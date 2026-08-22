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
artifacts built on every push to `main`) — plus this file and the `README.md` fork banner that
points at it. Alongside it the fork carries the two multi-instance Claude provider fixes
(entries 15 and 16) and a configurable worktree branch prefix (entry 17), so `apps/` and
`packages/` differ from upstream. `native/`, `scripts/`,
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

> **Last rebase onto upstream:** **2026-08-21**, onto `pingdotgg/t3code` `main` at
> **`c3e37094`** — _fix(web): render oversized terminal graphemes without crashing (#7809)_.
> The `main` this replaces was `1ffbbbbb` (based on `db0659fe`), which had itself replaced
> `8d6b5a56` (based on `9821bca1`, 2026-08-10) and `baaa8682` (based on `de592a00`,
> 2026-08-05). This rebase takes in **74 upstream commits**.
>
> **Nothing was superseded at this rebase.** All six carried entries (11, 12, 13, 14, 15, 16)
> and all three fork-intentional-but-unshipped ones (5, 6, 7) were re-checked against
> `c3e37094` and still apply; see each entry's redundancy check.
>
> **The `1ffbbbbb` history contained a merge commit** — `f78d68fa`, _Merge branch
> 'pingdotgg:main' into main_, which pulled `13458e65..db0659fe` in rather than rebasing onto
> it. This rebase linearized that away: the fork's seven own commits now sit directly on
> `c3e37094`. Keep syncing by rebase, not merge — a merge commit costs nothing here but it
> makes "what does this fork actually carry?" a graph question instead of a `git diff
upstream/main HEAD` one.
>
> `main` history was rewritten by force-push at this rebase. The overwritten tip `1ffbbbbb`
> **was backed up** to `origin/backup/main-pre-rebase-2026-08-21`, as `8d6b5a56` was to
> `origin/backup/main-pre-rebase-2026-08-17` and `baaa8682` to
> `origin/backup/main-pre-rebase-2026-08-10`. The two rebases before those overwrote tips
> (`563d725d`, `ba07e561`) that were never pushed anywhere and remain recoverable only from
> GitHub's unreachable-object retention.

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
> is green. The composer arrow-key recall (entry 7) and completed-dot timing (entry 6) have
> **no unit tests** (browser-tested) and must be confirmed in-app if they are ever re-derived.

> **Tooling note:** upstream uses **pnpm@11 + node ^24** (pnpm catalogs in
> `pnpm-workspace.yaml`) and the `vp` (vite-plus) scripts. The **node version matters**:
> `package.json` pins `engines.node: ^24.13.1`, and a node 22 host will need `nvm install 24`
> before `pnpm install` behaves. The rebase checklist is `pnpm install --frozen-lockfile` →
> `pnpm run typecheck` → `pnpm run test`; the `--frozen-lockfile` step is the one that catches
> a `pnpm-lock.yaml` that replayed badly, which is the most likely silent breakage in a rebase
> that reports no conflicts.
>
> **What was verified at the 2026-08-21 rebase:** entries 15 and 16 make this the first rebase
> since 2026-08-05 that carries a source change, so the full checklist ran. The host had node
> 22, so **node 24.19.0 was fetched from `nodejs.org/dist/latest-v24.x` and put on `PATH`**
> before anything else — the cheapest way to satisfy `engines.node: ^24.13.1` without a version
> manager. `pnpm install --frozen-lockfile` **succeeded and left `pnpm-lock.yaml` untouched**
> (`git status` clean afterwards), which is the check that a replayed lockfile is sound; the
> `@xmldom/xmldom` `deprecated:` drift the previous entry warned about did not reappear.
> `vp run --filter @t3tools/contracts --filter t3 --filter @t3tools/web typecheck` is clean
> (only pre-existing `unnecessaryFailYieldableError` _suggestions_ in untouched upstream files —
> `orchestration/decider.ts`, `orchestration/workflowScriptQuery.ts`,
> `pullRequest/GitLabPullRequestCli.ts`). `vp test run apps/server/src/provider
apps/server/src/usage` is **568 passed / 6 skipped**, and `vp test run
apps/web/src/components/settings apps/web/src/components/chat/ProviderStatusBanner.test.tsx` is
> **115 passed** — see the flake note above for the two failures that appeared on the first
> attempt and did not reproduce. `vp lint` and `vp fmt --check` are clean over all 15
> fork-touched `.ts`/`.tsx` files.
>
> Fork-specific checks: the kept `thread-transfer-report.yml` publisher test (`node --test
.github/scripts/thread-transfer-report.test.cjs`) passes 6/6; `infra/relay/scripts/deploy.test.ts`
> passes 9/9 with its dropped release-workflow guard; every kept workflow is on a standard
> GitHub-hosted runner with no secret beyond `GITHUB_TOKEN` (`grep -rn blacksmith
.github/workflows/` still hits only the explanatory comment in `desktop-artifacts.yml`); and a
> repo-wide grep for the deleted workflow filenames turns up only the two intentional fork notes.

> **Migration caution — no longer applies, but keep the rule.** The fork carries **no**
> migrations of its own (`git diff upstream/main HEAD -- apps/server/src/persistence/` is
> empty); upstream's set runs to `040_*` unmodified. If a future change reintroduces a
> fork-only migration, renumber it to sort after upstream's latest and verify `Migrations.ts`
> registers the merged set exactly once — a collision here is a data-corruption bug, not a
> merge annoyance.

---

## Active changes — this fork

> Entry numbers are **stable identifiers** tied to the original fork commits — they are
> never renumbered. A gap in the sequence means that entry moved to "Superseded changes"
> or "Dropped changes"; look for it there.
>
> **Carried on `main` today:** 11, 12 (its `AGENTS.md` sections only — the symlink half is now
> upstream's), 13, 14, 15, 16, 17 — workflows, fork documentation, and three source changes: 15
> and 16 (both from the same multi-instance provider investigation) and 17 (configurable worktree
> branch prefix).
> **Fork-intentional but not on `main` anywhere:** 5 (commit-preselect remainder), 6, 7.
> Their PR branches were deleted from `origin`; the only surviving copies are
> `refs/pull/6/head` (`47f1f30b`) and `refs/pull/7/head` (`8c295d66`), which sit on the
> **2026-07-23** base and predate upstream's libghostty terminal, sidebar-v2 default, and
> composer rework. Re-deriving them against current upstream is the only realistic path;
> the old hunks will not apply.
>
> Note that entries 5, 6, and 7 have now gone several consecutive rebases without being
> re-derived. They are still listed as fork intent, not as work in flight — nothing is lost by
> leaving them here, but do not read their presence as a claim that the behavior exists on
> `main`.

### 5. Open the commit modal with only the thread's own changed files pre-checked

- **Files (last known):** `apps/web/src/session-logic.ts` (+ test),
  `apps/web/src/components/ChatView.tsx`,
  `apps/web/src/components/GitActionsControl.tsx` (+ `.browser.tsx` test),
  `apps/web/src/components/chat/ChatHeader.tsx`,
  `apps/web/src/components/chat/MessagesTimeline.tsx`
- **Commit:** `e6990e3`
- **What (remaining intent):** The completion "Changed files" box gets a commit button that
  opens the commit modal with exactly the files this thread touched pre-checked (checkboxes
  shown automatically); the regular commit button still selects all files.
- **Why:** Committing a thread's work should not require hand-unchecking every unrelated
  dirty file in the worktree.
- **Re-apply notes:** The original derived the per-turn file set itself
  (`deriveTurnChangedFilesByTurnId` in `session-logic.ts`, with
  `normalizeWorkspaceRelativeFilePath` handling backslashes, workspace-root prefixes, and
  case-insensitive comparison). That half is upstream's now — source the file list from
  upstream's per-turn checkpoint data instead of re-deriving it. What is left is
  cross-component plumbing: thread a preselected-files prop from `ChatView` through
  `MessagesTimeline`/`ChatHeader` into `GitActionsControl`, whose `allFiles` memo and
  commit-dialog state handle the preselection. Expect this wiring to need adaptation
  whenever upstream reworks `GitActionsControl`.
- **Redundancy check (as of `c3e37094`): keep — the display half is superseded, the
  commit-preselect button is not.** Upstream's `AssistantChangedFilesSection` (still in
  `MessagesTimeline.tsx`) attributes changed files per turn, which was the bulk of the
  original entry; see "Superseded changes". No `preselect`-style symbol exists anywhere in
  `apps/web/src`, so the commit-modal half is still unshipped. All five last-known files still
  exist at their recorded paths. **`GitActionsControl.tsx` took zero upstream commits in the
  `db0659fe..c3e37094` range**, so the anchors the previous rebase flagged as moved have now
  settled: `allFiles` is still the plain `gitStatusForActions?.workingTree.files ?? []` memo
  (with `selectedFiles` derived from it through `excludedFiles`) that the preselect prop has to
  seed. `MessagesTimeline.tsx` churned three times; re-read it before threading the prop
  through.

### 6. Keep the completed (green) dot until the thread is read

- **Files (last known):** `apps/web/src/uiStateStore.ts` (+ test),
  `apps/web/src/components/Sidebar.logic.ts` (+ test),
  `apps/web/src/components/Sidebar.tsx`,
  `apps/web/src/components/ThreadStatusIndicators.tsx`
- **Commit:** `2f440ff`
- **What:** Track `threadLastCompletionAcknowledgedAtById` in the persisted UI
  state (seeded from `threadLastVisitedAtById` for legacy blobs, pruned with
  thread sync). The sidebar keeps a thread's green completed dot until the
  completion is acknowledged by viewing the thread, even though the "completed"
  tag itself still clears on open.
- **Why:** Opening a thread instantly cleared the dot, so it was easy to lose
  track of which completed threads had actually been looked at.
- **Re-apply notes:** Anchor on the persisted-UI-state shape in
  `uiStateStore.ts` (mirror everything done for `threadLastVisitedAtById`:
  initial state, hydrate, persist, `syncThreads` pruning/seeding). The
  outstanding TODO refinement — only mark read after ~3s of visibility — is
  not implemented; don't mistake the TODO for shipped behavior.
- **Redundancy check (as of `c3e37094`): keep.** `uiStateStore.ts` has now gone **three**
  consecutive rebases without an upstream change and still tracks only
  `threadLastVisitedAtById`; there is no acknowledged-at equivalent anywhere in `apps/web/src`
  (the `hasServerAcknowledgedLocalDispatch` helper in `ChatView.logic.ts` is unrelated — it is
  composer dispatch bookkeeping). The v2 `Sidebar.tsx` remains the target
  (`LegacySidebar.tsx` is still opt-in — leave it alone). **The precise hook point is
  `hasUnseenCompletion` in `Sidebar.logic.ts`** (now at line 259), which compares
  `latestTurn.completedAt` against a `thread.lastVisitedAt` field passed in on
  `ThreadStatusInput` — it does not read the `threadLastVisitedAtById` map itself, so the
  acknowledged-at value has to reach it the same way (widen `ThreadStatusInput` and its call
  sites in `Sidebar.tsx` / `ThreadStatusIndicators.tsx`) rather than by patching the store read.
  That shape is unchanged from the last rebase. `Sidebar.logic.ts` took one commit in this
  range (`1afe5545`, #7103, thread reordering) and `Sidebar.tsx` eight — none of them near
  `hasUnseenCompletion` — so this is the calmest these anchors have been in three rebases.

### 7. Per-thread composer message history (arrow-key recall)

- **Files (last known):** `apps/web/src/threadMessageHistory.ts` (new, + test),
  `apps/web/src/threadMessageHistoryStore.ts` (new),
  `apps/web/src/components/chat/ChatComposer.tsx`,
  `apps/web/src/components/ComposerPromptEditor.tsx`
- **Commit:** `274d317`
- **What:** Every sent message is appended to a per-thread history (capped at
  `THREAD_MESSAGE_HISTORY_LIMIT = 100`, persisted via
  `threadMessageHistoryStore`). In the composer, ArrowUp recalls older
  messages and ArrowDown moves forward again, shell-style — but only when the
  cursor is on the first line (up) or last line (down)
  (`isThreadMessageHistoryBoundary`); otherwise arrows move the cursor
  normally. The in-progress draft is stashed and restored when navigating back
  past the newest entry (`resolveThreadMessageHistoryNavigation`).
- **Why:** Recover/resend prior messages quickly, like terminal input history.
- **Re-apply notes:** All navigation rules are pure functions in
  `threadMessageHistory.ts` with tests — re-apply that module verbatim and
  redo only the `ChatComposer`/`ComposerPromptEditor` key-handler wiring if the
  composer has been refactored.
- **Redundancy check (as of `c3e37094`): keep.** No `threadMessageHistory` /
  `THREAD_MESSAGE_HISTORY` symbols upstream; the composer still has no history recall.
  The pure `threadMessageHistory.ts` module still ports verbatim, but the composer
  key wiring must be redone — `ComposerPromptEditor.tsx` still routes ArrowUp/ArrowDown
  through Lexical `registerCommand` (`unregisterArrowUp` at line 939, feeding a shared
  `handleCommand(key, event)` at line 913 typed to `"ArrowDown" | "ArrowUp" | "Enter" | "Tab"`),
  and that handler is already claimed by the completion/command menu. **That `handleCommand`
  union is the seam to extend**: the boundary rules from `isThreadMessageHistoryBoundary` have
  to run only when the menu declines the key. `ComposerPromptEditor.tsx` took one commit in this
  range (`792a1404`, #7150, attached composer state drawers) and the anchors landed at the same
  line numbers as last rebase, but `ChatComposer.tsx` took five — including `e7235012` (#7737),
  which puts **skills into the slash-command menu** and so adds another claimant on ArrowUp /
  ArrowDown. Re-read the current key handlers, and expect the menu to decline the key less often
  than it used to.

### 11. TODO list moved into this file; `TODO.md` deleted

- **Files:** `TODO.md` (deleted), this file's "TODO" section (bottom)
- **Commits:** `82cd7cf`, `3078f01` (and later edits)
- **What:** John's TODO / TODID lists (formerly prepended to upstream's
  `TODO.md`) now live in the "TODO" section at the bottom of this file, and
  `TODO.md` is removed from the tree.
- **Re-apply notes:** On sync this used to show up as a modify/delete conflict on
  `TODO.md` — resolve by keeping the deletion. If upstream added TODO items
  worth tracking, fold them into this file's TODO section instead of
  resurrecting `TODO.md`.
- **Redundancy check (as of `c3e37094`): moot — no conflict left to resolve.**
  `TODO.md` is still absent from upstream's tree (`git ls-tree upstream/main TODO.md`
  is empty), so the deletion no longer collides with anything. Nothing to
  re-apply; keep the TODO section in this file.

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
- **Redundancy check (as of `c3e37094`): keep, clean replay.** The two fork sections still sit
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
- **Redundancy check (as of `c3e37094`): keep, refreshed.** Upstream made **no** `README.md`
  change in this range, so the banner replayed untouched. Its body needed a real edit rather
  than just a marker bump this time: the previous text claimed the fork's diff was the workflow
  set alone and that `apps/` / `packages/` were byte-identical to upstream, which stopped being
  true when entries 15 and 16 landed. The banner now names the two source changes as well, and
  the rebase marker inside it moved to `c3e37094` / 2026-08-21.

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
  Windows `x64` NSIS) on every push to `main` and on dispatch, **unsigned**, and
  uploads them as workflow artifacts. Carries over the three secret-free steps that
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
  diff it against upstream's `release.yml` build job on every sync.
- **Redundancy check (as of `c3e37094`): keep, and once again this entry is where the rebase
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
- **Redundancy check (as of `c3e37094`): keep, clean replay — neither half is superseded.** Both
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
  entry fixes wrong numbers, it does not add a feature.
- **Drop it when:** upstream's `resolveTranscriptDirs` reads `settings.providerInstances`. Check
  with `grep -n providerInstances apps/server/src/usage/UsageService.ts` against clean upstream —
  no hit means this entry is still needed.
- **Redundancy check (as of `c3e37094`): keep, clean replay.** The drop-check comes back empty:
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
- Fix: Terminal does not capture ctrl+c or possibly other key commands when in focus, make it so it does.
- Maintain a history of messages in each thread if it isn't already. When a users cursor is in the message input box and they use the up arrow key it should populate the input with the last message they sent in that thread, pressing it multiple times goes further back in their message history. If they use the down arrow key it should go forward in the message history. This is similar to how terminal input works. If the input box has multiple lines of text, this should only happen when the cursor is on the first line and the up arrow is pressed or the last line and the down arrow is pressed, otherwise it should just move the cursor up and down as normal.
- Make the effect of threads moving to the top of the list when they are updated, optional based on a settings menu toggle. This should be on by default but if a user prefers the old way they can change it in settings.

### John's TODID

- Fix: Building on windows failed because of spaces in file paths
- Fix: Copilot CLI provider not working or fully implemented
- Fix: Gemini CLI provider not looking in the right path on Windows and not fully implemented
- Feature: Make it so time stamps in chat messages show the full date when hovering over them
