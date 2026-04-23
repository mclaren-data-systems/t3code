import { describe, expect, it } from "vitest";

import {
  appendThreadMessageHistoryEntry,
  isThreadMessageHistoryBoundary,
  resolveThreadMessageHistoryNavigation,
  THREAD_MESSAGE_HISTORY_LIMIT,
  type ThreadMessageHistoryNavigationState,
} from "./threadMessageHistory";

describe("threadMessageHistory", () => {
  it("keeps only the most recent entries up to the history limit", () => {
    let history: string[] = [];
    for (let index = 0; index < THREAD_MESSAGE_HISTORY_LIMIT + 3; index += 1) {
      history = appendThreadMessageHistoryEntry(history, `message-${index}`);
    }

    expect(history).toHaveLength(THREAD_MESSAGE_HISTORY_LIMIT);
    expect(history[0]).toBe("message-3");
    expect(history.at(-1)).toBe(`message-${THREAD_MESSAGE_HISTORY_LIMIT + 2}`);
  });

  it("detects first-line and last-line history boundaries", () => {
    const text = "first line\nsecond line\nthird line";

    expect(
      isThreadMessageHistoryBoundary({
        direction: "backward",
        text,
        expandedCursor: 5,
      }),
    ).toBe(true);
    expect(
      isThreadMessageHistoryBoundary({
        direction: "backward",
        text,
        expandedCursor: 12,
      }),
    ).toBe(false);
    expect(
      isThreadMessageHistoryBoundary({
        direction: "forward",
        text,
        expandedCursor: text.length,
      }),
    ).toBe(true);
    expect(
      isThreadMessageHistoryBoundary({
        direction: "forward",
        text,
        expandedCursor: 5,
      }),
    ).toBe(false);
  });

  it("walks backward through thread message history and restores the in-progress draft", () => {
    const history = ["first", "second", "third"];
    let navigation: ThreadMessageHistoryNavigationState = {
      index: null,
      draft: "",
    };

    const backwardOnce = resolveThreadMessageHistoryNavigation({
      direction: "backward",
      history,
      navigation,
      currentDraft: "draft",
    });
    expect(backwardOnce).toEqual({
      handled: true,
      nextPrompt: "third",
      navigation: {
        index: 2,
        draft: "draft",
      },
    });

    if (!backwardOnce.handled) {
      throw new Error("Expected first backward navigation to be handled.");
    }
    navigation = backwardOnce.navigation;

    const backwardTwice = resolveThreadMessageHistoryNavigation({
      direction: "backward",
      history,
      navigation,
      currentDraft: "ignored",
    });
    expect(backwardTwice).toEqual({
      handled: true,
      nextPrompt: "second",
      navigation: {
        index: 1,
        draft: "draft",
      },
    });

    if (!backwardTwice.handled) {
      throw new Error("Expected second backward navigation to be handled.");
    }
    navigation = backwardTwice.navigation;

    const forward = resolveThreadMessageHistoryNavigation({
      direction: "forward",
      history,
      navigation,
      currentDraft: "ignored",
    });
    expect(forward).toEqual({
      handled: true,
      nextPrompt: "third",
      navigation: {
        index: 2,
        draft: "draft",
      },
    });

    if (!forward.handled) {
      throw new Error("Expected forward navigation to be handled.");
    }

    const forwardToDraft = resolveThreadMessageHistoryNavigation({
      direction: "forward",
      history,
      navigation: forward.navigation,
      currentDraft: "ignored",
    });
    expect(forwardToDraft).toEqual({
      handled: true,
      nextPrompt: "draft",
      navigation: {
        index: null,
        draft: "",
      },
    });
  });
});
