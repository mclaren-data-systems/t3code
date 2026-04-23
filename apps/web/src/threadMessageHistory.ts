export const THREAD_MESSAGE_HISTORY_LIMIT = 100;

export type ThreadMessageHistoryDirection = "backward" | "forward";

export interface ThreadMessageHistoryNavigationState {
  index: number | null;
  draft: string;
}

export function appendThreadMessageHistoryEntry(
  history: readonly string[],
  message: string,
): string[] {
  if (message.trim().length === 0) {
    return history.slice();
  }
  const nextHistory = [...history, message];
  return nextHistory.length > THREAD_MESSAGE_HISTORY_LIMIT
    ? nextHistory.slice(nextHistory.length - THREAD_MESSAGE_HISTORY_LIMIT)
    : nextHistory;
}

export function isThreadMessageHistoryBoundary(input: {
  direction: ThreadMessageHistoryDirection;
  text: string;
  expandedCursor: number;
}): boolean {
  const cursor = Math.max(0, Math.min(input.expandedCursor, input.text.length));
  if (input.direction === "backward") {
    return input.text.lastIndexOf("\n", Math.max(0, cursor - 1)) === -1;
  }
  return input.text.indexOf("\n", cursor) === -1;
}

export function resolveThreadMessageHistoryNavigation(input: {
  direction: ThreadMessageHistoryDirection;
  history: readonly string[];
  navigation: ThreadMessageHistoryNavigationState;
  currentDraft: string;
}):
  | {
      handled: false;
    }
  | {
      handled: true;
      nextPrompt: string;
      navigation: ThreadMessageHistoryNavigationState;
    } {
  const historyLength = input.history.length;
  if (historyLength === 0) {
    return { handled: false };
  }

  if (input.direction === "backward") {
    if (input.navigation.index === null) {
      return {
        handled: true,
        nextPrompt: input.history[historyLength - 1] ?? "",
        navigation: {
          index: historyLength - 1,
          draft: input.currentDraft,
        },
      };
    }

    const nextIndex = Math.max(0, input.navigation.index - 1);
    return {
      handled: true,
      nextPrompt: input.history[nextIndex] ?? "",
      navigation: {
        index: nextIndex,
        draft: input.navigation.draft,
      },
    };
  }

  if (input.navigation.index === null) {
    return { handled: false };
  }

  if (input.navigation.index >= historyLength - 1) {
    return {
      handled: true,
      nextPrompt: input.navigation.draft,
      navigation: {
        index: null,
        draft: "",
      },
    };
  }

  const nextIndex = input.navigation.index + 1;
  return {
    handled: true,
    nextPrompt: input.history[nextIndex] ?? "",
    navigation: {
      index: nextIndex,
      draft: input.navigation.draft,
    },
  };
}
