/**
 * copilotTurnTracking — per-instance tracking of in-flight Copilot turns.
 *
 * Two surfaces are exported:
 *
 *   1. `createCopilotTurnTracker()` — a factory that returns operations
 *      bound to a freshly allocated `CopilotTurnTrackingState` closure. Use
 *      this from `makeCopilotAdapter`, where each `ProviderInstance` needs
 *      its own isolated turn-tracking state. Two driver instances of the
 *      same kind MUST NOT share this state.
 *
 *   2. The legacy state-passing helpers (`beginCopilotTurn`,
 *      `markTurnAwaitingCompletion`, etc.) — kept for unit tests that drive
 *      the state machine directly without an adapter. Production code paths
 *      should prefer the closure factory.
 *
 * The state object is intentionally a plain mutable record. Concurrent
 * mutation is impossible because the SDK delivers events serially on a
 * single callback thread per session.
 */
import { TurnId } from "@t3tools/contracts";
import type { SessionEvent } from "@github/copilot-sdk";

export type CopilotAssistantUsage = Extract<SessionEvent, { type: "assistant.usage" }>["data"];

export interface CopilotTurnTrackingState {
  currentTurnId: TurnId | undefined;
  currentProviderTurnId: TurnId | undefined;
  pendingCompletionTurnId: TurnId | undefined;
  pendingCompletionProviderTurnId: TurnId | undefined;
  pendingTurnIds: Array<TurnId>;
  pendingTurnUsage: CopilotAssistantUsage | undefined;
}

export function makeCopilotTurnTrackingState(): CopilotTurnTrackingState {
  return {
    currentTurnId: undefined,
    currentProviderTurnId: undefined,
    pendingCompletionTurnId: undefined,
    pendingCompletionProviderTurnId: undefined,
    pendingTurnIds: [],
    pendingTurnUsage: undefined,
  };
}

export function completionTurnRefs(state: CopilotTurnTrackingState) {
  return {
    turnId: state.pendingCompletionTurnId ?? state.currentTurnId,
    providerTurnId: state.pendingCompletionProviderTurnId ?? state.currentProviderTurnId,
  };
}

export function beginCopilotTurn(state: CopilotTurnTrackingState, providerTurnId: TurnId): void {
  state.pendingCompletionTurnId = undefined;
  state.pendingCompletionProviderTurnId = undefined;
  state.pendingTurnUsage = undefined;
  state.currentProviderTurnId = providerTurnId;
  state.currentTurnId = state.pendingTurnIds.shift() ?? state.currentTurnId ?? providerTurnId;
}

export function markTurnAwaitingCompletion(state: CopilotTurnTrackingState): void {
  state.pendingCompletionTurnId = state.currentTurnId ?? state.pendingCompletionTurnId;
  state.pendingCompletionProviderTurnId =
    state.currentProviderTurnId ?? state.pendingCompletionProviderTurnId;
}

export function recordTurnUsage(
  state: CopilotTurnTrackingState,
  usage: CopilotAssistantUsage,
): void {
  state.pendingTurnUsage = usage;
}

export function clearTurnTracking(state: CopilotTurnTrackingState): void {
  state.currentTurnId = undefined;
  state.currentProviderTurnId = undefined;
  state.pendingCompletionTurnId = undefined;
  state.pendingCompletionProviderTurnId = undefined;
  state.pendingTurnUsage = undefined;
}

export function assistantUsageFields(usage: CopilotAssistantUsage | undefined): {
  usage?: CopilotAssistantUsage;
  modelUsage?: { model: string };
  totalCostUsd?: number;
} {
  if (!usage) {
    return {};
  }

  return {
    usage,
    ...(usage.cost !== undefined ? { totalCostUsd: usage.cost } : {}),
    ...(usage.model ? { modelUsage: { model: usage.model } } : {}),
  };
}

export function isCopilotTurnTerminalEvent(event: SessionEvent): boolean {
  return event.type === "abort" || event.type === "session.idle";
}

/**
 * Per-instance Copilot turn tracker. The returned object owns its own
 * `CopilotTurnTrackingState` closure — two drivers of the same kind get
 * two independent trackers and cannot observe one another's turns.
 *
 * The shape mirrors the legacy state-passing helpers above: each method is
 * the same operation pre-bound to the closure.
 */
export interface CopilotTurnTracker {
  readonly state: CopilotTurnTrackingState;
  readonly currentTurnId: () => TurnId | undefined;
  readonly currentProviderTurnId: () => TurnId | undefined;
  readonly pendingTurnUsage: () => CopilotAssistantUsage | undefined;
  readonly enqueuePendingTurnId: (turnId: TurnId) => void;
  readonly removePendingTurnId: (turnId: TurnId) => void;
  readonly setCurrentTurnId: (turnId: TurnId | undefined) => void;
  readonly setCurrentProviderTurnId: (turnId: TurnId | undefined) => void;
  readonly completionRefs: () => {
    readonly turnId: TurnId | undefined;
    readonly providerTurnId: TurnId | undefined;
  };
  readonly beginTurn: (providerTurnId: TurnId) => void;
  readonly markAwaitingCompletion: () => void;
  readonly recordUsage: (usage: CopilotAssistantUsage) => void;
  readonly clear: () => void;
  readonly usageFields: () => {
    usage?: CopilotAssistantUsage;
    modelUsage?: { model: string };
    totalCostUsd?: number;
  };
}

export function createCopilotTurnTracker(): CopilotTurnTracker {
  const state = makeCopilotTurnTrackingState();
  return {
    state,
    currentTurnId: () => state.currentTurnId,
    currentProviderTurnId: () => state.currentProviderTurnId,
    pendingTurnUsage: () => state.pendingTurnUsage,
    enqueuePendingTurnId: (turnId) => {
      state.pendingTurnIds.push(turnId);
    },
    removePendingTurnId: (turnId) => {
      state.pendingTurnIds = state.pendingTurnIds.filter((candidate) => candidate !== turnId);
    },
    setCurrentTurnId: (turnId) => {
      state.currentTurnId = turnId;
    },
    setCurrentProviderTurnId: (turnId) => {
      state.currentProviderTurnId = turnId;
    },
    completionRefs: () => completionTurnRefs(state),
    beginTurn: (providerTurnId) => beginCopilotTurn(state, providerTurnId),
    markAwaitingCompletion: () => markTurnAwaitingCompletion(state),
    recordUsage: (usage) => recordTurnUsage(state, usage),
    clear: () => clearTurnTracking(state),
    usageFields: () => assistantUsageFields(state.pendingTurnUsage),
  };
}
