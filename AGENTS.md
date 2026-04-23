# AGENTS.md

## Git & GitHub Policy (CRITICAL — DO NOT VIOLATE)

- This is a FORK of `pingdotgg/t3code`. The upstream remote is READ-ONLY for us.
- **NEVER create PRs, push branches, post comments, or perform ANY write operation against `pingdotgg/t3code` or any upstream/third-party repo.**
- **NEVER run `gh pr create` without `--repo aaditagrawal/t3code`.** Always explicitly target the fork.
- **NEVER run `gh` write commands (pr create, issue create, pr comment, pr close, pr merge) against any repo other than `aaditagrawal/t3code`.**
- The ONLY interaction with upstream is `git fetch upstream` to pull changes. Everything else targets `origin` (the fork).
- When merging upstream changes, create a PR on `aaditagrawal/t3code` targeting the fork's `main` branch.

## Fork-First Policy

- The fork's `README.md` takes priority over upstream's. On merge conflicts, keep ours.
- Do NOT commit scratch/analysis markdown files (e.g. `CONFLICT_ANALYSIS.md`, plan dumps) into the repo.

## Task Completion Requirements

- All of `bun fmt`, `bun lint`, and `bun typecheck` must pass before considering tasks completed.
- NEVER run `bun test`. Always use `bun run test` (runs Vitest).

## Project Snapshot

T3 Code is a multi-provider web GUI for coding agents. It supports 8 providers:

- **Codex CLI** (v0.37.0+) — JSON-RPC over stdio
- **Claude Code** — Claude Agent SDK with thinking tokens and permission modes
- **Cursor** — ACP (Agent Communication Protocol) over stdio
- **Copilot** — GitHub Copilot CLI
- **Gemini CLI** — Google Gemini CLI with persistent JSON
- **Amp** — Amp Code headless mode (no `/mode free`)
- **Kilo** — HTTP SSE transport
- **OpenCode** — SDK CLI server

This repository is a VERY EARLY WIP. Proposing sweeping changes that improve long-term maintainability is encouraged.

## Core Priorities

1. Performance first.
2. Reliability first.
3. Keep behavior predictable under load and during failures (session restarts, reconnects, partial streams).

If a tradeoff is required, choose correctness and robustness over short-term convenience.

## Maintainability

Long-term maintainability is a core priority. If you add new functionality, first check if there is shared logic that can be extracted to a separate module. Duplicate logic across multiple files is a code smell and should be avoided. Don't be afraid to change existing code. Don't take shortcuts by just adding local logic to solve a problem.

## Package Roles

- `apps/server` (`"t3"`) — Node.js WebSocket server. Multi-provider session management, orchestration engine, event persistence (SQLite), and RPC streams to the web client.
- `apps/web` (`"@t3tools/web"`) — React/Vite UI. Session UX, conversation/event rendering, and client-side state. Connects to the server via WebSocket.
- `apps/desktop` (`"@t3tools/desktop"`) — Electron desktop app wrapping the web UI.
- `apps/marketing` (`"@t3tools/marketing"`) — Astro marketing site.
- `packages/contracts` (`"@t3tools/contracts"`) — Shared Effect/Schema schemas and TypeScript contracts for provider events, WebSocket protocol, and model/session types. Keep this package schema-only — no runtime logic.
- `packages/shared` (`"@t3tools/shared"`) — Shared runtime utilities consumed by both server and web. Uses explicit subpath exports (e.g. `@t3tools/shared/git`, `@t3tools/shared/model`, `@t3tools/shared/logging`) — no barrel index.

## Server Architecture

### Provider Adapter Pattern

All providers implement a unified adapter interface (`ProviderAdapterShape`) in `apps/server/src/provider/Services/`. Each adapter declares:

- `transport` — how it communicates (`app-server-json-rpc`, `sdk-cli-server`, `acp-stdio`, `http-sse`, `cli-headless-json`, `cli-persistent-json`, `sdk-query`)
- `sessionModelSwitch` — `"in-session"`, `"restart-session"`, or `"unsupported"`
- `modelDiscovery` — `"native"`, `"acp-or-config"`, `"config-or-static"`, `"session-native"`, or `"unsupported"`

Adapters are registered in `provider/Layers/ProviderAdapterRegistry.ts` and looked up by provider kind at runtime. Complex providers have dedicated process managers (e.g. `codexAppServerManager.ts`, `geminiCliServerManager.ts`, `ampServerManager.ts`).

### Key Server Modules

- `apps/server/src/provider/Services/ProviderService.ts` — Cross-provider facade for sessions, turns, and checkpoints.
- `apps/server/src/provider/Services/ProviderAdapterRegistry.ts` — Adapter lookup by provider kind.
- `apps/server/src/provider/Services/ProviderSessionDirectory.ts` — Session lifecycle management.
- `apps/server/src/orchestration/Services/OrchestrationEngine.ts` — Command dispatch, event persistence, read-model updates.
- `apps/server/src/orchestration/Layers/ProviderRuntimeIngestion.ts` — Normalizes provider events into canonical `OrchestrationEvent` type.
- `apps/server/src/orchestration/Layers/ProjectionPipeline.ts` — Projects events into queryable state.
- `apps/server/src/ws.ts` — WebSocket RPC server using Effect's `RpcServer.toHttpEffectWebsocket()`.

### Event Sourcing & Orchestration

Provider runtime activity is normalized into canonical `OrchestrationEvent`s by the ingestion layer, persisted in a SQLite event store with sequence-based ordering, and projected into in-memory materialized views. Clients receive ordered events via Effect RPC streams (replay + live merge). Command receipts provide idempotency for reconnects and retries.

### Effect Architecture

The server uses Effect throughout for dependency injection, typed errors, and streaming:

- `Layer.effect()` for service composition
- `Effect.gen()` generator-style async
- `Stream` API for event/data streaming
- Domain-specific error types (`ProviderAdapterError`, `OrchestrationDispatchError`, etc.)

## Reference Repos

- Open-source Codex repo: https://github.com/openai/codex
- Codex App Server docs: https://developers.openai.com/codex/sdk/#app-server
- Codex-Monitor (Tauri, feature-complete reference): https://github.com/Dimillian/CodexMonitor

Use these as implementation references when designing protocol handling, UX flows, and operational safeguards.
