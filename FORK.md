# Fork notes (mclaren-data-systems/t3code)

## Purpose of this fork

This is a development fork of pingdotgg/t3code, maintained at mclaren-data-systems/t3code.
It tracks `pingdotgg/t3code` closely and deliberately carries only a thin layer of changes.
It is not a hard fork: every entry below is provisional, and whenever upstream ships
an equivalent or the change is somehow negated the fork change is dropped rather than defended.
The goal is to rebase onto upstream indefinitely, so the active diff stays as small as
possible and changes are reapplied based on intent, not directly based on the specific change's
existing implementation.

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

> **Last rebase onto upstream:** **2026-08-05**, onto `pingdotgg/t3code` `main` at
> **`de592a00`** — _Enrich terminal font previews (#5428)_. The `main` this replaces was
> `563d725d` (based on `30c96228`, 2026-08-02), which had itself just replaced `ba07e561`
> (based on `89c5a19`, 2026-07-27). Measured from the last `main` that was verified end to
> end, this takes in **180 upstream commits**; 38 of them are new since `30c96228`.
>
> **This rebase also dropped the ported third-party provider layer** (GitHub Copilot CLI and
> Gemini CLI adapters/drivers/providers and their contract, settings, and `pnpm-lock.yaml`
> deltas) — see "Dropped changes" for entries 2 and 3 and the file list. `main` no longer
> carries any change under `apps/`, `packages/`, or `native/`: the entire fork diff against
> upstream is now workflows plus fork documentation.
>
> `main` history was rewritten by force-push at this rebase. The overwritten tips were
> `563d725d` and, before it, `ba07e561`; no backup branches were pushed, so treat both as
> recoverable only from GitHub's unreachable-object retention.

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

> **Migration caution — no longer applies, but keep the rule.** The fork carries **no**
> migrations of its own (`git diff upstream/main HEAD -- apps/server/src/persistence/` is
> empty); upstream's set runs to `036_*` unmodified. If a future change reintroduces a
> fork-only migration, renumber it to sort after upstream's latest and verify `Migrations.ts`
> registers the merged set exactly once — a collision here is a data-corruption bug, not a
> merge annoyance.

---

## Active changes — this fork

> Entry numbers are **stable identifiers** tied to the original fork commits — they are
> never renumbered. A gap in the sequence means that entry moved to "Superseded changes"
> or "Dropped changes"; look for it there.
>
> **Carried on `main` today:** 11, 12, 13, 14 — i.e. workflows and fork documentation only.
> **Fork-intentional but not on `main` anywhere:** 5 (commit-preselect remainder), 6, 7, 9.
> Their PR branches were deleted from `origin`; the only surviving copies are
> `refs/pull/6/head` (`47f1f30b`) and `refs/pull/7/head` (`8c295d66`), which sit on the
> **2026-07-23** base and predate upstream's libghostty terminal, sidebar-v2 default, and
> composer rework. Re-deriving them against current upstream is the only realistic path;
> the old hunks will not apply.

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
- **Redundancy check (as of `de592a00`): keep — the display half is superseded, the
  commit-preselect button is not.** Upstream's `AssistantChangedFilesSection` (in
  `MessagesTimeline.tsx`) attributes changed files per turn, which was the bulk of the
  original entry; see "Superseded changes". No `preselect`-style symbol exists anywhere in
  `apps/web/src`, so the commit-modal half is still unshipped.

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
- **Redundancy check (as of `de592a00`): keep.** `uiStateStore.ts` still tracks only
  `threadLastVisitedAtById`; there is no acknowledged-at equivalent anywhere in
  `apps/web/src` (the `hasServerAcknowledgedLocalDispatch` helper in `ChatView.logic.ts` is
  unrelated — it is composer dispatch bookkeeping). Re-derive rather than re-apply:
  `Sidebar.tsx` is sidebar-v2 by default (#4491, #4717) and has since gained thread pinning
  (#5312), so the old hunk's anchors are gone.

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
- **Redundancy check (as of `de592a00`): keep.** No `threadMessageHistory` /
  `THREAD_MESSAGE_HISTORY` symbols upstream; the composer still has no history recall.
  The pure `threadMessageHistory.ts` module still ports verbatim, but the composer
  key wiring must be redone — upstream reworked `ComposerPromptEditor` around Lexical
  `registerCommand` ArrowUp/ArrowDown handlers, added a per-provider prompt stash (#4453),
  and has since re-anchored the composer command menu (#5336), all of which claim composer
  keys.

### 9. Sidebar: always-visible new-thread button beside the env badge

- **Files:** `apps/web/src/components/Sidebar.tsx`
- **Commit:** `5103758`
- **What:** Show the remote-environment badge and the
  `data-testid="new-thread-button"` button side by side and unconditionally, instead of
  crossfading between them on hover.
- **Why:** The new-thread button was only discoverable on hover.
- **Redundancy check (as of `de592a00`): partially superseded — re-derive, don't
  re-apply.** Upstream renders the new-thread button itself, with the same
  `data-testid="new-thread-button"`, a `New thread (<shortcut>)` tooltip, and an
  environment badge whose tooltip already lists the environment labels (the tooltip half of
  this entry is therefore upstream's now). What upstream still does **not** do is show the
  button unconditionally: in `Sidebar.tsx` the button wrapper is
  `opacity-0 … group-hover/project-header:opacity-100 group-focus-within/project-header:opacity-100`
  with only `max-sm` getting `pointer-events-auto opacity-100`, and the environment badge
  carries the mirrored `group-hover/project-header:opacity-0`, i.e. the crossfade is intact.
- **Re-apply notes:** **Keep** the always-visible intent, but implement it as a small change
  to upstream's current markup — drop the `opacity-0`/hover-gating classes on the button
  wrapper and the `group-hover:opacity-0` on the badge — rather than restoring the old fork
  hunk. Note the badge and button now sit at different anchors (`top-1 right-1.5` vs
  `top-[calc(50%+1px)] right-0.5`), so un-gating both without adjusting position will
  overlap them.

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
- **Redundancy check (as of `de592a00`): moot — no conflict left to resolve.**
  `TODO.md` is absent from upstream's tree (`git ls-tree upstream/main TODO.md`
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
  own `AGENTS.md`. `CLAUDE.md` must stay a symlink pointing at the literal path `AGENTS.md`
  — a `16c78b6`-style retarget to `@AGENTS.md` leaves it dangling (the `@file` import syntax
  only works inside a file's content, not as a symlink target).
- **Redundancy check (as of `de592a00`): keep, re-anchor on conflict.** Upstream rewrote
  `AGENTS.md` wholesale in #4807 (`b64ae880`); the file opens `# T3 Code` with a
  two-paragraph intro, and the two fork sections are inserted after that intro, before
  `## What makes T3 Code special?`. Expect a conflict on any rebase that touches upstream's
  agent guidance; keep the fork sections, take upstream's prose.

### 13. Housekeeping: `README.md` fork banner and this file

- **Files:** `README.md`, `FORK.md`
- **What:** An "About this fork" blockquote prepended to `README.md` (before the `# T3 Code`
  heading), plus this file.
- **Re-apply notes:** The banner is delimited by `<!-- FORK-BANNER:START -->` /
  `<!-- FORK-BANNER:END -->` — re-derive the text between them rather than merging it, since
  it goes stale every time an entry moves out of "Active".
- **Redundancy check (as of `de592a00`): keep, rewritten.** Rewritten at this rebase: the
  banner previously advertised the Copilot and Gemini CLI providers, which are gone (see
  "Dropped changes"). It now describes only the workflow set, which is all `main` carries.

### 14. A workflow set this fork can actually run

- **Files:** `.github/workflows/ci.yml`, `.github/workflows/desktop-artifacts.yml` (new),
  deleted `.github/workflows/{release,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch}.yml`
  and `.github/VOUCHED.td`; fork notes in `docs/internals/ci.md`,
  `docs/operations/release.md`, `docs/operations/mobile-app-store-screenshots.md`,
  `infra/relay/README.md`; `CONTRIBUTING.md` and `infra/relay/scripts/deploy.test.ts` fallout
- **Commits:** `dbbb3b07`, `9c3dd8f5`
- **Standing rule:** a workflow stays in this fork only if it can actually run
  here — **standard GitHub-hosted runners** (upstream's `blacksmith-*` labels do
  not resolve; jobs sit queued for 24h and are auto-cancelled) and **no
  credentials beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted,
  not disabled. Verified against the fork's run history: 30+ consecutive
  scheduled `Release` runs were cancelled after the 24h queue timeout, and the
  only push-triggered `CI` run ever recorded went the same way.
- **Kept (2 upstream workflows):**
  - `ci.yml` — upstream's Blacksmith runners (`blacksmith-8vcpu-ubuntu-2404` on
    `check` / `test` / `release_smoke`) → `ubuntu-24.04`, and the macOS-only
    `mobile_native_static_analysis` job dropped (this fork does not target
    mobile, and `blacksmith-12vcpu-macos-26` is unavailable to it).
  - `issue-labels.yml` — unmodified; `GITHUB_TOKEN` only, and it bootstraps the
    labels `.github/ISSUE_TEMPLATE/*.yml` apply.
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
  `blacksmith-16vcpu-ubuntu-2404`).
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
  `docs/operations/mobile-app-store-screenshots.md`, and `infra/relay/README.md` gained
  fork notes.
- **Re-apply notes:** Highest-churn area, and the one entry that reliably bites. Re-derive
  from upstream's **new** workflow files and re-apply the standing rule above (runner swap,
  drop credentialed/unavailable jobs) rather than force-keeping stale fork copies. A new
  upstream workflow arriving in a rebase is opt-**in**: it ships only if it passes the
  standing rule. Separately, `desktop-artifacts.yml` is fork-owned and can drift against
  upstream's desktop build requirements **without ever showing up as a merge conflict** —
  diff it against upstream's `release.yml` build job on every sync.
- **Redundancy check (as of `de592a00`): keep, clean replay.** Upstream added no new
  workflows in the `30c96228..de592a00` range and did not touch `ci.yml`; the only change
  under `.github/` was to `release.yml` (#5394), which this fork deletes. The fork's
  workflow set is `ci.yml`, `desktop-artifacts.yml`, `issue-labels.yml`.

---

## Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not
re-introduce them.** Each entry names the upstream change that replaced it; all
were re-verified against `de592a00` during the 2026-08-05 rebase.

| #        | Fork change                    | Superseded by                                                         | Verified at |
| -------- | ------------------------------ | --------------------------------------------------------------------- | ----------- |
| 1        | Windows build: no shell mode   | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_      | `de592a00`  |
| 4        | Terminal Ctrl-chord forwarding | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_ | `de592a00`  |
| 5 (core) | Thread-scoped changed files    | `AssistantChangedFilesSection` per-turn checkpoints                   | `de592a00`  |
| 8        | Full timestamp on hover        | `formatChatTimestampTooltip`                                          | `de592a00`  |
| 10       | Package-local vitest configs   | `vp` (vite-plus) test-runner migration                                | `de592a00`  |

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
- **Change 10 — package-local vitest configs.** Upstream migrated the test
  runner to `vp` (vite-plus); the old `vitest.config.ts` files no longer apply,
  and upstream still ships none of its own for these packages. Revisit only if
  those packages' process-spawning tests flake under `vp`.

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
