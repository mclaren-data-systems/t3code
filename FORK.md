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
limits surfaced in the model picker and context bubble (22, web-only since this rebase), and five
web UX changes (5, 6, 7, 18, 21). Everything else is byte-identical to upstream — `native/`,
`scripts/`, `apps/desktop/`,
`packages/client-runtime/`, `apps/server/src/persistence/`, `pnpm-lock.yaml` and
`pnpm-workspace.yaml` are untouched, and the only edits under `infra/` and `packaging/` are the
entry 14 notes explaining which workflow no longer runs them. Mobile carries entry 19's usage
screens and nothing else.

This file is the authoritative list of what sets this fork apart, and it is written to be used when
rebasing. **Work from intent, not from the old diff.** For each numbered entry: run the drop-check
first, and if upstream now covers the intent, move the entry to section 4; otherwise re-derive the
intent against current upstream code, taking upstream's version of anything that moved.

## 2. Last rebase

> **2026-09-04** (second sync that day), onto `pingdotgg/t3code` `main` at **`c8f77e0d`** —
> _perf(server): stop caching unused OpenCode tool parts (#9738)_. Took in **108 upstream commits**
> (`9c9ae3dc..c8f77e0d`) and replayed **32 of the fork's 33 commits**; the 33rd was skipped because
> its whole content was either superseded or folded into the re-derivation below. The previous tip
> `d2f75881` is backed up at `origin/backup/main-pre-rebase-2026-09-04-2` (the plain
> `-2026-09-04` name was already taken by the morning's rebase); `main` was then force-pushed to
> the rebased tip.
>
> **One supersession: the server half of entry 22.** Upstream's `19d8ab2a` (#9507, Limits tab),
> `1641b4ab` (#9534, Codex reset credits) and `b34ff8f5` (#9584) ship `ServerProvider.usageLimits`:
> Claude's `get_usage` read in the capabilities probe, Codex's `account/rateLimits/read`, a
> `ProviderUsageLimitsIngestion` layer for the mid-turn `account.rate-limits.updated` event the
> fork's entry named as its own drop-check, per-model weekly buckets read structurally, and a Limits
> view on the Usage page for web and mobile. That is everything the fork collected and more, so the
> fork's contract field, `providerSubscriptionUsage.ts`, its probe changes in `ClaudeProvider.ts` /
> `CodexProvider.ts`, the cache strip and both test files are gone — those server files are
> byte-identical to upstream again. What upstream does **not** do is put the numbers where the
> provider is chosen, so entry 22's web half was **re-derived** onto `usageLimits`: same two
> surfaces, same "N% left" rule, same open-time ageing, reset countdowns now from upstream's
> `formatResetsIn`, and an `unavailable` snapshot renders nothing. Every other drop-check comes
> back **0**.
>
> **Entry 14: two new upstream workflows, both declined.** `windows-tests.yml` (`f96a220b`, #9538)
> is a manual-only Windows lane on `blacksmith-8vcpu-windows-2025` whose own header says nothing
> in the suite passes on Windows yet — it fails the runner rule and is not a quality gate.
> `cursor-hygiene-webhook.yml` (`44701efd`, `e3723e06`) POSTs repository events to Cursor using two
> `CURSOR_T3CODE_*` secrets — community tooling needing credentials. `.github/VOUCHED.td` was
> updated upstream (`95390ed7`) and stays deleted with `pr-vouch.yml`. `ci.yml` and `release.yml`
> were **untouched** this range, so `desktop-artifacts.yml` has no drift to port. The kept set is
> unchanged: `ci.yml`, `desktop-artifacts.yml`, `issue-labels.yml`, `thread-transfer-report.yml`.
>
> **Two ports that no merge conflict would have surfaced** (both found by typecheck):
>
> - Entry 7's `threadMessageHistoryStore.ts` used `createDebouncedStorage`, which `dab5f6e6`
>   (#9695) replaced with a typed `createDeferredStorage(base, serialize, ms)`. Ported with an
>   identity serializer, since `createJSONStorage` already stringifies before the store sees it.
> - Upstream's new `UsageLimits.tsx` reads `PROVIDER_PRESENTATION[kind].color`, a field entry 19
>   replaced with a `colors` ramp. Now reads `colors[0]`, the brand shade.
>
> **Six conflicts, all of them upstream moving code the fork sits next to:**
>
> - `.github/VOUCHED.td` — modify/delete. Resolved as delete: entry 14.
> - `docs/internals/ci.md` — upstream documented the Windows lane and (again) `release.yml`;
>   both paragraphs dropped, a one-line note on the declined Windows lane added.
> - `ProviderInstanceCard.tsx` — rewritten a **fourth** time (`343db2c3` #9354 settings
>   reorganisation, `8357eef1`): the card is now a stack of `SettingsSection`s. Entry 15's
>   "Resolved config directory" block was re-derived as a `SettingsRow` at the end of the Runtime
>   section, its hint in the row description; upstream had also dropped the `ScrollArea` import it
>   uses.
> - `apps/mobile/.../UsageRouteScreen.tsx` — upstream added `<UsageLimitsSection />` where entry
>   19 renamed the `merged` prop to `series`; unioned.
> - `docs/user/usage.md` — entry 19's per-instance paragraph now sits ahead of upstream's Limits
>   section.
> - `ChatComposer.tsx` — import list only; entry 22 (above) then rewrote its own hunk.
>
> **Checked against incoming upstream work and needed no change:**
>
> - Entry 7 against **161 changed lines** in `ChatComposer.tsx` (compact-composer, slash-menu and
>   helper-text work). Both anchors survived: the history hook still runs after the Enter
>   submission intent in `onComposerCommandKey`, and the append still rides
>   `submitComposerDraft`'s `didDispatch`.
> - Entries 18 and 21 against `f0347322` (draft indicator), `c7bf3115` (multi-select unpin) and
>   `ec3ec6f0` (muted branch name) in `Sidebar.tsx`; the header block replayed clean.
> - Entry 17 against `343db2c3`'s settings reorganisation: `settingsSearch.ts` gained a
>   `usage-providers` row and a renamed appearance target; entry 17's row replayed clean and
>   `WorktreeBranchSettingsSection` still mounts from `SourceControlSettings.tsx`.
> - Entry 19's ramps against `UsageProviderKind`, still `claude | codex | grok`; entry 16's
>   duplicated merge rule against `deriveProviderInstanceConfigMap`, untouched this range.
> - Entry 20: `resolveGitHubPublishConfig` is untouched (the build script's only change is Windows
>   sidecar packing); `SidebarChrome.tsx`'s `bf40fa78` wordmark alignment replayed clean.
> - Entry 6 (`uiStateStore.ts`) and entry 17's `packages/shared/src/git.ts` — **zero** upstream
>   commits this range.
>
> **Verification.** Node **24.13.1** was fetched as a tarball and put on `PATH` first (`package.json`
> pins `engines.node: ^24.13.1`; the host ships 22 and `pnpm env` refuses to manage Node there).
> `pnpm install --frozen-lockfile` succeeded with no lockfile drift. `vp run -r typecheck` is clean
> across all 15 packages after the two ports above (Effect lint _suggestions_ only, all
> pre-existing). `vp lint` over the 82 files the fork changes reports **0 errors**, warnings only.
> `vp fmt --check` passes. The 17 fork-touched test files run **629 passed, 1 failed**; the failure
> is the `server.test.ts` case _"reports workspace root stat failures without relabeling them as
> missing"_, which `chmod 0o000`s a directory and expects the stat to fail — **it cannot fail as
> uid 0**, and the rebase container runs as root. Same environment artifact as the last two
> rebases, not a regression. Nothing was checked in a browser: the re-derived picker footer and
> context-bubble section of entry 22, and the re-derived settings row of entry 15, want one look in
> a real client.
>
> Keep syncing by rebase, not merge — a merge commit makes "what does this fork carry?" a graph
> question instead of a `git diff upstream/main HEAD` one.

## 3. Fork changes

> Entry numbers are **stable identifiers** and are never renumbered. A gap means the entry moved to
> section 4 or 5. Numbers 1, 4, 8, 9, 10, the symlink half of 12, the banner half of 15 and the
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
  checkbox list and opens the dialog. `deriveCommitExcludedFilePaths` /
  `normalizeWorkspaceRelativeFilePath` do the checkpoint-vs-git-status path matching (separators,
  `./` prefixes, case). Expect the `GitActionsControl` wiring to need adapting whenever upstream
  reworks that dialog.
- **Drop it when:** upstream's commit dialog can be opened with a preselected file set. Check with
  `grep -rn "onCommitTurnFiles\|Preselection" apps/web/src` against clean upstream.
- **Checked at `c8f77e0d`: keep.** Drop-check empty. Upstream's pull-request preview work
  (`95103905`, #9631) reworked `session-logic.ts` again; replayed clean.
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
- **Checked at `c8f77e0d`: keep.** No upstream commit touched `uiStateStore.ts` this range; it
  still tracks only `threadLastVisitedAtById`.

### 7. Shell-style message recall in the composer

- **Intent.** Recover and resend prior messages the way terminal input history works.
- **Files:** `apps/web/src/threadMessageHistory.ts` (new, + test),
  `apps/web/src/threadMessageHistoryStore.ts` (new), `components/chat/ChatComposer.tsx`
- **Re-apply.** Every sent message is appended to a per-thread history (capped at 100, keyed by
  `scopedThreadKey`). ArrowUp/ArrowDown walk it, **but only** when the cursor is on the first/last
  line — otherwise arrows move the cursor normally. The in-progress draft is stashed and restored
  when navigating past the newest entry. The pure module ports verbatim; the part that must be
  redone on any composer rework is the hook placement: it sits in `onComposerCommandKey` **after**
  the slash/mention/skills menu handling and the Enter submission intent, so history only sees
  arrows the menu declined. Navigation reads through the existing `readComposerSnapshot` and applies
  prompts through the draft-store `setPrompt` path; the history append sits behind
  `submitComposerDraft`'s `didDispatch` so validation failures record no phantom entries.
- **Drop it when:** upstream's composer recalls prior messages. Check with
  `grep -c MessageHistory apps/web/src/components/chat/ChatComposer.tsx` against clean upstream.
- **Checked at `c8f77e0d`: keep, one port.** No history recall upstream; both composer anchors
  survived again. `threadMessageHistoryStore.ts` moved from `createDebouncedStorage` to upstream's
  new typed `createDeferredStorage` (`dab5f6e6`, #9695) with an identity serializer — see
  section 2. The storage helper is the piece of this entry most likely to move again.
- **Browser-only:** the arrow-key interaction. Unit tests cover the pure navigation rules only.

### 12. `AGENTS.md`: fork Git/GitHub policy

- **Intent.** Agents working in this repo must know that `origin` is the fork and the only write
  target, that `upstream` is fetch-only, and that the fork's `README.md` banner and this file win
  merge conflicts.
- **Files:** `AGENTS.md` (two sections prepended to upstream's, after its intro and before
  `## What makes T3 Code special?`)
- **Re-apply.** Take upstream's `AGENTS.md` prose wholesale and re-insert the two fork sections.
  `CLAUDE.md` is **not** part of this entry — take upstream's regular file containing `@AGENTS.md`
  and do not restore the old symlink (see section 4).
- **Checked at `c8f77e0d`: keep, clean replay.** Upstream touched neither file.

### 13. Fork identity in `README.md`, and this file

- **Intent.** Anyone landing on this repo should see immediately that it is a rebasing fork and
  where the authoritative change list lives.
- **Files:** `README.md` (an "About this fork" blockquote before the `# T3 Code` heading), `FORK.md`
- **Re-apply.** The banner is delimited by `<!-- FORK-BANNER:START -->` / `<!-- FORK-BANNER:END -->`
  — **re-derive its text, never merge it**, since it goes stale every time an entry moves out of
  section 3. Refresh the rebase marker inside it too.
- **Checked at `c8f77e0d`: keep, refreshed.** Upstream made no `README.md` change; the banner's
  rebase marker moved to `c8f77e0d` and its subscription sentence now says the allowances come
  from upstream's Limits view.

### 14. A workflow set this fork can actually run

- **Intent.** CI that runs here. A workflow stays only if it uses **standard GitHub-hosted runners**
  (upstream's `blacksmith-*` labels never resolve — jobs sat queued for 24h and were auto-cancelled)
  and needs **no credential beyond the automatic `GITHUB_TOKEN`**. Everything else is deleted, not
  disabled. Beyond that, keep only the minimum the fork needs to build and to check code quality,
  and prefer GitHub-native actions.
- **Files:** `.github/workflows/{ci,desktop-artifacts}.yml`; deleted
  `.github/workflows/{release,deploy-relay,mobile-eas-preview,mobile-eas-production,mobile-showcase-screenshots,pr-size,pr-vouch,web-preview,mobile-fingerprint-check,publish-aur,desktop-macos-preview}.yml`
  and `.github/VOUCHED.td`; fork notes in `docs/internals/ci.md`, `docs/operations/release.md`,
  `docs/operations/mobile-app-store-screenshots.md`, `infra/relay/README.md`,
  `packaging/aur/README.md`; fallout in `CONTRIBUTING.md` and `infra/relay/scripts/deploy.test.ts`
- **Kept (3 upstream workflows).** `ci.yml` with every Blacksmith runner swapped to `ubuntu-24.04`
  (five jobs: `check`, `test`, `test_server`, `rust`, `release_smoke`) and both mobile jobs dropped
  — the macOS-only `mobile_native_static_analysis` and the `mobile_native_changes` gate that exists
  only to decide whether it boots. `issue-labels.yml` and `thread-transfer-report.yml` unmodified;
  the latter publishes the thread-transfer budget diff from an artifact produced by the **sharded
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
  MSVC libs install, plus the Linux `libsecret-1-dev pkg-config` install its Chromium cookie-key
  reader needs. It never passes `--signed`, which is what would pull signing credentials into
  `scripts/build-desktop-artifact.ts`.
- **Deleted, and why.** Needing credentials and/or Blacksmith: `release.yml` (Cloudflare, Clerk,
  Apple, Azure, npm OIDC, a release GitHub App), `deploy-relay.yml`,
  `mobile-eas-{preview,production}.yml` (`EXPO_TOKEN`), `mobile-showcase-screenshots.yml`,
  `web-preview.yml` (Vercel tokens), `publish-aur.yml` (`AUR_SSH_PRIVATE_KEY`; it is a
  `workflow_call` target of the deleted `release.yml`, so nothing here would invoke it —
  `packaging/aur/` sources stay byte-identical and `packaging/aur/scripts/release.sh` still runs by
  hand). Credential-free but not needed: `desktop-macos-preview.yml` (Blacksmith runners, and it
  duplicates artifacts `desktop-artifacts.yml` already ships) and `mobile-fingerprint-check.yml` (it
  labels PRs that would break OTA reach until the next store build, and this fork ships no store
  builds). Upstream community governance: `pr-vouch.yml` + `.github/VOUCHED.td` and `pr-size.yml`.
  Fallout: the release-workflow tracing-config guard in `infra/relay/scripts/deploy.test.ts` read
  `release.yml` off disk and was dropped with a restore note; `CONTRIBUTING.md` lost its `vouch:*` /
  `size:*` paragraph.
- **Re-apply.** Highest-churn entry. Re-derive from upstream's **new** workflow files and re-apply
  the standing rule rather than force-keeping stale fork copies; a new upstream workflow is
  opt-**in** and ships only if it passes the rule and the fork actually needs it. Separately,
  `desktop-artifacts.yml` is fork-owned and can drift against upstream's desktop build requirements
  **without ever showing up as a merge conflict** — diff it against upstream's `release.yml` build
  job on every sync. The `check` job runs `vp check`, which includes `vp fmt --check`, so an upstream
  formatting break lands `main` red here even when the fork changed nothing; repair it in place and
  drop the repair once upstream fixes the file.
- **Checked at `c8f77e0d`: keep; two new upstream workflows declined.** `windows-tests.yml`
  (`f96a220b`, #9538) runs on `blacksmith-8vcpu-windows-2025`, is `workflow_dispatch`-only, and by
  its own header nothing in the suite passes on Windows yet — not a quality gate. Revisit only if
  upstream folds it into `ci.yml` on a standard runner. `cursor-hygiene-webhook.yml` (`44701efd`,
  `e3723e06`) forwards repository events to Cursor with two `CURSOR_T3CODE_*` secrets. Both
  deleted. `.github/VOUCHED.td` (`95390ed7`) stays deleted. `ci.yml` and `release.yml` were
  untouched, so `desktop-artifacts.yml` has no drift to port this time. `grep -rn blacksmith
.github/workflows/` still matches only the explanatory comment in `desktop-artifacts.yml`.

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
  front of the user is now upstream's job — see section 4. The docs half adds the
  Windows/PowerShell form of the multi-account instructions: PowerShell does not expand `~` inside a
  quoted string and neither does Claude Code, so upstream's bash-only `CLAUDE_CONFIG_DIR=~/.claude_x`
  writes the login into a folder literally named `~`, which T3 Code — which does expand — never sees.
- **Why it is not just a UI nicety.** With `unauthenticated` reachable, the existing filters in
  `apps/mobile/src/lib/modelOptions.ts`, `apps/web/src/components/CommandPalette.tsx` and
  `packages/client-runtime/src/operations/projects.ts` apply to Claude for the first time — a
  logged-out instance drops out of pickers instead of being offered and failing.
- **Drop it when:** upstream's `ClaudeProvider.ts` emits `auth.status: "unauthenticated"` on its own.
  Check with `grep -c '"unauthenticated"' apps/server/src/provider/Layers/ClaudeProvider.ts` and
  `grep -c configDirectory packages/contracts/src/server.ts` against clean upstream. Partial
  supersession is likely — keep whichever half is still missing.
- **Checked at `c8f77e0d`: keep.** The server drop-checks still come back **0**.
  `ProviderInstanceCard.tsx` was rewritten a **fourth** time (`343db2c3` #9354, `8357eef1`): it is
  now a stack of `SettingsSection`s, and the "Resolved config directory" block was re-derived as a
  `SettingsRow` closing the Runtime section, hint in the row description. Expect it to move again.

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
  change** are needed for this entry alone. Decisions worth keeping: disabled instances are **still
  scanned** (usage records tokens already spent; switching a provider off must not retroactively
  erase them); instances resolving to one directory are walked **once**, keyed case-insensitively on
  Windows; a single undecodable instance config is **logged and skipped**, not fatal; and ordering is
  Claude, then Codex, then Grok, default slot before custom instances sorted by id, which reproduces
  the old fixed-list output exactly for a single-instance environment. **Grok has no per-instance
  home** — its settings expose only a binary path — so its instances collapse onto the one
  `$GROK_HOME` (or `~/.grok`) directory; it is the only source carrying a `fileName`. **The one drift
  risk:** `instanceConfigsForDriver` duplicates the default-slot merge rule from
  `deriveProviderInstanceConfigMap` rather than importing it (importing would drag `BUILT_IN_DRIVERS`,
  the whole driver graph, in for a pure function). If upstream changes that merge rule, this copy
  must follow — re-verify it every rebase.
- **Drop it when:** upstream's `resolveTranscriptDirs` reads `settings.providerInstances`. Check with
  `grep -c providerInstances apps/server/src/usage/UsageService.ts` against clean upstream.
- **Checked at `c8f77e0d`: keep.** Drop-check **0**, and `deriveProviderInstanceConfigMap` is
  unchanged this range, so the duplicated merge rule has not drifted. Upstream's new
  `UsageLimitSources.ts` / `cliproxyUsageLimits.ts` live beside this code but read hubs, not
  transcript directories.

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
- **Checked at `c8f77e0d`: keep.** No upstream commit touched `packages/shared/src/git.ts` this
  range; still the lone hardcoded const. The settings row survived `343db2c3`'s page
  reorganisation without a conflict.

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
- **Checked at `c8f77e0d`: keep, clean replay.** Upstream changed 159 lines of `Sidebar.tsx`
  this range (unsent-draft indicator `f0347322`, multi-select unpin `c7bf3115`, muted branch name
  `ec3ec6f0`) and the header block survived without a conflict. **This is still the fork's
  highest-churn UI surface** — re-derive rather than replay whenever the block itself moves.
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
  `apps/web/src/components/usage/*`, `apps/mobile/src/features/usage/*`, `docs/user/usage.md`, plus
  the test files
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
     breaks** — which is the intended failure mode.
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

- **Drop it when:** upstream's `UsageBucket` carries an instance id. Check with
  `grep -c instanceId packages/contracts/src/usage.ts` against clean upstream. If upstream ships its
  own per-instance breakdown, drop **both** this and entry 16, and re-verify its ownership rule
  against the double count in the intent above — a kind-level `ownedContribution` is the natural
  shape to write and is wrong.
- **Checked at `c8f77e0d`: keep, one port.** Drop-check **0**; `UsageProviderKind` is still
  `claude | codex | grok`. Upstream's Limits tab (`19d8ab2a`) added `UsageLimits.tsx`, which
  colours its bars from `PROVIDER_PRESENTATION[kind].color` — a field decision 6 replaced with a
  `colors` ramp. It now reads `colors[0]`. `f1e90e38` (#9599) moved the usage-provider controls
  into settings and `UsageRouteScreen.tsx` gained `<UsageLimitsSection />` beside the renamed
  `series` prop; neither touched the per-instance model.

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
- **Checked at `c8f77e0d`: keep.** `resolveGitHubPublishConfig` is untouched this range (the
  build script's only change is Windows sidecar packing), so the disable holds. `SidebarChrome.tsx`
  took `bf40fa78`'s wordmark baseline fix without a conflict.
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
  trigger. **This is the same project-row block entry 18 restacks — re-apply the two together.**
  Mirror `DraftHeroHeadline.tsx`'s trailing "New project" item if the menu primitives change shape.
  Deliberately untouched: `LegacySidebar.tsx` (its add-project button sits beside the "Projects"
  section header, not a dropdown), the sidebar empty-state "Add project" button (the only way in when
  no projects exist), and mobile (separate add-project navigation flow).
- **Drop it when:** upstream's project scope menu carries its own new-project item. Check with
  `grep -n "New project" apps/web/src/components/Sidebar.tsx` against clean upstream — a hit only on
  an icon-only `aria-label` button beside the scope menu means this is still needed.
- **Checked at `c8f77e0d`: keep, clean replay.** Upstream still renders the standalone folder-plus
  button next to the scope trigger and no in-menu item.
- **Browser-only:** the menu item placement and the widened trigger row.

### 22. Subscription allowances in the picker and the context bubble

- **Intent.** A user driving two or three subscriptions all day should see which one has room left
  **at the moment of choosing a provider**, not on a separate page. Upstream now collects the
  allowance (`ServerProvider.usageLimits`, see section 4) and shows it on the Usage page's Limits
  view; that still means leaving the chat to find out, and the first signal that a window is
  exhausted is still a refused turn mid-task. This entry reads the same field where the provider is
  chosen (the model picker) and where the current turn's cost is already shown (the context bubble
  under the composer). **Web-only, no server or contract change.**
- **Files:**
  `apps/web/src/components/chat/{SubscriptionUsage.logic.ts (+ test),SubscriptionUsageMeters.tsx,ContextWindowMeter.tsx,ModelPickerContent.tsx,ChatComposer.tsx}`,
  `docs/user/composer.md`
- **Re-apply.** `SubscriptionUsageMeters` renders one row per `usageLimits.windows` entry; the
  picker shows it for the instance the rail has selected, the context bubble for the instance the
  thread runs on. Decisions worth keeping:
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
apps/web/src/components/chat/ContextWindowMeter.tsx` against clean upstream.
- **Checked at `c8f77e0d`: re-derived.** The server half is superseded (section 4); this UI half
  was rebuilt on `usageLimits` in the same rebase. Both drop-checks come back **0**.
- **Browser-only:** the picker footer and the Subscription section of the context bubble.

## 4. Superseded changes

Changes the fork used to carry that upstream has since implemented. **Do not re-introduce them.**

| #            | Fork change                       | Superseded by                                                                                 | Verified at |
| ------------ | --------------------------------- | --------------------------------------------------------------------------------------------- | ----------- |
| 1            | Windows build: no shell mode      | `edb1240` — _fix(cli): publish nightly branded favicons (#4372)_                              | `c8f77e0d`  |
| 4            | Terminal Ctrl-chord forwarding    | `acf761b2` — _feat(web): render terminals with libghostty-vt (#4860)_                         | `c8f77e0d`  |
| 5 (core)     | Thread-scoped changed files       | `AssistantChangedFilesSection` per-turn checkpoints                                           | `c8f77e0d`  |
| 8            | Full timestamp on hover           | `formatChatTimestampTooltip` in `apps/web/src/timestampFormat.ts`                             | `c8f77e0d`  |
| 9            | Always-visible new-thread btn     | `0de95407` — _feat: sidebar v2 is now the default sidebar (#5672)_                            | `c8f77e0d`  |
| 10           | Package-local vitest configs      | `vp` (vite-plus) test-runner migration                                                        | `c8f77e0d`  |
| 12 (symlink) | `CLAUDE.md` symlink → `AGENTS.md` | `4cb676cc` — _docs: point CLAUDE.md at AGENTS.md with an @import (#7171)_                     | `c8f77e0d`  |
| 15 (banner)  | Status banner prefers server msg  | `06336460` — _feat(providers): add Google Antigravity via the official ACP agent (#9348)_     | `c8f77e0d`  |
| 22 (server)  | Subscription usage collection     | `19d8ab2a` — _feat(usage): show Codex and Claude subscription limits on a Limits tab (#9507)_ | `c8f77e0d`  |

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
  mid-turn `account.rate-limits.updated` event onto the published snapshot (the very ingestion gap
  the fork's entry named), per-model weekly buckets read structurally from `model_scoped`, Codex
  reset credits, CLIProxyAPI hubs as read-only sources, and a Limits view for web and mobile. The
  fork's `providerSubscriptionUsage.ts`, its probe edits, the cache strip and the contract field are
  gone; `ClaudeProvider.ts`, `CodexProvider.ts`, `providerStatusCache.ts` and
  `ClaudeCapabilitiesProbe.test.ts` are byte-identical to upstream again. Checked against the two
  decisions the fork flagged as easy to get wrong: **Codex's envelope (old decision 6)** — upstream
  reads `response.rateLimits` off the typed client, correct. **The Claude deadline (old decision 3)** — upstream's `q.usage_EXPERIMENTAL…()` call is `.then(ok, () => undefined)` with **no
  timeout of its own**, and the fork's note recorded that a CLI which never answers the control
  request hung the probe past its 25s ceiling. Not ported: upstream pins a CLI that answers, and
  carrying a server-side deviation for a hang that cannot be reproduced here is not worth the
  drift. **Watch item:** if provider status refreshes start stalling on a Claude instance, this is
  the first place to look, and an `AbortSignal.timeout` raced inside the promise is the fix.
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
