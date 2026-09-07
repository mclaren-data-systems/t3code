# Fork notes (mclaren-data-systems/t3code)

## 1. Purpose

This is a development fork of `pingdotgg/t3code` maintained at `mclaren-data-systems/t3code`, and
it is not a hard fork: upstream is the source of truth, `main` here is rebased onto it
indefinitely, and every entry in section 3 is provisional — when upstream ships an equivalent, the
fork change is dropped rather than defended. The layer it carries is deliberately thin. Its one
substantive piece of infrastructure is **a CI/workflow set a fork can actually run** (standard
GitHub-hosted runners instead of upstream's Blacksmith ones, nothing needing a credential a fork
lacks, unsigned desktop artifacts published as pruned development prereleases). Around that sit
fork identity (this file, the `README.md` banner, the `AGENTS.md` policy sections, no update
checking, a sidebar link to this repo) and a handful of source changes: multi-instance provider
support (15, 16, 19), a configurable worktree branch prefix (17), upstream's provider subscription
limits surfaced in the model picker and context bubble (22, web-only), and four web UX changes
(5, 6, 18, 21). Everything else is byte-identical to upstream — `native/`, `scripts/`,
`apps/desktop/`, `packages/client-runtime/` (one test fixture aside), `apps/server/src/persistence/`,
`pnpm-lock.yaml` and `pnpm-workspace.yaml` are untouched, and the only edits under `infra/` and
`packaging/` are the entry 14 notes explaining which workflow no longer runs them. Mobile carries
entry 19's usage screens and nothing else.

This file is the authoritative list of what sets this fork apart, and it is written to be used when
rebasing. **Work from intent, not from the old diff.** For each numbered entry: run the drop-check
first, and if upstream now covers the intent, move the entry to section 4; otherwise re-derive the
intent against current upstream code, taking upstream's version of anything that moved.

## 2. Last rebase

> **2026-09-07**, onto `pingdotgg/t3code` `main` at **`5b0c923e`** —
> _feat(web): name the drop action while dragging sidebar threads (#10378)_. Took in **353 upstream
> commits** (`cbe93e8d..5b0c923e`). The previous tip `e6c901ef` — a GitHub-UI merge of upstream
> `cbe93e8d` into the fork's last rebased tip `29200e45` — is backed up at
> `origin/backup/main-pre-rebase-2026-09-07`; `main` was then force-pushed to the rebased tip.
>
> **History was re-cut, not replayed.** The fork's 33 historical commits re-conflicted on every
> entry several times over (each later fork commit re-derived an earlier one), so instead the
> fork's _net_ diff against the merge-base was 3-way merged onto upstream once and the result was
> split into **one commit per entry** (entries sharing a file — 18 with 21 — share a commit). From
> here on a rebase conflicts at most once per entry, and `git log upstream/main..main` reads as
> this section 3 does. Keep it that way: when an entry changes, amend its commit at the next rebase
> rather than stacking fix-ups.
>
> **One supersession: entry 7.** Upstream's `fd773172` (#9173) recalls sent prompts with `ArrowUp`
> in an empty composer, walking the prompts loaded in the thread. That is the intent, so the fork's
> `threadMessageHistory.ts`, its store and test, and the composer hunk are gone. Differences worth
> knowing, none worth carrying: upstream recalls only from an _empty_ composer (the fork also
> stepped from a non-empty draft when the caret sat on the first line) and does not persist a
> history across reloads (the fork kept 100 per thread in local storage). Every other drop-check
> comes back **0**.
>
> **Entry 14: `ci.yml` moved under the fork; three upstream additions, one kept.** Kept: the
> `vp run knip:check` step (`d2c3e2e5` #9962, `cd92a7e7` #10012) — a real quality gate on a
> standard runner, and it caught one fork export (below). Dropped: the `setup-apt-mirrors`
> composite action and the `sed` over `/etc/apt/blacksmith-ubuntu-mirrors.txt` (`4ade3651` #9864)
> — both name Blacksmith-image paths that do not exist on `ubuntu-24.04`, where the `sed` would
> fail the step; the plain `apt-get` line stays. Dropped: the `node --test
.github/scripts/check-nightly-release.test.cjs` step (`7544d3d2` #10272) — it tests the nightly
> release scheduler for `release.yml`, which this fork deletes; the two `.github/scripts/*.cjs`
> files themselves stay byte-identical to upstream. No new upstream workflows this range.
> `release.yml`'s build job changed the Spectre MSVC component id
> (`VC.Tools.x86.x64.Spectre` → `VC.Runtimes.x86.x64.Spectre`); **ported** into
> `desktop-artifacts.yml`. Upstream deleted `docs/internals/ci.md` (`2e688a53` #9755), so the
> fork's note there is gone with it; `docs/operations/release.md` still carries the entry 14 note.
>
> **Seventeen conflicts, two of them re-derivations:**
>
> - `ClaudeProvider.ts` — upstream (`98a29cba` #9784) restructured the capabilities probe so the
>   usage round-trip runs under its own `Effect.timeout` after initialization. That is exactly the
>   watch item recorded under 22 (server) in section 4; it is closed. Entry 15 now adds only
>   `apiKeySource` to the account read.
> - `UsageService.ts` — upstream (`394e8470` #9774, custom model prices) reads settings once in
>   `readSummary` and passes them down. Entry 16's `resolveTranscriptDirs(settings)` takes that
>   parameter and hands it to `resolveUsageTranscriptSources`; the nested `.claude/projects` probe
>   already lived in `usageTranscriptSources.ts`, so `UsageService.ts` lost its copy.
> - `ClaudeHome.ts` — union: upstream's `quotePath` beside the fork's credentials-file constant.
> - `UsageRouteScreen.tsx` (mobile) — upstream (`24aef0e6` #9775, `ac90950f`, `b155c219` #10334)
>   split the screen into Usage/Limits tabs with a pooled limits section. Entry 19's `series` prop
>   was threaded into upstream's new layout for `ChartCard`, `ProviderSection` and `ModelsSection`;
>   the fork's own `MetricToggle` went, upstream's segmented control does the job.
> - `UsagePage.tsx`, `UsageProviderChart.tsx`, `UsageProviderChart.test.ts` — upstream renamed
>   `buildDayColumns` to `buildPeriodColumns` (`487d1766` #9993) and added price overrides and
>   remembered preferences; entry 19's series argument moved onto the new name.
> - `ChatView.tsx`, `MessagesTimeline.tsx` — upstream replaced the per-message revert map with
>   `onRevertToTurnCount`; entry 5's `onCommitTurnFiles` prop sits beside it.
> - `ThreadStatusIndicators.tsx` — upstream simplified the PR lookup; entry 6's
>   `completionAcknowledgedAt` read was re-added on top.
> - `Sidebar.tsx` — **2,104 changed lines upstream** (drag-and-drop reorder, settled threads, drop
>   verbs). Import lists and the `handleNewProjectFromScopeMenu` / `scopedNewThreadProjectRef`
>   blocks conflicted on placement only; the header JSX replayed clean.
> - `session-logic.test.ts` — import list only.
> - The five user docs — upstream rewrote `docs/user/` top to bottom (`9e1fb459` #9756). Each
>   fork paragraph was **re-written into the new structure** rather than merged: entry 22 as a
>   `## Subscription usage` section in `composer.md`, entry 17 as `## Name branches your way` in
>   `source-control.md`, entries 18 + 21 as a paragraph under `## Start a thread` in
>   `thread-sidebar.md`, entry 19 as a paragraph under `## Understand your usage` in `usage.md`,
>   and entry 15's "Not authenticated" / PowerShell `~` guidance folded into
>   `## Separate accounts or configurations` in `providers-claude.md`.
> - `.github/workflows/release.yml`, `docs/internals/ci.md` — modify/delete, both resolved as
>   delete (entry 14; upstream's own deletion).
>
> **Five ports no merge conflict would have surfaced** (typecheck and knip found them):
>
> - Entry 19: upstream's new `packages/client-runtime/src/state/serverUsage.test.ts` and
>   `apps/web/src/state/usage.test.tsx` fixtures (`394e8470`, `7ee52b07`) build `UsageBucket`s
>   and `UsageSource`s without the fork's `instanceId` / `displayName` / `accentColor`; added.
> - Entry 19: upstream's `UsageLimitsPooled.tsx` and `UsageLimitsSection.tsx` on mobile import
>   `useProviderColors` from `usageProviders.ts`, which the fork's ramp replaced. Re-exported as
>   the head of each ramp (the same `colors[0]` port the web side took last rebase).
> - Entry 19: one `buildDayColumns` call outside the conflict hunks in
>   `UsageProviderChart.test.ts`.
> - Entry 15: the merge left `ProviderRegistry.test.ts` with two `Path` imports.
> - Entry 5: `normalizeWorkspaceRelativeFilePath` was exported from `session-logic.ts` but only used
>   there; knip rejects that now, so it is module-private.
>
> **Verification.** Node **24.13.1** was fetched as a tarball and put on `PATH` (`package.json`
> pins `engines.node: ^24.13.1`; the container ships 22). `pnpm install --frozen-lockfile` clean,
> no lockfile drift. `tsgo --noEmit` clean in every package including `apps/server` (note:
> `vp run -r typecheck` skips the `t3` server package — run it directly). `vp lint` over the fork's
> changed files: **0 errors**, warnings only, all pre-existing patterns. `vp fmt --check` passes.
> `vp run knip:check` passes. The 18 fork-touched test files: **689 passed, 1 failed** — the
> `server.test.ts` case _"reports workspace root stat failures without relabeling them as
> missing"_, which `chmod 0o000`s a directory and expects the stat to fail; it cannot fail as uid 0
> and the rebase container runs as root. Same environment artifact as every rebase since
> 2026-08-28, not a regression. Nothing was checked in a browser: the re-derived mobile usage
> screen (entry 19) and the re-written doc sections want one look.
>
> Keep syncing by rebase, not merge — a merge commit makes "what does this fork carry?" a graph
> question instead of a `git diff upstream/main HEAD` one. (The `e6c901ef` merge this rebase
> replaced is what that looks like.)

## 3. Fork changes

> Entry numbers are **stable identifiers** and are never renumbered. A gap means the entry moved to
> section 4 or 5. Numbers 1, 4, 7, 8, 9, 10, the symlink half of 12, the banner half of 15 and the
> server half of 22 are superseded; 2, 3 and 11 are dropped.

### 5. Commit exactly the files a turn changed

- **Intent.** Committing a thread's work should not require hand-unchecking every unrelated dirty
  file. The completion "Changed files" card gets a **Commit** button beside "Open diff" that opens
  the commit modal with only this turn's files checked; the regular commit button still selects all.
- **Files:** `apps/web/src/session-logic.ts` (+ test), `components/ChatView.tsx`,
  `components/GitActionsControl.tsx`,
  `components/chat/{ChangedFilesTree,ChatHeader,MessagesTimeline}.tsx`
- **Re-apply.** The file list is the turn's checkpoint `TurnDiffSummary` — the same one upstream's
  `AssistantChangedFilesSection` renders — so nothing re-derives per-turn attribution.
  `ChangedFilesCard` takes an optional `onCommitTurnFiles`; `ChatView` holds a
  `GitCommitPreselection` (`{ filePaths, requestId }`) that flows through `ChatHeader` into
  `GitActionsControl`, where an effect keyed on `requestId` seeds `excludedFiles`, turns on the
  checkbox list and opens the dialog. `deriveCommitExcludedFilePaths` (exported, tested) and
  `normalizeWorkspaceRelativeFilePath` (module-private — knip rejects an export with no importer)
  do the checkpoint-vs-git-status path matching (separators, `./` prefixes, case). Expect the
  `GitActionsControl` wiring to need adapting whenever upstream reworks that dialog.
- **Drop it when:** upstream's commit dialog can be opened with a preselected file set. Check with
  `grep -rn "onCommitTurnFiles\|Preselection" apps/web/src` against clean upstream.
- **Checked at `5b0c923e`: keep.** Drop-check empty. Upstream replaced the per-message revert map
  in `ChatView` / `MessagesTimeline` with `onRevertToTurnCount`; the `onCommitTurnFiles` prop was
  re-seated beside it.
- **Browser-only:** the button-to-dialog flow. Unit tests cover path matching only.

### 6. Keep the completed dot until the thread is actually read

- **Intent.** Opening a thread instantly cleared its green completed dot, so it was easy to lose
  track of which completed threads had been looked at. The dot now survives until the completion is
  acknowledged by viewing the thread, and wake-driven visit bumps do not clear it.
- **Files:** `apps/web/src/uiStateStore.ts` (+ test), `components/Sidebar.logic.ts` (+ test),
  `components/Sidebar.tsx`, `components/ThreadStatusIndicators.tsx`, `components/ChatView.tsx`
- **Re-apply.** Anchor on the persisted-UI-state shape: mirror everything done for
  `threadLastVisitedAtById` (initial state, hydrate seed, persist, mark-unread reset) for a new
  `threadLastCompletionAcknowledgedAtById`. The acknowledged-at value reaches `hasUnseenCompletion`
  through `ThreadStatusInput` and its two call sites, **not** by patching the store read. `ChatView`
  stamps the acknowledgement on visit at the turn's `completedAt`. The maintainer's refinement —
  only mark read after ~3s of visibility — is still unimplemented; this field is the seam for it.
  `LegacySidebar.tsx` is opt-in and untouched.
- **Drop it when:** upstream's `uiStateStore.ts` tracks a completion acknowledgement. Check with
  `grep -c AcknowledgedAt apps/web/src/uiStateStore.ts` against clean upstream.
- **Checked at `5b0c923e`: keep.** Drop-check **0**. Upstream changed 37 lines of
  `uiStateStore.ts` this range without touching the visited-at shape; the
  `ThreadStatusIndicators.tsx` read was re-added after upstream simplified that component's PR
  lookup.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents working in this repo must know that `origin` is the fork and the only write
  target, that `upstream` is fetch-only, and that the fork's `README.md` banner and this file win
  merge conflicts.
- **Files:** `AGENTS.md` (two sections prepended to upstream's, after its intro and before
  `## What makes T3 Code special?`)
- **Re-apply.** Take upstream's `AGENTS.md` prose wholesale and re-insert the two fork sections.
  `CLAUDE.md` is **not** part of this entry — take upstream's regular file containing `@AGENTS.md`
  and do not restore the old symlink (see section 4).
- **Checked at `5b0c923e`: keep, clean replay.** Upstream edited `AGENTS.md` this range; the two
  fork sections merged without conflict.

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on this repo should see immediately that it is a rebasing fork and
  where the authoritative change list lives.
- **Files:** `README.md` (an "About this fork" blockquote before the `# T3 Code` heading), `FORK.md`
- **Re-apply.** The banner is delimited by `<!-- FORK-BANNER:START -->` / `<!-- FORK-BANNER:END -->`
  — **re-derive its text, never merge it**, since it goes stale every time an entry moves out of
  section 3. Refresh the rebase marker inside it too.
- **Checked at `5b0c923e`: keep, refreshed.** Rebase marker moved to `5b0c923e`; the UX list is
  down to four entries now that 7 is superseded.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it uses **standard GitHub-hosted runners**
  (upstream's `blacksmith-*` labels never resolve — jobs sat queued for 24h and were auto-cancelled)
  and needs **no credential beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted, not
  disabled. Beyond that, keep only the minimum the fork needs to build and to check code quality,
  and prefer GitHub-native actions.
- **Files:** `.github/workflows/{ci,desktop-artifacts}.yml`; deleted
  `.github/workflows/{release,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check,publish-aur,desktop-macos-preview,windows-tests,cursor-hygiene-webhook}.yml`
  and `.github/VOUCHED.td`; fork notes in `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; fallout in `CONTRIBUTING.md` and `infra/relay/scripts/deploy.test.ts`.
  Untouched and kept from upstream: `.github/actions/setup-apt-mirrors/`, `.github/scripts/`,
  `.github/SECURITY.md`.
- **Kept (3 upstream workflows).** `ci.yml` with every Blacksmith runner swapped to `ubuntu-24.04`
  (five jobs: `check`, `test`, `test_server`, `rust`, `release_smoke`), both mobile jobs dropped —
  the macOS-only `mobile_native_static_analysis` and the `mobile_native_changes` gate that exists
  only to decide whether it boots — and three Blacksmith-image steps dropped (below). The `check`
  job runs upstream's `vp run knip:check` **on purpose**: it is a quality gate and it catches fork
  exports nothing imports. `issue-labels.yml` and `thread-transfer-report.yml` unmodified; the
  latter publishes the thread-transfer budget diff from an artifact produced by the **sharded
  `test_server`** job, so dropping or renaming `test_server` would silently break it.
- **Added.** `desktop-artifacts.yml` — the four platforms upstream's `release.yml` matrix covers
  (macOS `arm64`/`x64` DMG, Linux `x64` AppImage, Windows `x64` NSIS), **unsigned**, on every push
  to `main` and on dispatch, uploaded as workflow artifacts and then published as a
  `desktop-dev-<run number>` **prerelease**, pruning older `desktop-dev-*` releases to the current
  one plus two. That publish-and-prune tail is fork intent, not an implementation detail — re-apply
  it even if the build job around it is rebuilt from scratch. The release job is the one place
  `GITHUB_TOKEN` is used (job-scoped `contents: write`). It carries over the three secret-free things
  that matter from upstream's build job: the `dtolnay/rust-toolchain` setup with a per-matrix
  `rust_target` (the desktop build cargo-builds `native/resource-monitor`), the Linux `node-pty`
  prebuild bundled into the Windows artifact (non-fatal when missing), and the Spectre-mitigated
  MSVC libs install (component `VC.Runtimes.x86.x64.Spectre` since this rebase), plus the Linux
  `libsecret-1-dev pkg-config` install its Chromium cookie-key reader needs. It never passes
  `--signed`, which is what would pull signing credentials into `scripts/build-desktop-artifact.ts`.
- **Deleted, and why.** Needing credentials and/or Blacksmith: `release.yml` (Cloudflare, Clerk,
  Apple, Azure, npm OIDC, a release GitHub App), `deploy-relay.yml`,
  `mobile-eas-{preview,production}.yml` (`EXPO_TOKEN`), `mobile-showcase-screenshots.yml`,
  `web-preview.yml` (Vercel tokens), `publish-aur.yml` (`AUR_SSH_PRIVATE_KEY`; it is a
  `workflow_call` target of the deleted `release.yml`, so nothing here would invoke it —
  `packaging/aur/` sources stay byte-identical and `packaging/aur/scripts/release.sh` still runs by
  hand), `cursor-hygiene-webhook.yml` (two `CURSOR_T3CODE_*` secrets), `windows-tests.yml`
  (`blacksmith-8vcpu-windows-2025`, manual-only, and by its own header nothing passes on Windows
  yet). Credential-free but not needed: `desktop-macos-preview.yml` (Blacksmith runners, and it
  duplicates artifacts `desktop-artifacts.yml` already ships) and `mobile-fingerprint-check.yml` (it
  labels PRs that would break OTA reach until the next store build, and this fork ships no store
  builds). Upstream community governance: `pr-vouch.yml` + `.github/VOUCHED.td` and `pr-size.yml`.
  Fallout: the release-workflow tracing-config guard in `infra/relay/scripts/deploy.test.ts` read
  `release.yml` off disk and was dropped with a restore note; `CONTRIBUTING.md` lost its `vouch:*` /
  `size:*` paragraph.
- **Blacksmith-image steps dropped from `ci.yml`.** `uses: ./.github/actions/setup-apt-mirrors`
  and the `sudo sed -i … /etc/apt/blacksmith-ubuntu-mirrors.txt` line (`4ade3651` #9864) both
  address files that exist only on Blacksmith's Ubuntu image; on `ubuntu-24.04` the `sed` errors
  on the missing file and fails the job. The plain `apt-get install libsecret-1-dev pkg-config`
  stays. The `node --test .github/scripts/check-nightly-release.test.cjs` step (`7544d3d2`) tests
  release-scheduler code for the deleted `release.yml`; dropped, scripts kept as-is.
- **Re-apply.** Highest-churn entry. Re-derive from upstream's **new** workflow files and re-apply
  the standing rule rather than force-keeping stale fork copies; a new upstream workflow is
  opt-**in** and ships only if it passes the rule and the fork actually needs it. Separately,
  `desktop-artifacts.yml` is fork-owned and can drift against upstream's desktop build requirements
  **without ever showing up as a merge conflict** — diff it against upstream's `release.yml` build
  job on every sync (this rebase: the Spectre component id). The `check` job runs `vp check`, which
  includes `vp fmt --check`, so an upstream formatting break lands `main` red here even when the
  fork changed nothing; repair it in place and drop the repair once upstream fixes the file.
- **Checked at `5b0c923e`: keep; no new upstream workflows.** `ci.yml` took three upstream
  additions, one kept (knip) and two declined (Blacksmith apt mirrors, nightly-release script test).
  `release.yml` changed its scheduler and the Spectre component id; only the latter affects
  `desktop-artifacts.yml` and it is ported. `grep -rn blacksmith .github/workflows/` still matches
  only the explanatory comment in `desktop-artifacts.yml`.

### 15. A logged-out Claude instance reports as unauthenticated, and shows the directory it resolved

- **Intent.** Never infer "authenticated" from "the probe answered". `checkClaudeProviderStatus`
  treated the SDK capability probe returning an object as proof of a login, but Claude Code answers
  the handshake **locally** and a logged-out CLI still emits an `account` object filled with blanks
  plus `tokenSource: "none"`. So a second Claude instance pointed at a config directory with no login
  rendered as a bare "Authenticated" with an empty email while every turn failed — invisible
  everywhere except inside a chat.
- **Files:** `packages/contracts/src/server.ts` (`ServerProviderConfigDirectory`, optional
  `ServerProvider.configDirectory`), `apps/server/src/provider/providerSnapshot.ts`,
  `provider/providerStatusCache.ts`, `provider/Drivers/ClaudeHome.ts` (holds
  `resolveClaudeConfigDirPath`, moved in from `ClaudeSkills.ts`), `provider/Drivers/ClaudeSkills.ts`,
  `provider/Layers/ClaudeProvider.ts`,
  `apps/web/src/components/settings/ProviderInstanceCard.tsx`; tests in
  `provider/Layers/{ProviderRegistry,ClaudeCapabilitiesProbe}.test.ts`;
  `docs/user/providers-claude.md`
- **Re-apply.** Auth classification is **three-way, and the third case is load-bearing**: positive
  evidence (`email`, `subscriptionType`, `apiKeySource`, or a non-`firstParty` `apiProvider`) →
  `authenticated`; an explicit `tokenSource: "none"` with nothing else → `unauthenticated` +
  `status: "error"` + a message naming the directory; **no signal at all** → the pre-existing
  `unknown` + `warning` bucket, because a CLI authenticated through a `profile` source reports an
  empty account object and an older CLI may omit `tokenSource` entirely. Neither must be called
  logged-out. The fragile coupling is that `tokenSource: "none"` contract, which is Claude Code's,
  not T3 Code's — re-confirm it against the CLI version in play before re-deriving. Everything else
  is additive: `configDirectory` (`{ path, credentialsFound }`) is optional and driver-agnostic on
  the wire, `credentialsFound: false` is **not** proof of a logout (macOS keeps credentials in the
  keychain) so it renders only as detail on an already-failed auth state. Getting that message in
  front of the user is upstream's job — see section 4. In `ClaudeProvider.ts` the probe is
  upstream's (initialization, then usage under its own deadline); the fork adds only the
  `apiKeySource` field to the account read plus the classification and `configDirectory` plumbing
  in `checkClaudeProviderStatus`. The docs half explains "Not authenticated" / "Resolved config
  directory" and the Windows/PowerShell form of the multi-account instructions: PowerShell does not
  expand `~` inside a quoted string and neither does Claude Code, so upstream's bash-only
  `CLAUDE_CONFIG_DIR=~/.claude_x` writes the login into a folder literally named `~`, which T3 Code
  — which does expand — never sees.
- **Why it is not just a UI nicety.** With `unauthenticated` reachable, the existing filters in
  `apps/mobile/src/lib/modelOptions.ts`, `apps/web/src/components/CommandPalette.tsx` and
  `packages/client-runtime/src/operations/projects.ts` apply to Claude for the first time — a
  logged-out instance drops out of pickers instead of being offered and failing.
- **Drop it when:** upstream's `ClaudeProvider.ts` emits `auth.status: "unauthenticated"` on its own.
  Check with `grep -c '"unauthenticated"' apps/server/src/provider/Layers/ClaudeProvider.ts` and
  `grep -c configDirectory packages/contracts/src/server.ts` against clean upstream. Partial
  supersession is likely — keep whichever half is still missing. Watch `3d00cfd5` (#10321): upstream
  now names the config directory in the **turn-time** sign-out error (`claudeSignedOutMessage` in
  `ClaudeHome.ts`); if that moves into the status probe, this entry is done.
- **Checked at `5b0c923e`: keep.** Both server drop-checks still come back **0**.
  `ProviderInstanceCard.tsx` changed 120 lines upstream and the "Resolved config directory" row
  replayed clean this time. The doc paragraphs were rewritten into upstream's new
  `providers-claude.md`.

### 16. Usage scans every configured provider instance

- **Intent.** Usage totals must cover every configured instance, not just the default one.
  `resolveTranscriptDirs` built a **fixed list** from the legacy `settings.providers.*` blobs and
  never consulted `settings.providerInstances`, so a second Claude account's transcripts were
  silently skipped — the dashboard kept reporting, the totals just quietly excluded what that account
  spent.
- **Files:** `apps/server/src/usage/usageTranscriptSources.ts` (new, + test),
  `apps/server/src/usage/UsageService.ts`
- **Re-apply.** A new module enumerates one directory per configured instance and `UsageService`
  consumes it; the scan loop already iterated a `dirs` array, so **no contract change and no UI
  change** are needed for this entry alone. `resolveTranscriptDirs(settings)` takes the settings
  value upstream's `readSummary` already reads (for price overrides) rather than reading them
  again. Decisions worth keeping: disabled instances are **still scanned** (usage records tokens
  already spent; switching a provider off must not retroactively erase them); instances resolving
  to one directory are walked **once**, keyed case-insensitively on Windows; a single undecodable
  instance config is **logged and skipped**, not fatal; and ordering is Claude, then Codex, then
  Grok, default slot before custom instances sorted by id, which reproduces the old fixed-list
  output exactly for a single-instance environment. **Grok has no per-instance home** — its
  settings expose only a binary path — so its instances collapse onto the one `$GROK_HOME` (or
  `~/.grok`) directory; it is the only source carrying a `fileName`. **The one drift risk:**
  `instanceConfigsForDriver` duplicates the default-slot merge rule from
  `deriveProviderInstanceConfigMap` rather than importing it (importing would drag `BUILT_IN_DRIVERS`,
  the whole driver graph, in for a pure function). If upstream changes that merge rule, this copy
  must follow — re-verify it every rebase.
- **Drop it when:** upstream's `resolveTranscriptDirs` reads `settings.providerInstances`. Check with
  `grep -c providerInstances apps/server/src/usage/UsageService.ts` against clean upstream.
- **Checked at `5b0c923e`: keep.** Drop-check **0**. Upstream's `394e8470` (#9774) changed the
  `UsageService.ts` plumbing around this (settings passed in, `createOverrideRateTable`); the
  resolver took the parameter. `deriveProviderInstanceConfigMap` is unchanged, so the duplicated
  merge rule has not drifted.

### 17. The worktree branch prefix is configurable, not hardcoded to `t3code`

- **Intent.** `WORKTREE_BRANCH_PREFIX = "t3code"` was a `const` with no setting behind it, so the
  vendor name landed in every teammate's branch list and in every PR head branch, and repositories
  with branch-naming rules (`<handle>/*`, `feature/*`, protected prefixes) could not be satisfied at
  all. One new server setting, `worktreeBranchPrefix`, applied at the two places the server names a
  worktree branch.
- **Files:** `packages/contracts/src/settings.ts`, `packages/shared/src/git.ts` (+ test),
  `apps/server/src/ws.ts`, `apps/server/src/orchestration/Layers/ProviderCommandReactor.ts`
  (+ test), `apps/server/src/server.test.ts`,
  `apps/web/src/components/settings/{WorktreeBranchSettings.tsx (new),SourceControlSettings.tsx,settingsSearch.ts}`,
  `docs/user/source-control.md`
- **Re-apply.** Five decisions worth keeping:
  1. **The server owns the naming, the clients stay dumb.** Web and mobile mint the placeholder
     before they could know the setting, so `buildTemporaryWorktreeBranchName`'s signature is
     unchanged and the three client call sites are untouched. `ws.ts` rewrites the placeholder at
     `prepareWorktree` time and the existing `thread.meta.update` reports the real branch back.
  2. **Placeholders carry a `t3-` marker, and the marker is the whole point.** Provenance is inferred
     from the refName, not recorded. Under the default prefix a bare `t3code/deadbeef` was safe;
     under a configured prefix it is not (`deadbeef`, `cafebabe` are plausible hand-written names),
     so matching `<prefix>/<8 hex>` would rename a user's own branch. Mint and match
     `<prefix>/t3-<8 hex>`. Unmarked and UUID-shaped tokens stay matchable **under the default prefix
     only**.
  3. **The matcher accepts the configured prefix _and_ the default**, or changing the prefix strands
     every thread whose placeholder was already minted.
  4. **A blank or unusable prefix falls back to `t3code`; it does not mean "no prefix"** — an empty
     namespace would put placeholders at the repository root and lets a bad setting produce an
     invalid refName.
  5. **A branch the user named is never rewritten**, so picking a branch before the first message
     still opts a thread out entirely.

  The rename site is `maybeGenerateAndRenameWorktreeBranchForFirstTurn`, and the settings read must
  sit **inside** the guarded `Effect.gen` whose `catchCause` logs failures, or a `ServerSettingsError`
  escapes a path that previously could not fail. The `ws.ts` site is the `bootstrap.prepareWorktree`
  block, where `branch` is optional — rewrite only when defined, since an absent `newRefName` means
  "check out the base ref, do not create a branch".

- **Not fixed here:** no mobile settings UI. Mobile surfaces no server settings today; the setting
  still applies to threads started from mobile, since the server does the naming.
- **Drop it when:** upstream makes the prefix configurable. Check with
  `grep -n "WORKTREE_BRANCH_PREFIX\|worktreeBranchPrefix" packages/shared/src/git.ts` against clean
  upstream — a lone `export const WORKTREE_BRANCH_PREFIX = "t3code"` means this is still needed.
- **Checked at `5b0c923e`: keep.** Still the lone hardcoded const upstream. Every source file
  replayed clean; the doc section was rewritten into upstream's new `source-control.md`.

### 18. New thread button under the project selector, and scoped to it

- **Intent.** The sidebar header should read search → scope → act. The new thread button sat on the
  search row, above the project selector that gives it its context, as a bare glyph beside a text
  field it has nothing to do with — and it ignored the scope menu directly beneath it, always opening
  the command palette picker even when the sidebar was already scoped to one project. It now sits
  below the project row as a full-width labelled `SidebarMenuButton`, and when scoped it creates
  there immediately.
- **Files:** `apps/web/src/components/Sidebar.tsx`, `components/Sidebar.logic.ts` (+ test),
  `docs/user/thread-sidebar.md`
- **Re-apply.** Three decisions worth keeping:
  1. **The branch lives in a pure helper.** `resolveNewThreadClickTarget` returns
     `"scoped-project" | "current-project" | "picker"` and delegates the unscoped case to the existing
     `shouldCreateNewThreadInCurrentProject`, so the old rule is untouched.
  2. **The scoped target resolves through `buildSidebarProjectPickerEntries`**, the same builder the
     command palette uses. A scope entry is a _logical_ project (several checkouts grouped), so
     picking its representative by hand would target a different member than the picker does.
  3. **The scoped tooltip drops the shortcut and names the project.** `chat.new` is not scope-aware,
     so printing its shortcut next to a scoped button would advertise the wrong target.

  Also gone: the button no longer renders `disabled` when there are no projects — it renders with the
  project row, which is already hidden in that state. Not touched: `LegacySidebar.tsx`, the mobile
  home header, and the `chat.new` / `chat.newLocal` keybindings.

- **Drop it when:** upstream's `Sidebar.tsx` renders the new thread button below the project scope
  menu with a text label. Check with `grep -n "New thread" apps/web/src/components/Sidebar.tsx`
  against clean upstream — an icon-only button in the search row means this is still needed.
- **Checked at `5b0c923e`: keep.** Upstream changed **2,104 lines** of `Sidebar.tsx` this range
  (drag-and-drop reorder with drop verbs, settled threads, multi-select). The import list and the
  `scopedNewThreadProjectRef` memo conflicted on placement; the header JSX itself replayed clean.
  **This is still the fork's highest-churn UI surface** — re-derive rather than replay whenever the
  block itself moves.
- **Browser-only:** the header re-stack wants one look in a real client if re-derived.

### 19. Usage reports each provider instance separately

- **Intent.** Entry 16 made the _scan_ read every instance, but everything downstream still grouped
  by `UsageProviderKind`, so a work and a personal Claude Code collapsed into one row — the exact
  question a second account is configured to answer was unanswerable. It also left a **real double
  count**: `ownedContribution` resolved ownership per provider _kind_, so if environment A owned a
  shared Claude directory and B reported that directory plus another one, every bucket B reported
  survived, including the one A had already counted. The report's unit of grouping is now the
  provider instance.
- **Files:** `packages/contracts/src/usage.ts`, `packages/shared/src/{usageMerge,usageFormat}.ts`,
  `apps/server/src/usage/{usageTranscriptSources,usageAggregation,UsageService}.ts`,
  `apps/web/src/components/usage/*`, `apps/web/src/state/usage.test.tsx`,
  `packages/client-runtime/src/state/serverUsage.test.ts`, `apps/mobile/src/features/usage/*`,
  `docs/user/usage.md`, plus the test files
- **Re-apply.** `UsageBucket` gains `instanceId`; `UsageSource` gains `instanceId`, `displayName`,
  `accentColor`; `USAGE_CONTRACT_VERSION` and `USAGE_MERGE_COMPATIBLE_SINCE` both move to the new
  version. The aggregator keys by `(day, hourStart?, provider, instanceId, model)` and `mergeUsage`
  resolves ownership per instance, exposing `instances` in place of `providers` with per-period maps
  keyed `byInstance`. Decisions worth keeping:
  1. **Series are keyed by instance id alone, not `(environment, instance)`.** Every environment's
     default Claude instance is `claudeAgent`, so keying by the pair would split one person's laptop
     and desktop into two rows.
  2. **`UsageSourceFingerprint` stays physical** — host, provider, path, volume, no instance id. It
     answers "is this the same directory"; folding the id in breaks cross-environment dedupe.
  3. **Presentation travels on the wire** (`displayName`, `accentColor`) rather than the client
     joining usage against the provider snapshot stream — mobile has no equivalent of web's
     `providerInstances` projection. The client still owns the _rule_: `formatInstanceLabel` resolves
     configured name → brand label for a default instance → humanized instance id.
  4. **De-duplication stays global across instances.** A record copied forward when a session is
     resumed under a second account is still one response.
  5. **Instances sharing one directory report as one**, under the first instance id in scan order.
  6. **Colors:** a configured `accentColor` wins, else a per-provider ramp indexed by `shadeIndex`
     assigned in an order that does not move when spending does. Index 0 is the brand color, so a
     single-instance environment looks untouched. Both `usageProviders` modules type their ramps as
     `Record<UsageProviderKind, …>`, so **a provider upstream adds needs a ramp here or the build
     breaks** — which is the intended failure mode. Upstream's Limits views color by provider
     _kind_: web reads `PROVIDER_PRESENTATION[kind].colors[0]`, mobile calls a `useProviderColors()`
     the fork re-exports as the head of each ramp. Keep both — they are what upstream's newest
     usage components import.
  7. **Idle series are not drawn, and the empty state still shows one row per provider.**
     `buildUsageSeries` filters instances with no tokens and no cost — that is upstream `17dbe8dd`'s
     (#7563) `providersWithUsage` intent, applied at instance granularity — and falls back to
     per-provider stand-in rows only when nothing at all was reported. That fallback reads
     `PROVIDER_ORDER`, so a test that mocks `PROVIDER_PRESENTATION` must cover **every**
     `UsageProviderKind`.
  8. **The merge floor moves with the version.** `USAGE_MERGE_COMPATIBLE_SINCE` exists for _additive_
     bumps; this one is not additive, because a payload from before it has no instance to attribute.
     Leaving the floor behind would admit instance-less buckets.

  **The contract bump is the cost:** a fleet on mixed server versions excludes older environments
  from totals until they update. That path already existed and already says so in the UI; it is why
  this was not folded into entry 16.

  **Every upstream test fixture that builds a `UsageBucket` or `UsageSource` needs the new fields**
  — upstream keeps adding usage tests (`apps/web/src/state/usage.test.tsx`,
  `packages/client-runtime/src/state/serverUsage.test.ts` this range) and they fail typecheck, not
  merge. Run the typecheck before assuming a clean merge is a clean rebase.

- **Drop it when:** upstream's `UsageBucket` carries an instance id. Check with
  `grep -c instanceId packages/contracts/src/usage.ts` against clean upstream. If upstream ships its
  own per-instance breakdown, drop **both** this and entry 16, and re-verify its ownership rule
  against the double count in the intent above — a kind-level `ownedContribution` is the natural
  shape to write and is wrong.
- **Checked at `5b0c923e`: keep, five ports.** Drop-check **0**; `UsageProviderKind` is still
  `claude | codex | grok`. Upstream's usage work this range was large — custom model prices
  (`394e8470`, `84b99f3f`), remembered page selection (`add8c3a5`), live per-environment rendering
  (`7ee52b07`), `buildPeriodColumns` (`487d1766`), pooled limits (`b273d1cf`, `b155c219`), and the
  mobile Usage/Limits tabs (`24aef0e6`) — and none of it touched the per-instance model, but it
  did produce the fixture, rename, and `useProviderColors` ports listed in section 2. Upstream's
  pooled-limits data (`UsageLimitSourceSnapshots`) is keyed by account, not by this entry's
  instance id; the two coexist.

### 20. No update checking, and a sidebar link to this fork with build provenance

- **Intent.** The fork identifies as the fork and never offers updates. Its CI cuts no signed
  releases, so the inherited update feed could only error against this repo — or, pointed elsewhere,
  offer upstream's builds over this fork's. With update checking gone, the GitHub link's tooltip
  becomes the way to see which build is running.
- **Files:** `.github/workflows/desktop-artifacts.yml` (build-step env), `apps/web/vite.config.ts`,
  `apps/web/src/vite-env.d.ts`, `apps/web/src/branding.ts`,
  `apps/web/src/components/sidebar/SidebarChrome.tsx`
- **Re-apply.** Two halves:
  1. **Update checking off.** The workflow sets
     `T3CODE_DESKTOP_UPDATE_REPOSITORY: fork-updates-disabled` on the build step. The value is
     deliberately single-segment: `resolveGitHubPublishConfig` requires `owner/repo` so it resolves
     **no** publish config, and being set it also stops the `GITHUB_REPOSITORY` fallback (which in
     Actions is this repo). electron-builder then writes no `app-update.yml` and the app's own
     `getAutoUpdateDisabledReason` lands in its designed "no update feed is configured" state. **The
     disable lives at the feed, not in `DesktopUpdates.ts`** — hardcoding it in the updater would
     break its ~25 update-machine tests and diverge a file upstream actively maintains.
  2. **Sidebar GitHub link.** A utility item in the sidebar footer right of Usage, same
     `SidebarMenuButton size="icon"` shape as its neighbours, wearing the existing `GitHubIcon` in
     bright red (`text-red-500!` **needs** the important marker — `SidebarMenuButton` forces
     `[&>svg]:text-[var(--sidebar-icon-color)]`). It is a real anchor with `target="_blank"`, which
     covers every surface (the desktop window's `setWindowOpenHandler` routes it to the OS browser).
     Its tooltip shows short commit hash and build time from two Vite defines beside the existing
     `APP_VERSION` one — `BUILD_COMMIT` and `BUILD_TIMESTAMP` — exported through `branding.ts`; empty
     values degrade the tooltip to a plain "GitHub". The item sits inside the same conditional block
     as Settings/Usage so it hides with them on the settings pages.
- **Drop it when:** never on upstream's account — this is fork identity. But **both halves need
  re-deriving every rebase**: the workflow half moves with entry 14's re-derive rule and stops
  working silently if upstream renames `T3CODE_DESKTOP_UPDATE_REPOSITORY` or reworks
  `resolveGitHubPublishConfig`; the `SidebarChrome.tsx` item must be re-applied whenever upstream
  reworks the utility menu.
- **Checked at `5b0c923e`: keep.** `resolveGitHubPublishConfig` still reads
  `T3CODE_DESKTOP_UPDATE_REPOSITORY` as an `owner/repo` option, so the disable holds.
  `SidebarChrome.tsx` and `vite.config.ts` replayed clean.
- **Browser-only:** the icon, tooltip and link. The no-feed disable shows in a packaged build as the
  greyed "Check for updates" pill.

### 21. New project action lives inside the project scope menu

- **Intent.** The sidebar's project filter row carried a separate icon-only folder-plus button
  squeezed against the dropdown it belongs to. The scope dropdown itself now ends with a separated
  **New project** item that opens the same add-project command palette flow, the standalone button is
  gone, and the filter trigger spans the full row — matching the draft hero's project menu, which
  already ends with the same item.
- **Files:** `apps/web/src/components/Sidebar.tsx`
- **Re-apply.** No contract or store changes; one small handler. The scope popup is a `Combobox`, so
  the item must **not** be a `ComboboxItem` — that would join `filteredProjectScopeItems` and become
  selectable scope. It is a plain `<button>` after `ComboboxList`, behind a `ComboboxSeparator`,
  styled like the scope rows (`h-8 min-h-8 py-0 text-sm font-medium`, `FolderPlusIcon`). The combobox
  owns its open state through `reduceSidebarProjectScopeMenuState`, so the click handler
  (`handleNewProjectFromScopeMenu`) dispatches `{ type: "open-changed", open: false }` before calling
  the existing `openAddProjectCommandPalette` (`openCommandPalette({ open: "add-project" })`) — the
  old `MenuItem` got that from `closeOnClick`. Re-deriving also means deleting the
  `flex items-center gap-1` wrapper around trigger + standalone button and dropping `flex-1` from the
  trigger. **This is the same project-row block entry 18 restacks — re-apply the two together; they
  share one commit.** Mirror `DraftHeroHeadline.tsx`'s trailing "New project" item if the menu
  primitives change shape. Deliberately untouched: `LegacySidebar.tsx` (its add-project button sits
  beside the "Projects" section header, not a dropdown), the sidebar empty-state "Add project" button
  (the only way in when no projects exist), and mobile (separate add-project navigation flow).
- **Drop it when:** upstream's project scope menu carries its own new-project item. Check with
  `grep -n "New project" apps/web/src/components/Sidebar.tsx` against clean upstream — a hit only on
  an icon-only `aria-label` button beside the scope menu means this is still needed.
- **Checked at `5b0c923e`: keep.** Upstream still renders the standalone folder-plus button next to
  the scope trigger and no in-menu item. The handler's placement conflicted with upstream's new
  drop-hold state; the menu JSX replayed clean.
- **Browser-only:** the menu item placement and the widened trigger row.

### 22. Subscription allowances in the picker and the context bubble

- **Intent.** A user driving two or three subscriptions all day should see which one has room left
  **at the moment of choosing a provider**, not on a separate page. Upstream collects the allowance
  (`ServerProvider.usageLimits`, see section 4) and shows it on the Usage page's Limits view, and
  since `183c3433` (#9875) also on demand through a `/usage-limits` composer command; that is still
  an explicit act after the provider is chosen, and the first signal that a window is exhausted is
  still a refused turn mid-task. This entry reads the same field where the provider is chosen (the
  model picker) and where the current turn's cost is already shown (the context bubble under the
  composer). **Web-only, no server or contract change.**
- **Files:**
  `apps/web/src/components/chat/{SubscriptionUsage.logic.ts (+ test),SubscriptionUsageMeters.tsx,ContextWindowMeter.tsx,ModelPickerContent.tsx,ChatComposer.tsx}`,
  `docs/user/composer.md`
- **Re-apply.** `SubscriptionUsageMeters` renders one row per `usageLimits.windows` entry; the
  picker shows it for the instance the rail has selected, the context bubble for the instance the
  thread runs on. The `ChatComposer.tsx` part is five small hunks: the `ServerProviderUsageLimits`
  type import, an `activeSubscriptionUsage` prop on `ComposerFooterPrimaryActions` passed through to
  `ContextWindowMeter`, and the raw `selectedProviderEntry?.snapshot.usageLimits` read. Decisions
  worth keeping:
  1. **Stored as used, rendered as left.** Upstream's `usedPercent` crosses the wire; the UI always
     says "N% left" because that is the question being asked. The bar still fills with consumption,
     matching the context meter directly above it. Whole numbers except under 1% left.
  2. **Ageing happens where the clock is read, not in a memo.** The meter ages the raw snapshot and
     reads `Date.now()` when its popover opens (`onOpenChange`); the picker reads it once per open,
     its popup being unmounted while closed. Deciding staleness in a composer memo keyed on the
     snapshot freezes the decision exactly when provider refreshes stop, which is the case the
     one-hour age-out exists for. Still **no self-ticking clock** — a continuously repainting meter
     in the composer is exactly the GPU cost this app avoids. Reset countdowns come from upstream's
     `formatResetsIn` in `@t3tools/shared/usageLimits`, so the two views phrase them identically.
  3. **An `unavailable` snapshot renders nothing.** API-key, Bedrock and failed-probe cases are
     explained on the Limits view; in the composer silence is the right answer, the same as for
     Cursor, Grok and OpenCode, which report no `usageLimits` at all.
  4. **The composer hands the field over raw** (`selectedProviderEntry?.snapshot.usageLimits`) and
     the meter/picker apply `usableSubscriptionUsage`; keep it that way for the reason in 2.
- **Drop it when:** upstream renders `usageLimits` inside the model picker or the context meter.
  Check with `grep -c usageLimits apps/web/src/components/chat/ModelPickerContent.tsx
apps/web/src/components/chat/ContextWindowMeter.tsx` against clean upstream. Upstream's
  `/usage-limits` command (`183c3433`) is the nearest thing so far and does not count: it renders
  above the composer on request, not in the picker.
- **Checked at `5b0c923e`: keep.** Both drop-checks come back **0**. `ServerProviderUsageWindow`
  still carries `usedPercent`, so the "left" arithmetic holds even though upstream's own Limits view
  now displays remaining quota (`be53bbd8`). `ChatComposer.tsx` was rebuilt from upstream's file
  plus the five hunks after entry 7's removal.
- **Browser-only:** the picker footer and the Subscription section of the context bubble.

## 4. Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not re-introduce them.**

| #            | Fork change                       | Superseded by                                                                                 | Verified at |
| ------------ | --------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_                              | `5b0c923e`  |
| 4            | Terminal Ctrl-chord forwarding    | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_                         | `5b0c923e`  |
| 5 (core)     | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints                                           | `5b0c923e`  |
| 7            | Shell-style composer recall       | `fd773172` — _feat(web): recall sent prompts with the up arrow (#9173)_                       | `5b0c923e`  |
| 8            | Full timestamp on hover           | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`                             | `5b0c923e`  |
| 9            | Always-visible new-thread btn     | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_                            | `5b0c923e`  |
| 10           | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                                                        | `5b0c923e`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md` | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_                     | `5b0c923e`  |
| 15 (banner)  | Status banner prefers server msg  | `06336460` — _feat(providers): add Google Antigravity via the official ACP agent (#9348)_     | `5b0c923e`  |
| 22 (server)  | Subscription usage collection     | `19d8ab2a` — _feat(usage): show Codex and Claude subscription limits on a Limits tab (#9507)_ | `5b0c923e`  |

- **1 — Windows build shell mode.** The fork removed `shell: process.platform === "win32"` from the
  `buildCmd` spawn because shell mode broke builds from paths containing spaces. Upstream now
  hardcodes `shell: false` on that step and routes other spawns through `resolveSpawnCommand` — the
  fork's intent, arrived at independently.
- **4 — terminal Ctrl-chord forwarding.** The fork mapped plain `Ctrl+[a-z]` to its control byte
  because the app's keybindings swallowed Ctrl+C. Upstream's libghostty-vt surface now routes every
  unclaimed key through `GhosttyCore.encodeKey` with `preventDefault()` **and** `stopPropagation()`.
  Keeping the fork block would be **actively harmful** — returning `false` from `beforeKey` bails
  before `encodeKey`, so chords would bypass any negotiated Kitty keyboard-protocol encoding.
  Behavioral note: upstream binds copy to Ctrl+Shift+C, so plain Ctrl+C now interrupts even with a
  selection, matching every other terminal.
- **5 (core) — thread-scoped changed files.** Upstream attributes changed files per turn. Only the
  commit-preselect button remains; see entry 5.
- **7 — shell-style composer recall.** The fork kept a per-thread history of sent messages (100,
  persisted) and walked it with `ArrowUp`/`ArrowDown` from the first/last line of any draft.
  Upstream's `fd773172` (#9173) recalls the prompts already loaded in the thread with `ArrowUp`
  from an empty composer, steps with both arrows, restores nothing but text, and hands the arrows
  back the moment a recalled prompt is edited. Narrower on two points (empty composer only, no
  persistence beyond what the thread has loaded) and wider on one (it sits inside upstream's own
  key routing, so it cannot fall out of sync with the slash/mention menus the way the fork's
  hook placement could). The fork's `threadMessageHistory.ts`, `threadMessageHistoryStore.ts`,
  the test, and every composer hunk are gone; `ChatComposer.tsx` carries only entry 22 now. If
  persistence across reloads is ever wanted back, add it to upstream's `promptHistoryPositionRef`
  model rather than resurrecting the parallel store.
- **8 — hover timestamp.** Upstream renders `formatChatTimestampTooltip` as a real tooltip on both the
  `createdAt` and `updatedAt` rows — a strictly better version of the same idea.
- **9 — always-visible new-thread button.** Sidebar v2 became the default; its button sits in a plain
  `<div className="shrink-0">` with no hover gating and the tooltip this entry wanted.
  `LegacySidebar.tsx` still carries the old crossfade; leave it, it is opt-in.
- **10 — package-local vitest configs.** The `vp` migration made them inapplicable and upstream ships
  none of its own. Revisit only if those process-spawning tests flake under `vp`.
- **15 (banner half).** The fork inlined `status.message ?? <generic line>` in
  `ProviderStatusBanner.tsx` so a server message naming the config directory would reach the user in
  chat instead of the hardcoded "Sign in via the CLI to authenticate again." Upstream extracted
  `getProviderStatusMessage`, whose **first line** is `if (status.message) return status.message;`,
  and reuses it in `ModelPickerContent.tsx` too — strictly wider than the fork's version. Its own
  test file covers both the prefer-server-message and the fallback case, so the fork's two
  static-markup tests came out with it. `ProviderStatusBanner.tsx` and `ProviderStatusBanner.test.tsx`
  are now byte-identical to upstream. **The rest of entry 15 still stands** — nothing upstream
  produces the `unauthenticated` status or the `configDirectory` payload that message is built from.
- **22 (server half).** The fork collected Claude's `get_usage` and Codex's `account/rateLimits/read`
  in the status probes and shipped them as `ServerProvider.subscriptionUsage`. Upstream's `19d8ab2a`
  (#9507), `1641b4ab` (#9534) and `b34ff8f5` (#9584) ship the same data as
  `ServerProvider.usageLimits`, and more: a `ProviderUsageLimitsIngestion` layer merging the
  mid-turn `account.rate-limits.updated` event onto the published snapshot, per-model weekly buckets
  read structurally from `model_scoped`, Codex reset credits, CLIProxyAPI hubs as read-only sources,
  pooled limits across accounts (`b273d1cf`), and a Limits view for web and mobile. The fork's
  `providerSubscriptionUsage.ts`, its probe edits, the cache strip and the contract field are gone.
  **The former watch item is closed:** the fork had noted that upstream's Claude usage read carried
  no timeout of its own and could hang the probe past its ceiling; upstream's `98a29cba` (#9784)
  restructured the probe so the usage request runs under its own `Effect.timeout` after
  initialization has already been captured. Nothing to carry.
- **12 (symlink half).** Upstream replaced the symlink with a regular file whose content is
  `@AGENTS.md` — the `@file` import syntax in the one position where it resolves. **Do not restore
  the symlink**; re-adding it would silently revert #7171 on every future rebase. Entry 12 still
  carries the `AGENTS.md` sections.

## 5. Dropped changes

Removed by choice, not superseded. Upstream has **not** implemented these, so a redundancy check will
keep reporting them as missing — that is expected. **Do not re-introduce without an explicit decision
to take the maintenance back on.**

- **2 & 3 — GitHub Copilot CLI and Gemini CLI providers.** Dropped at the 2026-08-05 rebase. A
  complete provider layer for two agent CLIs upstream does not support (~6,400 lines), which was the
  fork's entire source diff and its entire maintenance cost: every upstream change to the
  provider/driver contract broke it silently at typecheck. Incompatible with a thin,
  rebase-indefinitely fork. If you want them back, do not resurrect the old files — re-derive against
  `apps/server/src/provider/builtInDrivers.ts` and the current `Drivers/ClaudeDriver.ts`, and check
  first whether upstream has shipped its own.
- **11 — TODO list moved into this file.** Retired by the maintainer in `f194c2d6`; the TODO section
  below stays, only the entry documenting the old `TODO.md` deletion is gone. Treat 11 as a
  permanently retired number.

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
