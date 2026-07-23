import { TurnId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import {
  assistantUsageFields,
  beginCopilotTurn,
  clearTurnTracking,
  createCopilotTurnTracker,
  isCopilotTurnTerminalEvent,
  makeCopilotTurnTrackingState,
  markTurnAwaitingCompletion,
  recordTurnUsage,
  type CopilotTurnTrackingState,
} from "./copilotTurnTracking.ts";

function makeState(): CopilotTurnTrackingState {
  return makeCopilotTurnTrackingState();
}

describe("copilotTurnTracking (state-passing API)", () => {
  it("keeps turn tracking alive until session.idle", () => {
    expect(isCopilotTurnTerminalEvent({ type: "assistant.usage" } as never)).toBe(false);
    expect(isCopilotTurnTerminalEvent({ type: "session.idle" } as never)).toBe(true);
    expect(isCopilotTurnTerminalEvent({ type: "abort" } as never)).toBe(true);
  });

  it("preserves usage details for the eventual turn completion event", () => {
    const state = makeState();
    state.pendingTurnIds.push(TurnId.make("turn-1"));

    beginCopilotTurn(state, TurnId.make("provider-turn-1"));
    recordTurnUsage(state, {
      model: "gpt-4.1",
      cost: 0.42,
      totalTokens: 123,
    } as never);
    markTurnAwaitingCompletion(state);

    expect(assistantUsageFields(state.pendingTurnUsage)).toEqual({
      usage: {
        model: "gpt-4.1",
        cost: 0.42,
        totalTokens: 123,
      },
      modelUsage: { model: "gpt-4.1" },
      totalCostUsd: 0.42,
    });

    clearTurnTracking(state);
    expect(state.pendingTurnUsage).toBeUndefined();
    expect(state.currentTurnId).toBeUndefined();
    expect(state.pendingCompletionTurnId).toBeUndefined();
  });
});

describe("copilotTurnTracking (per-instance closure factory)", () => {
  it("isolates state between two trackers (no shared mutable state)", () => {
    const tracker1 = createCopilotTurnTracker();
    const tracker2 = createCopilotTurnTracker();

    tracker1.enqueuePendingTurnId(TurnId.make("turn-A"));
    tracker1.beginTurn(TurnId.make("provider-A"));
    tracker1.recordUsage({ model: "gpt-A", cost: 0.1, totalTokens: 1 } as never);

    expect(tracker1.currentTurnId()).toBe("turn-A");
    expect(tracker2.currentTurnId()).toBeUndefined();
    expect(tracker2.pendingTurnUsage()).toBeUndefined();
  });

  it("threads the closure through completion refs and usage fields", () => {
    const tracker = createCopilotTurnTracker();
    tracker.enqueuePendingTurnId(TurnId.make("turn-1"));
    tracker.beginTurn(TurnId.make("provider-1"));
    tracker.recordUsage({ model: "gpt-4.1", cost: 0.5, totalTokens: 200 } as never);
    tracker.markAwaitingCompletion();

    expect(tracker.completionRefs()).toEqual({
      turnId: TurnId.make("turn-1"),
      providerTurnId: TurnId.make("provider-1"),
    });
    expect(tracker.usageFields()).toEqual({
      usage: { model: "gpt-4.1", cost: 0.5, totalTokens: 200 },
      modelUsage: { model: "gpt-4.1" },
      totalCostUsd: 0.5,
    });

    tracker.clear();
    expect(tracker.currentTurnId()).toBeUndefined();
    expect(tracker.pendingTurnUsage()).toBeUndefined();
  });

  it("removePendingTurnId deletes the matching id only", () => {
    const tracker = createCopilotTurnTracker();
    const turnA = TurnId.make("turn-A");
    const turnB = TurnId.make("turn-B");

    tracker.enqueuePendingTurnId(turnA);
    tracker.enqueuePendingTurnId(turnB);
    tracker.removePendingTurnId(turnA);

    expect(tracker.state.pendingTurnIds).toEqual([turnB]);
  });
});
