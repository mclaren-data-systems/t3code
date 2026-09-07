import type {
  VcsRef,
  SourceControlProviderInfo,
  VcsStatusLocalResult,
  VcsStatusRemoteResult,
  VcsStatusResult,
  VcsStatusStreamEvent,
} from "@t3tools/contracts";
import { DEFAULT_WORKTREE_BRANCH_PREFIX } from "@t3tools/contracts";
import * as Arr from "effect/Array";
import * as Result from "effect/Result";
import { detectSourceControlProviderFromRemoteUrl } from "./sourceControl.ts";

// Re-exported so every worktree branch naming rule can be imported from here.
export { DEFAULT_WORKTREE_BRANCH_PREFIX };

// Placeholder branches carry this marker so they cannot be mistaken for a
// branch someone named themselves. Provenance is inferred from the refName
// rather than recorded, so the shape has to be one nobody writes by hand:
// `theo/deadbeef` is eight hex characters and a plausible hand-written name,
// while `theo/t3-deadbeef` is not.
const TEMP_WORKTREE_BRANCH_MARKER = "t3-";
const TEMP_WORKTREE_BRANCH_TOKEN_PATTERN = "[0-9a-f]{8}";
// Unmarked tokens predate the marker, and older mobile builds minted a
// `Crypto.randomUUID()` (always RFC 4122 v4) — version nibble `4`, variant
// nibble `[89ab]`. Both were only ever minted under the default prefix, so they
// stay matchable there and nowhere else: honouring them under a configured
// prefix is what would make `theo/deadbeef` look like a placeholder.
const LEGACY_TEMP_WORKTREE_BRANCH_TOKEN_PATTERN =
  "(?:[0-9a-f]{8}|[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})";

/**
 * Sanitize an arbitrary string into a valid, lowercase git refName fragment.
 * Returns an empty string when nothing usable survives.
 */
function toBranchFragment(raw: string): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/^[./\s_-]+|[./\s_-]+$/g, "");

  return normalized
    .replace(/[^a-z0-9/_-]+/g, "-")
    .replace(/\/+/g, "/")
    .replace(/-+/g, "-")
    .replace(/^[./_-]+|[./_-]+$/g, "")
    .slice(0, 64)
    .replace(/[./_-]+$/g, "");
}

/**
 * Sanitize an arbitrary string into a valid, lowercase git refName fragment.
 * Strips quotes, collapses separators, limits to 64 chars.
 */
export function sanitizeBranchFragment(raw: string): string {
  const branchFragment = toBranchFragment(raw);
  return branchFragment.length > 0 ? branchFragment : "update";
}

/**
 * Resolve the configured worktree branch prefix into a usable refName
 * namespace. Blank or unusable values fall back to the default so a bad
 * setting can never produce an invalid refName.
 */
export function normalizeWorktreeBranchPrefix(prefix: string | null | undefined): string {
  const branchFragment = toBranchFragment(prefix ?? "");
  return branchFragment.length > 0 ? branchFragment : DEFAULT_WORKTREE_BRANCH_PREFIX;
}

/**
 * Sanitize a string into a `feature/…` refName name.
 * Preserves an existing `feature/` prefix or slash-separated namespace.
 */
export function sanitizeFeatureBranchName(raw: string): string {
  const sanitized = sanitizeBranchFragment(raw);
  if (sanitized.includes("/")) {
    return sanitized.startsWith("feature/") ? sanitized : `feature/${sanitized}`;
  }
  return `feature/${sanitized}`;
}

const AUTO_FEATURE_BRANCH_FALLBACK = "feature/update";

/**
 * Resolve a unique `feature/…` refName name that doesn't collide with
 * any existing refName. Appends a numeric suffix when needed.
 */
export function resolveAutoFeatureBranchName(
  existingBranchNames: readonly string[],
  preferredBranch?: string,
): string {
  const preferred = preferredBranch?.trim();
  const resolvedBase = sanitizeFeatureBranchName(
    preferred && preferred.length > 0 ? preferred : AUTO_FEATURE_BRANCH_FALLBACK,
  );
  const existingNames = new Set(existingBranchNames.map((refName) => refName.toLowerCase()));

  if (!existingNames.has(resolvedBase)) {
    return resolvedBase;
  }

  let suffix = 2;
  while (existingNames.has(`${resolvedBase}-${suffix}`)) {
    suffix += 1;
  }

  return `${resolvedBase}-${suffix}`;
}

/**
 * Strip the remote prefix from a remote ref such as `origin/feature/demo`.
 */
export function deriveLocalBranchNameFromRemoteRef(branchName: string): string {
  const firstSeparatorIndex = branchName.indexOf("/");
  if (firstSeparatorIndex <= 0 || firstSeparatorIndex === branchName.length - 1) {
    return branchName;
  }
  return branchName.slice(firstSeparatorIndex + 1);
}

export function buildTemporaryWorktreeBranchName(
  randomHex: (byteLength: number) => string,
): string {
  // Clients mint this before they know the configured prefix; the server
  // re-namespaces it in `applyWorktreeBranchPrefix` when the worktree is made.
  // Normalize to exactly 8 lowercase hex chars so a UUID-shaped callback
  // still produces the canonical temporary branch form.
  const token = randomHex(4)
    .toLowerCase()
    .replace(/[^0-9a-f]/g, "")
    .slice(0, 8);
  return `${DEFAULT_WORKTREE_BRANCH_PREFIX}/${TEMP_WORKTREE_BRANCH_MARKER}${token}`;
}

/**
 * The prefixes a marked placeholder may legitimately carry: the configured one,
 * plus the default, so a thread whose placeholder was minted before the prefix
 * changed stays eligible for rename.
 */
function temporaryWorktreeBranchPrefixes(prefix: string | null | undefined): ReadonlyArray<string> {
  const normalized = normalizeWorktreeBranchPrefix(prefix);
  return normalized === DEFAULT_WORKTREE_BRANCH_PREFIX
    ? [normalized]
    : [normalized, DEFAULT_WORKTREE_BRANCH_PREFIX];
}

/**
 * The random token a refName carries if it is a placeholder worktree branch, or
 * undefined if the refName is something the user named. Prefixes are sanitized
 * to `[a-z0-9/_-]`, none of which is a regex metacharacter, so interpolating
 * one needs no escaping.
 */
function temporaryWorktreeBranchToken(
  refName: string,
  prefix: string | null | undefined,
): string | undefined {
  const candidate = refName.trim().toLowerCase();

  for (const namespace of temporaryWorktreeBranchPrefixes(prefix)) {
    const marked = new RegExp(
      `^${namespace}\\/${TEMP_WORKTREE_BRANCH_MARKER}(${TEMP_WORKTREE_BRANCH_TOKEN_PATTERN})$`,
    ).exec(candidate);
    if (marked) return marked[1];
  }

  const legacy = new RegExp(
    `^${DEFAULT_WORKTREE_BRANCH_PREFIX}\\/(${LEGACY_TEMP_WORKTREE_BRANCH_TOKEN_PATTERN})$`,
  ).exec(candidate);
  return legacy ? legacy[1] : undefined;
}

/**
 * Whether a refName is one of the placeholder branches a client mints for a new
 * worktree thread, and so is still eligible for rename once the first turn
 * produces a real name.
 */
export function isTemporaryWorktreeBranch(refName: string, prefix?: string | null): boolean {
  return temporaryWorktreeBranchToken(refName, prefix) !== undefined;
}

/**
 * Re-namespace a placeholder worktree branch a client minted under a different
 * prefix, normalizing it to the marked form on the way through. Anything the
 * user actually named is returned untouched.
 */
export function applyWorktreeBranchPrefix(refName: string, prefix?: string | null): string {
  const token = temporaryWorktreeBranchToken(refName, prefix);
  if (token === undefined) {
    return refName;
  }
  return `${normalizeWorktreeBranchPrefix(prefix)}/${TEMP_WORKTREE_BRANCH_MARKER}${token}`;
}

/**
 * Build the namespaced worktree branch name for a generated (or hand-written)
 * description. An already-namespaced input keeps only its trailing fragment, so
 * a model that echoes the prefix back does not produce `<prefix>/<prefix>/…`.
 */
export function buildWorktreeBranchName(raw: string, prefix?: string | null): string {
  const normalized = raw
    .trim()
    .toLowerCase()
    .replace(/['"`]/g, "")
    .replace(/^refs\/heads\//, "");
  const withoutPrefix = temporaryWorktreeBranchPrefixes(prefix).reduce(
    (value, candidate) =>
      value.startsWith(`${candidate}/`) ? value.slice(`${candidate}/`.length) : value,
    normalized,
  );
  return `${normalizeWorktreeBranchPrefix(prefix)}/${sanitizeBranchFragment(withoutPrefix)}`;
}

/**
 * The web spelling of an Azure DevOps repository reached over SSH, or null for anything else.
 *
 * Azure alone addresses one repository under two names that share no part: `ssh.dev.azure.com` and
 * `v3/{org}/{project}/{repo}` over SSH, against `dev.azure.com` and `{org}/{project}/_git/{repo}`
 * everywhere a person sees it. A project cloned over SSH would otherwise be a different repository
 * to every comparison made against a pull request URL, which arrives in the web spelling. So the
 * web spelling is the one both are keyed by.
 */
function azureDevOpsRepositoryKey(host: string, segments: ReadonlyArray<string>): string | null {
  if (host !== "ssh.dev.azure.com" && host !== "vs-ssh.visualstudio.com") return null;
  const [marker, organization, project, repository] = segments;
  if (segments.length !== 4 || marker !== "v3") return null;
  if (!organization || !project || !repository) return null;
  return host === "ssh.dev.azure.com"
    ? `dev.azure.com/${organization}/${project}/_git/${repository}`
    : `${organization}.visualstudio.com/${project}/_git/${repository}`;
}

/**
 * Normalize a git remote URL into a stable comparison key.
 */
export function normalizeGitRemoteUrl(value: string): string {
  const normalized = value
    .trim()
    .replace(/\/+$/g, "")
    .replace(/\.git$/i, "")
    .toLowerCase();

  if (/^(?:ssh|https?|git):\/\//i.test(normalized)) {
    try {
      const url = new URL(normalized);
      const repositorySegments = url.pathname.split("/").filter((segment) => segment.length > 0);
      if (url.hostname && repositorySegments.length > 1) {
        return (
          azureDevOpsRepositoryKey(url.hostname, repositorySegments) ??
          `${url.hostname}/${repositorySegments.join("/")}`
        );
      }
    } catch {
      return normalized;
    }
  }

  const scpStyleHostAndPath = /^[a-zA-Z0-9._-]+@([^:/\s]+):([^/\s]+(?:\/[^/\s]+)+)$/i.exec(
    normalized,
  );
  const scpHost = scpStyleHostAndPath?.[1];
  const scpPath = scpStyleHostAndPath?.[2];
  if (scpHost && scpPath) {
    return azureDevOpsRepositoryKey(scpHost, scpPath.split("/")) ?? `${scpHost}/${scpPath}`;
  }

  return normalized;
}

/**
 * Unquote a git config value: strip an inline `#` or `;` comment outside
 * quotes, then drop surrounding quotes and backslash escapes.
 */
function parseGitConfigValue(raw: string): string {
  let out = "";
  let quoted = false;
  for (let index = 0; index < raw.length; index += 1) {
    const char = raw[index]!;
    if (char === "\\" && index + 1 < raw.length) {
      out += raw[index + 1];
      index += 1;
      continue;
    }
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (!quoted && (char === "#" || char === ";")) break;
    out += char;
  }
  return out.trim();
}

/**
 * Read the primary remote URL from raw `.git/config` text without spawning
 * git. Prefers `remote.origin.url` and falls back to the first remote so
 * clones made with `git clone --origin <name>` still resolve.
 */
export function parseOriginUrlFromGitConfig(configText: string): string | null {
  let section: string | null = null;
  let originUrl: string | null = null;
  let firstRemoteUrl: string | null = null;
  // A trailing backslash continues the value on the next line.
  const joined = configText.replace(/\\\r?\n[ \t]*/g, "");
  for (const rawLine of joined.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line.length === 0 || line.startsWith("#") || line.startsWith(";")) continue;
    // Both `[remote "origin"]` and the legacy `[remote.origin]` form, with an
    // optional trailing comment. Git keeps quoted subsections case-sensitive
    // but folds the dotted form to lowercase.
    const header = /^\[\s*remote(?:\s+"([^"]+)"|\.([^\]\s]+))\s*\](?:\s*[#;].*)?$/i.exec(line);
    if (header) {
      section = header[1] ?? header[2]?.toLowerCase() ?? null;
      continue;
    }
    if (line.startsWith("[")) {
      section = null;
      continue;
    }
    if (section === null) continue;
    const match = /^url\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const url = parseGitConfigValue(match[1] ?? "");
    if (url.length === 0) continue;
    if (section === "origin") {
      originUrl ??= url;
    } else {
      firstRemoteUrl ??= url;
    }
  }
  return originUrl ?? firstRemoteUrl;
}

/**
 * Best-effort parse of a GitHub `owner/repo` identifier from common remote URL shapes.
 */
export function parseGitHubRepositoryNameWithOwnerFromRemoteUrl(url: string | null): string | null {
  const trimmed = url?.trim() ?? "";
  if (trimmed.length === 0) {
    return null;
  }

  const match =
    /^(?:git@github\.com:|ssh:\/\/(?:git@)?github\.com\/|https:\/\/github\.com\/|git:\/\/github\.com\/)([^/\s]+\/[^/\s]+?)(?:\.git)?\/?$/i.exec(
      trimmed,
    );
  const repositoryNameWithOwner = match?.[1]?.trim() ?? "";
  return repositoryNameWithOwner.length > 0 ? repositoryNameWithOwner : null;
}

function deriveLocalBranchNameCandidatesFromRemoteRef(
  branchName: string,
  remoteName?: string,
): ReadonlyArray<string> {
  const candidates = new Set<string>();
  const firstSlashCandidate = deriveLocalBranchNameFromRemoteRef(branchName);
  if (firstSlashCandidate.length > 0) {
    candidates.add(firstSlashCandidate);
  }

  if (remoteName) {
    const remotePrefix = `${remoteName}/`;
    if (branchName.startsWith(remotePrefix) && branchName.length > remotePrefix.length) {
      candidates.add(branchName.slice(remotePrefix.length));
    }
  }

  return [...candidates];
}

/**
 * Hide `origin/*` remote refs when a matching local refName already exists.
 */
export function dedupeRemoteBranchesWithLocalMatches(
  refs: ReadonlyArray<VcsRef>,
): ReadonlyArray<VcsRef> {
  const localBranchNames = new Set(
    Arr.filterMap(refs, (refName) =>
      refName.isRemote ? Result.failVoid : Result.succeed(refName.name),
    ),
  );

  return refs.filter((refName) => {
    if (!refName.isRemote) {
      return true;
    }

    if (refName.remoteName !== "origin") {
      return true;
    }

    const localBranchCandidates = deriveLocalBranchNameCandidatesFromRemoteRef(
      refName.name,
      refName.remoteName,
    );
    return !localBranchCandidates.some((candidate) => localBranchNames.has(candidate));
  });
}

export function detectSourceControlProviderFromGitRemoteUrl(
  remoteUrl: string,
): SourceControlProviderInfo | null {
  return detectSourceControlProviderFromRemoteUrl(remoteUrl);
}

const EMPTY_GIT_STATUS_REMOTE: VcsStatusRemoteResult = {
  hasUpstream: false,
  aheadCount: 0,
  behindCount: 0,
  aheadOfDefaultCount: 0,
  pr: null,
};

export function mergeGitStatusParts(
  local: VcsStatusLocalResult,
  remote: VcsStatusRemoteResult | null,
): VcsStatusResult {
  return {
    ...local,
    ...(remote ?? EMPTY_GIT_STATUS_REMOTE),
  };
}

function toRemoteStatusPart(status: VcsStatusResult): VcsStatusRemoteResult {
  return {
    hasUpstream: status.hasUpstream,
    aheadCount: status.aheadCount,
    behindCount: status.behindCount,
    ...(status.aheadOfDefaultCount === undefined
      ? {}
      : { aheadOfDefaultCount: status.aheadOfDefaultCount }),
    pr: status.pr,
  };
}

function toLocalStatusPart(status: VcsStatusResult): VcsStatusLocalResult {
  return {
    isRepo: status.isRepo,
    ...(status.sourceControlProvider
      ? { sourceControlProvider: status.sourceControlProvider }
      : {}),
    hasPrimaryRemote: status.hasPrimaryRemote,
    isDefaultRef: status.isDefaultRef,
    refName: status.refName,
    hasWorkingTreeChanges: status.hasWorkingTreeChanges,
    workingTree: status.workingTree,
  };
}

export function applyGitStatusStreamEvent(
  current: VcsStatusResult | null,
  event: VcsStatusStreamEvent,
): VcsStatusResult {
  switch (event._tag) {
    case "snapshot":
      return mergeGitStatusParts(event.local, event.remote);
    case "localUpdated":
      return mergeGitStatusParts(event.local, current ? toRemoteStatusPart(current) : null);
    case "remoteUpdated":
      if (current === null) {
        return mergeGitStatusParts(
          {
            isRepo: true,
            hasPrimaryRemote: false,
            isDefaultRef: false,
            refName: null,
            hasWorkingTreeChanges: false,
            workingTree: { files: [], insertions: 0, deletions: 0 },
          },
          event.remote,
        );
      }
      return mergeGitStatusParts(toLocalStatusPart(current), event.remote);
  }
}
