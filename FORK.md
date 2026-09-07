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
support (15 names the config directory a logged-out Claude instance resolved, 19 reports usage per
instance), upstream's provider subscription limits surfaced in the model picker and context
bubble (22, web-only), and three web UX changes (5, 6, 18). Everything else is byte-identical to
upstream — `native/`, `scripts/` (two orphaned release scripts deleted aside, entry 14),
`apps/desktop/`, `packages/client-runtime/`, `apps/server/src/orchestration-v2/`,
`pnpm-workspace.yaml` and `pnpm-lock.yaml` are untouched, `knip.jsonc` carries two entries for
scripts only the deleted workflows ran, and the only edits under `infra/` and `packaging/` are
the entry 14 notes explaining which workflow no longer runs them. Mobile carries entry 19's
usage screens and nothing else.

This file is the authoritative list of what sets this fork apart, and it is written to be used when
rebasing. **Work from intent, not from the old diff.** For each numbered entry: run the drop-check
first, and if upstream now covers the intent, move the entry to section 4; otherwise re-derive the
intent against current upstream code, taking upstream's version of anything that moved.

## 2. Last rebase

> **2026-10-28**, onto `pingdotgg/t3code` `main` at **`c570c2cd5c`** —
> _fix(mobile): keep iPad tab bar within narrow sidebars (#26198)_. Took in **2349 upstream
> commits** (`11b00afc0..c570c2cd5c`) over the last tip that reached `main`, `99f09955b0` (based
> on `11b00afc0`), which is backed up at `origin/backup/main-pre-rebase-2026-10-28`. The automated
> run is not allowed to force-push, so the rebased tip is published as
> `origin/rebase/main-2026-10-28` for a maintainer to land with
> `git push --force-with-lease=main:99f09955b0 origin rebase/main-2026-10-28:main`, then delete
> that branch. This run started from `origin/rebase/main-2026-10-25` (the 2026-10-25 run's tip on
> `5a969c17e7`; the 10-19, 10-22 and 10-25 runs hit the same wall and each left a `rebase/main-*`
> branch), so those resolutions are folded in and only the **511** commits
> `5a969c17e7..c570c2cd5c` were replayed fresh. The three older `rebase/main-*` branches are
> superseded by this tip and can be deleted with it.
>
> **Nine commits replayed, nothing superseded, no new provider.** Every drop-check in section 3
> came back empty against clean upstream and `UsageProviderKind` did not grow. Seven commits
> conflicted, in fourteen files, and two new lint rules broke fork lines without conflicting:
>
> - **Entry 14** — `ci.yml` conflicted once: upstream still carries `mobile_native_static_analysis`
>   and `release_smoke` (`30f4d6374` #25929 grew the latter), re-removed with their `check` needs.
>   Kept as upstream wrote them: `a43b0032c` (#24693) gives every job `id-token: write` and passes
>   `secrets.T3_TASK_CACHE_READ_TOKEN` into `setup-ci-deps`, whose task-cache step is gated on
>   `github.repository == 'pingdotgg/t3code'` and a non-empty token, so it self-skips here;
>   `aa247c52a` (#24966) runs the server shards through `vp run test:cached` with per-shard cache
>   artifacts, token-free; `test_web` now builds and boots the web client (`30f4d6374`).
>   Modify/delete re-deleted `release-desktop.yml`, `release.yml`, `web-preview.yml`,
>   `deploy-relay.yml`, `mobile-eas-production.yml`, `.github/scripts/mirror-play-apk.cjs`,
>   `scripts/notify-discord-release.ts` and `scripts/smoke-cli-archive.ts`. One new upstream
>   workflow deleted under the rule: `agent-context-budget.yml` (`394929af7` #25785;
>   credential-free on `ubuntu-24.04`, but an upstream PR-policy gate on
>   `agentContextBudget.json`, which `AgentContextBudget.test.ts` already pins in `test_server`).
>   `knip.jsonc` collided on the comment above the fork's two script entries.
> - **Entry 15** — `8f26ed7e2` (#21514, comments halved repo-wide) collided with the fork's
>   `claudeUnauthenticatedMessage` and the moved `resolveClaudeConfigDirPath` (comment-only;
>   upstream's one-liners taken), and `c3888da8b` (#25251) restructured `ProviderInstanceCard.tsx`
>   around a `statusContent` block; the fork's "Resolved config directory" row re-seated.
> - **Entry 19** — `8f26ed7e2` comment collisions in `provider-core/usage.ts` and `usageMerge.ts`;
>   `3faeb9e6f` (#24847) dropped `useEscapeToGoBack` beside the fork's `UsagePage.tsx` import;
>   `9ff05979e` (#26061) rebuilt mobile `UsageRouteScreen.tsx` for iPad width, so that file was
>   taken from upstream and the fork's per-instance series re-applied onto the new layout.
> - **Entry 6** — `0a20d7ea7` (#25368) replaced `ThreadVisitWatermark`'s effects with a
>   `createThreadVisitTracker` atom subscribed outside React; the fork's acknowledgement is now an
>   atom of the same shape (see the entry).
> - **Entry 5** — `6f6c6c14b` (#25787) removed the paint-only timeline path from `ChatView.tsx`
>   (and the `RunId` import the fork's callback uses, re-added); `fb76594d7` (#24104) gated
>   `AssistantChangedFilesSection` on `ctx.onOpenTurnDiff` in `TimelineAssistantRows.tsx`.
> - **Entry 18** — `6a3a460b0` (#25234) destructured `handleNewThread` out of `newThreadContext`
>   in `Sidebar.tsx`; the fork's handler uses the local.
> - **Entry 20** — `2dfd6bf0e` (#24980) added a `node:fs/promises` import beside the fork's
>   `node:child_process` one in `vite.config.ts`; both stand with their own diagnostics reason.
>
> Two lint rules landed this range and failed on fork lines without conflicting:
> `t3code/no-low-value-comments` (`8f26ed7e2`; comment blocks capped at four lines) trimmed
> thirteen fork comments across entries 5, 6, 15, 18, 19, 20 and 22, and
> `t3code/no-unreasoned-state-sync` (`33d0c9637` #26161) requires every `useEffect` to carry an
> `oxlint-disable-next-line … -- reason`; the fork's one remaining effect, the commit-preselection
> applier in `GitActionsControl.tsx`, states its reason. Entries 12, 13 and 22 replayed clean
> (`AGENTS.md` changed twelve times upstream, all below the fork's two sections).
> `scripts/build-desktop-artifact.ts` changed in `1152e9171` (#25900, the packaged bundle
> self-check on macOS) and `8f26ed7e2` with no new flag or env, so `desktop-artifacts.yml` carries
> no new drift; `release-desktop.yml` gained an opt-in `launch_check` input the fork does not need.
>
> **Verification.** Node **26.12.1** (upstream's pin; the container ships 22, so it came through
> `npx node@26.12.1`), pnpm **12.14.0**. `pnpm install --frozen-lockfile` clean. `tsc --noEmit`
> **0 errors** in contracts, shared, provider-core, client-runtime, server, web and mobile. `vp lint`
> over the 60 fork-changed TypeScript files: **0 errors** after the comment and effect fixes above.
> `vp fmt --check` over all 73 fork-changed files and `knip:check` pass. The fork-touched test
> files pass: server usage and registry suites (81, one upstream skip), shared usage merge and
> format (28), provider-core snapshot probe and usage limits (14), mobile usage (7), the web unit
> files for ui state, sidebar logic, session logic, context meter, subscription usage, git actions
> logic and the usage folder (183, 12 files), and the `GitActionsControl` and
> `ThreadVisitWatermark` browser suites in the preinstalled headless Chromium (2). Nothing was
> checked in a browser by hand.
>
> Keep syncing by rebase, not merge — a merge commit makes "what does this fork carry?" a graph
> question instead of a `git diff upstream/main HEAD` one.

## 3. Fork changes

> Entry numbers are **stable identifiers** and are never renumbered. A gap means the entry moved to
> section 4 or 5. Numbers 1, 4, 7, 8, 9, 10, 16, 17, 21, the symlink half of 12, the banner and
> auth halves of 15, the layout half of 18, the ownership half of 19 and the server half of 22 are
> superseded; 2, 3 and 11 are dropped.

### 5. Commit exactly the files a turn changed

- **Intent.** Committing a thread's work should not require hand-unchecking every unrelated dirty
  file. The completion "Changed files" card gets a **Commit** button beside "Open diff" that opens
  the commit modal with only this turn's files checked; the regular commit button still selects all.
- **Files:** `apps/web/src/session-logic.ts` (+ test), `components/ChatView.tsx`,
  `components/GitActionsControl.tsx`,
  `components/chat/{ChangedFilesTree,MessagesTimeline,TimelineAssistantRows,ThreadDetailsPanel}.tsx`,
  `components/chat/timelineRowContext.ts`
- **Re-apply.** The file list is the turn's checkpoint `TurnDiffSummary` — the same one upstream's
  `AssistantChangedFilesSection` renders — so nothing re-derives per-turn attribution.
  `ChangedFilesCard` takes an optional `onCommitTurnFiles`; `ChatView` holds a
  `GitCommitPreselection` (`{ filePaths, requestId }`) that flows through `ThreadDetailsPanel`
  into `GitActionsControl`, where an effect keyed on `requestId` seeds `excludedFiles`, turns on
  the checkbox list and opens the dialog. Three consequences of the control living in the thread
  details panel (upstream's `de3439142`), which only mounts its content while open: the button
  also opens the panel (`setThreadPanelOpen` with the current presentation); the effect waits for
  git status to be loaded, or the exclusion set would be computed against an empty working tree;
  and the control reports the request consumed (`onCommitPreselectionConsumed`) so `ChatView`
  drops it — otherwise a later remount of the panel would replay it and reopen the dialog.
  `deriveCommitExcludedFilePaths` (exported, tested) and `normalizeWorkspaceRelativeFilePath`
  (module-private — knip rejects an export with no importer) do the checkpoint-vs-git-status
  path matching (separators, `./` prefixes, case). Expect the `GitActionsControl` wiring to need
  adapting whenever upstream reworks that dialog or moves the control again.
- **Drop it when:** upstream's commit dialog can be opened with a preselected file set. Check with
  `grep -rn "onCommitTurnFiles\|Preselection" apps/web/src` against clean upstream.
- **Checked at `c570c2cd5c`: keep, two conflicts, one typecheck break.** Drop-check empty.
  `6f6c6c14b` (#25787) dropped `ChatView.tsx`'s paint-only timeline path, so the fork's
  `onCommitTurnFiles` prop is gated on `isServerThread` alone, and with it the `RunId` type
  import the fork's callback signature uses (re-added). `fb76594d7` (#24104) wrapped
  `AssistantChangedFilesSection` in `TimelineAssistantRows.tsx` in `ctx.onOpenTurnDiff ? … : null`;
  the fork's pass-through sits inside. The preselection effect in `GitActionsControl.tsx` carries
  its `no-unreasoned-state-sync` reason (it applies a request raised in `ChatView` before this
  control mounted). `GitActionsControl.logic` (12), `session-logic` and the browser suite (1) pass.
- **Browser-only:** the button-to-dialog flow. Unit tests cover path matching only.

### 6. Keep the completed dot until the thread is actually read

- **Intent.** Opening a thread instantly cleared its green completed dot, so it was easy to lose
  track of which completed threads had been looked at. The dot now survives until the completion is
  acknowledged by viewing the thread, and visit bumps that are not a read do not clear it —
  upstream stamps a visit at the wake time when a Woke notice is dismissed or the thread is
  archived (`useAcknowledgeThreadWoke`, `useThreadActions.ts`), which under the plain
  visited-watermark rule clears a completion nobody looked at.
- **Files:** `apps/web/src/uiStateStore.ts` (+ test), `components/Sidebar.logic.ts` (+ test),
  `components/sidebar/SidebarThreadRow.tsx`, `components/ThreadStatusIndicators.tsx`,
  `components/chat/ThreadVisitWatermark.tsx`
- **Re-apply.** Anchor on the persisted-UI-state shape: mirror everything done for
  `threadLastVisitedAtById` (initial state, hydrate seed, persist, mark-unread reset) for a new
  `threadLastCompletionAcknowledgedAtById`. The acknowledged-at value reaches `hasUnseenCompletion`
  through `ThreadStatusInput` and its two call sites, **not** by patching the store read, and sits
  beside upstream's `resolveThreadLastVisitedAt` (server-tracked visits win over the local
  watermark; the acknowledgement is consulted first and falls back to that resolved visit).
  `ThreadVisitWatermark` (the leaf `ChatView` renders for visits) stamps the acknowledgement at
  the run's `completedAt` from a shell subscription of its own: an atom mounted beside upstream's
  `createThreadVisitTracker` and shaped like it (no React effect; upstream lints those). It does
  not touch upstream's visit dispatch. **Known limit:** the acknowledgement is browser-local
  while upstream's visits now sync through the server, so a device that acknowledged keeps its
  dot cleared even if another device marks the thread unread. The maintainer's refinement —
  only mark read after ~3s of visibility — is still unimplemented; this field is the seam for it.
  `LegacySidebar.tsx` is opt-in and untouched.
- **Drop it when:** upstream's `uiStateStore.ts` tracks a completion acknowledgement. Check with
  `grep -c AcknowledgedAt apps/web/src/uiStateStore.ts` against clean upstream.
- **Checked at `c570c2cd5c`: keep, re-derived.** Drop-check **0**. `0a20d7ea7` (#25368) moved
  `ThreadVisitWatermark.tsx`'s visit logic into `createThreadVisitTracker`
  (`@t3tools/client-runtime/state/thread-visits`), an atom that subscribes to the thread shell
  outside React so the component stops re-rendering on streaming ticks. The fork's acknowledgement
  is a second atom in the same file, `threadCompletionAcknowledger`, keyed by `threadKey(ref)`
  (the entity key `parseThreadKey` reads; `scopedThreadKey` is a different format) and stamping
  the store under `scopedThreadKey(ref)`, mounted beside the tracker. `uiStateStore.ts`,
  `Sidebar.logic.ts`, `SidebarThreadRow.tsx` and `ThreadStatusIndicators.tsx` merged clean; the
  ui-state and sidebar logic tests and upstream's `ThreadVisitWatermark.browser.test.tsx` pass.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents working in this repo must know that `origin` is the fork and the only write
  target, that `upstream` is fetch-only, and that the fork's `README.md` banner and this file win
  merge conflicts.
- **Files:** `AGENTS.md` (two sections prepended to upstream's, after its intro and before
  `## What makes T3 Code special?`)
- **Re-apply.** Take upstream's `AGENTS.md` prose wholesale and re-insert the two fork sections.
  `CLAUDE.md` is **not** part of this entry — take upstream's regular file containing `@AGENTS.md`
  and do not restore the old symlink (see section 4).
- **Checked at `c570c2cd5c`: keep, clean replay.** Upstream edited `AGENTS.md` twelve times this
  range, all below the fork's two sections; merged clean.

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on this repo should see immediately that it is a rebasing fork and
  where the authoritative change list lives.
- **Files:** `README.md` (an "About this fork" blockquote before the `# T3 Code` heading), `FORK.md`
- **Re-apply.** The banner is delimited by `<!-- FORK-BANNER:START -->` / `<!-- FORK-BANNER:END -->`
  — **re-derive its text, never merge it**, since it goes stale every time an entry moves out of
  section 3. Refresh the rebase marker inside it too.
- **Checked at `c570c2cd5c`: keep, refreshed.** Rebase marker moved to `c570c2cd5c`. `089930576`
  (#25451) added an FAQ link below the banner; merged clean.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it uses **standard GitHub-hosted runners**
  (upstream's `blacksmith-*` labels never resolve — jobs sat queued for 24h and were auto-cancelled)
  and needs **no credential beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted, not
  disabled. Beyond that, keep only the minimum the fork needs to build and to check code quality,
  and prefer GitHub-native actions.
- **Files:** `.github/workflows/{ci,desktop-artifacts}.yml`; deleted
  `.github/workflows/{release,release-desktop,deploy-relay,relay-preview,relay-preview-cleanup,mobile-eas-preview,mobile-eas-production,mobile-android-apk,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check,publish-aur,desktop-macos-preview,desktop-macos-preview-publish,windows-tests,cursor-hygiene-webhook,stale-needs-more-info,agent-context-budget}.yml`,
  `.github/VOUCHED.td` and `.github/scripts/mirror-play-apk.cjs`; deleted `scripts/smoke-cli-archive.ts` (only the deleted
  `release-desktop.yml` ran it, and `knip:check` fails on an orphaned script) and
  `scripts/notify-discord-release.ts` with its test (only the deleted `release.yml` ran it, and
  its test reads that workflow off disk, so it fails at once here); fork notes in
  `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; fallout in `CONTRIBUTING.md` and `docs/operations/development.md`
  (a sentence linking the deleted `windows-tests.yml`); two `scripts` entries in `knip.jsonc`
  (`build-cli-archive.ts`, `resolve-nightly-release.ts` — only the deleted workflows run them,
  and `knip:check` fails on an unlisted orphan; the first is the WSL revisit path below, so it
  is listed rather than deleted).
  Untouched and kept from upstream: `.github/actions/setup-apt-mirrors/`, `.github/scripts/`
  (including `stage-preview-bundle.py` and its test, which only the deleted preview-publish
  workflow uses), `.github/SECURITY.md`. Deleted with its workflow:
  `.github/scripts/mirror-play-apk.cjs` — knip's root pass reports an orphaned `.cjs` under
  `.github/scripts/` as an unused file, so it cannot stay the way the Python script does.
- **Kept (3 upstream workflows).** `ci.yml` with every Blacksmith runner swapped to `ubuntu-24.04`
  (upstream's layout since `727b4e74` #20044: a `changes` gate that maps the diff to the affected
  workspace packages through `.github/actions/ci-changes` and `.github/scripts/ci-changes.cjs` —
  kept, it reads git only, needs no token and fails open to running everything; `lint`; `build`,
  which runs the desktop pipeline with `vpr typecheck` in the background of the same job;
  `test`; `test_web`, which since `144aae4d4e` (#20797) caches and installs Playwright's
  headless Chromium shell because the web suites run in a real browser — runner-agnostic,
  kept; `test_server` × 8 shards, which gate themselves through the same action;
  `rust`; and the `check` aggregate that branch protection names, which fails when any job in
  its `needs` neither succeeded nor was skipped by `changes`, and which downloads the
  `thread-transfer-results` artifact itself — upstream folded the former `transfer-report` job
  into it). `.github/actions/setup-ci-deps` (`f6ad94d0` #19634: caches the Vite+ home, then
  setup-vp with a full install) is runner-agnostic and kept as upstream wrote it.
  `release_smoke` dropped (it runs `scripts/release-smoke.ts`, which exercises `release.yml`'s
  own steps — `relay-state-output.test.cjs` reads that deleted file, so the job fails at once
  here; the script itself stays, `package.json`'s `release:smoke` runs it by hand and knip is
  clean), the macOS-only `mobile_native_static_analysis` dropped together with its `check`
  entry (upstream gates it on `changes.outputs.mobile_native` now; that unused output and the
  `$renamed` lookup in `check`'s `jq` stay as upstream wrote them so the file keeps merging),
  and the Blacksmith-image steps dropped (below). The `lint` job runs upstream's `knip:check`,
  the GitHub and Expo GraphQL `generate --check` steps and `vp check` **on purpose**: they are quality gates
  and knip catches fork exports nothing imports. `issue-labels.yml` and
  `thread-transfer-report.yml` unmodified; the latter publishes the thread-transfer budget diff
  from the `thread-transfer-results` artifact produced by the **sharded `test_server`** job
  (and required by `check`), so dropping or renaming `test_server` would silently break it.
- **Added.** `desktop-artifacts.yml` — the four platforms upstream's release matrix covers
  (macOS `arm64`/`x64` DMG, Linux `x64` AppImage, Windows `x64` NSIS), **unsigned**, on every push
  to `main` and on dispatch, uploaded as workflow artifacts and then published as a
  `desktop-dev-<run number>` **prerelease**, pruning older `desktop-dev-*` releases to the current
  one plus two. That publish-and-prune tail is fork intent, not an implementation detail — re-apply
  it even if the build job around it is rebuilt from scratch. The release job is the one place
  `GITHUB_TOKEN` is used (job-scoped `contents: write`). It carries over the secret-free things
  that matter from upstream's `release-desktop.yml` build job: the `dtolnay/rust-toolchain` setup
  with a per-matrix `rust_target` (the desktop build cargo-builds `native/resource-monitor` and,
  on Linux, the capture helpers), the Spectre-mitigated MSVC libs install (component
  `VC.Runtimes.x86.x64.Spectre`), and the Linux `libsecret-1-dev pkg-config` install its Chromium
  cookie-key reader needs. It never passes `--signed`, which is what would pull signing
  credentials into `scripts/build-desktop-artifact.ts`, and never passes `--skip-build`: each
  platform builds its own JS bundle, so there is no shared bundle job to keep in step with
  upstream's. **The Windows artifact ships without a WSL runtime.** Upstream's `07549200`
  (#11511) replaced the `--wsl-prebuild <pty.node>` flag with `--wsl-runtime <archive>`, which
  embeds the signed Linux CLI archive from upstream's single-executable pipeline (Node 25.7+
  SEA, macOS signing for the archive). The build script treats the archive as optional
  (`bundlesWslRuntime`), so the artifact still builds and validates; only its WSL backend is
  unavailable. The fork's `wsl_node_pty` job, which built that prebuild, is gone. Revisit only if
  someone needs WSL from a dev build, and then by producing the archive with
  `scripts/build-cli-archive.ts` on a Linux runner, not by reviving node-pty.
- **Deleted, and why.** Needing credentials and/or Blacksmith: `release.yml` (Cloudflare, Clerk,
  Apple, Azure, npm OIDC, a release GitHub App), `release-desktop.yml` (its `workflow_call`
  desktop build: Apple and Azure signing, the relay tracing config, an inputs-driven runner),
  `deploy-relay.yml`, `mobile-eas-{preview,production}.yml` (`EXPO_TOKEN`),
  `mobile-showcase-screenshots.yml`, `mobile-android-apk.yml` (`c0c495e4d` #16271:
  `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` on a Blacksmith runner, mirroring store builds this fork
  never cuts), `web-preview.yml` (Vercel tokens), `publish-aur.yml`
  (`AUR_SSH_PRIVATE_KEY`; it is a `workflow_call` target of the deleted `release.yml`, so nothing
  here would invoke it — `packaging/aur/` sources stay byte-identical and
  `packaging/aur/scripts/release.sh` still runs by hand), `cursor-hygiene-webhook.yml` (two
  `CURSOR_T3CODE_*` secrets), `windows-tests.yml` (`blacksmith-8vcpu-windows-2025`, manual-only,
  and by its own header nothing passes on Windows yet), `desktop-macos-preview-publish.yml`
  (`9a49d6d5` #11760: a `workflow_run` / `pull_request_target` publisher that signs fork-PR
  previews with the Apple secrets, on a Blacksmith runner). Credential-free but not needed:
  `agent-context-budget.yml` (`394929af7` #25785: fails a PR whose `agentContextBudget.json`
  grew past `main` unless a maintainer adds a label; the budget is already pinned by
  `AgentContextBudget.test.ts`, which `test_server` runs, so the fork gains nothing from the gate),
  `desktop-macos-preview.yml` (Blacksmith runners, and it duplicates artifacts
  `desktop-artifacts.yml` already ships) and `mobile-fingerprint-check.yml` (it labels PRs that
  would break OTA reach until the next store build, and this fork ships no store builds).
  Upstream community governance: `pr-vouch.yml` + `.github/VOUCHED.td`, `pr-size.yml` and
  `stale-needs-more-info.yml` (`52628d863e` #22628: `actions/stale` closing "needs more info"
  issues, credential-free but triage this fork does not run). `relay-preview.yml` and
  `relay-preview-cleanup.yml` (`ff1f6fd884`: per-PR relay stages on Blacksmith runners with the
  Cloudflare, PlanetScale, Axiom and Clerk secrets).
  Fallout: `CONTRIBUTING.md` lost its `vouch:*` / `size:*` paragraph. (The fork used to also
  drop a guard in `infra/relay/scripts/deploy.test.ts` that read `release.yml` off disk; upstream
  deleted that test in `74796256`, so nothing remains.)
- **Blacksmith-image steps dropped from `ci.yml`.** `uses: ./.github/actions/setup-apt-mirrors`
  and the `sudo sed -i … /etc/apt/blacksmith-ubuntu-mirrors.txt` line (`4ade3651` #9864), in the
  `build` job (gated on `changes`) and the `test` job, address files that exist only on Blacksmith's Ubuntu
  image; on `ubuntu-24.04` the `sed` errors on the missing file and fails the job. Upstream's
  backgrounded `apt-get install libsecret-1-dev pkg-config` (start / finish step pair) stays.
  Two script-test steps are dropped because they test code for deleted workflows, scripts kept
  as-is: `node --test .github/scripts/check-nightly-release.test.cjs
  .github/scripts/vercel-deployment-output.test.cjs` (`7544d3d2`, the release scheduler;
  `1688f965` #22817, which reads `release.yml` and `web-preview.yml` off disk) and
  `python3 -B .github/scripts/stage-preview-bundle.test.py` (`9a49d6d5`, the preview-publish
  staging).
- **Re-apply.** Highest-churn entry. Re-derive from upstream's **new** workflow files and re-apply
  the standing rule rather than force-keeping stale fork copies; a new upstream workflow is
  opt-**in** and ships only if it passes the rule and the fork actually needs it. Separately,
  `desktop-artifacts.yml` is fork-owned and can drift against upstream's desktop build requirements
  **without ever showing up as a merge conflict** — diff it against upstream's
  `release-desktop.yml` build job and `scripts/build-desktop-artifact.ts`'s flags on every sync.
  The `lint` job runs `vp check`, which includes `vp fmt --check`, so an upstream formatting
  break lands `main` red here even when the fork changed nothing; repair it in place and drop
  the repair once upstream fixes the file.
- **Checked at `c570c2cd5c`: `ci.yml` re-derived, eight deletions re-applied, one new workflow
  dropped.** Upstream edited `ci.yml` three times (`a43b0032c` #24693, `aa247c52a` #24966,
  `30f4d6374` #25929); the fork copy is still that file with the standing edits (eight `runs-on`
  swaps, the `setup-apt-mirrors` step and Blacksmith `sed` line out of `build` and `test`, the two
  script-test steps out of `test`, the `mobile_native_static_analysis` and `release_smoke` jobs
  out with their two `check` needs, one comment reworded). Kept as upstream wrote them:
  `permissions: id-token: write` on every job and `secrets.T3_TASK_CACHE_READ_TOKEN` passed into
  `setup-ci-deps`, whose new task-cache step is gated on `github.repository == 'pingdotgg/t3code'`
  and a non-empty token, so it self-skips here (an unset secret is not a credential the fork
  lacks); the server shards running through `vp run test:cached` (`scripts/test-cached.ts`, a
  local on-disk cache) with per-shard `test-cache-*` artifacts; and `test_web` building the web
  client and running `apps/web/scripts/verify-built-boot.ts`. `grep -rni blacksmith
  .github/workflows/` matches only the explanatory comment in `desktop-artifacts.yml`. Deleted
  again on modify/delete: `release-desktop.yml` (an opt-in `launch_check` input), `release.yml`,
  `web-preview.yml`, `deploy-relay.yml`, `mobile-eas-production.yml`,
  `.github/scripts/mirror-play-apk.cjs`, `scripts/notify-discord-release.ts` and
  `scripts/smoke-cli-archive.ts`. New this range and deleted under the rule:
  `agent-context-budget.yml` (`394929af7` #25785), see "Deleted, and why". `knip.jsonc`:
  `8f26ed7e2` reworded the comment above the fork's two script entries; upstream's wording kept
  with the fork's line. **Desktop build drift:** `scripts/build-desktop-artifact.ts` changed in
  `1152e9171` (#25900, the packaged bundle self-check now runs on macOS artifacts too) and
  `8f26ed7e2` with no new flag or env, so `desktop-artifacts.yml` needs nothing.

### 15. A logged-out Claude instance shows the directory it resolved

- **Intent.** When a Claude instance is not logged in, say **where** Claude Code looked. The
  usual reason a second instance is logged out is that its home path resolved somewhere other
  than the directory the user logged in against (PowerShell's unexpanded `~`, a relative path,
  an inherited `CLAUDE_CONFIG_DIR`), and upstream's message — "Claude Code is not
  authenticated. Run `claude auth login` and try again." — does not name the directory, so the
  user logs in again in the wrong place. The classification itself (a probe answering with
  `tokenSource: "none"` and no other credential evidence is unauthenticated) is upstream's since
  `563645cf6e` (#15459); see section 4.
- **Files:** `packages/contracts/src/server.ts` (`ServerProviderConfigDirectory`, optional
  `ServerProvider.configDirectory`), `packages/provider-core/src/server/snapshotProbe.ts`
  (`buildServerProvider` passes it through), `apps/server/src/provider/providerStatusCache.ts`,
  `provider/Drivers/ClaudeHome.ts` (owns `resolveClaudeConfigDirPath`, moved in from
  `ClaudeSkills.ts`, plus `resolveClaudeConfigDirectory`), `provider/Drivers/ClaudeSkills.ts` (imports the resolver; keeps upstream's `expandHomePath`
  import, which it still uses for plugin directories),
  `provider/ClaudeProvider.ts` (`claudeUnauthenticatedMessage`, `configDirectory` on every
  outcome), `apps/web/src/components/settings/ProviderInstanceCard.tsx`; two tests in
  `provider/ProviderRegistry.test.ts`; `docs/user/providers-claude.md`
- **Re-apply.** Everything is additive on top of upstream's `claudeAuthStatus`: `configDirectory`
  (`{ path, credentialsFound }`) is optional and driver-agnostic on the wire and is reported on
  every Claude outcome, not only the failed one, so the card can show the path before anything
  goes wrong; the fork's only edit inside upstream's unauthenticated branch is the `message`,
  which names the path and adds "No credentials file was found there." when `.credentials.json`
  is absent. `credentialsFound: false` is **not** proof of a logout (macOS keeps credentials in
  the keychain) so the card renders it as detail on an already-failed auth state only.
  `resolveClaudeConfigDirPath` must stay the one resolver both skills discovery and the probe
  use — take upstream's current body (it reads `HostProcess.HomeDirectory`, never `node:os`)
  and move it, do not fork it. Getting the message in front of the user is upstream's
  `getProviderStatusMessage` (section 4). The docs half explains **Resolved config directory**
  and the Windows/PowerShell form of the multi-account instructions: PowerShell does not expand
  `~` inside a quoted string and neither does Claude Code, so `CLAUDE_CONFIG_DIR = "~\.claude_x"`
  writes the login into a folder literally named `~`, which T3 Code — which does expand — never
  sees.
- **Drop it when:** upstream's unauthenticated status message or `ServerProvider` names the
  resolved config directory. Check with `grep -c configDirectory packages/contracts/src/server.ts`
  and `grep -n "CLAUDE_CONFIG_DIR\|configDir" apps/server/src/provider/ClaudeProvider.ts` against
  clean upstream. Watch `claudeSignedOutMessage` in `ClaudeHome.ts`, which already names the
  directory in the **turn-time** sign-out error (`3d00cfd5` #10321, used from
  `orchestration-v2/Adapters/ClaudeAdapterV2.ts`): if upstream reuses it in the status probe,
  this entry is done.
- **Checked at `c570c2cd5c`: keep, three conflicts.** Both drop-checks come back empty and
  `claudeSignedOutMessage` is still used only from `ClaudeAdapterV2.ts`. `8f26ed7e2` (#21514)
  rewrote the comments around the fork's `claudeUnauthenticatedMessage` in `ClaudeProvider.ts`
  and around `resolveClaudeConfigDirPath` in `ClaudeSkills.ts` (the function the fork moves to
  `ClaudeHome.ts`; its comment is upstream's one-liner now). `c3888da8b` (#25251) rebuilt
  `ProviderInstanceCard.tsx`'s status into a `statusContent` block above the driver fields; the
  fork's "Resolved config directory" row still follows the driver form inside `runtimeFields`.
  `ServerProviderConfigDirectory`'s doc comment shrank to the four-line cap. Contract, probe,
  cache and docs files merged clean; the registry tests pass.

### 18. The sidebar new thread button creates in the scoped project

- **Intent.** The sidebar's new thread button ignored the project scope filter beside it, always
  opening the command palette picker even when the sidebar was already scoped to one project.
  Scoped, it now creates there immediately and its tooltip names the target. Unscoped behaviour is
  untouched. (This entry used to also restack the header — labelled button under the project row.
  Upstream's `d1d15c67f` redesigned that header; see section 4.)
- **Files:** `apps/web/src/components/Sidebar.tsx`, `components/Sidebar.logic.ts` (+ test),
  `components/sidebar/SidebarThreadHeader.tsx` (one optional prop), `docs/user/thread-sidebar.md`
- **Re-apply.** Three decisions worth keeping:
  1. **The branch lives in a pure helper.** `resolveNewThreadClickTarget` returns
     `"scoped-project" | "current-project" | "picker"` and delegates the unscoped case to the existing
     `shouldCreateNewThreadInCurrentProject`, so the old rule is untouched. That helper is
     module-private now: upstream deleted its tests (`05696c63`), and knip rejects an export with
     no importer.
  2. **The scoped target resolves through `buildSidebarProjectPickerEntries`**, the same builder the
     command palette uses. A scope entry is a _logical_ project (several checkouts grouped), so
     picking its representative by hand would target a different member than the picker does.
  3. **The scoped tooltip drops the shortcut and names the project.** `chat.new` is not scope-aware,
     so printing its shortcut next to a scoped button would advertise the wrong target. Upstream's
     `SidebarThreadHeader` builds its own tooltip from `newThreadShortcutLabel`, so the fork adds an
     optional `newThreadLabel` override prop (used only when scoped) and passes
     `showNewThreadInProjectHint={!scopedProjectGroup && …}` so the shift+click hint hides too.

  Not touched: the header layout (upstream's), `LegacySidebar.tsx`, the mobile home header, and the
  `chat.new` / `chat.newLocal` keybindings.

- **Drop it when:** upstream's `handleNewThreadClick` in `Sidebar.tsx` consults the project scope.
  Check with `grep -n "scopedProjectGroup" apps/web/src/components/Sidebar.tsx` against clean
  upstream — hits only in the scope combobox and the search-empty state mean this is still needed.
- **Checked at `c570c2cd5c`: keep, one conflict.** Upstream's `handleNewThreadClick` still never
  looks at the scope (`scopedProjectGroup` hits only the scope combobox and the search-empty
  state). `6a3a460b0` (#25234) destructured `handleNewThread` out of `newThreadContext` in
  `Sidebar.tsx`; the fork's scoped handler and `scopedNewThreadProjectRef` use that local.
  `Sidebar.logic.ts` and its test merged clean; the sidebar logic tests pass.
- **Browser-only:** the scoped tooltip on upstream's new icon button.

### 19. Usage reports each provider instance separately

- **Intent.** Everything downstream of the scan grouped by `UsageProviderKind`, so a work and a
  personal Claude Code collapsed into one row — the exact question a second account is
  configured to answer was unanswerable. The report's unit of display is now the provider
  instance: one line, row and column per configured instance that spent anything, under the
  name and accent color the user gave it. (This entry used to also fix a double count in
  ownership dedupe; upstream now resolves ownership per source directory. See section 4.)
- **Files:** `packages/contracts/src/usage.ts`, `packages/shared/src/{usageMerge,usageFormat}.ts`
  (+ tests), `packages/provider-core/src/server/usage.ts` (`ProviderUsageSourceInstance`,
  `usageSourceInstance`, optional `displayName` / `accentColor` on `ProviderUsageInstance`,
  optional `instance` on `ProviderUsageScan`), `apps/server/src/usage/UsageService.ts` (+ test),
  `apps/server/src/provider/Drivers/AntigravityUsage.ts`,
  `apps/web/src/components/usage/{UsagePage,UsageProviderChart,usageProviders}.{ts,tsx}`
  (+ tests, one fixture line in `usageBreakdown.test.ts`, the chart call in
  `UsageModelDialog.tsx`), `apps/mobile/src/features/usage/*`,
  `docs/user/usage.md`
- **Re-apply.** The change is **additive on the wire and layered on upstream's merge**, which is
  what makes it survive upstream's own usage churn:
  1. **Instance identity rides on `UsageSource`, not on buckets.** `UsageSource` gains optional
     `instanceId`, `displayName`, `accentColor`. Buckets already carry upstream's `sourcePath`,
     so a bucket reaches its instance through its source; nothing is keyed differently on the
     server and `usageAggregation.ts` is upstream's. **No contract version bump, no merge-floor
     move** — upstream owns `USAGE_CONTRACT_VERSION` and bumps it for its own reasons (the
     2026-10-01 rebase collided on v6), so the fork must never claim a number. An older server
     with no instance on its sources, or a source not configured per instance (OpenCode,
     Cursor, Antigravity's shared roots), is attributed to the provider's default instance via
     `USAGE_PROVIDER_DRIVERS`, which maps all six usage kinds and **needs a row when upstream
     adds a provider** (the `satisfies Record<UsageProviderKind, …>` makes that a build break).
  2. **The server stamps the three fields where upstream already walks instances**, nothing
     else: `usageInstances` in `UsageService.ts` copies `displayName` / `accentColor` onto
     upstream's `ProviderUsageInstance`, `resolveTranscriptDirs` keeps the instance each
     transcript reader's directory came from, and Antigravity's scan reader stamps each data root
     with the instance whose environment named it (`b85366d2` reads `ANTIGRAVITY_DATA_DIR` per
     instance; roots shared by several instances collapse onto the first in scan order, which is
     the default slot) plus its per-instance profile directories. OpenCode and Cursor report no
     instance and fall to the provider's default instance on the client. The instance list is
     sorted default slot first, then by id, so instances sharing a directory report under the id
     a single-account setup already shows (the `seen` dedupe keeps the first).
  3. **`mergeUsage` keeps upstream's `providers` / `byProvider` outputs untouched** and adds
     `instances` (`InstanceTotals`: identity, `isDefaultInstance`, `shadeIndex`, totals, shares),
     `byInstance` on daily and hourly periods, and `instanceId` on `ModelTotals` (models are keyed
     per instance, so the same model under two accounts is two rows). Sessions per instance come
     from the owned sources exactly as upstream's per-provider sessions do. Upstream's new UI
     code that reads `providers` (keyboard navigation, Cursor enable rows) keeps working; only
     the rows, chart lines and columns the fork wants per instance read `instances`.
  4. **Series are keyed by instance id alone, not `(environment, instance)`.** Every
     environment's default Claude instance is `claudeAgent`, so a laptop and a desktop are one
     row.
  5. **Presentation travels on the wire** (`displayName`, `accentColor`) rather than the client
     joining usage against the provider snapshot stream — mobile has no equivalent of web's
     `providerInstances` projection. The client owns the _rule_: `formatInstanceLabel`
     (`@t3tools/shared/usageFormat`) resolves configured name → brand label for a default
     instance → humanized instance id.
  6. **Colors:** a configured `accentColor` wins, else index 0 keeps upstream's brand `color`
     and later instances take the provider's `shades` ramp (web `PROVIDER_PRESENTATION`, mobile
     `useProviderShades`), indexed by `shadeIndex`, which is assigned default-first-then-by-id
     so it does not move when spending does. Upstream's `color` and `driverKind` fields and
     mobile `useProviderColors()` are untouched, so its Limits views need nothing; the web marks
     render through upstream's `ProviderInstanceIcon` with the series label as display name.
  7. **Model rows are per instance, the model dialog is per provider.** Upstream's
     `UsageModelDialog` (`e8545b293`) filters buckets by `(provider, model)`, so clicking a model
     row under either of two Claude accounts opens the same combined detail; the row key and
     `selectedModelKey` carry the instance so two rows never collide, and an ambiguous row names
     its instance beside the model. Splitting the dialog would need the bucket-to-instance
     resolver `usageMerge.ts` keeps private; not done.
  8. **Idle instances are not drawn, and an empty report draws nothing** — the stand-in row per
     provider the fork used to render went with upstream's own move to zero rows on an empty
     report (`providersWithUsage` of nothing), and it was what broke under upstream's
     `UsagePage.test.tsx`, which mocks `PROVIDER_PRESENTATION` with two providers. The one
     exception is upstream's own: since `8597558557` (#17147) a provider still refreshing keeps
     its row and line (dimmed, figures hidden) so nothing shifts when its usage lands;
     `holdLoadingSeries` appends a placeholder series under that provider's default instance
     while it has no series yet, and the chart's `loadingProviders` dims by `entry.provider`.
  9. **Only the chart's `PeriodTotals` is a `Pick<…, "byInstance">`**, so test fixtures that
     build periods without `byProvider` still typecheck.
- **Drop it when:** upstream's `UsageSource` or `UsageBucket` carries an instance id. Check with
  `grep -c instanceId packages/contracts/src/usage.ts` against clean upstream. If upstream ships
  its own per-instance breakdown, drop this whole entry.
- **Checked at `c570c2cd5c`: keep, four conflicts, no new provider.** Drop-check **0** and
  `UsageProviderKind` is unchanged (`pi` and `muse` already have their rows). `8f26ed7e2` (#21514)
  shortened the comments beside the fork's `displayName` / `accentColor` fields in
  `provider-core/usage.ts` and the per-source session count in `usageMerge.ts`; `3faeb9e6f`
  (#24847) removed `useEscapeToGoBack` from `UsagePage.tsx` beside the fork's import, and the
  per-instance `series` line replaced upstream's reworded `activeProviders` block as before.
  `9ff05979e` (#26061) rebuilt mobile `UsageRouteScreen.tsx` for iPad width: the chart card takes
  `height`, `fill` and `title`, the provider list a `compact` mode beside the chart, the model
  grid a `columns` prop, and `UsageSummary` moved out of the card. The file was taken from
  upstream and the fork's intent re-applied onto it: `useUsageSeries` feeds `ChartCard` (legend
  and `UsageDailyChart`), `ProviderSection` (rows keyed and colored per instance, the cursor row
  after the last Codex or Claude instance) and `ModelsSection` (rows keyed `instanceId:model`,
  the instance named when its provider has several). `UsageDailyChart*.tsx`, `usageChartData.ts`,
  `usageProviders.ts`, `UsageService.ts`, `AntigravityUsage.ts`, the contract and the web usage
  components merged clean; server, shared, web and mobile usage tests pass.

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
     `SidebarMenuButton size="icon"` shape as its neighbours, wearing upstream's GitHub forge mark
     (`getSourceControlPresentationForKind("github").Icon`, `currentColor`) in
     the destructive color (`text-destructive!` **needs** the important marker — `SidebarMenuButton` forces
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
- **Checked at `c570c2cd5c`: keep, one import conflict.** `resolveGitHubPublishConfig` still
  reads `T3CODE_DESKTOP_UPDATE_REPOSITORY` first and requires `owner/repo`. `2dfd6bf0e` (#24980)
  added a `node:fs/promises` import at the top of `vite.config.ts` where the fork's
  `node:child_process` one sits; both stand with their own `@effect-diagnostics-next-line` reason.
  `a960f5602` (#24340) added a `VITE_RELEASE_CHANNEL` define beside the fork's `BUILD_COMMIT` /
  `BUILD_TIMESTAMP` ones without touching them. `SidebarChrome.tsx`, `branding.ts` and
  `vite-env.d.ts` merged clean.
- **Browser-only:** the icon, tooltip and link. The no-feed disable shows in a packaged build as the
  greyed "Check for updates" pill.

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
  `apps/web/src/components/chat/{SubscriptionUsage.logic.ts (+ test),SubscriptionUsageMeters.tsx,ContextWindowMeter.tsx,ModelPickerContent.tsx,ChatComposer.tsx,ComposerFooterControls.tsx}`,
  `docs/user/composer.md`
- **Re-apply.** `SubscriptionUsageMeters` renders one row per `usageLimits.windows` entry; the
  picker shows it for the instance the rail has selected, the context bubble for the instance the
  thread runs on. The composer part is small: an `activeSubscriptionUsage` prop on
  `ComposerFooterPrimaryActions` (in `ComposerFooterControls.tsx`) passed through to
  `ContextWindowMeter`, and in `ChatComposer.tsx` the raw
  `selectedProviderEntry?.snapshot.usageLimits` read handed to that prop. Decisions
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
     explained on the Limits view; in the composer silence is the right answer. Which providers
     report `usageLimits` at all is upstream's call and needs no fork change: `eff44be4`
     (#12115) added OpenCode Go, Cursor and Grok, and their rows appeared in the picker and the
     bubble on their own, and `716357cbb` (#17530) did the same for Antigravity.
  4. **The composer hands the field over raw** (`selectedProviderEntry?.snapshot.usageLimits`) and
     the meter/picker apply `usableSubscriptionUsage`; keep it that way for the reason in 2.
- **Drop it when:** upstream renders `usageLimits` inside the model picker or the context meter.
  Check with `grep -c usageLimits apps/web/src/components/chat/ModelPickerContent.tsx
  apps/web/src/components/chat/ContextWindowMeter.tsx` against clean upstream. Upstream's
  `/usage-limits` command (`183c3433`) is the nearest thing so far and does not count: it renders
  above the composer on request, not in the picker.
- **Checked at `c570c2cd5c`: keep, clean replay.** Both drop-checks come back **0**; the
  `/usage-limits` command is still the nearest upstream thing. The `SubscriptionUsage` doc
  comments shrank to the four-line cap; `ModelPickerContent.tsx`, `ContextWindowMeter.tsx`,
  `ChatComposer.tsx` and the logic files merged clean; the logic and context-meter tests pass.
- **Browser-only:** the picker footer and the Subscription section of the context bubble.

## 4. Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not re-introduce them.**

| #            | Fork change                              | Superseded by                                                                                     | Verified at |
| ------------ | ---------------------------------------- | ------------------------------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode             | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_                                  | `8c3b5bef`  |
| 4            | Terminal Ctrl-chord forwarding           | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_                             | `8c3b5bef`  |
| 5 (core)     | Thread-scoped changed files              | `AssistantChangedFilesSection` per-turn checkpoints                                               | `8c3b5bef`  |
| 7            | Shell-style composer recall              | `fd773172` — _feat(web): recall sent prompts with the up arrow (#9173)_                           | `8c3b5bef`  |
| 8            | Full timestamp on hover                  | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`                                 | `8c3b5bef`  |
| 9            | Always-visible new-thread btn            | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_                                | `8c3b5bef`  |
| 10           | Package-local vitest configs             | `vp` (vite-plus) test-runner migration                                                            | `8c3b5bef`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md`        | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_                         | `8c3b5bef`  |
| 15 (banner)  | Status banner prefers server msg         | `06336460` — _feat(providers): add Google Antigravity via the official ACP agent (#9348)_         | `8c3b5bef`  |
| 16           | Usage scans every provider instance      | `2db675ae` — _fix(usage): respect provider account homes (#11485)_                                | `8c3b5bef`  |
| 22 (server)  | Subscription usage collection            | `19d8ab2a` — _feat(usage): show Codex and Claude subscription limits on a Limits tab (#9507)_     | `8c3b5bef`  |
| 18 (layout)  | Labelled new-thread btn under scope row  | `d1d15c67` — _feat(sidebar): fold the project scope into the search row (#11315)_                 | `8c3b5bef`  |
| 21           | New project inside the scope menu        | `d1d15c67` — _feat(sidebar): fold the project scope into the search row (#11315)_                 | `8c3b5bef`  |
| 19 (owner)   | Usage ownership resolved per instance    | `e5a46d6c5` — _feat(usage): read cursor, opencode, and antigravity history (#10409)_              | `6b286ae8`  |
| 14 (repair)  | `pnpm-workspace.yaml` placeholder fix    | `803f94e78` — _fix(release): drop placeholder allowBuilds entry that broke desktop builds_        | `6b286ae8`  |
| 17           | Configurable worktree branch prefix      | `de3439142` — _feat(orchestrator): introduce new orchestrator (#2829)_                            | `f2cc80a7`  |
| 15 (auth)    | Logged-out Claude CLI is unauthenticated | `563645cf6e` — _fix(server): a logged-out Claude CLI no longer reports as authenticated (#15459)_ | `5fe9d024`  |

- **1 — Windows build shell mode.** The fork removed `shell: process.platform === "win32"` from the
  `buildCmd` spawn because shell mode broke builds from paths containing spaces. Upstream now
  routes every spawn in `build-desktop-artifact.ts` through `resolveSpawnCommand` from
  `@t3tools/shared/shell`, never shell mode — the fork's intent, arrived at independently.
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
- **16 — usage scans every configured provider instance.** The fork's `usageTranscriptSources.ts`
  enumerated one transcript directory per `providerInstances` entry (disabled ones included,
  default slot first, shared directories walked once) because upstream's `resolveTranscriptDirs`
  read only the legacy `settings.providers.*` blobs. Upstream's `2db675ae` (#11485) now does the
  same inside `UsageService.ts`, and more: it merges each instance's own environment so a
  `CODEX_HOME` / `CLAUDE_CONFIG_DIR` / `GROK_HOME` set per account is honoured, and it dedupes by
  `realPath` so symlinked and aliased homes count once. The fork's module, its test and its copy of
  the default-slot merge rule are gone. What the fork still needs from that loop — the instance
  id, name and colour on each source — is entry 19's, and lives as three additions inside
  upstream's loop rather than a parallel one. If upstream ever emits an instance id per source
  itself, entry 19's server half goes the same way.
- **15 (banner half).** The fork inlined `status.message ?? <generic line>` in
  `ProviderStatusBanner.tsx` so a server message naming the config directory would reach the user in
  chat instead of the hardcoded "Sign in via the CLI to authenticate again." Upstream extracted
  `getProviderStatusMessage`, whose **first line** is `if (status.message) return status.message;`,
  and reuses it in `ModelPickerContent.tsx` too — strictly wider than the fork's version. Its own
  test file covers both the prefer-server-message and the fallback case, so the fork's two
  static-markup tests came out with it. `ProviderStatusBanner.tsx` and `ProviderStatusBanner.test.tsx`
  are now byte-identical to upstream. The auth classification followed in #15459 (below); what
  is left of entry 15 is the `configDirectory` payload and the message built from it.
- **15 (auth half).** The fork classified the capability probe three ways — positive evidence
  → `authenticated`, an explicit `tokenSource: "none"` → `unauthenticated`, no signal →
  `unknown` + warning. Upstream's `563645cf6e` (#15459) ships `claudeAuthStatus`: a non-first-party
  backend or any `tokenSource` other than `"none"` is authenticated, `"none"` is unauthenticated
  unless an API key (`apiKeySource` other than `"none"`), email or subscription says otherwise,
  and silence is deliberately **not** disproof — profile-authenticated installs and old CLIs
  report nothing and stay authenticated rather than landing in a warning bucket. Same
  `tokenSource: "none"` contract, same `apiKeySource` read, same `status: "error"` +
  `auth.status: "unauthenticated"` result, so the existing picker filters apply to Claude
  exactly as the fork intended; the one behavioural difference (no `unknown` for a silent
  probe) is upstream's call and is not worth a fork. The fork's `claudeProbeAuthStatus`, its
  `unknown` branch and its five tests are gone; upstream's function and tests are taken whole.
  Entry 15 still carries the directory reporting around it.
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
- **19 (ownership half).** The fork keyed every usage bucket by provider instance so that
  `ownedContribution` could resolve ownership per instance instead of per provider _kind_ — the
  kind-level rule let environment B keep every Claude bucket it reported, including the shared
  directory A had already counted. Upstream's `e5a46d6c5` (#10409) stamps `sourcePath` on every
  bucket and its `usageMerge.ts` owns buckets per `(provider, sourcePath)`, dropping only the
  duplicated directory; it also folds a newer partial scan's new cells onto an older complete
  one. That is the fork's double-count fix, arrived at independently and wider. What remains of
  entry 19 is display: instance identity on sources, resolved on the client.
- **14 (placeholder repair).** `d547e3b1` had landed `msgpackr-extract: set this to true or
  false` under `allowBuilds` in `pnpm-workspace.yaml`, which `build-desktop-artifact.ts` rejects
  as a non-boolean; the fork deleted the line in `2baebf1c`. Upstream's `803f94e78` (#12544)
  deleted it too. The file is byte-identical to upstream again.
- **17 — configurable worktree branch prefix.** The fork added one server setting,
  `worktreeBranchPrefix`, re-namespaced the client-minted `t3code/<hash>` placeholder at
  worktree creation and applied the prefix to the generated name at the first-turn rename, with
  a `t3-` marker so a configured prefix could never mistake a hand-written branch for a
  placeholder. Upstream's orchestration V2 (`de3439142`) owns worktree naming in
  `orchestration-v2/ThreadLaunchService.ts` and ships `branchNamingMode` (`static` / `semantic`
  / `custom`), `branchNamePrefix` (default `t3code`, shortened to `t3` by `2afe87ea4b` #16220) and `branchNameInstructions`, with
  `BranchNamingSettings.tsx` on web **and** mobile (which the fork never had) and
  `formatGeneratedBranchName` in `@t3tools/shared/git` applying the prefix at the rename. That
  is the intent — no vendor name in PR head branches, repositories with branch-naming rules
  satisfiable from a setting — arrived at independently and wider. What upstream does not do is
  namespace the transient placeholder: a worktree still exists as `t3/<8 hex>` until the
  background rename lands, and keeps that name if generation fails. Judged not worth a fork
  change against a service upstream is actively rewriting; if it ever is, derive it from
  `buildTemporaryWorktreeBranchName` and `isTemporaryWorktreeBranch` (also read by the web's
  `GitActionsControl.logic.ts`), not from the old diff. The fork's `git.ts` helpers, settings
  UI, `docs/user/source-control.md` paragraph and tests are gone; the whole 2026-10-01 commit
  was skipped.
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
