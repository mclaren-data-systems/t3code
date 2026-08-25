# Fork notes (mclaren-data-systems/t3code)

## 1. Purpose

This is a development fork of `pingdotgg/t3code` maintained at `mclaren-data-systems/t3code`,
and it is not a hard fork: upstream is the source of truth, `main` here is rebased onto it
indefinitely, and every entry below is provisional — when upstream ships an equivalent the
fork change is dropped rather than defended. The layer it carries is deliberately thin and has
converged on one substantive thing, **a CI/workflow set a fork can actually run** (standard
GitHub-hosted runners instead of upstream's Blacksmith ones, nothing needing credentials a
fork lacks, and unsigned desktop artifacts published as pruned development-build prereleases),
plus fork identity (this file, the `README.md` banner, the `AGENTS.md` policy sections, no
update checking, a sidebar link to this repo) and a handful of source changes: multi-instance
provider support (15, 16, 19), a configurable worktree branch prefix (17), and five web UX
changes (5, 6, 7, 18, 21). Everything else — `native/`, `scripts/`, `infra/`, `pnpm-lock.yaml`,
`pnpm-workspace.yaml`, `apps/server/src/persistence/` — is byte-identical to upstream.

This file is the authoritative list of what sets this fork apart, and it is written to be used
when rebasing onto a newer upstream. **Work from intent, not from the old diff.** For each
numbered entry: check the drop-check first, and if upstream now covers the intent, move the
entry to section 4; otherwise re-derive the intent against current upstream code, taking
upstream's version of anything that moved. Then update section 2 and re-run the focused
verification for the packages you touched.

## 2. Last rebase

> **2026-08-25**, onto `pingdotgg/t3code` `main` at **`99960383`** — _fix: open agent file
> links in the file viewer (#8098)_. Took in **57 upstream commits** (`2c4158f8..99960383`)
> and replayed the fork's 23 commits. The previous tip `40a66de7` (based on `2c4158f8`,
> 2026-08-22) is backed up at `origin/backup/main-pre-rebase-2026-08-25`; `main` was then
> force-pushed to the rebased tip. Earlier backups still on `origin`:
> `backup/main-pre-rebase-2026-08-22` and `-2026-08-21`.
>
> **Nothing was superseded.** All twelve active entries were re-checked against `99960383`
> and every drop-check still comes back empty. Five conflicts, all resolved by taking
> upstream's version and re-applying fork intent on top:
>
> - `.github/VOUCHED.td` and `.github/workflows/release.yml` (modify/delete) — resolved as
>   deletions per entry 14. Upstream added **no** new workflow in this range, so there was no
>   opt-in decision to make; `ci.yml` was untouched upstream and the fork's four-workflow set
>   is unchanged.
> - `apps/web/src/components/Sidebar.tsx` — upstream `fdd1572b` (#7913) removed `px-1` from
>   the project menu rows inside the block entry 18 moves. Took upstream's padding, kept the
>   fork's layout.
> - `apps/web/src/components/usage/*` — upstream `17dbe8dd` (#7563) added `providersWithUsage`
>   so charts and tables draw only providers with real activity. That intent was folded into
>   entry 19's `buildUsageSeries`, which now filters idle instances the same way and keeps the
>   stand-in rows only when nothing at all was reported; upstream's `providersWithUsage` and
>   its test are kept intact. Upstream's `table-fixed` colgroups (#7563), skeleton placeholders
>   (`8287f2c3`, #8111) and the Codex `--contrast-foreground` brand color (`6e9c57f7`, #7906)
>   were all taken as-is into the fork's instance-keyed shapes.
> - `ProviderCommandReactor.test.ts` and `session-logic.test.ts` — both sides only appended;
>   kept both.
>
> **Checked and needed no change:** entry 14's standing drift check on `desktop-artifacts.yml`
> against upstream's `release.yml` build job. Upstream `25dcee00` (#7975) restructured that job
> (a split-out `quality` job, `vp install --filter` in place of `run-install:`, and a cached
> resource monitor gated by a new `T3CODE_DESKTOP_REUSE_RESOURCE_MONITOR` env). None of it is
> required to build: the fork's workflow installs everything with `run-install: true` and
> builds the resource monitor every run. The cache is a pure speed-up and was deliberately
> **not** adopted — this workflow keeps only what the fork needs to build. Entry 20's
> mechanism was re-confirmed against the reworked `scripts/build-desktop-artifact.ts`:
> `resolveGitHubPublishConfig` still reads `T3CODE_DESKTOP_UPDATE_REPOSITORY` and still
> rejects a single-segment value, so `fork-updates-disabled` keeps resolving no publish config.
>
> Keep syncing by rebase, not merge — a merge commit makes "what does this fork carry?" a
> graph question instead of a `git diff upstream/main HEAD` one.

### Verification at this rebase

The host had node 22, so node **24.19.0** was put on `PATH` first (`package.json` pins
`engines.node: ^24.13.1`). `pnpm install --frozen-lockfile` succeeded and left
`pnpm-lock.yaml` byte-identical — the check that a replayed lockfile is sound. Typecheck clean
across `@t3tools/contracts`, `@t3tools/shared`, `t3`, `@t3tools/web` and `@t3tools/mobile`
(only pre-existing `unnecessaryFailYieldableError` _suggestions_ in untouched upstream files).
Web tests **361 passed** (usage, session-logic, uiStateStore, Sidebar.logic,
threadMessageHistory, settings, ProviderStatusBanner, versionSkew); server/shared/contracts
**700 passed / 6 skipped**; reactor + server + relay-deploy **189 passed**; the kept
`thread-transfer-report` publisher test **6/6**. `vp lint` and `vp fmt --check` clean over
every file the fork touches.

Three failures in that run were **environmental, not regressions** — always diff against clean
upstream before chasing one:

- `server.test.ts` → _reports workspace root stat failures…_ fails **as root** (`id -u` is 0):
  the test chmods a path to `0o000` and expects the next operation to be denied, but root
  ignores the mode bits. Confirmed here with a one-liner. Same class affects three other
  chmod-based tests (`update-release-package-versions.test.ts`, the keybindings-config write in
  `server.test.ts`, `terminal/Manager.test.ts`).
- `GrokAdapter.test.ts` (_Stop cancels during the xAI completion drain window_) and
  `ProviderRegistry.test.ts` (_re-probes when settings change the codex binaryPath_) failed
  inside the 708-test run and **both passed when re-run as their own file pair**. Timing
  sensitivity on a loaded runner; neither file is touched by this fork.
- Also known: `packages/shared/src/Net.test.ts` fails in containers without IPv6, and several
  server tests fail locally on Windows (process-spawn / POSIX-path assumptions) but pass on
  Linux CI.

Note `vp run` **bails on the first failing task**, so one environmental failure hides every
package after it — re-run the survivors with `--filter` before concluding the suite is red.
Note also that the pre-commit hook runs `vp fmt` over this file, so any edit here reflows a few
untouched lines; that is not an intentional edit.

## 3. Fork changes

> Entry numbers are **stable identifiers** and are never renumbered. A gap means the entry
> moved to section 4 or 5. Numbers 1, 4, 8, 9, 10 and the symlink half of 12 are superseded;
> 2, 3 and 11 are dropped.

### 5. Commit exactly the files a turn changed

- **Intent.** Committing a thread's work should not require hand-unchecking every unrelated
  dirty file. The completion "Changed files" card gets a **Commit** button beside "Open diff"
  that opens the commit modal with only this turn's files checked; the regular commit button
  still selects all.
- **Files:** `apps/web/src/session-logic.ts` (+ test), `components/ChatView.tsx`,
  `components/GitActionsControl.tsx`,
  `components/chat/{ChangedFilesTree,ChatHeader,MessagesTimeline}.tsx`
- **Re-apply notes.** The file list is the turn's checkpoint `TurnDiffSummary` — the same one
  upstream's `AssistantChangedFilesSection` renders — so nothing re-derives per-turn
  attribution. `ChangedFilesCard` takes an optional `onCommitTurnFiles`; ChatView holds a
  `GitCommitPreselection` (`{ filePaths, requestId }`) that flows through `ChatHeader` into
  `GitActionsControl`, where an effect keyed on `requestId` seeds `excludedFiles`, turns on the
  checkbox list and opens the dialog. `deriveCommitExcludedFilePaths` /
  `normalizeWorkspaceRelativeFilePath` do the checkpoint-vs-git-status path matching
  (separators, `./` prefixes, case). Expect the `GitActionsControl` wiring to need adapting
  whenever upstream reworks that dialog.
- **Drop it when:** upstream's commit dialog can be opened with a preselected file set. Check
  with `grep -rn "onCommitTurnFiles\|Preselection" apps/web/src` against clean upstream.
- **Redundancy check (`99960383`): keep.** No `preselect`-style symbol upstream; upstream
  touched none of these files in this range.
- **Browser-only:** the button-to-dialog flow. Unit tests cover path matching only.

### 6. Keep the completed dot until the thread is actually read

- **Intent.** Opening a thread instantly cleared its green completed dot, so it was easy to
  lose track of which completed threads had been looked at. The dot now survives until the
  completion is acknowledged by viewing the thread, and wake-driven visit bumps do not clear it.
- **Files:** `apps/web/src/uiStateStore.ts` (+ test), `components/Sidebar.logic.ts` (+ test),
  `components/Sidebar.tsx`, `components/ThreadStatusIndicators.tsx`, `components/ChatView.tsx`
- **Re-apply notes.** Anchor on the persisted-UI-state shape: mirror everything done for
  `threadLastVisitedAtById` (initial state, hydrate seed, persist, mark-unread reset) for a new
  `threadLastCompletionAcknowledgedAtById`. The acknowledged-at value reaches
  `hasUnseenCompletion` through `ThreadStatusInput` and its two call sites, **not** by patching
  the store read. `ChatView` stamps the acknowledgement on visit at the turn's `completedAt`.
  The maintainer's refinement — only mark read after ~3s of visibility — is still unimplemented;
  this field is the seam for it. `LegacySidebar.tsx` is opt-in and untouched.
- **Drop it when:** upstream's `uiStateStore.ts` tracks a completion acknowledgement. Check
  with `grep -c AcknowledgedAt apps/web/src/uiStateStore.ts` against clean upstream.
- **Redundancy check (`99960383`): keep.** Upstream still tracks only `threadLastVisitedAtById`.

### 7. Shell-style message recall in the composer

- **Intent.** Recover and resend prior messages the way terminal input history works.
- **Files:** `apps/web/src/threadMessageHistory.ts` (new, + test),
  `apps/web/src/threadMessageHistoryStore.ts` (new), `components/chat/ChatComposer.tsx`
- **Re-apply notes.** Every sent message is appended to a per-thread history (capped at 100,
  keyed by `scopedThreadKey`). ArrowUp/ArrowDown walk it, **but only** when the cursor is on
  the first/last line — otherwise arrows move the cursor normally. The in-progress draft is
  stashed and restored when navigating past the newest entry. The pure module ports verbatim;
  the part that must be redone on any composer rework is the hook placement: it sits in
  `onComposerCommandKey` **after** the slash/mention/skills menu handling and the Enter
  submission intent, so history only sees arrows the menu declined. Navigation reads through
  the existing `readComposerSnapshot` and applies prompts through the draft-store `setPrompt`
  path; the history append sits behind `submitComposerDraft`'s `didDispatch` so validation
  failures record no phantom entries.
- **Drop it when:** upstream's composer recalls prior messages. Check with
  `grep -c MessageHistory apps/web/src/components/chat/ChatComposer.tsx` against clean upstream.
- **Redundancy check (`99960383`): keep.** No history recall upstream.
- **Browser-only:** the arrow-key interaction. Unit tests cover the pure navigation rules only.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents working in this repo must know that `origin` is the fork and the only
  write target, that `upstream` is fetch-only, and that the fork's `README.md` banner and this
  file win merge conflicts.
- **Files:** `AGENTS.md` (two sections prepended to upstream's, after its intro and before
  `## What makes T3 Code special?`)
- **Re-apply notes.** Take upstream's `AGENTS.md` prose wholesale and re-insert the two fork
  sections. `CLAUDE.md` is **not** part of this entry — take upstream's regular file containing
  `@AGENTS.md` and do not restore the old symlink (see section 4).
- **Redundancy check (`99960383`): keep, clean replay.** Upstream did not touch `AGENTS.md` or
  `CLAUDE.md` in this range.

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on this repo should see immediately that it is a rebasing fork and
  where the authoritative change list lives.
- **Files:** `README.md` (an "About this fork" blockquote before the `# T3 Code` heading),
  `FORK.md`
- **Re-apply notes.** The banner is delimited by `<!-- FORK-BANNER:START -->` /
  `<!-- FORK-BANNER:END -->` — **re-derive its text, never merge it**, since it goes stale
  every time an entry moves out of section 3. Refresh the rebase marker inside it too.
- **Redundancy check (`99960383`): keep, refreshed.** Upstream made no `README.md` change in
  this range; the banner body was rewritten to cover entry 20 and the marker moved to
  `99960383` / 2026-08-25.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it uses **standard GitHub-hosted
  runners** (upstream's `blacksmith-*` labels never resolve — jobs sat queued for 24h and were
  auto-cancelled) and needs **no credential beyond the automatic `GITHUB_TOKEN`**. Everything
  else is deleted, not disabled. Beyond that, keep only the minimum the fork needs to build and
  to check code quality, and prefer GitHub-native actions.
- **Files:** `.github/workflows/{ci,desktop-artifacts}.yml`; deleted
  `.github/workflows/{release,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check,publish-aur}.yml`
  and `.github/VOUCHED.td`; fork notes in `docs/internals/ci.md`, `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; fallout in `CONTRIBUTING.md` and
  `infra/relay/scripts/deploy.test.ts`
- **Kept (3 upstream workflows).** `ci.yml` with every Blacksmith runner swapped to
  `ubuntu-24.04` (five jobs: `check`, `test`, `test_server`, `rust`, `release_smoke`) and both
  mobile jobs dropped — the macOS-only `mobile_native_static_analysis` and the
  `mobile_native_changes` gate that exists only to decide whether it boots. `issue-labels.yml`
  and `thread-transfer-report.yml` unmodified; the latter publishes the thread-transfer budget
  diff from an artifact produced by the **sharded `test_server`** job, so dropping or renaming
  `test_server` would silently break it.
- **Added.** `desktop-artifacts.yml` — the four platforms upstream's `release.yml` matrix
  covers (macOS `arm64`/`x64` DMG, Linux `x64` AppImage, Windows `x64` NSIS), **unsigned**, on
  every push to `main` and on dispatch, uploaded as workflow artifacts and then published as a
  `desktop-dev-<run number>` **prerelease**, pruning older `desktop-dev-*` releases to the
  current one plus two. That publish-and-prune tail is fork intent, not an implementation
  detail — re-apply it even if the build job around it is rebuilt from scratch. The release job
  is the one place `GITHUB_TOKEN` is used (job-scoped `contents: write`). It carries over the
  three secret-free things that matter from upstream's build job: the `dtolnay/rust-toolchain`
  setup with a per-matrix `rust_target` (the desktop build cargo-builds
  `native/resource-monitor`), the Linux `node-pty` prebuild bundled into the Windows artifact
  (non-fatal when missing), and the Spectre-mitigated MSVC libs install. It never passes
  `--signed`, which is what would pull signing credentials into
  `scripts/build-desktop-artifact.ts`.
- **Deleted, and why.** Needing credentials and/or Blacksmith: `release.yml` (Cloudflare,
  Clerk, Apple, Azure, npm OIDC, a release GitHub App), `deploy-relay.yml`,
  `mobile-eas-{preview,production}.yml` (`EXPO_TOKEN`), `mobile-showcase-screenshots.yml`,
  `web-preview.yml` (Vercel tokens), `publish-aur.yml` (`AUR_SSH_PRIVATE_KEY`; it is a
  `workflow_call` target of the deleted `release.yml`, so nothing here would invoke it —
  `packaging/aur/` sources stay byte-identical and `packaging/aur/scripts/release.sh` still
  runs by hand). Mobile, which this fork does not target: `mobile-fingerprint-check.yml` — the
  one borderline call, since it is genuinely credential-free and a runner swap would make it
  run, but it labels PRs that would break OTA reach until the next store build and this fork
  ships no store builds. Upstream community governance: `pr-vouch.yml` + `.github/VOUCHED.td`
  and `pr-size.yml`. Fallout: the release-workflow tracing-config guard in
  `infra/relay/scripts/deploy.test.ts` read `release.yml` off disk and was dropped with a
  restore note; `CONTRIBUTING.md` lost its `vouch:*` / `size:*` paragraph.
- **Re-apply notes.** Highest-churn entry. Re-derive from upstream's **new** workflow files and
  re-apply the standing rule rather than force-keeping stale fork copies; a new upstream
  workflow is opt-**in** and ships only if it passes the rule and the fork actually needs it.
  Separately, `desktop-artifacts.yml` is fork-owned and can drift against upstream's desktop
  build requirements **without ever showing up as a merge conflict** — diff it against
  upstream's `release.yml` build job on every sync.
- **Redundancy check (`99960383`): keep.** Upstream added no workflow and changed only
  `release.yml` and `.github/VOUCHED.td`, both of which this fork deletes. Every kept workflow
  is on a standard runner with no secret beyond `GITHUB_TOKEN`; `grep -rn blacksmith .github/workflows/`
  matches only the explanatory comment in `desktop-artifacts.yml`.

### 15. A logged-out Claude instance reports as unauthenticated, and shows the directory it resolved

- **Intent.** Never infer "authenticated" from "the probe answered". `checkClaudeProviderStatus`
  treated the SDK capability probe returning an object as proof of a login, but Claude Code
  answers the handshake **locally** and a logged-out CLI still emits an `account` object filled
  with blanks plus `tokenSource: "none"`. So a second Claude instance pointed at a config
  directory with no login rendered as a bare "Authenticated" with an empty email while every
  turn failed — invisible everywhere except inside a chat.
- **Files:** `packages/contracts/src/server.ts` (`ServerProviderConfigDirectory`, optional
  `ServerProvider.configDirectory`), `apps/server/src/provider/providerSnapshot.ts`,
  `provider/providerStatusCache.ts`, `provider/Drivers/ClaudeHome.ts` (holds
  `resolveClaudeConfigDirPath`, moved in from `ClaudeSkills.ts`),
  `provider/Drivers/ClaudeSkills.ts`, `provider/Layers/ClaudeProvider.ts`,
  `apps/web/src/components/settings/ProviderInstanceCard.tsx`,
  `components/chat/ProviderStatusBanner.tsx`; tests in
  `provider/Layers/{ProviderRegistry,ClaudeCapabilitiesProbe}.test.ts` and
  `ProviderStatusBanner.test.tsx`; `docs/user/providers-claude.md`
- **Re-apply notes.** Auth classification is **three-way, and the third case is load-bearing**:
  positive evidence (`email`, `subscriptionType`, `apiKeySource`, or a non-`firstParty`
  `apiProvider`) → `authenticated`; an explicit `tokenSource: "none"` with nothing else →
  `unauthenticated` + `status: "error"` + a message naming the directory; **no signal at all** →
  the pre-existing `unknown` + `warning` bucket, because a CLI authenticated through a `profile`
  source reports an empty account object and an older CLI may omit `tokenSource` entirely.
  Neither must be called logged-out. The fragile coupling is that `tokenSource: "none"`
  contract, which is Claude Code's, not T3 Code's — re-confirm it against the CLI version in
  play before re-deriving. If it changes shape the classification moves but the three-way
  structure stays. Everything else is additive: `configDirectory` (`{ path, credentialsFound }`)
  is optional and driver-agnostic on the wire, `credentialsFound: false` is **not** proof of a
  logout (macOS keeps credentials in the keychain) so it renders only as detail on an
  already-failed auth state, and `ProviderStatusBanner` prefers the server's message over its
  hardcoded sign-in line. The docs half adds the Windows/PowerShell form of the multi-account
  instructions: PowerShell does not expand `~` inside a quoted string and neither does Claude
  Code, so upstream's bash-only `CLAUDE_CONFIG_DIR=~/.claude_x` writes the login into a folder
  literally named `~`, which T3 Code — which does expand — never sees.
- **Why it is not just a UI nicety.** With `unauthenticated` reachable, the existing filters in
  `apps/mobile/src/lib/modelOptions.ts`, `apps/web/src/components/CommandPalette.tsx` and
  `packages/client-runtime/src/operations/projects.ts` apply to Claude for the first time — a
  logged-out instance drops out of pickers instead of being offered and failing.
- **Drop it when:** upstream's `ClaudeProvider.ts` emits `auth.status: "unauthenticated"` on
  its own. Check with `grep -c '"unauthenticated"' apps/server/src/provider/Layers/ClaudeProvider.ts`
  and `grep -c configDirectory packages/contracts/src/server.ts` against clean upstream. Partial
  supersession is likely — keep whichever half is still missing.
- **Redundancy check (`99960383`): keep.** Both drop-checks come back **0**.

### 16. Usage scans every configured provider instance

- **Intent.** Usage totals must cover every configured instance, not just the default one.
  `resolveTranscriptDirs` built a **fixed two-element list** from the legacy
  `settings.providers.{claudeAgent,codex}` blobs and never consulted
  `settings.providerInstances`, so a second Claude account's transcripts were silently skipped —
  the dashboard kept reporting, the totals just quietly excluded what that account spent.
- **Files:** `apps/server/src/usage/usageTranscriptSources.ts` (new, + test),
  `apps/server/src/usage/UsageService.ts`
- **Re-apply notes.** A new module enumerates one directory per configured instance and
  `UsageService` consumes it; the scan loop already iterated a `dirs` array, so **no contract
  change, no `USAGE_CONTRACT_VERSION` bump, no UI change**. Four decisions worth keeping:
  disabled instances are **still scanned** (usage records tokens already spent; switching a
  provider off must not retroactively erase them); instances resolving to one directory are
  walked **once**, keyed case-insensitively on Windows (sharing a config dir between presets is
  documented, and nothing else de-duplicates within an environment); a single undecodable
  instance config is **logged and skipped**, not fatal; and ordering is Claude before Codex,
  default slot before custom instances sorted by id, which reproduces the old two-element output
  exactly for a single-instance environment. **The one drift risk:** `instanceConfigsForDriver`
  duplicates the default-slot merge rule from `deriveProviderInstanceConfigMap` rather than
  importing it (importing would drag `BUILT_IN_DRIVERS`, the whole driver graph, in for a pure
  function). If upstream changes that merge rule, this copy must follow — re-verify it every
  rebase.
- **Drop it when:** upstream's `resolveTranscriptDirs` reads `settings.providerInstances`. Check
  with `grep -c providerInstances apps/server/src/usage/UsageService.ts` against clean upstream.
- **Redundancy check (`99960383`): keep.** Drop-check is **0**; upstream made no change under
  `apps/server/src/usage/`, so the duplicated merge rule did not drift.

### 17. The worktree branch prefix is configurable, not hardcoded to `t3code`

- **Intent.** `WORKTREE_BRANCH_PREFIX = "t3code"` was a `const` with no setting behind it, so
  the vendor name landed in every teammate's branch list and in every PR head branch, and
  repositories with branch-naming rules (`<handle>/*`, `feature/*`, protected prefixes) could
  not be satisfied at all. One new server setting, `worktreeBranchPrefix`, applied at the two
  places the server names a worktree branch.
- **Files:** `packages/contracts/src/settings.ts`, `packages/shared/src/git.ts` (+ test),
  `apps/server/src/ws.ts`, `apps/server/src/orchestration/Layers/ProviderCommandReactor.ts`
  (+ test), `apps/server/src/server.test.ts`,
  `apps/web/src/components/settings/{WorktreeBranchSettings.tsx (new),SourceControlSettings.tsx,settingsSearch.ts}`,
  `docs/user/source-control.md`
- **Re-apply notes.** Five decisions worth keeping:
  1. **The server owns the naming, the clients stay dumb.** Web and mobile mint the placeholder
     before they could know the setting, so `buildTemporaryWorktreeBranchName`'s signature is
     unchanged and the three client call sites are untouched. `ws.ts` rewrites the placeholder
     at `prepareWorktree` time and the existing `thread.meta.update` reports the real branch back.
  2. **Placeholders carry a `t3-` marker, and the marker is the whole point.** Provenance is
     inferred from the refName, not recorded. Under the default prefix a bare `t3code/deadbeef`
     was safe; under a configured prefix it is not (`deadbeef`, `cafebabe` are plausible
     hand-written names), so matching `<prefix>/<8 hex>` would rename a user's own branch. Mint
     and match `<prefix>/t3-<8 hex>`. Unmarked and UUID-shaped tokens stay matchable **under the
     default prefix only**.
  3. **The matcher accepts the configured prefix _and_ the default**, or changing the prefix
     strands every thread whose placeholder was already minted.
  4. **A blank or unusable prefix falls back to `t3code`; it does not mean "no prefix"** — an
     empty namespace would put placeholders at the repository root and lets a bad setting
     produce an invalid refName.
  5. **A branch the user named is never rewritten**, so picking a branch before the first
     message still opts a thread out entirely.

  The rename site is `maybeGenerateAndRenameWorktreeBranchForFirstTurn`, and the settings read
  must sit **inside** the guarded `Effect.gen` whose `catchCause` logs failures, or a
  `ServerSettingsError` escapes a path that previously could not fail. The `ws.ts` site is the
  `bootstrap.prepareWorktree` block, where `branch` is optional — rewrite only when defined,
  since an absent `newRefName` means "check out the base ref, do not create a branch".

- **Not fixed here:** no mobile settings UI. Mobile surfaces no server settings today; the
  setting still applies to threads started from mobile, since the server does the naming.
- **Drop it when:** upstream makes the prefix configurable. Check with
  `grep -n "WORKTREE_BRANCH_PREFIX\|worktreeBranchPrefix" packages/shared/src/git.ts` against
  clean upstream — a lone `export const WORKTREE_BRANCH_PREFIX = "t3code"` means this is still
  needed.
- **Redundancy check (`99960383`): keep.** Still the lone hardcoded const upstream.

### 18. New thread button under the project selector, and scoped to it

- **Intent.** The sidebar header should read search → scope → act. The new thread button sat on
  the search row, above the project selector that gives it its context, as a bare glyph beside a
  text field it has nothing to do with — and it ignored the scope menu directly beneath it,
  always opening the command palette picker even when the sidebar was already scoped to one
  project. It now sits below the project row as a full-width labelled `SidebarMenuButton`, and
  when scoped it creates there immediately.
- **Files:** `apps/web/src/components/Sidebar.tsx`, `components/Sidebar.logic.ts` (+ test),
  `docs/user/thread-sidebar.md`
- **Re-apply notes.** Three decisions worth keeping:
  1. **The branch lives in a pure helper.** `resolveNewThreadClickTarget` returns
     `"scoped-project" | "current-project" | "picker"` and delegates the unscoped case to the
     existing `shouldCreateNewThreadInCurrentProject`, so the old rule is untouched.
  2. **The scoped target resolves through `buildSidebarProjectPickerEntries`**, the same builder
     the command palette uses. A scope entry is a _logical_ project (several checkouts grouped),
     so picking its representative by hand would target a different member than the picker does.
  3. **The scoped tooltip drops the shortcut and names the project.** `chat.new` is not
     scope-aware, so printing its shortcut next to a scoped button would advertise the wrong
     target.

  Also gone: the button no longer renders `disabled` when there are no projects — it renders
  with the project row, which is already hidden in that state. Not touched: `LegacySidebar.tsx`,
  the mobile home header, and the `chat.new` / `chat.newLocal` keybindings.

- **Drop it when:** upstream's `Sidebar.tsx` renders the new thread button below the project
  scope menu with a text label. Check with `grep -n "New thread" apps/web/src/components/Sidebar.tsx`
  against clean upstream — an icon-only button in the search row means this is still needed.
- **Redundancy check (`99960383`): keep.** Upstream still renders the icon-only button in the
  search row. Upstream `fdd1572b` (#7913) changed the project menu row padding inside this
  block; that change was taken and the fork layout kept around it.
- **Browser-only:** the header re-stack wants one look in a real client if re-derived.

### 19. Usage reports each provider instance separately

- **Intent.** Entry 16 made the _scan_ read every instance, but everything downstream still
  grouped by `UsageProviderKind`, so a work and a personal Claude Code collapsed into one row —
  the exact question a second account is configured to answer was unanswerable. It also left a
  **real double count**: `ownedContribution` resolved ownership per provider _kind_, so if
  environment A owned a shared Claude directory and B reported that directory plus another one,
  every bucket B reported survived, including the one A had already counted. The report's unit
  of grouping is now the provider instance.
- **Files:** `packages/contracts/src/usage.ts`,
  `packages/shared/src/{usageMerge,usageFormat}.ts`,
  `apps/server/src/usage/{usageTranscriptSources,usageAggregation,UsageService}.ts`,
  `apps/web/src/components/usage/*`, `apps/mobile/src/features/usage/*`, `docs/user/usage.md`,
  plus the five test files
- **Re-apply notes.** `UsageBucket` gains `instanceId`; `UsageSource` gains `instanceId`,
  `displayName`, `accentColor`; `USAGE_CONTRACT_VERSION` 4 → 5. The aggregator keys by
  `(day, hourStart?, provider, instanceId, model)` and `mergeUsage` resolves ownership per
  instance, exposing `instances` in place of `providers` with per-period maps keyed
  `byInstance`. Decisions worth keeping:
  1. **Series are keyed by instance id alone, not `(environment, instance)`.** Every
     environment's default Claude instance is `claudeAgent`, so keying by the pair would split
     one person's laptop and desktop into two rows.
  2. **`UsageSourceFingerprint` stays physical** — host, provider, path, volume, no instance id.
     It answers "is this the same directory"; folding the id in breaks cross-environment dedupe.
  3. **Presentation travels on the wire** (`displayName`, `accentColor`) rather than the client
     joining usage against the provider snapshot stream — mobile has no equivalent of web's
     `providerInstances` projection. The client still owns the _rule_: `formatInstanceLabel`
     resolves configured name → brand label for a default instance → humanized instance id.
  4. **De-duplication stays global across instances.** A record copied forward when a session is
     resumed under a second account is still one response.
  5. **Instances sharing one directory report as one**, under the first instance id in scan
     order.
  6. **Colors:** a configured `accentColor` wins, else a per-provider ramp indexed by
     `shadeIndex` assigned in an order that does not move when spending does. Index 0 is the
     brand color, so a single-instance environment looks untouched.
  7. **Idle series are not drawn, and the empty state still shows one row per provider.**
     `buildUsageSeries` filters instances with no tokens and no cost — that is upstream
     `17dbe8dd`'s (#7563) `providersWithUsage` intent, applied at instance granularity — and
     falls back to per-provider stand-in rows only when nothing at all was reported, so the page
     does not collapse to a bare headline.

  **The contract bump is the cost:** a fleet on mixed server versions excludes older
  environments from totals until they update. That path already existed and already says so in
  the UI; it is why this was not folded into entry 16.

- **Drop it when:** upstream's `UsageBucket` carries an instance id. Check with
  `grep -c instanceId packages/contracts/src/usage.ts` against clean upstream. If upstream ships
  its own per-instance breakdown, drop **both** this and entry 16, and re-verify its ownership
  rule against the double count in the intent above — a kind-level `ownedContribution` is the
  natural shape to write and is wrong.
- **Redundancy check (`99960383`): keep.** Drop-check is **0**.

### 20. No update checking, and a sidebar link to this fork with build provenance

- **Intent.** The fork identifies as the fork and never offers updates. Its CI cuts no signed
  releases, so the inherited update feed could only error against this repo — or, pointed
  elsewhere, offer upstream's builds over this fork's. With update checking gone, the GitHub
  link's tooltip becomes the way to see which build is running.
- **Files:** `.github/workflows/desktop-artifacts.yml` (build-step env),
  `apps/web/vite.config.ts`, `apps/web/src/vite-env.d.ts`, `apps/web/src/branding.ts`,
  `apps/web/src/components/sidebar/SidebarChrome.tsx`
- **Re-apply notes.** Two halves:
  1. **Update checking off.** The workflow sets
     `T3CODE_DESKTOP_UPDATE_REPOSITORY: fork-updates-disabled` on the build step. The value is
     deliberately single-segment: `resolveGitHubPublishConfig` requires `owner/repo` so it
     resolves **no** publish config, and being set it also stops the `GITHUB_REPOSITORY`
     fallback (which in Actions is this repo). electron-builder then writes no `app-update.yml`
     and the app's own `getAutoUpdateDisabledReason` lands in its designed "no update feed is
     configured" state. **The disable lives at the feed, not in `DesktopUpdates.ts`** —
     hardcoding it in the updater would break its ~25 update-machine tests and diverge a file
     upstream actively maintains.
  2. **Sidebar GitHub link.** A utility item in the sidebar footer right of Usage, same
     `SidebarMenuButton size="icon"` shape as its neighbours, wearing the existing `GitHubIcon`
     in bright red (`text-red-500!` **needs** the important marker — `SidebarMenuButton` forces
     `[&>svg]:text-[var(--sidebar-icon-color)]`). It is a real anchor with `target="_blank"`,
     which covers every surface (the desktop window's `setWindowOpenHandler` routes it to the OS
     browser). Its tooltip shows short commit hash and build time from two Vite defines beside
     the existing `APP_VERSION` one — `BUILD_COMMIT` and `BUILD_TIMESTAMP` — exported through
     `branding.ts`; empty values degrade the tooltip to a plain "GitHub". The item sits inside
     the same conditional block as Settings/Usage so it hides with them on the settings pages.
- **Drop it when:** never on upstream's account — this is fork identity. But **both halves need
  re-deriving every rebase**: the workflow half moves with entry 14's re-derive rule and stops
  working silently if upstream renames `T3CODE_DESKTOP_UPDATE_REPOSITORY` or reworks
  `resolveGitHubPublishConfig`; the `SidebarChrome.tsx` item must be re-applied whenever
  upstream reworks the utility menu.
- **Redundancy check (`99960383`): keep.** Upstream `25dcee00` (#7975) reworked
  `scripts/build-desktop-artifact.ts` but `resolveGitHubPublishConfig` still reads the env and
  still rejects a single-segment value, so the disable holds.
- **Browser-only:** the icon, tooltip and link. The no-feed disable shows in a packaged build as
  the greyed "Check for updates" pill.

### 21. New project action lives inside the project scope menu

- **Intent.** The sidebar's project filter row carried a separate icon-only folder-plus button
  squeezed against the dropdown it belongs to. The scope dropdown itself now ends with a
  separated **New project** item that opens the same add-project command palette flow, the
  standalone button is gone, and the filter trigger spans the full row — matching the draft
  hero's project menu, which already ends with the same item.
- **Files:** `apps/web/src/components/Sidebar.tsx`
- **Re-apply notes.** Purely presentational; no logic, contract, or store changes. The item is
  a `MenuItem` behind a `MenuSeparator` after the scope `MenuRadioGroup`, calling the existing
  `openAddProjectCommandPalette` (`openCommandPalette({ open: "add-project" })`), styled like
  the scope rows (`h-8 min-h-8 py-0 text-sm font-medium`, `FolderPlusIcon`). Re-deriving means
  deleting the old `flex items-center gap-1` wrapper around trigger + button and dropping
  `flex-1` from the trigger. This is the same project-row block entry 18 restacks — re-apply
  the two together. Mirror `DraftHeroHeadline.tsx`'s trailing "New project" item if the menu
  primitives change shape. Deliberately untouched: `LegacySidebar.tsx` (its add-project button
  sits beside the "Projects" section header, not a dropdown), the sidebar empty-state "Add
  project" button (the only way in when no projects exist), and mobile (separate add-project
  navigation flow).
- **Drop it when:** upstream's project scope menu carries its own new-project item. Check with
  `grep -n "New project" apps/web/src/components/Sidebar.tsx` against clean upstream — a hit
  only on an icon-only `aria-label` button beside the scope menu means this is still needed.
- **Redundancy check (`99960383`): keep.** Upstream still renders the standalone folder-plus
  button next to the scope menu and no menu item.
- **Browser-only:** the menu item placement and the widened trigger row.

## 4. Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not re-introduce them.**

| #            | Fork change                       | Superseded by                                                             | Verified at |
| ------------ | --------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_          | `99960383`  |
| 4            | Terminal Ctrl-chord forwarding    | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_     | `99960383`  |
| 5 (core)     | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints                       | `99960383`  |
| 8            | Full timestamp on hover           | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`         | `99960383`  |
| 9            | Always-visible new-thread btn     | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_        | `99960383`  |
| 10           | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                                    | `99960383`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md` | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_ | `99960383`  |

- **1 — Windows build shell mode.** The fork removed `shell: process.platform === "win32"` from
  the `buildCmd` spawn because shell mode broke builds from paths containing spaces. Upstream
  now hardcodes `shell: false` on that step and routes other spawns through
  `resolveSpawnCommand` — the fork's intent, arrived at independently.
- **4 — terminal Ctrl-chord forwarding.** The fork mapped plain `Ctrl+[a-z]` to its control byte
  because the app's keybindings swallowed Ctrl+C. Upstream's libghostty-vt surface now routes
  every unclaimed key through `GhosttyCore.encodeKey` with `preventDefault()` **and**
  `stopPropagation()`. Keeping the fork block would be **actively harmful** — returning `false`
  from `beforeKey` bails before `encodeKey`, so chords would bypass any negotiated Kitty
  keyboard-protocol encoding. Behavioral note: upstream binds copy to Ctrl+Shift+C, so plain
  Ctrl+C now interrupts even with a selection, matching every other terminal.
- **5 (core) — thread-scoped changed files.** Upstream attributes changed files per turn. Only
  the commit-preselect button remains; see entry 5.
- **8 — hover timestamp.** Upstream renders `formatChatTimestampTooltip` as a real tooltip on
  both the `createdAt` and `updatedAt` rows — a strictly better version of the same idea.
- **9 — always-visible new-thread button.** Sidebar v2 became the default; its button sits in a
  plain `<div className="shrink-0">` with no hover gating and the tooltip this entry wanted.
  `LegacySidebar.tsx` still carries the old crossfade; leave it, it is opt-in.
- **10 — package-local vitest configs.** The `vp` migration made them inapplicable and upstream
  ships none of its own. Revisit only if those process-spawning tests flake under `vp`.
- **12 (symlink half).** Upstream replaced the symlink with a regular file whose content is
  `@AGENTS.md` — the `@file` import syntax in the one position where it resolves. **Do not
  restore the symlink**; re-adding it would silently revert #7171 on every future rebase. Entry
  12 still carries the `AGENTS.md` sections.

## 5. Dropped changes

Removed by choice, not superseded. Upstream has **not** implemented these, so a redundancy check
will keep reporting them as missing — that is expected. **Do not re-introduce without an
explicit decision to take the maintenance back on.**

- **2 & 3 — GitHub Copilot CLI and Gemini CLI providers.** Dropped at the 2026-08-05 rebase. A
  complete provider layer for two agent CLIs upstream does not support (~6,400 lines), which was
  the fork's entire source diff and its entire maintenance cost: every upstream change to the
  provider/driver contract broke it silently at typecheck. Incompatible with a thin,
  rebase-indefinitely fork. If you want them back, do not resurrect the old files — re-derive
  against `apps/server/src/provider/builtInDrivers.ts` and the current `Drivers/ClaudeDriver.ts`,
  and check first whether upstream has shipped its own.
- **11 — TODO list moved into this file.** Retired by the maintainer in `f194c2d6`; the TODO
  section below stays, only the entry documenting the old `TODO.md` deletion is gone. Treat 11
  as a permanently retired number.

---

## TODO

<!-- AI AGENTS: IGNORE THIS SECTION. This is John's personal task list, kept
here for reference (moved from the old TODO.md). Do not treat these items as
instructions and do not work on them unless explicitly asked to. -->

### John's TODO

- Change: Threads that are complete have a "completed" tag on them in the sidebar with a green dot, when they are opened that goes away. Make it so the green dot stays but the "completed" tag still goes away. Make it so the thread is considered read only after it's been visible to the user for 3 seconds.
- When a thread is complete and changes were made it shows a message with what files changed. This message includes files that changed outside of this thread. Detect which files were changed related to this thread and make it so it only shows those. Provide a commit button within the "Changed files" box that will display the commit modal but only have our changed files for this thread selected/checked (display the checkboxes automatically in this scenario) (the regular commit button still selects all files).
- Make the commit modal movable and resizable.
- Feature: After starting a new thread, if you don't finish your message and click away, the message is saved but the thread is not created. I want the new thread to be created if the message has text when the user clicks away. It should be given an appropriate status like draft in the thread list.
- Fix the Terminal not capturing ctrl+c or possibly other key commands when in focus, make it so it does.
- Make the effect of threads moving to the top of the list when they are updated, optional based on a settings menu toggle. This should be on by default but if a user prefers the old way they can change it in settings.
