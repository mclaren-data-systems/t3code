# Fork notes (mclaren-data-systems/t3code)

## Purpose of this fork

This is a development fork of pingdotgg/t3code, maintained at mclaren-data-systems/t3code.
It tracks `pingdotgg/t3code` closely and deliberately carries only a thin layer of changes.
It is not a hard fork: every entry below is provisional, and whenever upstream ships
an equivalent or the change is somehow negated the fork change is dropped rather than defended.
The goal is to rebase onto upstream indefinitely, so the active diff stays as small as
possible and changes are reapplied based on intent, not directly based on the specific change's
existing implementation. In practice that thin layer has converged on one substantive thing —
**a CI/workflow set a fork can actually run** (standard GitHub-hosted runners instead of
upstream's Blacksmith ones, nothing needing credentials a fork lacks, and unsigned desktop
artifacts built on every push to `main` and published as pruned development-build
prereleases) — plus this file and the `README.md` fork banner that
points at it. Alongside it the fork carries the three multi-instance provider changes
(entries 15, 16 and 19), a configurable worktree branch prefix (entry 17), one sidebar layout
change (entry 18), and three web UX changes re-derived at the 2026-08-22 rebase (entries 5, 6
and 7 — commit-preselect from a turn's changed files, the completed dot persisting until read,
and shell-style composer message recall), so `apps/` and `packages/` differ from upstream.
`native/`, `scripts/`,
`pnpm-lock.yaml`, and `pnpm-workspace.yaml` are byte-identical to upstream; the only thing
under `packaging/` and `infra/` that differs is a fork note in a README (plus the dropped
release-workflow guard in `infra/relay/scripts/deploy.test.ts` — see entry 14).

This file is the authoritative list of changes that set this fork
(`mclaren-data-systems/t3code`, branch `main`) apart from upstream. It is
written to be used by a human or an AI agent when **rebasing onto / merging a
newer upstream, or re-applying these changes**.

When you reset/sync, work through every entry below. For each one:

1. Check whether upstream has since implemented an equivalent fix. If it has, **drop** the
   fork change and move it to "Superseded changes" with a note naming the upstream change
   that replaced it.
2. Otherwise re-apply the changes, adapting to any code that moved and prioritizing the
   upstream changes while reimplementing the intent of the downstream changes. Re-run focused
   verification for touched packages (see the tooling note below).
3. Keep this file in sync: update the "Last rebase" marker, and move entries between the
   "Active", "Superseded", and "Dropped" sections as upstream evolves.

> **Last rebase onto upstream:** **2026-08-22**, onto `pingdotgg/t3code` `main` at
> **`2c4158f8`** — _fix(web): handle wide ordered-list marker edge cases (#7856)_. This rebase
> takes in **12 upstream commits** (`c3e37094..2c4158f8`) and replayed the fork's 16 commits
> **without a single conflict**. It was performed on the working branch
> `claude/fork-alignment-reimplement-4pk37r` (PR #15 — never mergeable as a PR, since a
> history-rewriting rebase conflicts with `main` by construction, which also means GitHub runs
> no `pull_request` CI on it) and landed by force-pushing `main` to the branch tip on
> **2026-08-22**. The overwritten tip `35664cdc` (based on `c3e37094`, 2026-08-21) **was backed
> up** to `origin/backup/main-pre-rebase-2026-08-22`. The `35664cdc` history had replaced
> `1ffbbbbb` (based on `db0659fe`), which had itself replaced `8d6b5a56` (based on `9821bca1`,
> 2026-08-10) and `baaa8682` (based on `de592a00`, 2026-08-05).
>
> **Nothing was superseded at this rebase.** All eight carried entries (12, 13, 14, 15, 16, 17,
> 18, 19) were re-checked against `2c4158f8` and still apply — upstream touched no workflow, no
> usage code, no provider-status code, and neither `Sidebar.tsx` nor `git.ts` in this range (its
> 12 commits are composer/markdown/terminal fixes, project favicons, thread-search hardening,
> and a new `041_AuthSessionClientConnection` migration). The three previously-unshipped
> entries (5, 6, 7) were **re-implemented on this branch at this rebase** after their own
> redundancy checks came back "keep"; see their entries.
>
> Older marker history: `main` was rewritten by force-push at the 2026-08-21 rebase. The
> overwritten tip `1ffbbbbb` **was backed up** to `origin/backup/main-pre-rebase-2026-08-21`,
> as `8d6b5a56` was to `origin/backup/main-pre-rebase-2026-08-17` and `baaa8682` to
> `origin/backup/main-pre-rebase-2026-08-10`. The two rebases before those overwrote tips
> (`563d725d`, `ba07e561`) that were never pushed anywhere and remain recoverable only from
> GitHub's unreachable-object retention. Keep syncing by rebase, not merge — a merge commit
> costs nothing here but it makes "what does this fork actually carry?" a graph question
> instead of a `git diff upstream/main HEAD` one.

> **Verification note:** some test failures are **environmental, not regressions** — always
> diff against clean upstream before chasing one. Three seen repeatedly, all in files this
> fork does not touch:
>
> - `packages/shared/src/Net.test.ts` → `findAvailablePort returns preferred when it is free`
>   fails **in containers without IPv6** (`/proc/net/if_inet6` empty).
> - **Four `chmod`-based permission tests fail when the suite runs as root** (`id -u` is 0) —
>   they set a path to `0o000`/`0o400`/`0o500` and assert the following operation fails, but
>   root ignores the mode bits, so the expected error never arrives. As of `de592a00` these
>   are `scripts/update-release-package-versions.test.ts` (manifest write),
>   `apps/server/src/server.test.ts` (keybindings-config write, and workspace-root stat), and
>   `apps/server/src/terminal/Manager.test.ts` (cwd stat). Confirm with a one-liner —
>   `node -e "fs.chmodSync(d,0)…"` succeeding as uid 0 — before treating any of them as a
>   regression; re-run as a non-root user to see them pass.
> - Several server tests (ACP adapters, some `ProviderRegistry`) fail **locally on Windows**
>   (process-spawn / POSIX-path assumptions) but pass on Linux CI.
> - **Timing-sensitive server tests flake on a loaded or CPU-starved runner.** Seen at the
>   2026-08-21 rebase: `GrokAdapter.test.ts` (_retains turn transcript when sendTurn is
>   interrupted after prompt success_) and one spawn-ordering assertion in
>   `ProviderRegistry.test.ts` each failed once inside a 574-test run, then passed three
>   consecutive times when run as their own file pair, and the full run went green on a
>   re-run. Re-run the failing file alone before treating this class as a regression.
>
> Note that `vp run` **bails on the first failing task**, so one environmental failure hides
> every package after it — re-run the survivors with `--filter` before concluding the suite
> is green. The composer arrow-key recall (entry 7) has unit tests for its pure navigation
> rules only and the commit-preselect button (entry 5) for its path matching only — the
> actual key handling and dialog interactions are **browser-only** and must be confirmed
> in-app after any composer or git-dialog rework.

> **Tooling note:** upstream uses **pnpm@11 + node ^24** (pnpm catalogs in
> `pnpm-workspace.yaml`) and the `vp` (vite-plus) scripts. The **node version matters**:
> `package.json` pins `engines.node: ^24.13.1`, and a node 22 host will need `nvm install 24`
> before `pnpm install` behaves. The rebase checklist is `pnpm install --frozen-lockfile` →
> `pnpm run typecheck` → `pnpm run test`; the `--frozen-lockfile` step is the one that catches
> a `pnpm-lock.yaml` that replayed badly, which is the most likely silent breakage in a rebase
> that reports no conflicts.
>
> **What was verified at the 2026-08-22 rebase:** the host had node 22, so **node 24.19.0 was
> fetched from `nodejs.org/dist/latest-v24.x` and put on `PATH`** before anything else — the
> cheapest way to satisfy `engines.node: ^24.13.1` without a version manager.
> `pnpm install --frozen-lockfile` **succeeded and left `pnpm-lock.yaml` untouched**
> (`git status` clean afterwards), which is the check that a replayed lockfile is sound.
> `vp run --filter @t3tools/contracts --filter @t3tools/shared --filter t3 --filter
@t3tools/web typecheck` is clean (only pre-existing `unnecessaryFailYieldableError`
> _suggestions_ in untouched upstream files — `orchestration/decider.ts`,
> `orchestration/workflowScriptQuery.ts`, `pullRequest/GitLabPullRequestCli.ts`). `vp test run
apps/server/src/provider apps/server/src/usage packages/shared/src/git.test.ts
packages/shared/src/usageMerge.test.ts packages/shared/src/usageFormat.test.ts` is
> **620 passed / 6 skipped**, and the web/settings/usage/sidebar/reactor batch (`vp test run
apps/web/src/components/settings apps/web/src/components/chat/ProviderStatusBanner.test.tsx
apps/web/src/components/Sidebar.logic.test.ts apps/web/src/components/usage
apps/server/src/orchestration/Layers/ProviderCommandReactor.test.ts`) is **287 passed**, all
> on the first attempt. The re-implemented entries 5, 6 and 7 each ran their own focused tests
> green (see their entries), and `vp lint` / `vp fmt --check` are clean over every file they
> touch.
>
> Fork-specific checks: the kept `thread-transfer-report.yml` publisher test (`node --test
.github/scripts/thread-transfer-report.test.cjs`) passes 6/6; `infra/relay/scripts/deploy.test.ts`
> passes 9/9 with its dropped release-workflow guard; every kept workflow is on a standard
> GitHub-hosted runner with no secret beyond `GITHUB_TOKEN` (`grep -rn blacksmith
.github/workflows/` still hits only the explanatory comment in `desktop-artifacts.yml`); and a
> repo-wide grep for the deleted workflow filenames turns up only the two intentional fork notes.

> **Migration caution — no longer applies, but keep the rule.** The fork carries **no**
> migrations of its own (`git diff upstream/main HEAD -- apps/server/src/persistence/` is
> empty); upstream's set runs to `041_*` unmodified. If a future change reintroduces a
> fork-only migration, renumber it to sort after upstream's latest and verify `Migrations.ts`
> registers the merged set exactly once — a collision here is a data-corruption bug, not a
> merge annoyance.

---

## Active changes — this fork

> Entry numbers are **stable identifiers** tied to the original fork commits — they are
> never renumbered. A gap in the sequence means that entry moved to "Superseded changes"
> or "Dropped changes"; look for it there.
>
> **Carried on `main` today:** 12 (its `AGENTS.md` sections only — the symlink half is now
> upstream's), 13, 14, 15, 16, 17, 18, 19 — workflows, fork documentation, and five source
> changes: 15, 16 and 19 (all three from the same multi-instance provider investigation), 17
> (configurable worktree branch prefix), and 18 (sidebar new thread button). **On the
> `claude/fork-alignment-reimplement-4pk37r` branch, not yet on `main`:** the 2026-08-22 rebase
> onto `2c4158f8` and the **re-implementations of 5 (commit-preselect remainder), 6
> (completed dot until read), and 7 (composer arrow-key recall)**. Those three had been
> fork-intent-only since their PR branches were deleted; they were re-derived against current
> upstream at this rebase (entries 6 and 7 with `refs/pull/7/head` `8c295d66` and its parent
> `85082673` as references, entry 5 from this file's notes alone — its original commit
> `e6990e3` survives nowhere).
>
> Entry 11 (TODO list moved into this file) was **removed from this list by the maintainer**
> in `f194c2d6` — the TODO section at the bottom of this file remains, only the entry
> documenting the old `TODO.md` deletion is gone. Treat 11 as a permanently retired number.

### 5. Open the commit modal with only the thread's own changed files pre-checked

- **Files:** `apps/web/src/session-logic.ts` (+ test),
  `apps/web/src/components/ChatView.tsx`,
  `apps/web/src/components/GitActionsControl.tsx`,
  `apps/web/src/components/chat/ChangedFilesTree.tsx`,
  `apps/web/src/components/chat/ChatHeader.tsx`,
  `apps/web/src/components/chat/MessagesTimeline.tsx`
- **Commits:** branch `claude/fork-alignment-reimplement-4pk37r` (**re-implemented
  2026-08-22**; the original `e6990e3` survives nowhere and this was re-derived from this
  entry's notes alone)
- **What:** The completion "Changed files" card gets a **Commit** button beside "Open diff"
  that opens the commit modal with exactly the files this turn touched pre-checked
  (checkboxes shown automatically via `isEditingFiles`); the regular commit button still
  selects all files.
- **Why:** Committing a thread's work should not require hand-unchecking every unrelated
  dirty file in the worktree.
- **How it is wired:** The file list comes from the turn's checkpoint diff summary — the same
  `TurnDiffSummary` upstream's `AssistantChangedFilesSection` renders — so nothing re-derives
  per-turn attribution. `ChangedFilesCard` takes an optional `onCommitTurnFiles`; ChatView
  provides it through the timeline row context and holds a `GitCommitPreselection`
  (`{ filePaths, requestId }`) state that flows through `ChatHeader` into
  `GitActionsControl`, where an effect keyed on `requestId` seeds `excludedFiles` (working
  tree minus the preselection), turns on the checkbox list, and opens the dialog.
  `deriveCommitExcludedFilePaths` / `normalizeWorkspaceRelativeFilePath` in
  `session-logic.ts` do the checkpoint-vs-git-status path matching (separators, `./`
  prefixes, case) with unit tests. Expect the `GitActionsControl` wiring to need adaptation
  whenever upstream reworks that dialog.
- **Redundancy check (as of `2c4158f8`): keep — the display half is upstream's, the
  commit-preselect button is fork-carried.** Upstream's `AssistantChangedFilesSection`
  attributes changed files per turn (see "Superseded changes"); no `preselect`-style symbol
  exists in upstream's `apps/web/src`, and `GitActionsControl.tsx` took zero upstream commits
  in `c3e37094..2c4158f8`.
- **Verified:** `vp test run apps/web/src/session-logic.test.ts` (78 passed, 3 new),
  `apps/web/src/components/chat/MessagesTimeline.test.tsx` +
  `GitActionsControl.logic.test.ts` (90 passed) and `ChangedFilesTree.test.tsx` (9 passed)
  untouched-green, web typecheck clean, `vp lint` / `vp fmt --check` clean on the touched
  files. The button-to-dialog flow itself is browser-only and should be confirmed in-app.

### 6. Keep the completed (green) dot until the thread is read

- **Files:** `apps/web/src/uiStateStore.ts` (+ test),
  `apps/web/src/components/Sidebar.logic.ts` (+ test),
  `apps/web/src/components/Sidebar.tsx`,
  `apps/web/src/components/ThreadStatusIndicators.tsx`,
  `apps/web/src/components/ChatView.tsx`
- **Commits:** branch `claude/fork-alignment-reimplement-4pk37r` (**re-implemented
  2026-08-22**, re-derived with `85082673` — the parent of `refs/pull/7/head` — as reference;
  the original `2f440ff` survives nowhere)
- **What:** Track `threadLastCompletionAcknowledgedAtById` in the persisted UI
  state (seeded from `threadLastVisitedAtById` for legacy blobs, persisted and
  reset alongside it on mark-unread). `hasUnseenCompletion` prefers the
  acknowledgement timestamp over last-visited (falling back for callers that
  don't pass it), and `ChatView` stamps the acknowledgement on visit at the
  turn's `completedAt` — the same effect that stamps the visit. The sidebar
  keeps a thread's green completed dot until the completion is acknowledged by
  viewing the thread; wake-driven visit bumps (`markThreadVisited` from the
  snooze/wake paths) no longer clear it.
- **Why:** Opening a thread instantly cleared the dot, so it was easy to lose
  track of which completed threads had actually been looked at.
- **Re-apply notes:** Anchor on the persisted-UI-state shape in
  `uiStateStore.ts` (mirror everything done for `threadLastVisitedAtById`:
  initial state, hydrate seed, persist, mark-unread reset). The acknowledged-at
  value reaches `hasUnseenCompletion` through `ThreadStatusInput` (widened with
  `completionAcknowledgedAt`) and its call sites in `Sidebar.tsx`
  (`SidebarThreadRow`'s `isUnread`) and `ThreadStatusIndicators.tsx`
  (`ThreadRowLeadingStatus`) — not by patching the store read. The outstanding
  TODO refinement — only mark read after ~3s of visibility — is **still not
  implemented**; the acknowledgement field is the seam for it. `LegacySidebar.tsx`
  is opt-in and untouched.
- **Redundancy check (as of `2c4158f8`): keep.** Upstream's `uiStateStore.ts` still tracks
  only `threadLastVisitedAtById`; no acknowledged-at equivalent exists anywhere in upstream's
  `apps/web/src`. Neither `uiStateStore.ts`, `Sidebar.logic.ts`, `Sidebar.tsx` nor
  `ThreadStatusIndicators.tsx` took an upstream commit in `c3e37094..2c4158f8`.
- **Verified:** `vp test run apps/web/src/uiStateStore.test.ts
apps/web/src/components/Sidebar.logic.test.ts` (128 passed, 4 new: acknowledgement
  monotonic guard, mark-unread reset, hydrate seeding, acknowledgement-over-visit in
  `hasUnseenCompletion`), web typecheck clean, `vp lint` / `vp fmt --check` clean on the
  touched files.

### 7. Per-thread composer message history (arrow-key recall)

- **Files:** `apps/web/src/threadMessageHistory.ts` (new, + test),
  `apps/web/src/threadMessageHistoryStore.ts` (new),
  `apps/web/src/components/chat/ChatComposer.tsx`
- **Commits:** branch `claude/fork-alignment-reimplement-4pk37r` (**re-implemented
  2026-08-22**, with `refs/pull/7/head` `8c295d66` as reference; the original `274d317`
  survives nowhere)
- **What:** Every sent message is appended to a per-thread history (capped at
  `THREAD_MESSAGE_HISTORY_LIMIT = 100`, persisted via
  `threadMessageHistoryStore`, keyed by `scopedThreadKey`). In the composer,
  ArrowUp recalls older messages and ArrowDown moves forward again, shell-style
  — but only when the cursor is on the first line (up) or last line (down)
  (`isThreadMessageHistoryBoundary`); otherwise arrows move the cursor
  normally. The in-progress draft is stashed and restored when navigating back
  past the newest entry (`resolveThreadMessageHistoryNavigation`), and editing
  a recalled message restarts navigation from the newest one.
- **Why:** Recover/resend prior messages quickly, like terminal input history.
- **How it is wired (the part that must be redone on composer rework):** the pure module
  ported verbatim; the composer hook sits in `ChatComposer`'s `onComposerCommandKey`,
  **after** the slash/mention/skills menu handling and the Enter submission intent, so
  history only sees arrow keys the menu declined (Lexical's `registerCommand` in
  `ComposerPromptEditor.tsx` feeds that handler and stays untouched). Navigation reads the
  editor through the existing `readComposerSnapshot`, applies prompts through the draft-store
  `setPrompt` path plus cursor/trigger updates, and the history append sits behind
  `submitComposerDraft`'s `didDispatch` so validation failures don't record phantom entries.
- **Redundancy check (as of `2c4158f8`): keep.** No `threadMessageHistory` /
  `THREAD_MESSAGE_HISTORY` symbols upstream; the composer still has no history recall.
  `ChatComposer.tsx` took two upstream commits in `c3e37094..2c4158f8` (`e0b4f463` #7821
  cmd+enter background threads, `b381fdb1` #7794 launcher-shortcut guard) — both replayed
  clean and neither adds an ArrowUp/ArrowDown claimant.
- **Verified:** `vp test run apps/web/src/threadMessageHistory.test.ts` (3 passed — limit
  trimming, boundary detection, backward/forward walk with draft restore), web typecheck
  clean, `vp lint` / `vp fmt --check` clean on the touched files. The arrow-key interaction
  itself is browser-only (no composer unit tests exist) and should be confirmed in-app.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Files:** `AGENTS.md`, `CLAUDE.md`
- **Commits:** `4e93085`, `16c78b6`
- **What:** Two sections prepended to upstream's `AGENTS.md` — **Git & GitHub Policy**
  (`origin` is the fork and is the only write target; `upstream` is read-only and is only
  ever `git fetch`ed) and **Fork-First Policy** (`README.md`'s fork banner and this file win
  merge conflicts; no scratch/analysis markdown in the repo).
- **Re-apply notes:** What is carried is just those two fork sections sitting on upstream's
  own `AGENTS.md`. **`CLAUDE.md` is no longer part of this entry** — take whatever upstream
  ships for it (as of `c3e37094` a regular file containing `@AGENTS.md`) and do not restore
  the old fork symlink; see "Superseded changes". The rule the old note encoded still holds
  as a rule, though: `@AGENTS.md` works as _file content_ and not as a symlink target, so a
  `CLAUDE.md` that is a symlink must point at the literal path `AGENTS.md`.
- **Redundancy check (as of `c3e37094`; re-checked clean at `2c4158f8` — upstream did not touch `AGENTS.md` or `CLAUDE.md` in that range): keep, clean replay.** The two fork sections still sit
  after upstream's two-paragraph intro and before `## What makes T3 Code special?` (lines 7 and
  17). Upstream touched `AGENTS.md` three times in this range — `45a2c4b2` (#7658, user count),
  `9167622a` (#7665, implementation plans move out of the repo) and `9f12eab3` (#7762, PR assets
  stop being committed) — all far below the insertion point, so it replayed without a conflict.
  `CLAUDE.md` is upstream's regular file containing `@AGENTS.md`, unchanged. Expect a conflict on
  any rebase that rewrites upstream's intro; keep the fork sections, take upstream's prose.

### 13. Housekeeping: `README.md` fork banner and this file

- **Files:** `README.md`, `FORK.md`
- **What:** An "About this fork" blockquote prepended to `README.md` (before the `# T3 Code`
  heading), plus this file.
- **Re-apply notes:** The banner is delimited by `<!-- FORK-BANNER:START -->` /
  `<!-- FORK-BANNER:END -->` — re-derive the text between them rather than merging it, since
  it goes stale every time an entry moves out of "Active".
- **Redundancy check (as of `2c4158f8`): keep, refreshed.** Upstream made **no** `README.md`
  change in `c3e37094..2c4158f8`, so the banner replayed untouched. Its body needed a real
  edit again: the previous text still described "two server fixes" from entries 15 and 16,
  which went stale when 17, 18 and 19 landed on `main` and staler still when 5, 6 and 7 were
  re-implemented at this rebase. The banner now summarizes the carried layer at that
  granularity, and the rebase marker inside it moved to `2c4158f8` / 2026-08-22.

### 14. A workflow set this fork can actually run

- **Files:** `.github/workflows/ci.yml`, `.github/workflows/desktop-artifacts.yml` (new),
  deleted `.github/workflows/{release,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check}.yml`
  and `.github/VOUCHED.td`, plus `.github/workflows/publish-aur.yml`; fork notes in
  `docs/internals/ci.md`, `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; `CONTRIBUTING.md` and `infra/relay/scripts/deploy.test.ts` fallout
- **Commits:** `dbbb3b07`, `9c3dd8f5`
- **Standing rule:** a workflow stays in this fork only if it can actually run
  here — **standard GitHub-hosted runners** (upstream's `blacksmith-*` labels do
  not resolve; jobs sit queued for 24h and are auto-cancelled) and **no
  credentials beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted,
  not disabled. Verified against the fork's run history: 30+ consecutive
  scheduled `Release` runs were cancelled after the 24h queue timeout, and the
  only push-triggered `CI` run ever recorded went the same way.
- **Kept (3 upstream workflows):**
  - `ci.yml` — every Blacksmith runner → `ubuntu-24.04` (as of `c3e37094` that is
    `blacksmith-8vcpu-ubuntu-2404` on `check` / `test` / `test_server` / `release_smoke` and
    `blacksmith-4vcpu-ubuntu-2404` on `rust`), and **both** mobile jobs dropped: the macOS-only
    `mobile_native_static_analysis` (this fork does not target mobile, and its
    `blacksmith-6vcpu-macos-26` runner is unavailable to it) and the
    `mobile_native_changes` gate that exists only to decide whether to boot it. Note the
    thread-transfer budget report is published from the `test_server` job, not `test` — see
    `thread-transfer-report.yml` below.
  - `issue-labels.yml` — unmodified; `GITHUB_TOKEN` only, and it bootstraps the
    labels `.github/ISSUE_TEMPLATE/*.yml` apply.
  - `thread-transfer-report.yml` — **adopted at the 2026-08-10 rebase**, unmodified. Arrived
    with `ddfe45c6` (#5350) and passes the standing rule as shipped: upstream wrote it on
    `ubuntu-24.04` (not Blacksmith) with `secrets.GITHUB_TOKEN` only. It runs on
    `workflow_run` against `workflows: [CI]` — a workflow this fork keeps — and comments the
    thread-transfer budget diff from the `thread-transfer-results` artifact that #5350 also
    added to `ci.yml`. **As of `d7b9a689` (#7286) that artifact is produced by the sharded
    `test_server` job, not `Test`** — one shard writes it and the upload is gated on the file's
    presence so exactly one `thread-transfer-results` artifact exists per run, which is the name
    this workflow resolves. Dropping or renaming `test_server` would silently break it. Its
    `.github/scripts/thread-transfer-report.cjs` publisher and test came along; `node --test
.github/scripts/thread-transfer-report.test.cjs` passes 6/6 here.
- **Added:** `desktop-artifacts.yml` — builds the four platforms upstream's
  `release.yml` matrix covers (macOS `arm64`/`x64` DMG, Linux `x64` AppImage,
  Windows `x64` NSIS) on every push to `main` and on dispatch, **unsigned**,
  uploads them as workflow artifacts, and then **publishes every run as a GitHub
  prerelease** tagged `desktop-dev-<run number>` — always a prerelease, never
  "latest", i.e. a development build — **pruning older `desktop-dev-*` releases so
  only the current one plus two remain**. The release job is the one place the
  automatic `GITHUB_TOKEN` is used (job-scoped `contents: write`), which stays
  inside the standing rule; it publishes whatever platforms built, fails only when
  none did, and prefixes an asset with its artifact name on a filename collision
  (both macOS legs emit a `latest-mac.yml`). Carries over the three secret-free steps that
  matter from upstream's build job: the `dtolnay/rust-toolchain` setup with a per-matrix
  `rust_target` (upstream's desktop build cargo-builds `native/resource-monitor`, #2679),
  the Linux `node-pty` prebuild bundled into the Windows artifact (non-fatal when missing),
  and the Spectre-mitigated MSVC libs install. It never passes `--signed`, which is what
  pulls signing credentials into `scripts/build-desktop-artifact.ts`.
- **Deleted (needs credentials and/or Blacksmith runners):** `release.yml`
  (Cloudflare + Clerk + Apple + Azure + npm OIDC + release GitHub App; its
  3-hourly nightly cron was pure noise here), `deploy-relay.yml` (Cloudflare,
  PlanetScale, Axiom, Clerk, APNs; ran on every push to `main`),
  `mobile-eas-preview.yml` / `mobile-eas-production.yml` (`EXPO_TOKEN`),
  `mobile-showcase-screenshots.yml` (`blacksmith-12vcpu-macos-26` /
  `blacksmith-16vcpu-ubuntu-2404`), — **declined at the 2026-08-10 rebase** —
  `web-preview.yml` (arrived with `963ebf5b` (#5465); label-gated Vercel preview deploys
  needing `VERCEL_TOKEN` / `VERCEL_ORG_ID` / `VERCEL_PROJECT_ID`, on
  `blacksmith-8vcpu-ubuntu-2404`), and — **declined at the 2026-08-17 rebase** —
  `publish-aur.yml` (arrived with `e25021af` (#4128); pushes the `t3code-bin` /
  `t3code-nightly-bin` AUR packages, needs `AUR_SSH_PRIVATE_KEY` and runs on
  `blacksmith-8vcpu-ubuntu-2404`, so it fails the standing rule on both counts. It is a
  `workflow_call` target of the `release.yml` this fork deletes, so nothing here would ever
  invoke it. Its `packaging/aur/` sources are upstream's and are kept byte-identical —
  `packaging/aur/scripts/release.sh` can still be run by hand; only the workflow is dropped,
  with a fork note in `packaging/aur/README.md`).
- **Deleted (mobile, which this fork does not target):** `mobile-fingerprint-check.yml`,
  **declined at the 2026-08-10 rebase** (arrived with `73b2e8fd` (#5609)). This is the one
  borderline call in the set: it is genuinely credential-free (it computes both native
  fingerprints in one job, no `EXPO_TOKEN`), so a runner swap alone would make it _run_. It
  was still dropped, because what it runs _for_ does not exist here — it labels PRs that would
  break OTA reach until the next store build, and this fork ships no store builds, no EAS
  workflows, and no mobile CI (same reasoning that dropped `mobile_native_static_analysis`
  from `ci.yml`). Revisit only if this fork ever starts releasing the mobile app.
- **Deleted (upstream community governance, no value in this fork):**
  `pr-vouch.yml` + `.github/VOUCHED.td` (trust-gates external contributors
  against upstream's contributor list) and `pr-size.yml` (size labels on PRs that
  are all authored by the fork owner and its agents; its `sync-label-definitions`
  job was also dead code — `if: github.event_name != 'pull_request_target'` on a
  workflow whose only trigger is `pull_request_target`). Both used
  `pull_request_target`.
- **Fallout fixed with the deletions:** the release-workflow tracing-config guard
  in `infra/relay/scripts/deploy.test.ts` read `release.yml` off disk and would
  fail `vp run test` once it was gone — dropped, with a restore note in place.
  `CONTRIBUTING.md` lost its `vouch:*` / `size:*` paragraph;
  `docs/internals/ci.md`, `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`, and — added at
  the 2026-08-17 rebase — `packaging/aur/README.md` gained fork notes.
- **Re-apply notes:** Highest-churn area, and the one entry that reliably bites. Re-derive
  from upstream's **new** workflow files and re-apply the standing rule above (runner swap,
  drop credentialed/unavailable jobs) rather than force-keeping stale fork copies. A new
  upstream workflow arriving in a rebase is opt-**in**: it ships only if it passes the
  standing rule. Separately, `desktop-artifacts.yml` is fork-owned and can drift against
  upstream's desktop build requirements **without ever showing up as a merge conflict** —
  diff it against upstream's `release.yml` build job on every sync. Whatever that re-derive
  produces, **keep the dev-release tail**: every run publishes a `desktop-dev-<run number>`
  prerelease (a development build) and prunes older `desktop-dev-*` releases down to the
  current one plus two. That publish-and-prune goal is fork intent, not an implementation
  detail — re-apply it even if the build job around it is rebuilt from scratch.
- **Redundancy check (as of `c3e37094`; re-checked at `2c4158f8` — upstream added no workflow and touched nothing under `.github/` in that range, so the set replayed untouched): keep, and at the 2026-08-21 rebase this entry is where the rebase
  spent its effort.** Upstream added **no** new workflow in the `db0659fe..c3e37094` range, so
  there was nothing new to accept or decline — the first rebase in a while with no opt-in
  decision to make. It did, however, **restructure `ci.yml` substantially**, which is why the
  fork's `ci.yml` delta could not simply replay:
  - `d7b9a689` (#7286) split the suite into `test` (everything except `t3`, run with
    `--parallel`) and a **new sharded `test_server`** job (`t3` alone, 3 shards, because
    `apps/server` sets `fileParallelism: false`), and pulled the Rust checks out of `check` /
    `test` into a **new `rust`** job on `blacksmith-4vcpu-ubuntu-2404`. The thread-transfer
    budget report moved to `test_server` along with the server tests.
  - `8f7da3b9` (#7283) added the **new `mobile_native_changes`** gate job on
    `blacksmith-2vcpu-ubuntu-2404`, whose only purpose is to decide whether the macOS
    `mobile_native_static_analysis` job boots.
  - `9f12eab3` (#7762) added a `Reject repository-owned PR assets` step to `check` (a plain
    `git ls-files` guard — credential-free, kept as-is) and deleted `.github/pr-assets/`.

  **Resolved per this entry's re-derive rule:** upstream's new `ci.yml` was taken wholesale and
  the standing rule re-applied to it, rather than replaying the old hunks. That is now **five**
  `runs-on` swaps to `ubuntu-24.04` (`check`, `test`, `test_server`, `rust`, `release_smoke`) and
  **two** dropped jobs. Dropping `mobile_native_changes` alongside
  `mobile_native_static_analysis` is the new call here and it is deliberate: the gate is
  credential-free and would run on a swapped runner, but with its only consumer gone it is a job
  that computes an output nothing reads. Same reasoning that dropped
  `mobile-fingerprint-check.yml` — keep what this fork's CI actually uses.
  `issue-labels.yml` and `thread-transfer-report.yml` were unchanged upstream and stay
  unmodified; `grep -rn blacksmith .github/workflows/` still matches only the explanatory comment
  in `desktop-artifacts.yml`. Two conflicts came up: `.github/VOUCHED.td` (modify/delete —
  upstream kept adding vouch entries; resolved as a **deletion**, per this entry) and
  `docs/internals/ci.md`, whose fork note was **rewritten** rather than merged so it describes
  the five jobs the fork now runs instead of the old three.

  `desktop-artifacts.yml` was diffed against upstream's `release.yml` build job as this entry
  requires. Upstream touched neither `release.yml` nor `scripts/build-desktop-artifact.ts` in
  this range (`git log db0659fe..upstream/main` on both paths is empty), so there is **no drift**
  and nothing to reconcile. The fork's workflow set is unchanged: `ci.yml`,
  `desktop-artifacts.yml`, `issue-labels.yml`, `thread-transfer-report.yml`.

### 15. Claude providers report a real unauthenticated state, and show the config dir they resolved

- **Files:** `packages/contracts/src/server.ts` (new `ServerProviderConfigDirectory`, new optional
  `ServerProvider.configDirectory`), `apps/server/src/provider/providerSnapshot.ts`
  (`buildServerProvider` passes it through), `apps/server/src/provider/providerStatusCache.ts`
  (`hydrateCachedProvider` carries it alongside `auth`),
  `apps/server/src/provider/Drivers/ClaudeHome.ts`
  (`resolveClaudeConfigDirPath` moved in from `ClaudeSkills.ts`, new
  `resolveClaudeConfigDirectory`), `apps/server/src/provider/Drivers/ClaudeSkills.ts` (imports the
  moved helper), `apps/server/src/provider/Layers/ClaudeProvider.ts` (auth classification),
  `apps/web/src/components/settings/ProviderInstanceCard.tsx` (resolved-directory row),
  `apps/web/src/components/chat/ProviderStatusBanner.tsx` (prefer the server's message); tests in
  `apps/server/src/provider/Layers/{ProviderRegistry,ClaudeCapabilitiesProbe}.test.ts` and
  `apps/web/src/components/chat/ProviderStatusBanner.test.tsx`; docs in
  `docs/user/providers-claude.md`
- **Commits:** branch `claude/multiple-claude-providers-9a0ewg`
- **Problem.** `checkClaudeProviderStatus` treated "the SDK capability probe returned an object" as
  proof of a login. It is not. Claude Code answers the initialization handshake **locally**, before
  contacting Anthropic, and for first-party auth it always emits an `account` object — a logged-out
  CLI just fills it with blanks plus the literal `tokenSource: "none"`. So every Claude instance
  that could start its CLI reported `status: "ready"` / `auth.status: "authenticated"`, and
  `ClaudeProvider.ts` was the only provider layer that could never emit `"unauthenticated"` (Codex
  and Cursor both do). A second Claude instance pointed at a config directory with no login
  rendered as a bare "Authenticated" with an empty email while every turn failed asking the user
  to log in — the failure was invisible everywhere except inside a chat.
- **What changed:**
  1. **Auth classification** (`claudeProbeAuthStatus`). Three-way, not two: any positive evidence
     (`email`, `subscriptionType`, `apiKeySource`, or a non-`firstParty` `apiProvider` such as
     Bedrock) → `authenticated`; the explicit `tokenSource: "none"` marker with nothing else →
     `unauthenticated` + `status: "error"` + a message naming the directory; **no signal at all** →
     the pre-existing `unknown` + `warning` bucket, the same one a probe that never answered lands
     in. The third case is deliberate and load-bearing: a CLI authenticated through a `profile`
     source reports an empty account object, and an older CLI may omit `tokenSource` entirely.
     Neither must be called logged-out. The probe also now captures `apiKeySource`, without which
     a raw `ANTHROPIC_API_KEY` setup would be misreported.
  2. **Resolved config directory on the snapshot.** New optional `ServerProvider.configDirectory` =
     `{ path, credentialsFound }`, populated by the Claude driver with the absolute path it exports
     as `CLAUDE_CONFIG_DIR` plus whether a `.credentials.json` sits there. Driver-agnostic on the
     wire so Codex could adopt it. `credentialsFound: false` is **not** proof of a logged-out CLI —
     macOS keeps credentials in the login keychain — so it is only ever rendered as detail on an
     already-failed auth state.
  3. **UI.** The provider card shows `Resolved config directory` in its expanded body, next to the
     `CLAUDE_CONFIG_DIR path` field that produces it; the hint turns warning-coloured only when
     auth actually failed. `ProviderStatusBanner` now prefers the server's `message` over its
     hardcoded "Sign in via the CLI to authenticate again." line, so the specific directory reaches
     the user in-chat. That fallback still applies when the server sent no message.
  4. **Docs.** `docs/user/providers-claude.md` gained a Windows/PowerShell section. Upstream's
     multi-account instructions only show the bash form (`CLAUDE_CONFIG_DIR=~/.claude_x claude auth
login`), which works on bash **because the shell expands `~`**. PowerShell does not expand `~`
     inside a quoted string and neither does Claude Code, so the same instruction writes the login
     into a relative folder literally named `~` next to the caller's cwd. It is convincing — the
     folder looks right and a fresh terminal still shows a login, because it opens in the same
     place — and T3 Code, which _does_ expand `~` before exporting `CLAUDE_CONFIG_DIR`, never sees
     it. That asymmetry is the whole bug, and it is not going away: T3 Code must expand, since a
     spawned process gets no shell expansion.
- **Why this is not just a UI nicety.** With `unauthenticated` now reachable, the existing filters
  in `apps/mobile/src/lib/modelOptions.ts`, `apps/web/src/components/CommandPalette.tsx`, and
  `packages/client-runtime/src/operations/projects.ts` start applying to Claude for the first time
  — a logged-out instance drops out of pickers instead of being offered and failing. That is the
  behavior those call sites always intended; only Claude was exempt.
- **Re-apply notes:** The fragile coupling is the `tokenSource: "none"` contract, which is Claude
  Code's, not T3 Code's. Before re-deriving, confirm it still holds against the CLI version in play
  (the initialization `account` payload is built from an internal helper that returns `{}` for
  non-first-party backends and `{ tokenSource: "none" }` when it holds no credential). If that ever
  changes shape, the _classification_ has to move but the three-way structure should stay — the one
  thing this entry exists to prevent is a binary "probe answered ⇒ authenticated". Everything else
  is additive: the contract field is optional, `buildServerProvider` ignores it when absent, and
  the two UI changes degrade to today's behavior with no `configDirectory` present.
- **Drop it when:** upstream's `ClaudeProvider.ts` emits `auth.status: "unauthenticated"` on its
  own. Check with `grep -c '"unauthenticated"' apps/server/src/provider/Layers/ClaudeProvider.ts`
  against clean upstream — `0` means this entry is still needed. Partial supersession is likely
  (upstream may fix the auth state without surfacing the directory); keep whichever half is still
  missing rather than dropping the entry wholesale.
- **Redundancy check (as of `c3e37094`; re-checked at `2c4158f8` — both drop-check greps still come back empty and upstream's only provider change in that range is the Codex adapter): keep, clean replay — neither half is superseded.** Both
  drop-checks come back empty against clean upstream: `grep -c '"unauthenticated"'` on upstream's
  `ClaudeProvider.ts` is **0**, and `configDirectory` does not appear in upstream's
  `packages/contracts/src/server.ts`. Upstream made three changes under
  `apps/server/src/provider/` in this range — `e7f6a30c` (#7459, stop probing Grok/Cursor/OpenCode
  unless turned on), `cf251c3b` (#3154, OpenCode skill discovery) and `4bdbd8ce` (#7659, Daybreak
  models out of legacy models) — and none collided: every fork file replayed without a conflict.
  The one worth re-checking by hand was `cf251c3b`, since this entry **moves
  `resolveClaudeConfigDirPath` out of `ClaudeSkills.ts` into `ClaudeHome.ts`**; the import survived
  (`ClaudeSkills.ts:20` still pulls it from `./ClaudeHome.ts` and uses it at line 72), and
  `apps/server/src/provider` is green at 568 passed / 6 skipped. Note `e7f6a30c` narrows which
  providers get probed at all — it does not touch how a Claude probe's answer is classified, which
  is what this entry changes.
- **Related gap, now entry 16:** the usage scan had the same default-instance-only blind spot.
  Fixed separately so each entry can be dropped on its own when upstream catches up.
- **Verified:** `vp test run apps/server/src/provider` (517 passed, 6 skipped), `vp test run
apps/web/src/components/settings apps/web/src/components/chat/ProviderStatusBanner.test.tsx` plus
  the contracts settings/provider-instance tests (213 passed), `vp run --filter @t3tools/contracts
--filter t3 --filter @t3tools/web typecheck` clean, and `vp lint` / `vp fmt --check` clean on the
  touched source files. Node 22 host against the pinned node ^24.13.1; `pnpm install` (not
  `--frozen-lockfile`) succeeded and **`pnpm-lock.yaml` is left unchanged** — this entry adds no
  dependency. The install did rewrite two `deprecated:` annotation lines under `@xmldom/xmldom`
  (registry metadata drift, unrelated to this change); those were reverted so the lockfile stays
  byte-identical to upstream. Expect the same noise on the next install. Note also that the
  **pre-commit hook runs `vp fmt` over `FORK.md`**, which does not conform on upstream: any edit
  here also reflows a handful of untouched lines (lazy blockquote continuations lose their `> `,
  `*em*` becomes `_em_`). Harmless to render, but it is extra rebase-conflict surface — expect it,
  and do not mistake it for an intentional edit.

### 16. Usage scans every configured provider instance, not just the default one

- **Files:** `apps/server/src/usage/usageTranscriptSources.ts` (new),
  `apps/server/src/usage/usageTranscriptSources.test.ts` (new),
  `apps/server/src/usage/UsageService.ts` (`resolveTranscriptDirs` delegates to the new module)
- **Commits:** branch `claude/multiple-claude-providers-9a0ewg`
- **Problem.** `resolveTranscriptDirs` built a **fixed two-element list** from the legacy blobs —
  `settings.providers.claudeAgent` and `settings.providers.codex` — so only the _default_ instance
  of each driver was ever scanned. `settings.providerInstances` was not consulted anywhere in the
  usage feature. Add a second Claude account and its transcripts (`<its config dir>/projects`) are
  silently skipped: the dashboard keeps reporting, the totals just quietly exclude everything that
  account spent. Same class of bug as entry 15 — the default instance treated as if it were the
  only one.
- **What changed.** A new `usageTranscriptSources` module enumerates one directory per configured
  instance and `UsageService` consumes it. The scan loop already iterated a `dirs` array, emitted
  one `UsageSource` per directory, and stamped `resolvedHomePath` into each fingerprint, so nothing
  downstream needed touching: **no contract change, no `USAGE_CONTRACT_VERSION` bump, no UI
  change.** Buckets stay keyed by `UsageProviderKind` (`"claude" | "codex"`), so the dashboard
  keeps its two rows — the Claude row simply becomes correct instead of partial.
- **Three decisions worth keeping if this is re-derived:**
  1. **Disabled instances are still scanned.** Usage records tokens already spent; switching a
     provider off must not retroactively erase them. This also matches the old behavior, which
     ignored `enabled` entirely.
  2. **Instances resolving to one directory are walked once**, keyed case-insensitively on Windows.
     Sharing a config dir between presets is a documented setup (`docs/user/providers-claude.md`),
     and nothing else de-duplicates inside a single environment — the client's
     duplicate-fingerprint drop only runs _across_ environments. Without this, a shared directory
     doubles every token it reads.
  3. **A single undecodable instance config is logged and skipped**, not fatal. One bad envelope
     must not zero out the whole usage page.
- **Ordering is deliberate:** Claude sources before Codex ones, default slot before custom
  instances (custom sorted by instance id). That reproduces the old two-element output exactly for
  a single-instance environment, which is what keeps this change invisible to anyone not running
  multiple instances.
- **The default-slot merge is duplicated, not shared.** `instanceConfigsForDriver` re-implements
  the rule from `deriveProviderInstanceConfigMap` (explicit `providerInstances` entry owns its id;
  the legacy `providers.<kind>` blob fills the default slot only when unclaimed) for exactly the
  two driver kinds that leave transcripts. Importing the hydration helper instead would drag
  `BUILT_IN_DRIVERS` — the entire driver graph — into the usage module for a pure function. If
  upstream ever moves that merge somewhere lightweight, collapse the two. **If upstream changes the
  merge rule, this copy must follow**; that is the one drift risk in this entry.
- **Not fixed here:** per-instance _breakdown_ in the dashboard (separate rows for "Claude Work"
  and "Claude Personal"). That needs `instanceId` on `UsageBucket`, a `USAGE_CONTRACT_VERSION`
  bump, and dynamic presentation/colors in both web and mobile. Deliberately out of scope: this
  entry fixes wrong numbers, it does not add a feature. **Entry 19 is that follow-up** — it lands
  the breakdown and, with it, fixes a double count this entry left in the client-side merge.
- **Drop it when:** upstream's `resolveTranscriptDirs` reads `settings.providerInstances`. Check
  with `grep -n providerInstances apps/server/src/usage/UsageService.ts` against clean upstream —
  no hit means this entry is still needed.
- **Redundancy check (as of `c3e37094`; re-checked at `2c4158f8` — upstream still has no `providerInstances` in `UsageService.ts` and made no change under `apps/server/src/usage/`): keep, clean replay.** The drop-check comes back empty:
  `providerInstances` still does not appear in upstream's `UsageService.ts`, and upstream's
  `apps/server/src/usage/` has no `usageTranscriptSources.ts` equivalent. Upstream made **no**
  change under `apps/server/src/usage/` in this range at all, so the entry replayed untouched and
  the drift risk this entry names — upstream moving the default-slot merge rule that
  `instanceConfigsForDriver` duplicates from `deriveProviderInstanceConfigMap` — did not
  materialize. Re-verify that duplication on the next rebase regardless; it is the one part of
  this entry that can go silently wrong. `vp test run apps/server/src/usage` is green.
- **Verified:** `vp test run apps/server/src/usage` (45 passed, 7 of them new), `vp run --filter t3
typecheck` clean, `vp lint` and `vp fmt --check` clean on the touched files. The new tests cover
  default-only output, the nested-vs-flat Claude layout probe, multiple instances per driver with
  ordering, disabled instances, shared-directory de-duplication, an explicit entry claiming the
  default slot, and the undecodable-config skip.

### 17. The worktree branch prefix is configurable, not hardcoded to `t3code`

- **Files:** `packages/contracts/src/settings.ts` (`DEFAULT_WORKTREE_BRANCH_PREFIX`,
  `ServerSettings.worktreeBranchPrefix`, `ServerSettingsPatch.worktreeBranchPrefix`),
  `packages/shared/src/git.ts` (+ test), `apps/server/src/ws.ts`,
  `apps/server/src/orchestration/Layers/ProviderCommandReactor.ts` (+ test),
  `apps/server/src/server.test.ts`,
  `apps/web/src/components/settings/WorktreeBranchSettings.tsx` (new),
  `apps/web/src/components/settings/SourceControlSettings.tsx`,
  `apps/web/src/components/settings/settingsSearch.ts`, `docs/user/source-control.md`
- **Commits:** branch `claude/t3code-pr-prefix-i2orpy`
- **Problem.** `WORKTREE_BRANCH_PREFIX = "t3code"` was a `const` in `packages/shared/src/git.ts`
  with no setting, no project config, and no env override behind it. Every worktree thread got a
  `t3code/<hex>` placeholder, and on the first turn the server renamed it to
  `t3code/<generated-slug>` — which is the head branch a pull request opens from. So the vendor
  name lands in every teammate's branch list and in every PR, and repositories with branch-naming
  rules (`<handle>/*`, `feature/*`, protected-prefix policies) cannot be satisfied at all. The only
  escape was to hand-create a branch before the first message, opting the thread out of automatic
  naming entirely.
- **What changed.** One new server setting, `worktreeBranchPrefix`, applied at the two places the
  server names a worktree branch. `packages/shared/src/git.ts` grows the naming policy —
  `normalizeWorktreeBranchPrefix` (sanitize into a refName fragment, fall back to the default when
  nothing usable survives), `applyWorktreeBranchPrefix` (re-namespace a placeholder),
  `buildWorktreeBranchName` (namespace a generated description) — and
  `isTemporaryWorktreeBranch` takes an optional prefix and matches only the marked `t3-` form
  outside the default namespace. `ws.ts` re-namespaces at worktree creation;
  `ProviderCommandReactor` uses the configured prefix for the first-turn rename. Settings →
  Source Control gains a **Branches** section.
- **Five decisions worth keeping if this is re-derived:**
  1. **The server owns the naming, the clients stay dumb.** Web and mobile mint the placeholder
     (`buildTemporaryWorktreeBranchName`) before they could know the setting, so its signature is
     unchanged and the three client call sites are untouched. `ws.ts` rewrites the placeholder at
     `prepareWorktree` time and the existing `thread.meta.update` already reports the real branch
     back, so no client ever displays the pre-rewrite name. Pushing the setting out to three
     clients instead would buy nothing and add a stale-settings failure mode on mobile's outbox
     drain.
  2. **Placeholders carry a `t3-` marker, and the marker is the whole point.** Provenance is
     inferred from the refName, not recorded, so the placeholder shape has to be one nobody writes
     by hand. Under the default prefix a bare `t3code/deadbeef` was safe because nobody names a
     branch that. Under a configured prefix it is not: `deadbeef`, `cafebabe` and `deadc0de` are
     eight hex characters and plausible hand-written names, so matching `<prefix>/<8 hex>` would
     rename a user's own branch out from under them and defeat the escape hatch in (4). Minting
     `<prefix>/t3-<8 hex>` and matching only that removes the ambiguity. Unmarked and UUID-shaped
     tokens stay matchable **under the default prefix only** — they were only ever minted there,
     and honouring them under a configured prefix is exactly what reintroduces the collision.
  3. **The matcher accepts the configured prefix _and_ the default.** `isTemporaryWorktreeBranch`
     gates the first-turn rename. Without the default in the accepted set, changing the prefix
     would strand every thread whose placeholder was already minted, and would break the rewrite
     in (1) — the client's `t3code/t3-<hex>` has to still read as temporary.
  4. **A blank or unusable prefix falls back to `t3code`, it does not mean "no prefix".** An empty
     namespace would put placeholders at the repository root and leaves a bad setting free to
     produce an invalid refName. The fallback keeps both from happening.
  5. **A branch the user named is never rewritten.** Both `applyWorktreeBranchPrefix` and the
     rename gate pass through anything that is not a marked placeholder, so picking a branch before
     the first message still opts a thread out entirely — the pre-existing escape hatch keeps
     working, including for a branch that happens to sit under the configured prefix.
- **Not fixed here:** no mobile settings UI. Mobile surfaces no server settings today (it has no
  equivalent of the source-control writing-style rows either), so this follows that precedent
  rather than opening a new surface. The setting still applies to threads started from mobile —
  the server does the naming.
- **Drop it when:** upstream makes the prefix configurable. Check with `grep -rn
"WORKTREE_BRANCH_PREFIX\|worktreeBranchPrefix" packages/shared/src/git.ts` against clean upstream
  — a lone `export const WORKTREE_BRANCH_PREFIX = "t3code"` means this entry is still needed.
- **Redundancy check (as of `2c4158f8`): keep.** The drop-check still shows the lone hardcoded
  `WORKTREE_BRANCH_PREFIX` const upstream. Upstream touched `ws.ts` and `server.test.ts` in
  `c3e37094..2c4158f8` (`11f05137`, #7774 — client attribution on sessions), away from the
  `prepareWorktree` block and the branch-prefix test; both replayed clean.
- **Re-apply notes:** The rename site is
  `maybeGenerateAndRenameWorktreeBranchForFirstTurn` in `ProviderCommandReactor.ts`; the settings
  read has to sit **inside** the guarded `Effect.gen` whose `catchCause` logs failures, otherwise a
  `ServerSettingsError` escapes a path that previously could not fail. The `ws.ts` site is the
  `bootstrap.prepareWorktree` block, where `branch` is optional — rewrite only when it is defined,
  since an absent `newRefName` means "check out the base ref, do not create a branch".
- **Verified:** `vp test run packages/shared/src/git.test.ts` (24 passed),
  `apps/server/src/orchestration/Layers/ProviderCommandReactor.test.ts` (46 passed, 1 new),
  `apps/server/src/server.test.ts` (125 passed, 1 new; the one failure,
  _reports workspace root stat failures without relabeling them as missing_, fails identically on
  a clean tree in this container — it needs a non-root user for the stat to be denied),
  `packages/contracts/src/settings.test.ts` + `packages/shared/src/serverSettings.test.ts` +
  web settings tests (94 passed). `vp run --filter @t3tools/contracts --filter @t3tools/shared
--filter t3 --filter @t3tools/web typecheck` clean; `vp lint` and `vp fmt` clean on the touched
  files.

---

### 18. New thread button under the project selector, and scoped to it

- **Files:** `apps/web/src/components/Sidebar.tsx`,
  `apps/web/src/components/Sidebar.logic.ts` (+ test),
  `docs/user/thread-sidebar.md` ("Starting a thread" section)
- **Commits:** branch `claude/thread-button-positioning-bt4gba`
- **Problem.** The sidebar header stacked its controls against the reading order. Row one was
  the thread search box with an icon-only new thread button pinned to its right; row two was
  the project scope menu with the new project button pinned to _its_ right. So the two "create"
  affordances sat on different rows, the new thread one _above_ the project selector that gives
  it its context, and it was a bare glyph next to a text field it has nothing to do with.
  Behaviorally it also ignored the scope menu directly beneath it: with several projects a
  plain click always opened the command palette picker, even when the sidebar was already
  scoped to one project and the answer was on screen.
- **What changed.** The new thread button moves below the project row and becomes a full-width
  `SidebarMenuButton` — icon plus a "New thread" label, content centered — so the header reads
  search → scope → act. The search row keeps only the search box; the new project button stays
  where it was, beside the scope menu. The button also follows the scope:
  - scoped to a project → create there immediately, no picker;
  - "All projects" → unchanged behavior (create in the current project when there is nothing
    to pick or shift is held, otherwise open the palette's "New thread in..." picker).
- **Three decisions worth keeping if this is re-derived:**
  1. **The branch lives in a pure helper.** `resolveNewThreadClickTarget` in `Sidebar.logic.ts`
     returns `"scoped-project" | "current-project" | "picker"` and delegates the unscoped case
     to the existing `shouldCreateNewThreadInCurrentProject`, so the added behavior is one
     testable function and the old rule is untouched.
  2. **The scoped target resolves through `buildSidebarProjectPickerEntries`**, the same entry
     builder the command palette picker uses, seeded with `resolveThreadActionProjectRef` as the
     preferred ref. A scope entry is a _logical_ project (several checkouts of one repo grouped
     together), so picking its representative by hand would silently target a different member
     than the picker does for the same row.
  3. **The scoped tooltip drops the shortcut and names the project** ("New thread in _Foo_").
     `chat.new` is not scope-aware — it still opens the picker from the keyboard — so printing
     its shortcut next to a scoped button would advertise the wrong target. Making the keybinding
     scope-aware would mean lifting the sidebar's local `projectScopeKey` into shared state;
     deliberately out of scope.
- **Also gone:** the button no longer renders `disabled` when there are no projects. It now
  renders with the project row, which is already hidden in that state, and the list's existing
  "No projects yet → Add project" empty state remains the way in.
- **Not touched:** `LegacySidebar.tsx` (opt-in legacy layout, different header), the mobile
  home header, and the `chat.new` / `chat.newLocal` keybindings.
- **Drop it when:** upstream's `Sidebar.tsx` renders the new thread button below the project
  scope menu with a text label. Check with `grep -n "New thread" apps/web/src/components/Sidebar.tsx`
  against clean upstream — an icon-only button in the search row means this entry is still needed.
- **Redundancy check (as of `2c4158f8`): keep.** Upstream's `Sidebar.tsx` still renders the
  icon-only new thread button in the search row (`aria-label="New thread"` beside the search
  box) and took no commit in `c3e37094..2c4158f8`; `resolveNewThreadClickTarget` exists only in
  this fork.
- **Verified:** `vp test run apps/web/src/components/Sidebar.logic.test.ts` (110 passed, 5 of them
  new), `tsgo --noEmit` clean in `apps/web`, `vp lint` and `vp fmt --check` clean on the touched
  files. The new tests cover the scoped target winning at any project count and on shift+click,
  the picker from "All projects" with several projects, and both unscoped direct-create cases.
  Not browser-verified — the layout move is a header re-stack that wants one look in a real client
  if this is ever re-derived.

---

### 19. Usage reports each provider instance separately

- **Files:** `packages/contracts/src/usage.ts`, `packages/shared/src/usageMerge.ts`,
  `packages/shared/src/usageFormat.ts`, `apps/server/src/usage/usageTranscriptSources.ts`,
  `apps/server/src/usage/usageAggregation.ts`, `apps/server/src/usage/UsageService.ts`,
  `apps/web/src/components/usage/*`, `apps/mobile/src/features/usage/*`, `docs/user/usage.md`,
  plus the five test files for those modules
- **Commits:** branch `claude/usage-report-multi-provider-2dsrkq`
- **Problem.** Entry 16 made the _scan_ read every configured instance, but everything downstream
  still grouped by `UsageProviderKind`. Two consequences:
  1. **The dashboard could not tell two accounts apart.** A work and a personal Claude Code
     collapsed into one "Claude Code" row, one chart line, one column — the exact question a
     second account is configured to answer ("which one is costing me this?") was unanswerable.
  2. **A real double count in the client-side merge.** `ownedContribution` resolved ownership per
     provider _kind_: if environment A owned a shared Claude directory and environment B reported
     that same directory _plus_ a second one, B still owned "claude" through the second directory,
     so **every** Claude bucket B reported survived — including the shared directory's, which A had
     already counted. Kind-level ownership cannot express "this directory yes, that one no", and
     that only becomes reachable once an environment has two directories of one kind.
- **What changed.** The report's unit of grouping is now the **provider instance**:
  - `UsageBucket` gains `instanceId`; `UsageSource` gains `instanceId`, `displayName` and
    `accentColor`. `USAGE_CONTRACT_VERSION` 4 → 5.
  - The aggregator keys buckets by `(day, hourStart?, provider, instanceId, model)`, and
    `UsageAggregator.add` takes the instance the record's transcripts came from.
  - `mergeUsage` resolves ownership per instance, exposes `instances` in place of `providers`,
    keys the per-period maps `byInstance`, and keys models by instance too.
  - Web and mobile draw one series, row and column per instance, labelled and colored from what
    the user configured.
- **Decisions worth keeping if this is re-derived:**
  1. **Series are keyed by instance id alone, not by `(environment, instance)`.** Every
     environment's default Claude instance is `claudeAgent`, so keying by the pair would split one
     person's laptop and desktop into two rows — a change to today's behavior for the _common_
     case in service of the rare one. Keying by instance id leaves multi-device setups merged
     exactly as they were and splits only where the user explicitly created a second instance.
  2. **`UsageSourceFingerprint` stays physical** — host, provider, path, volume, no instance id.
     It answers "is this the same directory", and two environments can reach one directory under
     instance ids they named differently; folding the id in would break cross-environment
     de-duplication.
  3. **Presentation travels on the wire** (`displayName`, `accentColor` on `UsageSource`) rather
     than the client joining usage against the provider snapshot stream. Mobile has no equivalent
     of web's `providerInstances` projection, and the join would be a second source of truth for a
     label. The client still owns the _rule_: `formatInstanceLabel` in `usageFormat` resolves
     configured name → brand label for a default instance → humanized instance id.
  4. **De-duplication stays global across instances.** A record copied forward when a session is
     resumed under a second account is still one response; it counts once, for whichever instance
     the scan reached first. Per-instance dedupe would double it.
  5. **Instances sharing one directory report as one**, under the first instance id in scan order.
     Their transcripts are physically indistinguishable, so any split would be invented.
  6. **Colors:** a configured `accentColor` wins; otherwise a per-provider ramp indexed by
     `shadeIndex`, which the merge assigns in an order (default instance first, then by id) that
     does not move when spending does. Index 0 is always the brand color, so a single-instance
     environment looks untouched.
  7. **The empty state still renders one row per provider.** With nothing reported the clients
     fall back to stand-in series for each provider's default instance, so the page does not
     collapse to a bare headline the way it would if it only drew what was reported.
- **The contract bump is the cost.** A fleet running mixed server versions will exclude the older
  environments from totals until they update. That path already existed and already says so in the
  UI ("runs an older server version and is excluded from totals"); no new failure mode, but it is
  the reason this was not folded into entry 16.
- **Drop it when:** upstream's `UsageBucket` carries an instance id. Check with
  `grep -n instanceId packages/contracts/src/usage.ts` against clean upstream — no hit means this
  entry is still needed. If upstream ships its own per-instance breakdown, drop **both** this entry
  and entry 16 and re-verify the merge's ownership rule against theirs; the double count in
  decision-point 2 above is the thing to test, since a kind-level `ownedContribution` is the
  natural shape to write and is wrong.
- **Redundancy check (as of `2c4158f8`): keep.** `instanceId` still does not appear in
  upstream's `packages/contracts/src/usage.ts`, and upstream made no change under
  `apps/server/src/usage/`, `packages/shared/src/usageMerge.ts` or either client's usage
  feature in `c3e37094..2c4158f8`.
- **Verified:** `vp test run apps/server/src/usage apps/web/src/components/usage
packages/shared/src/usageMerge.test.ts packages/shared/src/usageFormat.test.ts` (82 passed, 10 of
  them new), `vp run --filter t3 --filter @t3tools/web --filter @t3tools/mobile --filter
@t3tools/shared --filter @t3tools/contracts typecheck` clean, `vp lint` and `vp fmt --check` clean.
  New tests cover: two instances of one provider staying in separate buckets; a record copied
  between two accounts counted once; instance metadata reaching the source list; separate instance
  rows, model rows and per-day cells in the merge; the shade order; the partial-duplicate ownership
  regression; per-instance chart bands; and the label resolution rules.

---

## Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not
re-introduce them.** Each entry names the upstream change that replaced it; all
were re-verified against `c3e37094` during the 2026-08-21 rebase.

| #            | Fork change                       | Superseded by                                                             | Verified at |
| ------------ | --------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_          | `c3e37094`  |
| 4            | Terminal Ctrl-chord forwarding    | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_     | `c3e37094`  |
| 5 (core)     | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints                       | `c3e37094`  |
| 8            | Full timestamp on hover           | `formatChatTimestampTooltip`                                              | `c3e37094`  |
| 9            | Always-visible new-thread btn     | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_        | `c3e37094`  |
| 10           | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                                    | `c3e37094`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md` | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_ | `c3e37094`  |

Detail:

- **Change 1 — Windows build shell mode.** The fork removed
  `shell: process.platform === "win32"` from the `buildCmd` spawn because shell
  mode broke Windows builds from paths containing spaces. Upstream reworked that
  spawn entirely in `edb1240` (#4372): `apps/server/scripts/cli.ts` now calls
  `ChildProcess.make(process.execPath, ["--run", "build:bundle"], { cwd: serverDir,
… shell: false })` and routes other spawns through `resolveSpawnCommand` from
  `@t3tools/shared/shell` (`shell: spawnCommand.shell`). Upstream hardcodes
  `shell: false` on the build step — exactly the fork's intent, arrived at
  independently. **Nothing left to re-apply.**
- **Change 4 — terminal Ctrl-chord forwarding.** The fork added
  `terminalControlShortcutData(event, hasSelection)` in `apps/web/src/keybindings.ts` and
  wired it into `ThreadTerminalDrawer`'s key handler, mapping a plain `Ctrl+[a-z]` to its
  control byte and sending it with `preventDefault`/`stopPropagation` — because the app's
  own keybindings otherwise swallowed Ctrl+C. Upstream replaced xterm.js with
  libghostty-vt in `acf761b2` (#4860). `GhosttyTerminalSurface.onKeyDown` now runs every
  key the `beforeKey` hook did not claim through `GhosttyCore.encodeKey` — which is given
  the Ctrl modifier bit directly — and calls `preventDefault()` **and** `stopPropagation()`
  before writing the encoded bytes, which is the fork's fix arrived at properly. Keeping
  the fork block would have been actively harmful: returning `false` from `beforeKey` makes
  the surface bail before `encodeKey`, so chords would have gone out as raw legacy control
  bytes and bypassed any negotiated Kitty keyboard-protocol encoding. **Nothing left to
  re-apply.** One behavioral note for the maintainer: the fork's guard kept Ctrl+C-to-copy
  when text was selected; upstream binds copy to Ctrl+Shift+C (Cmd+C on macOS), so plain
  Ctrl+C now interrupts even with a selection — matching Ghostty and every other terminal.
- **Change 5 (core) — thread-scoped changed files.** Upstream's
  `AssistantChangedFilesSection` already shows per-turn checkpoint files. Only
  the commit-preselect button remains unshipped — see active entry 5.
- **Change 8 — hover timestamp.** The fork added `formatFullTimestamp` as a
  `title` attribute. Upstream now exports `formatChatTimestampTooltip` from
  `apps/web/src/timestampFormat.ts` and renders it as a real tooltip next to
  `formatShortTimestamp` in `MessagesTimeline.tsx` (both the `createdAt` and
  `updatedAt` rows) — a strictly better version of the same idea.
- **Change 9 — always-visible new-thread button.** The fork un-gated the new-thread button
  from its hover crossfade with the environment badge, because the button was only
  discoverable on hover. Superseded at the 2026-08-10 rebase by `0de95407` (#5672), which
  promoted **sidebar v2** to the default: the old sidebar moved to `LegacySidebar.tsx`
  (opt-in behind `useLegacySidebarEnabled`) and `Sidebar.tsx` is now v2, where the new-thread
  button sits in the thread-search row inside a plain `<div className="shrink-0">` — no
  `opacity-0`, no `group-hover/project-header` gating — with the `New thread (<shortcut>)`
  tooltip this entry also wanted. The fork's intent ships in full on the sidebar users
  actually get. **Nothing left to re-apply.** `LegacySidebar.tsx` still carries the old
  crossfade and the `data-testid="new-thread-button"`; leave it alone, it is opt-in and
  upstream's to maintain.
- **Change 10 — package-local vitest configs.** Upstream migrated the test
  runner to `vp` (vite-plus); the old `vitest.config.ts` files no longer apply,
  and upstream still ships none of its own for these packages. Revisit only if
  those packages' process-spawning tests flake under `vp`.
- **Change 12 (symlink half) — `CLAUDE.md` as a symlink.** The fork insisted `CLAUDE.md` stay a
  symlink whose target is the literal path `AGENTS.md`, after a `16c78b6`-style retarget to
  `@AGENTS.md` had left it dangling. Upstream has now settled the same question the other way
  and correctly: `2fc67623` (#3929) first restored the symlink target, then `4cb676cc` (#7171)
  **replaced the symlink with a regular file whose content is `@AGENTS.md`** — which is the
  `@file` import syntax in the one position where it actually resolves, i.e. inside a file's
  content rather than as a link target. That is the fork's intent (`CLAUDE.md` resolves to
  `AGENTS.md`, one source of truth) reached by a mechanism that does not depend on symlink
  support in the checkout, so the fork now simply takes upstream's file: mode `100644`, content
  `@AGENTS.md`. **Nothing left to re-apply, and do not restore the symlink** — re-adding it
  would silently revert #7171 on every future rebase. Active entry 12 continues to carry the
  two fork sections in `AGENTS.md`; only the `CLAUDE.md` half moved here.

---

## Dropped changes

Changes the fork used to carry that were removed by choice rather than because upstream
replaced them. Upstream has **not** implemented these, so a redundancy check will keep
reporting them as "missing" — that is expected. **Do not re-introduce them without an
explicit decision to take the maintenance back on.**

### 2 & 3. GitHub Copilot CLI and Gemini CLI providers

- **Dropped:** 2026-08-05 rebase.
- **What was carried:** a complete provider layer for two agent CLIs upstream does not
  support — ported from a third-party fork and then wired up, extended, and kept alive
  here across three rebases. Entry 2 was the Copilot provider registration
  (detection + status cache) on top of the ported adapter; entry 3 was the same for Gemini
  CLI plus `parseGeminiShimEntryPoint` / `resolveGeminiShimScriptPath`, which resolve the
  real JS entry point behind npm's `gemini.cmd` shim on Windows.
- **Files removed:** `apps/server/src/provider/Layers/{CopilotAdapter,CopilotProvider,GeminiCliAdapter,GeminiCliProvider,copilotCliPath,copilotTurnTracking,ProviderAdapterUtils}.ts`
  (+ tests), `apps/server/src/provider/Drivers/{CopilotDriver,CopilotSettings,GeminiCliDriver}.ts`,
  `apps/server/src/provider/Services/CopilotAdapter.ts`,
  `apps/server/src/{commandPath,geminiCliServerManager}.ts` (+ test),
  `apps/server/src/textGeneration/{Copilot,GeminiCli}TextGeneration.ts`, and the
  registration deltas in `apps/server/src/provider/{builtInDrivers,toMessage}.ts`,
  `apps/server/package.json`, `packages/contracts/src/{provider,providerRuntime,settings}.ts`,
  and `pnpm-lock.yaml`. Roughly 6,400 lines.
- **Why dropped:** it was the fork's entire source-code diff and its entire maintenance
  cost. Every upstream change to the provider/driver contract broke it silently at
  typecheck — the 2026-08-03 rebase alone had to add `BackgroundPolicy` and
  `ServerSettingsService` to both driver env unions after upstream widened
  `makeManagedServerProvider`. Carrying a two-provider port against a moving driver
  interface is not compatible with this fork's "thin layer, rebase indefinitely" goal.
- **If you want them back:** don't resurrect the old files — upstream's `ProviderDriver`
  interface has moved on. Re-derive against `apps/server/src/provider/builtInDrivers.ts`
  and the current `Drivers/ClaudeDriver.ts` as the reference implementation, and check first
  whether upstream has shipped its own (as of `de592a00`, `BUILT_IN_DRIVERS` lists only
  `CodexDriver`, `ClaudeDriver`, `CursorDriver`, `GrokDriver`, `OpenCodeDriver`). If
  upstream ever ships either provider, take upstream's and drop this note.
- **Note:** the "Copilot CLI provider not working" and "Gemini CLI provider not looking in
  the right path on Windows" entries in John's TODID list below refer to this dropped work
  and are left as written — that list is his, not this file's changelog.

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
