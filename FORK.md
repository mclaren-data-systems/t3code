# Fork notes (mclaren-data-systems/t3code)

## 1. Purpose

`mclaren-data-systems/t3code` is a development fork of `pingdotgg/t3code` that is rebased onto
upstream `main` indefinitely: upstream is the source of truth, and every change listed in section 3
is provisional and gets dropped, not defended, once upstream ships an equivalent. The layer it
carries is deliberately thin — a CI/workflow set a fork can actually run (standard GitHub-hosted
runners, no credential beyond `GITHUB_TOKEN`, unsigned desktop builds published as pruned
prereleases), fork identity (this file, the `README.md` banner, the `AGENTS.md` policy sections,
no update checking, a sidebar link to this repo, a workflow that moves branches for agents that
may not force-push), and a
few product changes for people driving several provider accounts all day (per-instance usage, the
resolved Claude config directory, subscription room in the model picker) plus three web UX fixes.
**When rebasing, work from each entry's intent, not its old diff:** run the drop-check first; if
upstream now covers the intent, move the entry to section 4, otherwise re-derive it against current
upstream code. Sync by rebase, never merge, so `git diff upstream/main main` is the whole fork.
Land the rebased tip through entry 24 (`land/main/<old main sha>`), never by force-pushing.

Upstream: <https://github.com/pingdotgg/t3code>, tracking `main`.

## 2. Last rebase

**2026-11-13**, onto `pingdotgg/t3code` `main` at **`ab9e6a2792`** — _fix(web): closing Settings no
longer leaves it as a back/forward stop (#36437)_. Took in **2,829** upstream commits
(`dd14848153..ab9e6a2792`). The previous `main` (`1a0bf610c3`) is backed up at
`origin/rebase-backup-2026-11-13`, and `land.yml` also copies it to `backup/main-pre-rebase`.
Landed through entry 24 by the scheduled routine. The 2026-10-29 rebase was landed by the
maintainer by hand, because the routine's own force-push was refused (the reason entry 24 exists).

- **Replayed:** all 12 fork commits (entries 5, 6, 12, 13, 14, 15, 18, 19, 20, 22, 23, 24; 23 is
  two commits, the maintainer's prune kept as its own). 24's follow-up fix is folded into it.
- **Superseded:** 15 (message) — upstream's `claudeSignedOutMessage` now reaches the status probe
  and names `CLAUDE_CONFIG_DIR` for an instance's own home and an inherited value (#32951); the
  fork's message is dropped, the snapshot field and settings row stay.
- **Re-derived:** 15 — `resolveClaudeConfigDirPath` stays in `ClaudeSkills.ts` (exported) because
  upstream's `ClaudeHome.ts` now imports from `ClaudeSkills.ts`, and moving it would make a cycle.
  18 — upstream reworked the click rule around open (unarchived) projects (#26154) and dropped the
  boring sidebar special case, so `resolveNewThreadClickTarget` delegates to upstream's exported
  `shouldCreateNewThreadInCurrentProject` and keeps upstream's fall-back to the picker. 19 — threads
  the instance through upstream's refreshing and in-memory scan paths (#33993), keeps upstream's
  shared `usageSourceMessages`, and ranks the per-instance summary rows by the chosen metric
  (`rankSeriesByMetric`, mirroring upstream's `rankProvidersByMetric`); upstream removed the Cursor
  enable rows, so the fork's interleaving of them is gone on web and mobile. 5 — the button is not
  offered in an embedded side chat, which mounts no details panel.
- **Entry 14:** `ci.yml` re-derived (upstream now restricts apt components in its Blacksmith mirror
  `sed`, which is dropped whole, and added two script tests to the release-checks step, which stays
  deleted); 22 modify/delete files re-deleted; the new `issue-vouch.yml`, `pr-limits.yml` (community
  triage; `issue-vouch` reads the deleted `VOUCHED.td`), `mobile-dev-client.yml` and
  `mobile-eas-preview-fork.yml` (Blacksmith and credentials) deleted. `CONTRIBUTING.md` now cites
  `VOUCHED.td` in its PR-limit rules; the link is unlinked rather than the rule removed.
  `desktop-artifacts.yml` gained upstream's Rosetta step for macOS x64 (#29484) and the Electron
  runtime libraries on Linux (#33050), both needed to generate server bytecode.
- **Verification:** Node 26.12.1 and pnpm 12.14.0, `pnpm install --frozen-lockfile` clean;
  `vp run typecheck` 0 errors in contracts, shared, provider-core, client-runtime, server, web and
  mobile; `vp lint` clean over all fork-changed sources; `vp fmt --check` clean except
  `.claude/settings.json` (see entry 23); `knip:check` clean; tests pass for server registry and
  usage (138, 1 upstream skip), shared usage (37), provider-core (266), mobile usage (7), web unit
  files for sidebar logic, session logic, ui state, subscription usage and the usage folder (206),
  and the Sidebar, Sidebar logic, ThreadDetailsCard, ThreadDetailsPanel, ThreadVisitWatermark,
  ProviderInstanceCard and usage browser suites (72) in headless Chromium. Nothing was checked by
  hand in a browser.
- **Undocumented changes:** none. Every file the fork touched maps to an entry in section 3.
- **Flagged:** the `ci.yml` `lint` job fails `vp check` on `.claude/settings.json` (entry 23),
  the same as on the previous `main`.

## 3. Fork changes

Numbers are **durable identifiers** and are never reused. Gaps are in section 4 (superseded) or 5
(dropped).

### 5. Commit exactly the files a turn changed

- **Intent.** Committing a thread's work should not require unchecking every unrelated dirty file.
  The turn's "Changed files" card gets a **Commit** button that opens the commit dialog with only
  that turn's files checked; the regular commit button still selects all.
- **Files:** `apps/web/src/session-logic.ts` (+ test), `components/ChatView.tsx`,
  `components/GitActionsControl.tsx`,
  `components/chat/{ChangedFilesTree,MessagesTimeline,TimelineAssistantRows,ThreadDetailsPanel}.tsx`,
  `components/chat/timelineRowContext.ts`
- **How.** The file list is the turn's checkpoint, the same one upstream's
  `AssistantChangedFilesSection` renders. `ChatView` holds a `GitCommitPreselection`
  (`{ filePaths, requestId }`) that flows through `ThreadDetailsPanel` into `GitActionsControl`,
  where an effect waits for git status, seeds `excludedFiles`, opens the dialog and reports the
  request consumed so a remount never replays it. The button also opens the details panel, and the
  panel mounts `GitActionsControl` while a preselection is pending even if the user hid both git
  rows (#26904). The button is offered only when the card holds the full list: upstream caps
  checkpoints over 200 files on the wire (#27110), and a prefix would commit a partial set.
  `deriveCommitExcludedFilePaths` does the checkpoint-vs-git-status path matching.
- **Drop-check:** `grep -rn "onCommitTurnFiles\|Preselection" apps/web/src` on clean upstream.

### 6. Keep the completed dot until the thread is actually read

- **Intent.** Opening a thread, or a visit bump that is not a read (dismissing a Woke notice,
  archiving), cleared its green completed dot, so it was easy to lose track of which completions
  had been looked at. The dot now stays until the completion is acknowledged by viewing the thread.
- **Files:** `apps/web/src/uiStateStore.ts` (+ test), `components/Sidebar.logic.ts` (+ test),
  `components/sidebar/SidebarThreadRow.tsx`, `components/ThreadStatusIndicators.tsx`,
  `components/chat/ThreadVisitWatermark.tsx`
- **How.** A `threadLastCompletionAcknowledgedAtById` field mirrors everything upstream does for
  `threadLastVisitedAtById`, reaches `hasUnseenCompletion` through `ThreadStatusInput`, and falls
  back to upstream's `resolveThreadLastVisitedAt`. `ThreadVisitWatermark` mounts a
  `threadCompletionAcknowledger` atom beside upstream's `createThreadVisitTracker`, shaped like it
  (no React effect). Known limit: the acknowledgement is browser-local. The maintainer's
  "read after ~3s visible" refinement is still open; this field is the seam for it.
- **Drop-check:** `grep -c AcknowledgedAt apps/web/src/uiStateStore.ts` on clean upstream.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents must know `origin` is the fork and the only write target, `upstream` is
  fetch-only, and the fork's `README.md` banner and this file win merge conflicts.
- **How.** Take upstream's `AGENTS.md` and keep the two fork sections before `## What makes T3 Code
  special?`. `CLAUDE.md` stays upstream's `@AGENTS.md` file (see 12 (symlink) in section 4).

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on the repo sees it is a rebasing fork and where the change list lives.
- **How.** The banner sits between `<!-- FORK-BANNER:START -->` / `<!-- FORK-BANNER:END -->` above
  `# T3 Code`. Re-derive its text from section 3 every rebase (never merge it) and refresh its
  rebase marker.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it runs on **standard GitHub-hosted
  runners** (upstream's `blacksmith-*` labels never resolve) and needs **no credential beyond
  `GITHUB_TOKEN`**, and only if the fork needs it to build or check code quality. Prefer
  GitHub-native actions. Everything else is deleted, not disabled.
- **Fork-owned:** `desktop-artifacts.yml` (below) and `land.yml` (entry 24, the one workflow
  allowed a credential beyond `GITHUB_TOKEN`).
- **Kept:** `ci.yml` with every runner on `ubuntu-24.04`, minus the Blacksmith-only
  `setup-apt-mirrors` step and mirror `sed` line (`build`, `test`), the two script-test steps for
  deleted release/preview workflows, and the `mobile_native_static_analysis` (macOS Blacksmith) and
  `release_smoke` (reads the deleted `release.yml`) jobs with their `check` needs. Upstream's
  `changes` gate, `setup-ci-deps` action (its maintainer task-cache step self-skips outside
  `pingdotgg/t3code`), sharded `test_server`, and `lint` running `knip:check` and `vp check` stay
  as written. `issue-labels.yml` and `thread-transfer-report.yml` unmodified (the latter reads the
  `thread-transfer-results` artifact from `test_server`).
- **Added:** `desktop-artifacts.yml` — macOS arm64/x64 DMG, Linux x64 AppImage and Windows x64
  NSIS, **unsigned**, on every push to `main` and on dispatch, published as a `desktop-dev-<run>`
  prerelease with older `desktop-dev-*` releases pruned to the current one plus two (that
  publish-and-prune tail is intent). It carries the secret-free parts of upstream's
  `release-desktop.yml` build job (Rust toolchain per target, Rosetta for macOS x64, Spectre MSVC
  libs, Linux `libsecret-1-dev pkg-config` plus the Electron runtime libraries server bytecode
  generation runs), never passes `--signed` or `--skip-build`, and ships Windows
  without the WSL runtime archive (revisit via `scripts/build-cli-archive.ts`, not node-pty).
- **Deleted:** `release`, `release-desktop`, `deploy-relay`, `relay-preview`,
  `relay-preview-cleanup`, `mobile-eas-preview`, `mobile-eas-production`, `mobile-android-apk`,
  `mobile-showcase-screenshots`, `web-preview`, `publish-aur`, `cursor-hygiene-webhook`,
  `desktop-macos-preview-publish` (credentials and/or Blacksmith); `windows-tests`,
  `desktop-macos-preview` (Blacksmith); `agent-context-budget` (PR-policy gate;
  `AgentContextBudget.test.ts` already pins the budget), `mobile-fingerprint-check` and
  `mobile-fingerprint-label` (store-build OTA labelling this fork does not do), `mobile-dev-client`
  and `mobile-eas-preview-fork` (Blacksmith and credentials); `pr-vouch` + `.github/VOUCHED.td`,
  `issue-vouch`, `pr-size`, `pr-limits`, `stale-needs-more-info` (upstream community triage). Also
  `.github/scripts/mirror-play-apk.cjs`, `scripts/smoke-cli-archive.ts` and
  `scripts/notify-discord-release.ts` (+ test), which only deleted workflows ran and which knip or
  their own tests fail on here. `knip.jsonc` lists `build-cli-archive.ts` and
  `resolve-nightly-release.ts` as entries for the same reason. Fork notes in
  `docs/operations/{release,mobile-app-store-screenshots,development}.md`, `infra/relay/README.md`,
  `packaging/aur/README.md` and `CONTRIBUTING.md` explain what no longer runs.
- **Re-apply.** Re-derive from upstream's new workflow files and apply the rule; a new upstream
  workflow is opt-in. `desktop-artifacts.yml` can drift from upstream's desktop build without a
  conflict: diff it against `release-desktop.yml`'s build job and `scripts/build-desktop-artifact.ts`
  flags every sync. `vp check` in `lint` turns an upstream format break red here too; repair in
  place until upstream fixes it.

### 15. A logged-out Claude instance shows the directory it resolved

- **Intent.** When a Claude instance is not logged in, show **where** Claude Code looked. A second
  instance is usually logged out because its home resolved somewhere other than where the user
  logged in (PowerShell's unexpanded `~`, a relative path, an inherited `CLAUDE_CONFIG_DIR`).
  Upstream's message now names the directory except for the default `~/.claude`; the settings row
  shows the resolved path for every instance, and whether a credentials file sits there.
- **Files:** `packages/contracts/src/server.ts` (optional `ServerProvider.configDirectory`),
  `packages/provider-core/src/server/snapshotProbe.ts`,
  `apps/server/src/provider/providerStatusCache.ts`, `provider/Drivers/ClaudeHome.ts`
  (`resolveClaudeConfigDirectory`), `provider/Drivers/ClaudeSkills.ts` (exports upstream's
  `resolveClaudeConfigDirPath`),
  `provider/ClaudeProvider.ts`, `apps/web/src/components/settings/ProviderInstanceCard.tsx`, two
  tests in `provider/ProviderRegistry.test.ts`, `docs/user/providers-claude.md`
- **How.** Additive on upstream's `claudeAuthStatus`: `configDirectory`
  (`{ path, credentialsFound }`) is reported on every Claude outcome, and the card shows a
  "Resolved config directory" row (a warning once auth has failed). The unauthenticated message is
  upstream's (see 15 (message) in section 4). `resolveClaudeConfigDirPath` stays the one resolver
  for skills discovery, settings env and the probe; it stays in `ClaudeSkills.ts` because
  `ClaudeHome.ts` imports from there — never fork its body.
- **Drop-check:** `grep -c configDirectory packages/contracts/src/server.ts` on clean upstream.

### 18. The sidebar new thread button creates in the scoped project

- **Intent.** With the sidebar filtered to one project, the new thread button should create there
  instead of opening the project picker; its tooltip names the target. Otherwise behaviour is
  upstream's.
- **Files:** `apps/web/src/components/Sidebar.tsx`, `components/Sidebar.logic.ts` (+ test),
  `components/sidebar/SidebarThreadHeader.tsx` (one optional `newThreadLabel` prop),
  `docs/user/thread-sidebar.md`
- **How.** `resolveNewThreadClickTarget` (pure, tested) returns `"scoped-project" |
  "current-project" | "picker"`; a scope of **exactly one** project wins, else upstream's exported
  `shouldCreateNewThreadInCurrentProject` decides (shift, one open project or none creates in the
  current project, falling back to the picker when there is none; several open the picker).
  Upstream's scope is multi-select since #25284, so two or more scoped projects fall back to that
  rule. The target resolves through
  `buildSidebarProjectPickerEntries` (the picker's own builder) so grouped checkouts land on the
  same member. The scoped tooltip drops the shortcut (`chat.new` is not scope-aware) and hides the
  shift+click hint.
- **Drop-check:** upstream's `handleNewThreadClick` in `Sidebar.tsx` consults
  `scopedProjectGroups`.

### 19. Usage reports each provider instance separately

- **Intent.** A work and a personal Claude Code collapsed into one usage row, so the question a
  second account exists to answer was unanswerable. The usage report's unit is the provider
  instance: one line, row and column per instance that spent anything, under its configured name
  and accent color.
- **Files:** `packages/contracts/src/usage.ts`, `packages/shared/src/{usageMerge,usageFormat}.ts`
  (+ tests), `packages/provider-core/src/server/usage.ts`, `apps/server/src/usage/UsageService.ts`
  (+ test), `apps/server/src/provider/Drivers/AntigravityUsage.ts`,
  `apps/web/src/components/usage/*` (+ tests), `apps/mobile/src/features/usage/*`,
  `docs/user/usage.md`
- **How.** Additive and layered on upstream's merge: `UsageSource` gains optional `instanceId`,
  `displayName`, `accentColor` (buckets reach their instance through upstream's `sourcePath`); the
  server stamps them where upstream already walks instances. **Never bump
  `USAGE_CONTRACT_VERSION`** — upstream owns it. Sources without an instance fall to the provider's
  default instance via `USAGE_PROVIDER_DRIVERS`, which needs a row whenever `UsageProviderKind`
  grows (a build break). `mergeUsage` keeps `providers`/`byProvider` and adds `instances`,
  `byInstance` and per-instance model rows; series are keyed by instance id alone. Colors: a
  configured accent wins, else the brand color then the provider's shade ramp by a stable
  `shadeIndex`. Summary rows rank by the chosen metric (`rankSeriesByMetric`, the per-instance
  twin of upstream's `rankProvidersByMetric`). The model dialog stays per provider.
- **Drop-check:** `grep -c instanceId packages/contracts/src/usage.ts` on clean upstream.

### 20. No update checking, and a sidebar link to this fork with build provenance

- **Intent.** Fork builds identify as the fork and never offer updates (no signed releases here, so
  the inherited feed could only error or offer upstream's builds). The sidebar's GitHub link
  tooltip shows which build is running.
- **Files:** `.github/workflows/desktop-artifacts.yml`, `apps/web/vite.config.ts`,
  `apps/web/src/vite-env.d.ts`, `apps/web/src/branding.ts`,
  `apps/web/src/components/sidebar/SidebarChrome.tsx`
- **How.** The workflow sets `T3CODE_DESKTOP_UPDATE_REPOSITORY: fork-updates-disabled`, a
  single-segment value `resolveGitHubPublishConfig` rejects, so no `app-update.yml` is written and
  the app lands in its "no update feed" state — the disable lives at the feed, not in
  `DesktopUpdates.ts`. The footer link (GitHub mark, destructive color, `target="_blank"`) shows
  `BUILD_COMMIT` / `BUILD_TIMESTAMP` Vite defines.
- **Re-check every rebase:** upstream renaming that env or reworking `resolveGitHubPublishConfig`
  breaks the disable silently; a reworked sidebar footer needs the link re-seated.

### 22. Subscription allowances in the model picker

- **Intent.** Someone driving several subscriptions should see which one has room left **at the
  moment of choosing a provider**, not on a separate page or after a refused turn.
- **Files:**
  `apps/web/src/components/chat/{SubscriptionUsage.logic.ts (+ test),SubscriptionUsageMeters.tsx,ModelPickerContent.tsx}`,
  `docs/user/composer.md`
- **How.** Web-only, reads upstream's `ServerProvider.usageLimits` for the instance the picker rail
  has selected. Stored as used, rendered as "N% left"; aged against `Date.now()` once per open
  (never a ticking clock); an `unavailable` snapshot renders nothing; reset countdowns use
  upstream's `formatResetsIn`.
- **Drop-check:** `grep -c usageLimits apps/web/src/components/chat/ModelPickerContent.tsx` on
  clean upstream.

### 23. Agent permissions for the scheduled rebase

- **Intent.** The unattended Claude Code routine that performs this rebase should not stop at a
  permission prompt for the pushes it needs.
- **Files:** `.claude/settings.json` (fork-only; upstream has none). On conflict, merge upstream's
  keys and keep the fork's `allow` rules.
- **Note.** The `--force-with-lease=main:*` rule did not get past the cloud auto-mode classifier,
  which refuses force-pushes to `main` as destructive regardless of allow rules; entry 24 replaced
  it, and the maintainer pruned both rules (`1a0bf610c3`), so `allow` is empty and the entry is
  currently a no-op. That edit left whitespace `vp fmt --check` rejects, which turns `ci.yml`'s
  `lint` job red. Agents may not edit this file themselves (refused as self-modification), so the
  fix (format it, or delete the entry) is a maintainer edit.

### 24. A workflow that moves branches for agents

- **Intent.** Anything a cloud agent session is not permitted to do to a branch — above all
  landing the rebased `main` — happens fully automatically and safely without a human: the agent
  only pushes a new branch, and a workflow does the rewrite.
- **Files:** `.github/workflows/land.yml`, the fork policy bullet in `AGENTS.md` (entry 12)
- **How.** An agent pushes the new tip as `land/<branch>/<full sha the branch points at now>`.
  The workflow runs on that push, and in one atomic push moves `<branch>` with a lease on that sha,
  deletes the request branch, and for `main` also overwrites `backup/main-pre-rebase` with the old
  tip after checking the new tip contains the upstream commit the old `main` was based on. A stale
  lease or failed check leaves everything untouched and the request branch in place. It
  authenticates with the `FORK_LANDING_TOKEN` secret (fine-grained, this repository only,
  Contents and Workflows read/write): `GITHUB_TOKEN` cannot push commits that change
  `.github/workflows/`, which every rebase does, and its pushes would not start CI or desktop
  builds on the landed `main`. Branch protection on `main`, if any, must let that token's owner
  force-push.
- **Drop-check:** none; fork tooling. Revisit if cloud sessions are ever allowed to force-push.

## 4. Superseded changes

Implemented upstream; **do not re-introduce**.

| #            | Fork change                              | Superseded by                                                                                   |
| ------------ | ---------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1            | Windows build without shell mode         | `edb1240` — every spawn in `build-desktop-artifact.ts` goes through `resolveSpawnCommand`       |
| 4            | Terminal Ctrl-chord forwarding           | `acf761b2` (#4860) — libghostty-vt encodes every unclaimed key; the fork block would be harmful |
| 5 (core)     | Thread-scoped changed files              | upstream's per-turn `AssistantChangedFilesSection` checkpoints                                  |
| 7            | Shell-style composer recall              | `fd773172` (#9173) — up-arrow prompt recall                                                     |
| 8            | Full timestamp on hover                  | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`                               |
| 9            | Always-visible new-thread button         | `0de95407` (#5672) — sidebar v2 default                                                         |
| 10           | Package-local vitest configs             | the `vp` (vite-plus) test-runner migration                                                      |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md`        | `4cb676cc` (#7171) — `CLAUDE.md` is a regular `@AGENTS.md` file; never restore the symlink      |
| 14 (repair)  | `pnpm-workspace.yaml` placeholder fix    | `803f94e78` (#12544)                                                                            |
| 15 (banner)  | Status banner prefers the server message | `06336460` (#9348) — `getProviderStatusMessage`                                                 |
| 15 (auth)    | Logged-out Claude CLI is unauthenticated | `563645cf6e` (#15459) — `claudeAuthStatus`                                                      |
| 15 (message) | Sign-in message names the directory      | `feb9c6b842` (#32951) — `claudeSignedOutMessage` names `CLAUDE_CONFIG_DIR` in the status probe  |
| 16           | Usage scans every provider instance      | `2db675ae` (#11485) — per-instance homes in `UsageService.ts`                                   |
| 17           | Configurable worktree branch prefix      | `de3439142` (#2829) — `branchNamingMode` / `branchNamePrefix` settings                          |
| 18 (layout)  | Labelled new-thread button under scope   | `d1d15c67` (#11315) — scope folded into the search row                                          |
| 19 (owner)   | Usage ownership resolved per instance    | `e5a46d6c5` (#10409) — ownership per `(provider, sourcePath)`                                   |
| 21           | New project inside the scope menu        | `d1d15c67` (#11315)                                                                             |
| 22 (server)  | Subscription usage collection            | `19d8ab2a` (#9507) — `ServerProvider.usageLimits` and the Limits view                           |
| 22 (bubble)  | Subscription rows in the context bubble  | `310c1285` (#26859) — **Labs → Usage in thread details** shows limits and context together      |

## 5. Dropped changes

Removed by choice; upstream has **not** implemented them. Do not re-introduce without an explicit
decision.

- **2 & 3 — GitHub Copilot CLI and Gemini CLI providers.** ~6,400 lines that broke on every
  upstream driver-contract change. If wanted back, re-derive against `builtInDrivers.ts` and the
  current `ClaudeDriver.ts`.
- **11 — TODO list moved into this file.** Retired number.

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
