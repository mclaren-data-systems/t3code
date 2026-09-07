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
support (15, 19), upstream's provider subscription limits surfaced in the model picker and context
bubble (22, web-only), and three web UX changes (5, 6, 18). Everything else is byte-identical to
upstream — `native/`, `scripts/` (one orphaned release script deleted aside, entry 14),
`apps/desktop/`, `packages/client-runtime/`, `apps/server/src/orchestration-v2/`,
`pnpm-workspace.yaml` and `pnpm-lock.yaml` are untouched, and the only edits under `infra/` and
`packaging/` are the entry 14 notes explaining which workflow no longer runs them. Mobile carries
entry 19's usage screens and nothing else.

This file is the authoritative list of what sets this fork apart, and it is written to be used when
rebasing. **Work from intent, not from the old diff.** For each numbered entry: run the drop-check
first, and if upstream now covers the intent, move the entry to section 4; otherwise re-derive the
intent against current upstream code, taking upstream's version of anything that moved.

## 2. Last rebase

> **2026-10-04**, onto `pingdotgg/t3code` `main` at **`f2cc80a7`** —
> _feat(web): morph composer and panel action icons (#14924)_. Took in **123 upstream commits**
> (`6b286ae8..f2cc80a7`). The previous tip `3eb5ed5b` is backed up at
> `origin/backup/main-pre-rebase-2026-10-04`; `main` was then force-pushed to the rebased tip.
>
> **Nine commits replayed, one entry superseded, one re-derived.** The range is dominated by
> upstream's orchestration V2 (`de3439142` #2829: `apps/server/src/orchestration/` is gone,
> `orchestration-v2/` replaces it, `TurnId` is `RunId` on the web, thread visits are tracked by
> the server, the header's git actions moved into the thread details panel, and the server grew
> its own branch-naming settings). Every drop-check in section 3 still comes back **0** against
> clean upstream. Five commits conflicted, in twenty-two files:
>
> - **Entry 14** — `ci.yml` was split into parallel jobs (`6f8e2534f` #14025, `ddcd31028`
>   #15041): rebuilt from upstream's new file with the standing rule re-applied, see the entry.
>   Six modify/delete conflicts, all deleted again — `release.yml`, `release-desktop.yml`,
>   `desktop-macos-preview-publish.yml` (`c57a04b72`, `8630e1ac7`, `783ccf0fd`), the two mobile
>   EAS workflows (`a3abb5266`, `8ed276c24`) and `scripts/smoke-cli-archive.ts` (`41a823984`,
>   still run only by the deleted `release-desktop.yml`). `CONTRIBUTING.md` and
>   `docs/operations/release.md` merged clean.
> - **Entry 17 — superseded.** Upstream's `de3439142` ships `branchNamingMode`,
>   `branchNamePrefix` and `branchNameInstructions` with web and mobile settings UI, applied by
>   `ThreadLaunchService` at the rename. The fork commit was skipped whole (section 4).
> - **Entry 19** — six files on upstream's cost-by-token-type report (`e8545b293` #15108), its
>   cached concurrent scan (`71dbaf1f9` #15149) and its presentation table switching from an
>   icon to a `driverKind` (`ProviderInstanceIcon`). Additive design unchanged; see the entry.
> - **Entry 6** — four files on server-tracked visits (`de3439142`, `c5a929e1a` #15034): the
>   acknowledgement now sits beside upstream's `resolveThreadLastVisitedAt`, and the entry's
>   reason to exist is sharper than before — upstream's Woke dismiss and archive actions stamp a
>   visit at the wake time, which would clear the dot without the thread being read.
> - **Entry 5** — seven files: `TurnId` → `RunId`, `ChatHeader.tsx` no longer hosts the git
>   actions (back to byte-identical), and the preselection now reaches `GitActionsControl`
>   through `ThreadDetailsPanel`, which only mounts while that panel is open — so the button
>   opens the panel, the control waits for git status before applying, and the request is
>   dropped once consumed. Re-derived, see the entry.
> - **Entry 18** — `Sidebar.logic.test.ts` only: upstream removed two neighbouring describe
>   blocks; the fork's block stays.
>
> Entries 12, 13, 15, 20 and 22 replayed clean. Entry 6's own test needed upstream's
> `latestRun` / `runtime` fixture names.
>
> **Verification.** Node **24.13.1** via nvm (the container ships 22). `pnpm install
--frozen-lockfile` clean. `tsc --noEmit` **0 errors** in contracts, shared, client-runtime,
> server, web, mobile and desktop. `vp lint` over the 50 fork-changed TypeScript files: **0
> errors** (warnings are React Compiler notes, nearly all on upstream lines). `vp fmt --check`
> over every fork-changed file and `vp run knip:check` pass. The fork-touched test files pass:
> server usage, registry and probe suites (95), shared usage merge and format (43), and the web
> unit files for ui state, sidebar logic, session logic, usage chart, breakdown, page and
> subscription usage (247). Nothing was checked in a browser.
>
> Keep syncing by rebase, not merge — a merge commit makes "what does this fork carry?" a graph
> question instead of a `git diff upstream/main HEAD` one.

## 3. Fork changes

> Entry numbers are **stable identifiers** and are never renumbered. A gap means the entry moved to
> section 4 or 5. Numbers 1, 4, 7, 8, 9, 10, 16, 17, 21, the symlink half of 12, the banner half
> of 15, the layout half of 18, the ownership half of 19 and the server half of 22 are superseded;
> 2, 3 and 11 are dropped.

### 5. Commit exactly the files a turn changed

- **Intent.** Committing a thread's work should not require hand-unchecking every unrelated dirty
  file. The completion "Changed files" card gets a **Commit** button beside "Open diff" that opens
  the commit modal with only this turn's files checked; the regular commit button still selects all.
- **Files:** `apps/web/src/session-logic.ts` (+ test), `components/ChatView.tsx`,
  `components/GitActionsControl.tsx`,
  `components/chat/{ChangedFilesTree,MessagesTimeline,ThreadDetailsPanel}.tsx`
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
- **Checked at `f2cc80a7`: re-derived, seven conflicts.** Drop-check empty. Upstream's
  `de3439142` renamed `TurnId` to `RunId` through the timeline, moved the header actions out of
  `ChatHeader.tsx` (now byte-identical to upstream again) into `ThreadDetailsPanel.tsx`, and
  gave `GitActionsControl` `displayMode` / `compact` / `onOpenChanges` props. The commit button
  uses the sibling's `ghost-muted` variant and upstream's mixed `lucide` / `lucide-react` icon
  imports. Upstream's own model of opening the commit dialog is unchanged
  (`setIsEditingFiles` / `setIsCommitDialogOpen` / `excludedFiles` still exist).
- **Browser-only:** the button-to-dialog flow. Unit tests cover path matching only.

### 6. Keep the completed dot until the thread is actually read

- **Intent.** Opening a thread instantly cleared its green completed dot, so it was easy to lose
  track of which completed threads had been looked at. The dot now survives until the completion is
  acknowledged by viewing the thread, and visit bumps that are not a read do not clear it —
  upstream stamps a visit at the wake time when a Woke notice is dismissed or the thread is
  archived (`useAcknowledgeThreadWoke`, `useThreadActions.ts`), which under the plain
  visited-watermark rule clears a completion nobody looked at.
- **Files:** `apps/web/src/uiStateStore.ts` (+ test), `components/Sidebar.logic.ts` (+ test),
  `components/Sidebar.tsx`, `components/ThreadStatusIndicators.tsx`, `components/ChatView.tsx`
- **Re-apply.** Anchor on the persisted-UI-state shape: mirror everything done for
  `threadLastVisitedAtById` (initial state, hydrate seed, persist, mark-unread reset) for a new
  `threadLastCompletionAcknowledgedAtById`. The acknowledged-at value reaches `hasUnseenCompletion`
  through `ThreadStatusInput` and its two call sites, **not** by patching the store read, and sits
  beside upstream's `resolveThreadLastVisitedAt` (server-tracked visits win over the local
  watermark; the acknowledgement is consulted first and falls back to that resolved visit).
  `ChatView` stamps the acknowledgement in its own effect at the run's `completedAt`; it does
  not touch upstream's visit dispatch. **Known limit:** the acknowledgement is browser-local
  while upstream's visits now sync through the server, so a device that acknowledged keeps its
  dot cleared even if another device marks the thread unread. The maintainer's refinement —
  only mark read after ~3s of visibility — is still unimplemented; this field is the seam for it.
  `LegacySidebar.tsx` is opt-in and untouched.
- **Drop it when:** upstream's `uiStateStore.ts` tracks a completion acknowledgement. Check with
  `grep -c AcknowledgedAt apps/web/src/uiStateStore.ts` against clean upstream.
- **Checked at `f2cc80a7`: keep, four conflicts resolved.** Drop-check **0**. Upstream's
  `de3439142` made visits server-tracked (`thread.lastVisitedAt`, `threadEnvironment.visit`,
  `resolveThreadLastVisitedAt`) and renamed `latestTurn` to `latestRun`; `c5a929e1a` (#15034)
  routes Woke dismissal through the same visit. The fork's reads of
  `threadLastCompletionAcknowledgedAtById` were re-seated next to upstream's resolved visit in
  `Sidebar.tsx` and `ThreadStatusIndicators.tsx`, `ChatView.tsx` keeps upstream's throttled visit
  dispatch untouched, and the fork's test fixture took upstream's `latestRun` / `runtime` names.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents working in this repo must know that `origin` is the fork and the only write
  target, that `upstream` is fetch-only, and that the fork's `README.md` banner and this file win
  merge conflicts.
- **Files:** `AGENTS.md` (two sections prepended to upstream's, after its intro and before
  `## What makes T3 Code special?`)
- **Re-apply.** Take upstream's `AGENTS.md` prose wholesale and re-insert the two fork sections.
  `CLAUDE.md` is **not** part of this entry — take upstream's regular file containing `@AGENTS.md`
  and do not restore the old symlink (see section 4).
- **Checked at `f2cc80a7`: keep, clean replay.** Upstream edited `AGENTS.md` three times this
  range (`a3fb5392e`, `094fb230e`, `ddcd31028`); the two fork sections merged clean after the
  intro.

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on this repo should see immediately that it is a rebasing fork and
  where the authoritative change list lives.
- **Files:** `README.md` (an "About this fork" blockquote before the `# T3 Code` heading), `FORK.md`
- **Re-apply.** The banner is delimited by `<!-- FORK-BANNER:START -->` / `<!-- FORK-BANNER:END -->`
  — **re-derive its text, never merge it**, since it goes stale every time an entry moves out of
  section 3. Refresh the rebase marker inside it too.
- **Checked at `f2cc80a7`: keep, refreshed.** Rebase marker moved to `f2cc80a7`; the banner
  no longer lists the worktree branch prefix (entry 17, section 4). Upstream's `README.md` edits
  merged clean below the banner.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it uses **standard GitHub-hosted runners**
  (upstream's `blacksmith-*` labels never resolve — jobs sat queued for 24h and were auto-cancelled)
  and needs **no credential beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted, not
  disabled. Beyond that, keep only the minimum the fork needs to build and to check code quality,
  and prefer GitHub-native actions.
- **Files:** `.github/workflows/{ci,desktop-artifacts}.yml`; deleted
  `.github/workflows/{release,release-desktop,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check,publish-aur,desktop-macos-preview,desktop-macos-preview-publish,windows-tests,cursor-hygiene-webhook}.yml`
  and `.github/VOUCHED.td`; deleted `scripts/smoke-cli-archive.ts` (only the deleted
  `release-desktop.yml` ran it, and `knip:check` fails on an orphaned script); fork notes in
  `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; fallout in `CONTRIBUTING.md`.
  Untouched and kept from upstream: `.github/actions/setup-apt-mirrors/`, `.github/scripts/`
  (including `stage-preview-bundle.py` and its test, which only the deleted preview-publish
  workflow uses), `.github/SECURITY.md`.
- **Kept (3 upstream workflows).** `ci.yml` with every Blacksmith runner swapped to `ubuntu-24.04`
  (upstream's parallel layout since `6f8e2534f` #14025: `lint`, `typecheck`, `build`, `test`,
  `test_web`, `test_server` × 6 shards, `transfer-report`, `rust`, `release_smoke`, and the
  `check` aggregate that branch protection names and that fails when any job in its `needs` does
  not succeed), both mobile jobs dropped — the macOS-only `mobile_native_static_analysis` and the
  `mobile_native_changes` gate that exists only to decide whether it boots — together with their
  two `needs` entries and the `check` job's `jq` exemption for the skipped lint, and the
  Blacksmith-image steps dropped (below). The `lint` job runs upstream's `vp check`, which
  includes `knip:check`, **on purpose**: it is a quality gate and it catches fork exports nothing
  imports. `issue-labels.yml` and `thread-transfer-report.yml` unmodified; the latter publishes
  the thread-transfer budget diff from the `thread-transfer-results` artifact produced by the
  **sharded `test_server`** job (the `transfer-report` job in `ci.yml` exists only to fail the
  run if no shard produced it), so dropping or renaming `test_server` would silently break it.
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
  `mobile-showcase-screenshots.yml`, `web-preview.yml` (Vercel tokens), `publish-aur.yml`
  (`AUR_SSH_PRIVATE_KEY`; it is a `workflow_call` target of the deleted `release.yml`, so nothing
  here would invoke it — `packaging/aur/` sources stay byte-identical and
  `packaging/aur/scripts/release.sh` still runs by hand), `cursor-hygiene-webhook.yml` (two
  `CURSOR_T3CODE_*` secrets), `windows-tests.yml` (`blacksmith-8vcpu-windows-2025`, manual-only,
  and by its own header nothing passes on Windows yet), `desktop-macos-preview-publish.yml`
  (`9a49d6d5` #11760: a `workflow_run` / `pull_request_target` publisher that signs fork-PR
  previews with the Apple secrets, on a Blacksmith runner). Credential-free but not needed:
  `desktop-macos-preview.yml` (Blacksmith runners, and it duplicates artifacts
  `desktop-artifacts.yml` already ships) and `mobile-fingerprint-check.yml` (it labels PRs that
  would break OTA reach until the next store build, and this fork ships no store builds).
  Upstream community governance: `pr-vouch.yml` + `.github/VOUCHED.td` and `pr-size.yml`.
  Fallout: `CONTRIBUTING.md` lost its `vouch:*` / `size:*` paragraph. (The fork used to also
  drop a guard in `infra/relay/scripts/deploy.test.ts` that read `release.yml` off disk; upstream
  deleted that test in `74796256`, so nothing remains.)
- **Blacksmith-image steps dropped from `ci.yml`.** `uses: ./.github/actions/setup-apt-mirrors`
  and the `sudo sed -i … /etc/apt/blacksmith-ubuntu-mirrors.txt` line (`4ade3651` #9864), now in
  both the `build` and the `test` job, address files that exist only on Blacksmith's Ubuntu
  image; on `ubuntu-24.04` the `sed` errors on the missing file and fails the job. Upstream's
  backgrounded `apt-get install libsecret-1-dev pkg-config` (start / finish step pair) stays.
  Two script-test steps are dropped because they test code for deleted workflows, scripts kept
  as-is: `node --test .github/scripts/check-nightly-release.test.cjs` (`7544d3d2`, the release
  scheduler) and `python3 -B .github/scripts/stage-preview-bundle.test.py` (`9a49d6d5`, the
  preview-publish staging).
- **Re-apply.** Highest-churn entry. Re-derive from upstream's **new** workflow files and re-apply
  the standing rule rather than force-keeping stale fork copies; a new upstream workflow is
  opt-**in** and ships only if it passes the rule and the fork actually needs it. Separately,
  `desktop-artifacts.yml` is fork-owned and can drift against upstream's desktop build requirements
  **without ever showing up as a merge conflict** — diff it against upstream's
  `release-desktop.yml` build job and `scripts/build-desktop-artifact.ts`'s flags on every sync.
  The `lint` job runs `vp check`, which includes `vp fmt --check`, so an upstream formatting
  break lands `main` red here even when the fork changed nothing; repair it in place and drop
  the repair once upstream fixes the file.
- **Checked at `f2cc80a7`: re-derived `ci.yml`, six deletions re-applied.** Upstream's
  `6f8e2534f` (#14025) split the old `check` job into `lint`, `typecheck` and `build`, split the
  web tests out of `test`, took `test_server` to six shards on 4-vCPU Blacksmith runners, added
  the `transfer-report` artifact gate and the `check` aggregate; `ddcd31028` (#15041) retargeted
  the transfer-budget comment at V2's integration test. The fork file was rebuilt from upstream's
  new one by rule — nine runner labels to `ubuntu-24.04`, two `setup-apt-mirrors` uses and two
  mirror `sed` lines removed, the two deleted-workflow script tests removed, the mobile jobs
  removed with their `needs` entries and `jq` exemption — and nothing else. Every deleted workflow
  upstream touched this range still needs Blacksmith or a secret: `release.yml` (`783ccf0fd`
  Vercel early builds, `c57a04b72` Windows no longer waits for Linux), `release-desktop.yml`
  (`c57a04b72`, `8630e1ac7` trimmed Windows setup), `desktop-macos-preview-publish.yml`
  (`c57a04b72`), `mobile-eas-preview.yml` (`a3abb5266` pinned `eas-cli`),
  `mobile-eas-production.yml` (`8ed276c24`, `de3439142`); `scripts/smoke-cli-archive.ts`
  (`41a823984`) is still invoked only by the deleted `release-desktop.yml`. `CONTRIBUTING.md`
  (`024d49520`, `ddcd31028`) merged clean; the fork's fallout is still the two `vouch:*` /
  `size:*` sentences. **Desktop build drift:** `scripts/build-desktop-artifact.ts` changed only
  in `de3439142`; `--platform`, `--target`, `--arch` and `--verbose` are unchanged, `--signed`,
  `--skip-build` and `--wsl-runtime` are still the flags the fork never passes, and no new
  required env appeared (upstream's new per-platform caches of the resource monitor and its
  Windows wait for the Linux CLI archive are speed-ups and signing plumbing the fork does not
  need). `grep -rn blacksmith .github/workflows/` matches only the explanatory comment in
  `desktop-artifacts.yml`, plus upstream's own capitalised note on the C toolchain step.

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
- **Checked at `f2cc80a7`: keep, clean replay.** Both server drop-checks still come back **0**.
  `ClaudeProvider.ts` and `ProviderInstanceCard.tsx` took unrelated upstream edits (`de3439142`,
  `f2cc80a7a` icon morphs) clear of the fork's classification and config-directory row.
  `claudeSignedOutMessage` is still used only at turn time, now from
  `orchestration-v2/Adapters/ClaudeAdapterV2.ts`.

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
     `shouldCreateNewThreadInCurrentProject`, so the old rule is untouched.
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
- **Checked at `f2cc80a7`: keep, one conflict resolved.** Upstream's `handleNewThreadClick`
  still never looks at the scope, including after `de3439142`: its unscoped path is the same
  `startNewThreadFromContext` / palette split the fork delegates to. Only `Sidebar.logic.test.ts`
  conflicted, where upstream (`de3439142`) removed the two describe blocks the fork's
  `resolveNewThreadClickTarget` block used to follow; the fork's block stays, nothing else.
  `Sidebar.tsx`, `Sidebar.logic.ts`, `SidebarThreadHeader.tsx` and the docs merged clean.
- **Browser-only:** the scoped tooltip on upstream's new icon button.

### 19. Usage reports each provider instance separately

- **Intent.** Everything downstream of the scan grouped by `UsageProviderKind`, so a work and a
  personal Claude Code collapsed into one row — the exact question a second account is
  configured to answer was unanswerable. The report's unit of display is now the provider
  instance: one line, row and column per configured instance that spent anything, under the
  name and accent color the user gave it. (This entry used to also fix a double count in
  ownership dedupe; upstream now resolves ownership per source directory. See section 4.)
- **Files:** `packages/contracts/src/usage.ts`, `packages/shared/src/{usageMerge,usageFormat}.ts`
  (+ tests), `apps/server/src/usage/UsageService.ts` (+ test),
  `apps/web/src/components/usage/{UsagePage,UsageProviderChart,usageProviders}.{ts,tsx}`
  (+ tests, one fixture line in `usageBreakdown.test.ts`), `apps/mobile/src/features/usage/*`,
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
  2. **The server stamps the three fields in upstream's `resolveTranscriptDirs` loop** and on
     Antigravity's per-instance profile directories, nothing else. The per-driver instance list
     is sorted default slot first, then by id, so instances sharing a directory report under the
     id a single-account setup already shows (the `seen` dedupe keeps the first).
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
     `UsagePage.test.tsx`, which mocks `PROVIDER_PRESENTATION` with two providers.
  9. **Only the chart's `PeriodTotals` is a `Pick<…, "byInstance">`**, so test fixtures that
     build periods without `byProvider` still typecheck.
- **Drop it when:** upstream's `UsageSource` or `UsageBucket` carries an instance id. Check with
  `grep -c instanceId packages/contracts/src/usage.ts` against clean upstream. If upstream ships
  its own per-instance breakdown, drop this whole entry.
- **Checked at `f2cc80a7`: keep, six conflicts resolved.** Drop-check **0**. The additive design
  held: `usage.ts`, `usageMerge.ts` and `usageFormat.ts` merged clean around upstream's new
  `categoryCostUsd` / speed fields and `CategoryCost` / `SpeedCost` outputs (`e8545b293` #15108,
  `56914128c`), and `UsageService.ts` kept the three stamped fields through upstream's concurrent
  cached read (`71dbaf1f9` #15149) and preview-model folding (`b05adb70b`). Web:
  `usageProviders.ts` keeps upstream's `driverKind` and adds `shades`; `UsageProviderChart.tsx`
  draws the tooltip marks with `ProviderInstanceIcon`; `UsagePage.tsx` keeps upstream's model
  rows (dialog button, share bar, rank column) keyed per instance and tints the bar with the
  series colour. Mobile: `usageProviders.ts` carries upstream's `useUsageMixColors` beside the
  fork's `useUsageSeries`; `UsageRouteScreen.tsx` keeps upstream's new `CostSection`.
  `usageBreakdown.test.ts` still needs its one `instanceId` fixture line.

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
- **Checked at `f2cc80a7`: keep, clean replay.** `scripts/build-desktop-artifact.ts` changed
  only in `de3439142`; `resolveGitHubPublishConfig` still reads
  `T3CODE_DESKTOP_UPDATE_REPOSITORY` first, still requires exactly `owner/repo`, and the new
  nightly / latest `updateChannel` split happens after that check, so the single-segment value
  still yields no publish config. `SidebarChrome.tsx` took one upstream edit (`de3439142`) clear
  of the utility item; `branding.ts`, `vite.config.ts` and `vite-env.d.ts` are unchanged.
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
     explained on the Limits view; in the composer silence is the right answer. Which providers
     report `usageLimits` at all is upstream's call and needs no fork change: `eff44be4`
     (#12115) added OpenCode Go, Cursor and Grok, and their rows appeared in the picker and the
     bubble on their own. Antigravity still reports none and stays silent.
  4. **The composer hands the field over raw** (`selectedProviderEntry?.snapshot.usageLimits`) and
     the meter/picker apply `usableSubscriptionUsage`; keep it that way for the reason in 2.
- **Drop it when:** upstream renders `usageLimits` inside the model picker or the context meter.
  Check with `grep -c usageLimits apps/web/src/components/chat/ModelPickerContent.tsx
apps/web/src/components/chat/ContextWindowMeter.tsx` against clean upstream. Upstream's
  `/usage-limits` command (`183c3433`) is the nearest thing so far and does not count: it renders
  above the composer on request, not in the picker.
- **Checked at `f2cc80a7`: keep, clean replay.** Both drop-checks come back **0**; `usedPercent`
  still crosses the wire. `ChatComposer.tsx`, `ModelPickerContent.tsx` and
  `ContextWindowMeter.tsx` took three upstream commits between them and merged clean around the
  fork's hunks; `SubscriptionUsageMeters.tsx` and the logic file are unchanged.
- **Browser-only:** the picker footer and the Subscription section of the context bubble.

## 4. Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not re-introduce them.**

| #            | Fork change                             | Superseded by                                                                                 | Verified at |
| ------------ | --------------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode            | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_                              | `8c3b5bef`  |
| 4            | Terminal Ctrl-chord forwarding          | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_                         | `8c3b5bef`  |
| 5 (core)     | Thread-scoped changed files             | `AssistantChangedFilesSection` per-turn checkpoints                                           | `8c3b5bef`  |
| 7            | Shell-style composer recall             | `fd773172` — _feat(web): recall sent prompts with the up arrow (#9173)_                       | `8c3b5bef`  |
| 8            | Full timestamp on hover                 | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`                             | `8c3b5bef`  |
| 9            | Always-visible new-thread btn           | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_                            | `8c3b5bef`  |
| 10           | Package-local vitest configs            | `vp` (vite-plus) test-runner migration                                                        | `8c3b5bef`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md`       | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_                     | `8c3b5bef`  |
| 15 (banner)  | Status banner prefers server msg        | `06336460` — _feat(providers): add Google Antigravity via the official ACP agent (#9348)_     | `8c3b5bef`  |
| 16           | Usage scans every provider instance     | `2db675ae` — _fix(usage): respect provider account homes (#11485)_                            | `8c3b5bef`  |
| 22 (server)  | Subscription usage collection           | `19d8ab2a` — _feat(usage): show Codex and Claude subscription limits on a Limits tab (#9507)_ | `8c3b5bef`  |
| 18 (layout)  | Labelled new-thread btn under scope row | `d1d15c67` — _feat(sidebar): fold the project scope into the search row (#11315)_             | `8c3b5bef`  |
| 21           | New project inside the scope menu       | `d1d15c67` — _feat(sidebar): fold the project scope into the search row (#11315)_             | `8c3b5bef`  |
| 19 (owner)   | Usage ownership resolved per instance   | `e5a46d6c5` — _feat(usage): read cursor, opencode, and antigravity history (#10409)_          | `6b286ae8`  |
| 14 (repair)  | `pnpm-workspace.yaml` placeholder fix   | `803f94e78` — _fix(release): drop placeholder allowBuilds entry that broke desktop builds_    | `6b286ae8`  |
| 17           | Configurable worktree branch prefix     | `de3439142` — _feat(orchestrator): introduce new orchestrator (#2829)_                        | `f2cc80a7`  |

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
  / `custom`), `branchNamePrefix` (default `t3code`) and `branchNameInstructions`, with
  `BranchNamingSettings.tsx` on web **and** mobile (which the fork never had) and
  `formatGeneratedBranchName` in `@t3tools/shared/git` applying the prefix at the rename. That
  is the intent — no vendor name in PR head branches, repositories with branch-naming rules
  satisfiable from a setting — arrived at independently and wider. What upstream does not do is
  namespace the transient placeholder: a worktree still exists as `t3code/<8 hex>` until the
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
