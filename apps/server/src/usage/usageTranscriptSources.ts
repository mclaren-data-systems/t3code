/**
 * usageTranscriptSources — the transcript directories one usage scan walks.
 *
 * Every configured provider instance whose CLI leaves readable transcripts
 * contributes a directory, not only the default instance. A second Claude or
 * Codex account is a second place tokens get spent, and a scan that ignores it
 * under-reports without saying so.
 *
 * Grok is the exception: its settings expose only a binary path, so it has no
 * per-instance home to enumerate and contributes the single `$GROK_HOME` (or
 * `~/.grok`) directory the scan has always walked.
 *
 * Two rules the scan depends on:
 *
 *   - Disabled instances still count. Usage records tokens already spent;
 *     turning a provider off must not retroactively rewrite history.
 *   - Instances resolving to one directory are walked once. Sharing a config
 *     directory between presets is a supported setup, and nothing else
 *     de-duplicates within a single environment — the client's duplicate
 *     fingerprint drop only runs *across* environments.
 *
 * @module usage/usageTranscriptSources
 */
import {
  ClaudeSettings,
  CodexSettings,
  defaultInstanceIdForDriver,
  ProviderDriverKind,
  type ServerSettings,
  type UsageProviderKind,
} from "@t3tools/contracts";
import { HostProcessEnvironment, isHostWindows } from "@t3tools/shared/hostProcess";
import * as NodeOS from "node:os";
import * as Effect from "effect/Effect";
import * as FileSystem from "effect/FileSystem";
import * as Path from "effect/Path";
import * as Schema from "effect/Schema";

import { expandHomePath } from "../pathExpansion.ts";
import { resolveClaudeHomePath } from "../provider/Drivers/ClaudeHome.ts";
import { resolveCodexHomeLayout } from "../provider/Drivers/CodexHomeLayout.ts";

export interface UsageTranscriptSource {
  readonly provider: UsageProviderKind;
  /** Absolute transcript directory, exactly as the scan will walk it. */
  readonly dir: string;
  /** Set when the provider writes one fixed transcript file name per session. */
  readonly fileName?: string;
}

const CLAUDE_DRIVER = ProviderDriverKind.make("claudeAgent");
const CODEX_DRIVER = ProviderDriverKind.make("codex");

const decodeClaudeSettings = Schema.decodeUnknownEffect(ClaudeSettings);
const decodeCodexSettings = Schema.decodeUnknownEffect(CodexSettings);

/**
 * Claude's config dir is the home itself when overridden, but a default
 * install nests transcripts under `~/.claude/projects`. Probe both.
 */
const resolveClaudeTranscriptDir = Effect.fn("resolveClaudeTranscriptDir")(function* (
  homePath: string,
): Effect.fn.Return<string, never, FileSystem.FileSystem | Path.Path> {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const nested = path.join(homePath, ".claude", "projects");
  const nestedExists = yield* fileSystem
    .exists(nested)
    .pipe(Effect.catchCause(() => Effect.succeed(false)));
  return nestedExists ? nested : path.join(homePath, "projects");
});

interface DriverInstanceConfig {
  readonly instanceId: string;
  readonly config: unknown;
}

/**
 * Opaque configs for one driver, default slot first so a single-instance
 * environment reports exactly the source it always did.
 *
 * Mirrors the registry's own merge: an explicit `providerInstances` entry owns
 * its id, and the legacy `providers.<kind>` blob fills the default slot only
 * when nothing has claimed it.
 */
function instanceConfigsForDriver(
  settings: ServerSettings,
  driver: ProviderDriverKind,
): ReadonlyArray<DriverInstanceConfig> {
  const defaultInstanceId = defaultInstanceIdForDriver(driver);
  const instances = settings.providerInstances;
  const claimed = instances[defaultInstanceId];
  const configs: Array<DriverInstanceConfig> = [];

  if (claimed === undefined) {
    // Access is dynamic (the driver kind is a branded string) but constrained
    // to the built-in kinds this module names.
    const legacy = (settings.providers as Record<string, unknown>)[driver];
    if (legacy !== undefined) configs.push({ instanceId: defaultInstanceId, config: legacy });
  } else if (claimed.driver === driver) {
    configs.push({ instanceId: defaultInstanceId, config: claimed.config ?? {} });
  }

  for (const [instanceId, entry] of Object.entries(instances).sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    if (instanceId === defaultInstanceId || entry.driver !== driver) continue;
    configs.push({ instanceId, config: entry.config ?? {} });
  }

  return configs;
}

/**
 * Enumerate every transcript directory this environment should scan, Claude
 * instances before Codex ones and default instances before custom ones.
 *
 * An instance whose config fails to decode is logged and skipped rather than
 * failing the whole scan: one bad envelope must not zero out the usage page.
 */
export const resolveUsageTranscriptSources = Effect.fn("resolveUsageTranscriptSources")(function* (
  settings: ServerSettings,
): Effect.fn.Return<
  ReadonlyArray<UsageTranscriptSource>,
  never,
  FileSystem.FileSystem | Path.Path
> {
  const path = yield* Path.Path;
  const hostIsWindows = yield* isHostWindows;
  const hostEnvironment = yield* HostProcessEnvironment;
  const sources: Array<UsageTranscriptSource> = [];
  const seen = new Set<string>();

  const add = (provider: UsageProviderKind, dir: string, fileName?: string) => {
    // Windows paths are case-insensitive, so two instances configured with
    // different casing name one directory and would otherwise double count.
    const key = hostIsWindows ? dir.toLowerCase() : dir;
    if (seen.has(key)) return;
    seen.add(key);
    sources.push(fileName === undefined ? { provider, dir } : { provider, dir, fileName });
  };

  for (const { instanceId, config } of instanceConfigsForDriver(settings, CLAUDE_DRIVER)) {
    const decoded = yield* decodeClaudeSettings(config).pipe(Effect.result);
    if (decoded._tag === "Failure") {
      yield* Effect.logWarning("Skipping Claude instance with undecodable config in usage scan", {
        instanceId,
      });
      continue;
    }
    const homePath = yield* resolveClaudeHomePath(decoded.success);
    add("claude", yield* resolveClaudeTranscriptDir(homePath));
  }

  for (const { instanceId, config } of instanceConfigsForDriver(settings, CODEX_DRIVER)) {
    const decoded = yield* decodeCodexSettings(config).pipe(Effect.result);
    if (decoded._tag === "Failure") {
      yield* Effect.logWarning("Skipping Codex instance with undecodable config in usage scan", {
        instanceId,
      });
      continue;
    }
    const layout = yield* resolveCodexHomeLayout(decoded.success);
    add("codex", path.join(layout.sharedHomePath, "sessions"));
  }

  // Grok Settings only expose the binary path; home is `$GROK_HOME` or `~/.grok`.
  // Empty/whitespace GROK_HOME must fall back: coalescing alone would scan cwd.
  const grokHomeEnv = hostEnvironment["GROK_HOME"]?.trim() ?? "";
  const grokHome =
    grokHomeEnv.length > 0
      ? path.resolve(expandHomePath(grokHomeEnv))
      : path.join(NodeOS.homedir(), ".grok");
  add("grok", path.join(grokHome, "sessions"), "updates.jsonl");

  return sources;
});
