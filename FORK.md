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
points at it. The 2026-08-17 rebase left the fork carrying **no source change at all**; entry 15
(Claude provider auth reporting) reintroduced one, so `apps/` and `packages/` now differ from
upstream again. `native/`, `scripts/`, `packaging/`, and `pnpm-lock.yaml` remain byte-identical.

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

> **Last rebase onto upstream:** **2026-08-17**, onto `pingdotgg/t3code` `main` at
> **`13458e65`** — _fix(web): center the context usage meter (#7296)_. The `main` this
> replaces was `8d6b5a56` (based on `9821bca1`, 2026-08-10), which had itself replaced
> `baaa8682` (based on `de592a00`, 2026-08-05). This rebase takes in **212 upstream
> commits**.
>
> **The symlink half of entry 12 was superseded at this rebase** — upstream replaced the
> `CLAUDE.md` symlink with a regular file whose content is `@AGENTS.md` in `4cb676cc` (#7171),
> which is the `@file` import syntax used in the one place it works. The fork's two `AGENTS.md`
> sections are untouched and entry 12 stays active for them; see "Superseded changes".
> `main` still carries no change under `apps/`, `packages/`, `native/`, or the new
> `packaging/`: the entire fork diff against upstream remains workflows plus fork
> documentation.
>
> `main` history was rewritten by force-push at this rebase. The overwritten tip `8d6b5a56`
> **was backed up** to `origin/backup/main-pre-rebase-2026-08-17`, as `baaa8682` was to
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
> **What was verified at the 2026-08-17 rebase:** `git diff upstream/main HEAD -- apps/ packages/
native/ scripts/ packaging/ pnpm-lock.yaml pnpm-workspace.yaml` is **empty** — the fork's source
> tree and lockfile are byte-identical to upstream, so the `--frozen-lockfile` / `typecheck` /
> `test` checklist would only have been testing upstream against itself, and it was not run (the
> host again had node 22 against the pinned node ^24.13.1). The checks that were fork-specific
> ran: the kept `thread-transfer-report.yml` publisher test (`node --test
.github/scripts/thread-transfer-report.test.cjs`) passes 6/6; every kept workflow is on a
> standard GitHub-hosted runner with no secret beyond `GITHUB_TOKEN` (`grep -rn blacksmith
.github/workflows/` now hits only a comment in `desktop-artifacts.yml`); the one new dangling
> reference to a deleted workflow (`packaging/aur/README.md` → `publish-aur.yml`) was given a fork
> note; and `infra/relay/scripts/deploy.test.ts` has no leftover reference to the imports its
> dropped guard used. **Re-run the full checklist the moment any entry re-introduces a source
> change** — that is when the lockfile risk comes back.

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
> upstream's), 13, 14, 15 — workflows, fork documentation, and one source change (15).
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
- **Redundancy check (as of `13458e65`): keep — the display half is superseded, the
  commit-preselect button is not.** Upstream's `AssistantChangedFilesSection` (still in
  `MessagesTimeline.tsx`) attributes changed files per turn, which was the bulk of the
  original entry; see "Superseded changes". No `preselect`-style symbol exists anywhere in
  `apps/web/src`, so the commit-modal half is still unshipped. All five last-known files still
  exist at their recorded paths. **Unlike the previous rebase, `GitActionsControl.tsx` churned
  here** — four upstream commits in the `9821bca1..13458e65` range: `cad2c936` (#4849, the
  multi-provider pull-requests page with in-app reviews, the substantial one), plus `4c1d99d7`
  (#6392, commit-dialog path overflow), `2db08457` (#6207) and `35172010` (#6194) on action
  icons. Re-read its `allFiles` memo and commit-dialog state before threading the preselect
  prop; the plumbing shape should still hold, but the anchors have moved.

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
- **Redundancy check (as of `13458e65`): keep.** `uiStateStore.ts` again took **no** upstream
  change in this range and still tracks only `threadLastVisitedAtById`; there is no
  acknowledged-at equivalent anywhere in `apps/web/src` (the `hasServerAcknowledgedLocalDispatch`
  helper in `ChatView.logic.ts` is unrelated — it is composer dispatch bookkeeping). The v2
  `Sidebar.tsx` remains the target (`LegacySidebar.tsx` is still opt-in — leave it alone).
  **The precise hook point is `hasUnseenCompletion` in `Sidebar.logic.ts`**, which compares
  `latestTurn.completedAt` against a `thread.lastVisitedAt` field passed in on
  `ThreadStatusInput` — it no longer reads the `threadLastVisitedAtById` map itself, so the
  acknowledged-at value has to reach it the same way (widen `ThreadStatusInput` and its call
  sites in `Sidebar.tsx` / `ThreadStatusIndicators.tsx`) rather than by patching the store read.
  Both sidebar files churned heavily in this range — `Sidebar.tsx` in **16** commits (notably
  `fee10def` (#7209), which bans native `title` tooltips in favour of the styled `Tooltip`, and
  the `d7abd7f3` / `804cba43` workspace-layout refresh-and-revert pair) and `Sidebar.logic.ts`
  in four — so re-read them before wiring.

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
- **Redundancy check (as of `13458e65`): keep.** No `threadMessageHistory` /
  `THREAD_MESSAGE_HISTORY` symbols upstream; the composer still has no history recall.
  The pure `threadMessageHistory.ts` module still ports verbatim, but the composer
  key wiring must be redone — `ComposerPromptEditor.tsx` still routes ArrowUp/ArrowDown
  through Lexical `registerCommand` (`unregisterArrowUp` around line 939, feeding a shared
  `handleCommand(key, event)` typed to `"ArrowDown" | "ArrowUp" | "Enter" | "Tab"`), and that
  handler is already claimed by the completion/command menu. **That `handleCommand` union is the
  seam to extend**: the boundary rules from `isThreadMessageHistoryBoundary` have to run only
  when the menu declines the key. Both composer files churned again in this range — eight
  upstream commits across them, including `7c55e863` (#6602) and `34a12bc3` (#6574) adding
  pre-turn prompt/attachment rejection, `a6ac27e7` (#6636) accepting file drops across the chat
  workspace, and `9885a845` (#6381) simplifying global styling — so re-read the current key
  handlers before wiring anything.

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
- **Redundancy check (as of `13458e65`): moot — no conflict left to resolve.**
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
  ships for it (as of `13458e65` a regular file containing `@AGENTS.md`) and do not restore
  the old fork symlink; see "Superseded changes". The rule the old note encoded still holds
  as a rule, though: `@AGENTS.md` works as _file content_ and not as a symlink target, so a
  `CLAUDE.md` that is a symlink must point at the literal path `AGENTS.md`.
- **Redundancy check (as of `13458e65`): keep, clean replay.** The two fork sections still sit
  after upstream's two-paragraph intro and before `## What makes T3 Code special?`. Upstream
  touched `AGENTS.md` once in this range (`9e201941`, #6479 — dropping the rebase-before-PR
  requirement), far below the insertion point, so it replayed without a conflict. Expect a
  conflict on any rebase that rewrites upstream's intro; keep the fork sections, take
  upstream's prose.

### 13. Housekeeping: `README.md` fork banner and this file

- **Files:** `README.md`, `FORK.md`
- **What:** An "About this fork" blockquote prepended to `README.md` (before the `# T3 Code`
  heading), plus this file.
- **Re-apply notes:** The banner is delimited by `<!-- FORK-BANNER:START -->` /
  `<!-- FORK-BANNER:END -->` — re-derive the text between them rather than merging it, since
  it goes stale every time an entry moves out of "Active".
- **Redundancy check (as of `13458e65`): keep, refreshed.** The banner's body still describes
  the fork accurately (workflow set only; everything under `apps/`, `packages/`, `native/`
  byte-identical to upstream), so only the rebase marker inside it moved to `13458e65` /
  2026-08-17. Upstream's two `README.md` changes in this range (`e9ae134c` routing feature
  requests to Discussions, `e25021af` #4128 splitting the existing Arch/AUR install block into
  stable and nightly packages) both landed below the banner without conflict.

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
  - `ci.yml` — upstream's Blacksmith runners (`blacksmith-8vcpu-ubuntu-2404` on
    `check` / `test` / `release_smoke`) → `ubuntu-24.04`, and the macOS-only
    `mobile_native_static_analysis` job dropped (this fork does not target
    mobile, and its `blacksmith-6vcpu-macos-26` runner is unavailable to it).
  - `issue-labels.yml` — unmodified; `GITHUB_TOKEN` only, and it bootstraps the
    labels `.github/ISSUE_TEMPLATE/*.yml` apply.
  - `thread-transfer-report.yml` — **adopted at the 2026-08-10 rebase**, unmodified. Arrived
    with `ddfe45c6` (#5350) and passes the standing rule as shipped: upstream wrote it on
    `ubuntu-24.04` (not Blacksmith) with `secrets.GITHUB_TOKEN` only. It runs on
    `workflow_run` against `workflows: [CI]` — a workflow this fork keeps — and comments the
    thread-transfer budget diff from the `thread-transfer-results` artifact that #5350 also
    added to `ci.yml`'s Test job. Its `.github/scripts/thread-transfer-report.cjs` publisher
    and test came along; `node --test .github/scripts/thread-transfer-report.test.cjs` passes
    6/6 here.
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
- **Redundancy check (as of `13458e65`): keep, and this is again where the 2026-08-17 rebase did
  nearly all of its work.** Upstream added **one** new workflow in the `9821bca1..13458e65`
  range — `publish-aur.yml`, **declined**; see the Deleted list above. Upstream did **not** touch
  `ci.yml` at all in this range, so the fork's `ci.yml` delta replayed untouched and is still
  exactly the three `runs-on` lines plus the dropped `mobile_native_static_analysis` job;
  `issue-labels.yml` and `thread-transfer-report.yml` were likewise unchanged upstream and stay
  unmodified. `grep -rn blacksmith .github/workflows/` now matches only the explanatory comment
  in `desktop-artifacts.yml`. Four modify/delete conflicts came up and were all resolved as
  **deletions**, per this entry: `.github/VOUCHED.td` (upstream kept adding vouch entries),
  `.github/workflows/release.yml`, `mobile-eas-production.yml`, and
  `mobile-showcase-screenshots.yml`. `desktop-artifacts.yml` was diffed against upstream's
  `release.yml` build job as this entry requires, and the check was worth running this time
  because upstream _did_ touch `release.yml` (`1b120f35` #6034, `e25021af` #4128): both changes
  landed **outside** the build job — a `timeout-minutes` bump on the `release` job and the new
  `publish_aur` call — and the build job is byte-for-byte identical across the range (346 lines
  either side), so there is **no drift**. Note that upstream's build **script**
  `scripts/build-desktop-artifact.ts` did change (`ad117235` #6201 macOS DMG installer
  background, `c9063f03` #6169, `7e01d33f` #5877); that is shared source the fork does not fork,
  and the fork's invocation still matches upstream's (`vp run dist:desktop:artifact` with the
  same `--platform` / `--target` / `--arch` args, minus `--signed` and the credential env
  block). The fork's workflow set is unchanged: `ci.yml`, `desktop-artifacts.yml`,
  `issue-labels.yml`, `thread-transfer-report.yml`.

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
- **Related gap, deliberately not fixed here:** `apps/server/src/usage/UsageService.ts` resolves
  the Claude transcript directory from `settings.providers.claudeAgent` — the _default_ instance's
  legacy blob — so usage and limits for any additional Claude instance are never scanned. Same
  class of bug (default instance treated specially), out of scope for this entry, and worth its
  own entry if it ever gets fixed here.
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

---

## Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not
re-introduce them.** Each entry names the upstream change that replaced it; all
were re-verified against `13458e65` during the 2026-08-17 rebase.

| #            | Fork change                       | Superseded by                                                             | Verified at |
| ------------ | --------------------------------- | ------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_          | `13458e65`  |
| 4            | Terminal Ctrl-chord forwarding    | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_     | `13458e65`  |
| 5 (core)     | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints                       | `13458e65`  |
| 8            | Full timestamp on hover           | `formatChatTimestampTooltip`                                              | `13458e65`  |
| 9            | Always-visible new-thread btn     | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_        | `13458e65`  |
| 10           | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                                    | `13458e65`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md` | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_ | `13458e65`  |

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
