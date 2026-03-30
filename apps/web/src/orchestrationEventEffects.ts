import type { OrchestrationEvent, ThreadId } from "@t3tools/contracts";

export interface OrchestrationBatchEffects {
  clearPromotedDraftThreadIds: ThreadId[];
  clearDeletedThreadIds: ThreadId[];
  removeTerminalStateThreadIds: ThreadId[];
  needsProviderInvalidation: boolean;
}

export function deriveOrchestrationBatchEffects(
  events: readonly OrchestrationEvent[],
): OrchestrationBatchEffects {
  const threadLifecycleEffects = new Map<
    ThreadId,
    {
      clearPromotedDraft: boolean;
      clearDeletedThread: boolean;
      removeTerminalState: boolean;
    }
  >();
  let needsProviderInvalidation = false;

  for (const event of events) {
    switch (event.type) {
      case "thread.turn-diff-completed":
      case "thread.reverted":
      case "thread.session-set": {
        needsProviderInvalidation = true;
        break;
      }

      case "thread.created": {
        const current = threadLifecycleEffects.get(event.payload.threadId);
        threadLifecycleEffects.set(event.payload.threadId, {
          clearPromotedDraft: true,
          clearDeletedThread: current?.clearDeletedThread ?? false,
          removeTerminalState: current?.removeTerminalState ?? false,
        });
        break;
      }

      case "thread.deleted": {
        const current = threadLifecycleEffects.get(event.payload.threadId);
        threadLifecycleEffects.set(event.payload.threadId, {
          clearPromotedDraft: current?.clearPromotedDraft ?? false,
          clearDeletedThread: true,
          removeTerminalState: true,
        });
        break;
      }

      default: {
        break;
      }
    }
  }

  const clearPromotedDraftThreadIds: ThreadId[] = [];
  const clearDeletedThreadIds: ThreadId[] = [];
  const removeTerminalStateThreadIds: ThreadId[] = [];
  for (const [threadId, effect] of threadLifecycleEffects) {
    if (effect.clearPromotedDraft) {
      clearPromotedDraftThreadIds.push(threadId);
    }
    if (effect.clearDeletedThread) {
      clearDeletedThreadIds.push(threadId);
    }
    if (effect.removeTerminalState) {
      removeTerminalStateThreadIds.push(threadId);
    }
  }

  return {
    clearPromotedDraftThreadIds,
    clearDeletedThreadIds,
    removeTerminalStateThreadIds,
    needsProviderInvalidation,
  };
}
