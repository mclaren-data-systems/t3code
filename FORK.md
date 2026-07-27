# Fork notes (mclaren-data-systems/t3code)

## Purpose of this fork

This fork exists to run T3 Code on a Windows-first, multi-provider developer
setup that upstream does not target. It tracks `pingdotgg/t3code` closely and
deliberately carries only a thin layer of changes: **extra agent providers**
(GitHub Copilot CLI and Gemini CLI, ported selectively from
`aaditagrawal/t3code` and registered so they are actually detected — including
the Windows `.cmd`-shim path resolution Gemini needs), **small workflow and UX
fixes** the maintainer wants day to day (forwarding Ctrl-chords to the embedded
terminal, per-thread composer history, sidebar read-state tweaks), and **CI made
runnable by a fork** (standard GitHub-hosted runners instead of upstream's
Blacksmith ones). It is not a hard fork: every entry below is provisional, and
whenever upstream ships an equivalent the fork change is dropped rather than
defended. The goal is to stay rebasable onto upstream indefinitely, so the
active diff stays as small as possible.

This file is the authoritative list of changes that set this fork
(`mclaren-data-systems/t3code`, branch `main`) apart from upstream. It is
written to be used by a human or an AI agent when **rebasing onto / merging a
newer upstream, or re-applying these changes**.

The fork relates to two source repos:

- **Upstream (source of truth):** [`pingdotgg/t3code`](https://github.com/pingdotgg/t3code) —
  the project we track and reset onto.
- **Feature source (selective):** [`aaditagrawal/t3code`](https://github.com/aaditagrawal/t3code) —
  a multi-provider expansion fork that stays close to `pingdotgg` (its net diff vs upstream is
  clean and current). We port **selected** features from it — no longer carried wholesale.

When you reset/sync, work through every entry below. For each one:

1. Check whether upstream (or the aadit fork, for ported entries) has since implemented an
   equivalent fix. If it has, **drop** the fork change and move it to "Superseded changes"
   with a note naming the upstream change that replaced it.
2. Otherwise re-apply it, adapting to any code that moved. Re-run focused verification for
   touched packages (see the tooling note below).
3. Keep this file in sync: update the "Last rebase" marker, and move entries between the
   "Active" and "Superseded" sections as upstream evolves.

> **Last rebase onto upstream:** **2026-07-27**, onto `pingdotgg/t3code` `main` at
> **`89c5a19`** — _fix(dev): skip browser-blocked ports (#4608)_. Previous base was
> `b41e89e` (2026-07-23), so this rebase took in **36 upstream commits**.
> The pre-reset fork is preserved at branch/tag **`pre-reset-main-2026-07-23`** (`8744b86`);
> the pre-rebase tip of this lineage was `ead4077`.
> The aadit fork tip at the 2026-07-23 reset was `937f301` (branch `aadit/main`).

---

## 2026-07-27 rebase

`main`'s five fork commits were replayed from base `b41e89e` onto `89c5a19` with
`git rebase --onto`. **No textual conflicts.** The resulting net diff vs upstream is
37 files / ~7.1k added lines — unchanged in shape from before the rebase.

Every active entry was re-checked against the 36 incoming commits. Outcome:

- **Newly superseded:** none of the entries carried on `main` — the incoming upstream
  work does not overlap them. Entries **1**, **8**, **10** and **5 (core)** were already
  superseded at the 2026-07-23 reset; this pass re-verified each against `89c5a19` and
  names the replacing upstream change (see "Superseded changes").
- **Partially superseded:** entry **9** (always-visible new-thread button). Upstream now
  ships the button itself with the same `data-testid="new-thread-button"` **and** the
  environment-label tooltip this entry added — but on desktop it is still
  hover/focus-revealed (`opacity-0` → `group-hover/project-header:opacity-100`), always
  visible only under `max-sm`. The "always visible" intent survives; the tooltip half is
  now upstream's. Re-derive from upstream's current `Sidebar.tsx` rather than re-applying
  the old hunk.
- **Moot:** entry **11**'s modify/delete conflict on `TODO.md` can no longer occur —
  `TODO.md` is absent from `89c5a19` entirely, so there is nothing to resolve on sync.

**Verification run at `89c5a19`** (node 24.18.0, pnpm 11.10.0):

- `pnpm install --frozen-lockfile` — **clean**. This matters: upstream rewrote ~145 lines
  of `pnpm-lock.yaml` and reshuffled the `pnpm-workspace.yaml` catalogs in this range
  (Clerk upgrade, #4440), and the fork adds its own `@github/copilot*` importer entries.
  The lockfile survived the replay without drift.
- `pnpm run typecheck` — **0 errors** across all 15 packages (suggestion-level Effect
  lint hints only, several of them pre-existing upstream ones).
- `pnpm run test` — 294/295 passing. The single failure is **pre-existing upstream and
  environmental**, not a rebase regression; see the verification note below.

> **Known environmental test failure:** `packages/shared/src/Net.test.ts` →
> _"findAvailablePort returns preferred when it is free"_ fails **in any container without
> IPv6**. Upstream's `isPortAvailableOnLoopback` requires a port to be bindable on both
> `127.0.0.1` **and** `::1`; `canListenOnHost` only treats `EADDRNOTAVAIL` as "available",
> so an IPv6-less host returns `EAFNOSUPPORT` → the preferred port is judged unavailable →
> `findAvailablePort` falls back to a different port and the assertion fails. This is
> upstream code the fork does not touch (`git diff upstream/main HEAD -- packages/shared/`
> is empty) and it arrived with #4608. Reproduces identically on clean upstream. Do not
> chase it as a fork regression.

---

## 2026-07-23 reset

`main` was hard-reset onto `pingdotgg/t3code` (force-pushed over the prior fork, which mixed
old pingdotgg + aadit merges) and the fork's changes are being re-applied as **discrete PRs**.

**Scope decisions for this reset (see the fork owner's choices):**

- **Providers:** bring **Copilot + Gemini CLI only** from aadit (plus the shared provider
  infra they need). **Drop** aadit's Amp, Kilo, and Droid providers.
- **Non-provider aadit groups brought in:** Settings & appearance UI (C), Web UI
  enhancements (D), Desktop branding + installer (E), CI/release workflow tweaks (F).
- **Dropped:** aadit's fork-maintenance tooling (section G).

**PR outcomes** (against `origin` = mclaren-data-systems/t3code; merge in order):

1. **Fork identity docs** (PR #3) — this `FORK.md`, README banner, `AGENTS.md` fork policy.
2. **Terminal Ctrl-key forwarding** (PR #4) — change 4 only. Changes **1** (Windows build),
   **8** (hover timestamp), **10** (vitest configs) are now **upstream/obsolete** — dropped.
3. **Provider expansion — Copilot + Gemini** (PR #5) — shared infra + the two adapters +
   changes 2/3. Registered in `BUILT_IN_DRIVERS`, **disabled by default** (opt-in).
4. **Surface Copilot/Gemini in the UI** (PR #6, stacked on #5) — `PROVIDER_OPTIONS`, provider
   icons, display names. aadit **section C** (settings/appearance UI) is superseded by
   upstream (theme, accent picker, add-provider wizard) — not ported.
5. **Fork chat/sidebar UX** (PR #7, stacked on #6) — changes **6** (completed dot), **7**
   (composer history), **9** (new-thread button). Change **5**'s core (thread-scoped changed
   files) is already upstream (`AssistantChangedFilesSection` per-turn checkpoints); only its
   commit-preselect button is unshipped (needs cross-component commit-dialog plumbing).
   aadit **section D** (web UI) is superseded by upstream — not ported.
6. **Desktop branding + installer** (section E) — **no PR**: upstream ships the electron
   launcher, `brand-assets`, desktop build, and the same Electron; the only aadit-unique piece
   (`scripts/install.sh`) is hardcoded to aadit's repo. Nothing additive for a dev fork.
7. **CI fork-runnable** (PR #8) — `ci.yml` Blacksmith runners → `ubuntu-24.04`, mobile job
   dropped. `release.yml` left as-is (release-only; needs secrets a fork lacks).

> **Verification note:** several classes of test failure are **environmental, not
> regressions** — always diff against clean upstream before chasing one.
> (a) Many server tests (Cursor/Grok ACP adapters, some `ProviderRegistry`) fail
> **locally on Windows** (process-spawn / POSIX-path assumptions) but pass on Linux CI.
> (b) `packages/shared/src/Net.test.ts` fails **in containers without IPv6** — see the
> 2026-07-27 rebase section for the full diagnosis.
> The composer arrow-key recall (#7) and completed-dot timing (#6) have **no unit tests**
> (browser-tested) and should be confirmed in-app.

> **Tooling note:** upstream migrated from **bun** to **pnpm@11 + node ^24** (pnpm catalogs
> in `pnpm-workspace.yaml`). The old fork's `bun`/`bun run test` commands no longer apply —
> use `pnpm` and the `vp` (vite-plus) scripts. Verification requires node + pnpm installed.
> The **node version matters**: `package.json` pins `engines.node: ^24.13.1`, and a node 22
> host will need `nvm install 24` before `pnpm install` behaves. The rebase checklist is
> `pnpm install --frozen-lockfile` → `pnpm run typecheck` → `pnpm run test`; the
> `--frozen-lockfile` step is the one that catches a `pnpm-lock.yaml` that replayed badly,
> which is the most likely silent breakage in a rebase that reports no conflicts.

---

## How this fork is layered

The fork divides into two layers with different sync strategies:

- **This fork's own changes** (John's work, sections 1–13): small, surgical, and the
  priority to preserve. Re-apply each individually from the notes below. The original
  commits (on the `pre-reset-main-2026-07-23` backup) are `1619f42`, `3ee45ab`, `01b28bb`,
  `5103758`, `30744f7`, `562a44b`, `f379f84`, `9f1c136`, `e6990e3`, `2f440ff`, `274d317`
  (plus `TODO.md` housekeeping) — a 3-way cherry-pick of each from the backup onto the new
  base is usually the fastest re-apply. Note: changes 2 & 3 (Copilot/Gemini registration)
  depend on the ported provider adapters in section B.
- **Ported from `aaditagrawal/t3code`** (sections A–H): as of the 2026-07-23 reset we port
  **selectively** — Copilot + Gemini adapters from section B (dropping Amp/Kilo/Droid),
  plus sections C, D, E, F. Because the aadit fork now tracks upstream closely, the cleanest
  source for each ported feature is the **current** `aadit/main` version of the relevant
  files (`git diff upstream/main aadit/main -- <paths>`), not the stale pre-reset copies.

**Migration caution for every sync:** `apps/server/src/persistence/Migrations/`
numbering collides between the two lineages (the tree already carries two
different `020_*` and `021_*` pairs: upstream's auth migrations and the fork's
provider-kind migrations). Upstream's `026_CanonicalizeModelSelectionOptions`
was dropped in favor of the fork's reworked `016_CanonicalizeModelSelections`.
When upstream adds new migrations, renumber fork-only migrations to sort after
upstream's latest, and verify `Migrations.ts` registers the merged set exactly
once.

---

## Active changes — this fork

> Entry numbers are **stable identifiers** tied to the original fork commits — they are
> never renumbered. A gap in the sequence means that entry moved to
> "Superseded changes"; look for it there.
>
> **Carried on `main` today:** 2, 3, 4, 11, 12, 13.
> **Fork-intentional but not yet on `main`:** 5 (commit-preselect remainder), 6, 7, 9 —
> these live on the unmerged PR branches `pr/04-surface-copilot-gemini-ui` and
> `pr/05-fork-ux` and are re-applied there, not here.

### 2. Register the Copilot provider (detection + status)

- **Files:** `apps/server/src/provider/Layers/CopilotProvider.ts` (new),
  `apps/server/src/provider/Services/CopilotProvider.ts` (new),
  `apps/server/src/provider/Layers/ProviderRegistry.ts`,
  `apps/server/src/provider/providerStatusCache.ts`
- **Commit:** `3ee45ab`
- **What:** Add a `CopilotProvider` layer/service and register it in
  `ProviderRegistry` and the provider status cache, so the Copilot CLI is
  actually detected and usable. (The Copilot _adapter_ itself —
  `CopilotAdapter.ts`, `copilotCliPath.ts` — is inherited from the aadit fork,
  section B; this change is the wiring that made it work.)
- **Why:** The inherited Copilot adapter existed but the provider was never
  detected ("Copilot CLI provider not working or fully implemented").
- **Re-apply notes:** Follow the registration pattern of the other managed
  providers in `ProviderRegistry.ts` (one layer entry + one status-cache
  entry). Provider kind is `"copilot"` (`apps/server/src/provider/providerKind.ts`).
- **Redundancy check (as of `89c5a19`): keep.** Upstream's `BUILT_IN_DRIVERS`
  still lists only `CodexDriver`, `ClaudeDriver`, `CursorDriver`, `GrokDriver`,
  `OpenCodeDriver` — no Copilot. If upstream ever ships its own, prefer
  upstream's and drop both this and the inherited adapter — then re-test
  detection on Windows (see change 3's shim caveats).

### 3. Register the Gemini CLI provider + Windows shim resolution

- **Files:** `apps/server/src/provider/Layers/GeminiCliProvider.ts` (new),
  `apps/server/src/provider/Services/GeminiCliProvider.ts` (new),
  `apps/server/src/provider/Layers/ProviderRegistry.ts`,
  `apps/server/src/provider/providerStatusCache.ts`,
  `apps/server/src/geminiCliServerManager.ts` (+ its test)
- **Commits:** `562a44b`, `01b28bb`
- **What:** Two parts. (a) Register a `GeminiCliProvider` layer/service the
  same way as change 2. (b) On Windows, resolve the real JS entry point behind
  the `gemini.cmd` npm shim: `parseGeminiShimEntryPoint` reads the shim file,
  extracts quoted `*.js` paths, resolves `%~dp0`-style prefixes against the
  shim directory (`resolveGeminiShimScriptPath`), and falls back to
  `GEMINI_SHIM_ENTRY_POINT_CANDIDATES`
  (`node_modules/@google/gemini-cli/dist/index.js` and `bundle/gemini.js`).
- **Why:** Gemini CLI was "not looking in the right path on Windows and not
  fully implemented" — npm installs a `.cmd` shim that can't be spawned
  directly by the server manager.
- **Re-apply notes:** The shim logic lives in `geminiCliServerManager.ts` and
  is covered by `geminiCliServerManager.test.ts` — carry the tests with the
  code. Provider kind is `"geminiCli"` (legacy alias `"gemini"` is normalized
  in `providerKind.ts`).
- **Redundancy check (as of `89c5a19`): keep.** No Gemini driver upstream (see
  change 2's check). If upstream gains first-party Gemini support, keep
  whichever Windows shim resolution is more complete and drop the rest.

### 4. Terminal: forward Ctrl+letter keys to the shell

- **Files:** `apps/web/src/components/ThreadTerminalDrawer.tsx`,
  `apps/web/src/components/ThreadTerminalDrawer.test.ts` (new),
  `apps/web/src/components/ThreadTerminalDrawer.browser.tsx`
- **Commit:** `9f1c136`
- **What:** Add `terminalControlShortcutData(event, hasSelection)`: on keydown
  of a plain `Ctrl+[a-z]` (no meta/alt/shift, no active selection), return the
  corresponding control character (`key.charCodeAt(0) - 96`) and send it via
  `sendTerminalInput`, with `preventDefault`/`stopPropagation`. Wired into the
  custom key handler in `TerminalViewport` before the clear-shortcut check.
- **Why:** The embedded terminal did not capture Ctrl+C (and other control
  chords) when focused — the app's own keybindings swallowed them.
- **Re-apply notes:** The selection guard matters: Ctrl+C with a selection must
  still copy. Insert the check before `isTerminalClearShortcut` so Ctrl+K/L
  clearing still works. Unit tests in `ThreadTerminalDrawer.test.ts` cover the
  mapping and guards.
- **Redundancy check (as of `89c5a19`): keep.** Upstream has not touched
  `keybindings.ts` or `ThreadTerminalDrawer.tsx` since `b41e89e` and still has no
  control-key forwarding. Drop only if upstream's terminal stack changes wholesale.

### 5. Scope "Changed files" and commit selection to the thread's own work

- **Files:** `apps/web/src/session-logic.ts` (+ test),
  `apps/web/src/components/ChatView.tsx`,
  `apps/web/src/components/GitActionsControl.tsx` (+ `.browser.tsx` test),
  `apps/web/src/components/chat/ChatHeader.tsx`,
  `apps/web/src/components/chat/MessagesTimeline.tsx`
- **Commit:** `e6990e3`
- **What:** Derive the set of files each turn actually touched
  (`deriveTurnChangedFilesByTurnId` over orchestration activities, with
  `normalizeWorkspaceRelativeFilePath` handling backslashes, workspace-root
  prefixes, and case-insensitive comparison). The completion "Changed files"
  box shows only files changed by this thread, and its commit button opens the
  commit modal with exactly those files pre-checked (checkboxes shown
  automatically); the regular commit button still selects all files.
- **Why:** The changed-files summary previously listed every dirty file in the
  worktree, including changes made outside the thread.
- **Re-apply notes:** The pure logic lives in `session-logic.ts` and is the
  stable anchor (carry `session-logic.test.ts`). The UI wiring threads a
  preselected-files prop from `ChatView` through `MessagesTimeline`/`ChatHeader`
  into `GitActionsControl`, whose `allFiles` memo and commit-dialog state
  handle the preselection. Expect this wiring to need adaptation whenever
  upstream reworks `GitActionsControl`.
- **Redundancy check (as of `89c5a19`): mostly superseded — only the
  commit-preselect button is still fork work.** Upstream's
  `AssistantChangedFilesSection` (in `MessagesTimeline.tsx`) already attributes
  changed files per turn, which is the bulk of this entry; see "Superseded
  changes". What remains unshipped is opening the commit modal with exactly
  those files pre-checked, which needs cross-component commit-dialog plumbing.

### 6. Keep the completed (green) dot until the thread is read

- **Files:** `apps/web/src/uiStateStore.ts` (+ test),
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
- **Redundancy check (as of `89c5a19`): keep.** No `threadLastCompletionAcknowledgedAtById`
  or equivalent acknowledged-at tracking anywhere in upstream's `apps/web/src`.

### 7. Per-thread composer message history (arrow-key recall)

- **Files:** `apps/web/src/threadMessageHistory.ts` (new, + test),
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
- **Redundancy check (as of `89c5a19`): keep.** No `threadMessageHistory` /
  `THREAD_MESSAGE_HISTORY` symbols upstream; the composer still has no history recall.

### 9. Sidebar: always-visible new-thread button beside the env badge

- **Files:** `apps/web/src/components/Sidebar.tsx`
- **Commit:** `5103758`
- **What:** Replace the hover-crossfade between the environment badge and the
  new-thread button with a single `absolute top-1 right-1.5` flex group that
  shows the remote-environment badge (now with a tooltip listing environment
  labels) and an always-visible `data-testid="new-thread-button"` button side
  by side.
- **Why:** The new-thread button was only discoverable on hover.
- **Re-apply notes:** Anchors on the project header row in `Sidebar.tsx`. Note
  the inherited layer (section D) also reworks `Sidebar.tsx` heavily — apply
  on top of it, not upstream's original.
- **Redundancy check (as of `89c5a19`): partially superseded — re-derive, don't
  re-apply.** Upstream now renders the new-thread button itself, with the same
  `data-testid="new-thread-button"`, a `New thread (<shortcut>)` tooltip, and an
  environment badge whose tooltip already lists the environment labels (the
  tooltip half of this entry is therefore upstream's now). What upstream still
  does **not** do is show the button unconditionally: on desktop the wrapper is
  `opacity-0 … group-hover/project-header:opacity-100
group-focus-within/project-header:opacity-100`, i.e. still hover/focus-gated,
  and only `max-sm` gets `pointer-events-auto opacity-100`. **Keep** the
  always-visible intent, but implement it as a small change to upstream's
  current markup (drop the `opacity-0`/hover-gating classes on the wrapper)
  rather than restoring the old fork hunk.

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
- **Redundancy check (as of `89c5a19`): moot — no conflict left to resolve.**
  `TODO.md` is absent from upstream's tree (`git ls-tree upstream/main TODO.md`
  is empty), so the deletion no longer collides with anything. Nothing to
  re-apply; keep the TODO section in this file.

### 12. AGENTS.md: generalize the GitHub fork policy

- **Files:** `AGENTS.md`, `CLAUDE.md`
- **Commits:** `4e93085`, `16c78b6`
- **What:** The inherited `AGENTS.md` (section A) hardcoded
  `aaditagrawal/t3code` as the only allowed target for `gh` write commands.
  Generalized to "the fork" so the same policy applies to this repo, and
  dropped the aadit-specific upstream-merge PR instruction.
- **Re-apply notes:** Apply on top of the aadit fork's `AGENTS.md`, not
  upstream's. `CLAUDE.md` must stay a symlink pointing at the literal path
  `AGENTS.md` — a `16c78b6`-style retarget to `@AGENTS.md` leaves it dangling
  (the `@file` import syntax only works inside a file's content, not as a
  symlink target).

### 13. Housekeeping

- **Files:** stray `update` file deleted (`de4b997`); `README.md` fork banner
  and this `FORK.md` file (see the README entry in section A notes).
- **Re-apply notes:** When syncing, re-prepend the "About this fork" blockquote
  to `README.md` (before the `# T3 Code` heading) and keep its one-paragraph
  change summary in sync with this file's Active lists.

---

## Active changes — inherited from `aaditagrawal/t3code`

These arrived via the `aadit/main` merges (`e30772f` and earlier history). They
are documented at feature-group level: when syncing via the aadit fork they
merge in wholesale; only consult these notes when resolving conflicts or when
rebasing directly onto `pingdotgg/main`.

### A. Fork README and docs

- **Files:** `README.md`, `CONTRIBUTING.md`, `AGENTS.md`, `REMOTE.md`,
  `.docs/architecture.md`, `.plans/17-claude-code.md`,
  `.plans/18-cursor-agent-provider.md`
- **What:** README rewritten to describe the multi-provider fork (8 supported
  agents, installer instructions, credits). `REMOTE.md` gains auth-token
  security guidance (`--auth-token`, `--bootstrap-fd` envelope). `.plans/`
  documents the Claude Code and Cursor provider designs. `AGENTS.md` carries
  the fork-first GitHub policy — since generalized by this fork (change 12).
- **Re-apply notes:** This repo's own "About this fork" banner sits above the
  aadit README content (change 12). On conflict, keep banner → aadit fork
  README → nothing of upstream's README (upstream's install instructions don't
  apply to the fork).

### B. Provider expansion: Copilot, Gemini CLI, Amp, Kilo, Claude Agent SDK

- **Files (per provider):**
  - Copilot: `apps/server/src/provider/Layers/CopilotAdapter.ts` (+tests),
    `copilotCliPath.ts`, `copilotTurnTracking.ts`, `Services/CopilotAdapter.ts`,
    `apps/server/src/git/Layers/CopilotTextGeneration.ts`,
    `apps/server/src/provider/copilot-sdk.d.ts`
  - Gemini CLI: `apps/server/src/geminiCliServerManager.ts` (+tests),
    `Layers/GeminiCliAdapter.ts`, `Services/GeminiCliAdapter.ts`
  - Amp: `apps/server/src/ampServerManager.ts`, `Layers/AmpAdapter.ts` (+tests),
    `Services/AmpAdapter.ts`
  - Kilo: `apps/server/src/kilo/` (errors, eventHandlers, serverLifecycle,
    types, utils), `kiloServerManager.ts` (+tests), `Layers/KiloAdapter.ts`
  - Claude: root dependency `@anthropic-ai/claude-agent-sdk`,
    `apps/server/src/provider/claude-agent-sdk.d.ts`, expanded
    `ClaudeAdapter.ts` / `ClaudeProvider.ts` (permission modes, thinking token
    limits), `git/Layers/ClaudeTextGeneration.ts`
  - Cursor/OpenCode: fork-side enhancements on top of upstream's ACP Cursor and
    `@opencode-ai/sdk` OpenCode backends (`CursorProvider.ts`,
    `scripts/cursor-acp-probe.mjs`, `OpenCodeProvider.ts`)
- **Shared infra:** `apps/server/src/provider/providerKind.ts` (8 kinds +
  legacy aliases `claudeCode`→`claudeAgent`, `gemini`→`geminiCli`),
  `ProviderAdapterRegistry.ts`, `ProviderAdapterUtils.ts`,
  `ProviderAdapterConformance.test.ts`, `ProviderSessionDirectory.ts`,
  `providerStatusCache.ts`, `git/Layers/SessionTextGeneration.ts`,
  `git/Layers/RoutingTextGeneration.ts`, `apps/server/src/commandPath.ts`,
  `apps/server/src/logger.ts`, migrations
  `017_NormalizeLegacyClaudeCodeProvider`, `020_NormalizeLegacyProviderKinds`,
  `021_RepairProjectionThreadProposedPlanImplementationColumns`; model catalog
  expansion in `packages/shared/src/model.ts` and
  `packages/contracts/src/{model,provider,orchestration,settings}.ts`
- **Re-apply notes:** This is the core of the fork and the biggest conflict
  surface. When upstream adds first-party support for one of these providers,
  prefer upstream's implementation and drop the fork's (that already happened
  once for Cursor/OpenCode — see "Superseded changes"). The conformance test suite
  (`ProviderAdapterConformance.test.ts`) is the fastest way to validate all
  adapters after a sync.

### C. Settings, appearance, and model configuration UI

- **Files:** `apps/web/src/routes/settings.{tsx,general.tsx,connections.tsx,archived.tsx}`,
  `apps/web/src/appSettings.ts` (+test), `accentColor.ts`, `themeConfig.ts`,
  `appearance.ts`, `customModels.ts`, `providerModelOptions.ts`,
  `providerModels.ts`, `modelSelection.ts`, `environmentBootstrap.ts`,
  `components/settings/SettingsPanels.tsx`, `ConnectionsSettings.tsx`,
  `hooks/useSettings.ts`
- **What:** A dedicated `/settings` route with theme (light/dark/system),
  accent-color presets with contrast-safe terminal color injection, custom
  model slugs, and provider connection settings.
- **Re-apply notes:** `appSettings.ts` is the state root; the accent color
  system also patches `apps/web/src/index.css` and the terminal font/theme
  helpers (`lib/terminalFont.ts`).

### D. Web UI enhancements

- **Files (highlights):** `components/GhosttyTerminalSplitView.tsx`,
  `components/ui/toast.tsx` (+`toast.logic.ts` rework),
  `components/Sidebar.tsx` + `Sidebar.logic.ts` (search/filtering),
  `components/CommandPalette.tsx` (script running, thread navigation),
  `components/chat/TraitsPicker.tsx` + `CursorTraitsPicker.tsx`,
  `components/chat/composerProviderRegistry.tsx` (replaces
  `composerProviderState.tsx`), `components/ProviderLogo.tsx`,
  `components/Icons.tsx`, `components/ChatMarkdown.tsx`,
  `lib/threadDraftDefaults.ts`, `lib/threadProvider.ts`,
  `hooks/useProjectThreadNavigation.ts`, `hooks/useLocalStorage.ts`,
  `composerDraftStore.ts`, `gitTextGeneration.ts`, `truncateTitle.ts`
- **What:** Terminal split view, reworked toast system, sidebar thread search,
  extended command palette, provider-aware composer/traits pickers, provider
  logos, and per-provider draft defaults.
- **Re-apply notes:** These files also host this fork's own changes 5, 6, 7,
  9 — apply the aadit layer first, then this fork's commits on top.

### E. Desktop, build, and branding

- **Files:** `apps/desktop/scripts/electron-launcher.mjs`,
  `apps/desktop/src/main.ts` / `preload.ts` (windowReveal removed), Electron
  `40.8.5` + `trustedDependencies` in `apps/desktop/package.json`,
  `scripts/install.sh` (interactive installer),
  `scripts/build-desktop-artifact.ts`, `scripts/lib/macos-icon-composer.ts`,
  `scripts/lib/brand-assets.ts`, regenerated icons under
  `apps/desktop/resources/`, `apps/marketing/public/`, and `assets/prod/`
- **Re-apply notes:** Icons are generated (see `macos-icon-composer.ts`) —
  regenerate rather than hand-merge binary conflicts.

### F. CI / workflows adapted for the fork

- **Files:** `.github/workflows/ci.yml`, `.github/workflows/pr-size.yml`,
  `.github/workflows/release.yml`
- **What:** `ci.yml`: upstream's Blacksmith runners (`blacksmith-8vcpu-ubuntu-2404`
  on `check` / `test` / `release_smoke`) → `ubuntu-24.04`, and the macOS-only
  `mobile_native_static_analysis` job dropped (this fork does not target mobile,
  and `blacksmith-12vcpu-macos-26` is unavailable to it). `pr-size.yml` and
  `release.yml` were part of the pre-reset fork; as of the 2026-07-23 reset only
  `ci.yml` is modified — `release.yml` is left as upstream ships it, since it is
  release-only and needs secrets a fork lacks.
- **Re-apply notes:** Highest-churn area. Re-derive from upstream's **new**
  workflow files and re-apply these transformations (runner swap, drop
  fork-unavailable jobs/secrets), rather than force-keeping stale fork copies.
- **Redundancy check (as of `89c5a19`): keep.** Upstream has not touched
  `.github/workflows/ci.yml` since `b41e89e`, so the runner swap replayed
  cleanly. Re-check on every rebase — a new upstream job would silently be
  dropped by a stale fork copy of this file.

### G. Fork-maintenance infrastructure (aadit-specific — review before keeping)

- **Files:** `docs/custom-alpha-workflow.md`,
  `scripts/sync-upstream-pr-tracks.mjs` + `config/upstream-pr-tracks.json`,
  `.claude/settings.json`, `.claude/scheduled_tasks.lock`
- **What:** The aadit fork's own maintenance tooling: an alpha-build playbook,
  an upstream-PR tracking script (`bun run sync:upstream-prs`), and a Claude
  Code pre-push hook.
- **Re-apply notes:** These reference the _aadit_ fork's layout —
  `origin = aaditagrawal/t3code` and integration branch `codex/alpha` — and
  are candidates to **drop or rewrite** for this repo's layout at the next
  sync. The pre-push hook originally hardcoded `/Users/mav/...` and blocked
  every push from any other machine; this fork rewrote it to use
  `$CLAUDE_PROJECT_DIR`. On conflict, keep the portable version.

### H. Dependency / config drift

- **Files:** root `package.json` (turbo `^2.8.14`, tsdown `^0.21.7`, security
  overrides for `defu`/`h3`/`picomatch`/`smol-toml`/`vite`/`yaml`,
  `@anthropic-ai/claude-agent-sdk` dependency, `trustedDependencies` moved to
  the desktop package), `bun.lock`, `apps/server/vitest.config.ts`,
  `apps/server/tsdown.config.ts`, `turbo.json`,
  `packages/effect-codex-app-server/src/_generated/*` (regenerated schema)
- **Re-apply notes:** On sync, take upstream's newer versions where they exist
  and keep only the overrides upstream lacks. The `_generated` codex schema is
  script-generated (`packages/effect-codex-app-server/scripts/generate.ts`) —
  regenerate instead of merging.

---

## Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not
re-introduce them.** Each entry names the upstream change that replaced it; all
were re-verified against `89c5a19` during the 2026-07-27 rebase.

| #        | Fork change                       | Superseded by                                                    | Verified at |
| -------- | --------------------------------- | ---------------------------------------------------------------- | ----------- |
| 1        | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_ | `89c5a19`   |
| 5 (core) | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints              | `89c5a19`   |
| 8        | Full timestamp on hover           | `formatChatTimestampTooltip`                                     | `89c5a19`   |
| 10       | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                           | `89c5a19`   |
| —        | Custom Cursor / OpenCode backends | `3f8d328` — upstream ACP Cursor + `@opencode-ai/sdk`             | 2026-04-18  |
| C        | Settings & appearance UI          | upstream theme / accent / add-provider wizard                    | `89c5a19`   |
| D        | Web UI enhancements               | upstream terminal split, palette, sidebar search, toasts         | `89c5a19`   |
| E        | Desktop branding + installer      | upstream electron launcher + `brand-assets`                      | `89c5a19`   |

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
- **Custom Cursor and OpenCode backends** — the aadit fork originally carried
  its own Cursor and OpenCode integrations; at the 2026-04-18 sync it adopted
  upstream's ACP-based Cursor backend and `@opencode-ai/sdk` OpenCode backend
  (`3f8d328`), keeping only fork-side enhancements on top (section B). When
  upstream ships first-party support for any other fork provider, follow the
  same pattern: adopt upstream's backend, re-apply only the fork's deltas.
- **Section C — settings & appearance UI.** Upstream has theme (light/dark/system
  via `useTheme`), `ProviderAccentColorPicker`, the `AddProviderInstanceDialog`
  wizard, and `ProviderModelsSection`.
- **Section D — web UI enhancements.** Terminal split, command palette, sidebar
  search, toasts, and provider logos are all upstream now.
- **Section E — desktop branding + installer.** Upstream ships the electron
  launcher, `brand-assets`, desktop build, and matching Electron. Only aadit's
  `scripts/install.sh` (hardcoded to aadit's repo) is unique — not worth porting.

### Deliberately not ported (not superseded)

- **Amp / Kilo / Droid providers.** Intentionally not ported (owner chose
  Copilot + Gemini only). Their adapters remain available in `aadit/main` if
  wanted later — follow section B's driver-registration pattern.
- **Section G — aadit fork-maintenance tooling.** Dropped at the 2026-07-23
  reset; it is wired to the aadit fork's own repo layout.

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
- Change: Always show the new thread button on sidebar projects, not just on hover

### Upstream's TODO (from the old TODO.md)

#### Small things

- [ ] Submitting new messages should scroll to bottom
- [ ] Only show last 10 threads for a given project
- [ ] Thread archiving
- [ ] New projects should go on top
- [ ] Projects should be sorted by latest thread update

#### Bigger things

- [ ] Queueing messages
