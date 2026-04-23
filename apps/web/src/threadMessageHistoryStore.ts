import { parseScopedThreadKey } from "@t3tools/client-runtime";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

import { createDebouncedStorage, createMemoryStorage } from "./lib/storage";
import { appendThreadMessageHistoryEntry } from "./threadMessageHistory";

export const THREAD_MESSAGE_HISTORY_STORAGE_KEY = "t3code:thread-message-history:v1";
const THREAD_MESSAGE_HISTORY_PERSIST_DEBOUNCE_MS = 300;

const threadMessageHistoryStorage = createDebouncedStorage(
  typeof localStorage !== "undefined" ? localStorage : createMemoryStorage(),
  THREAD_MESSAGE_HISTORY_PERSIST_DEBOUNCE_MS,
);

if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("beforeunload", () => {
    threadMessageHistoryStorage.flush();
  });
}

interface PersistedThreadMessageHistoryState {
  historyByThreadKey?: Record<string, string[]>;
}

interface ThreadMessageHistoryState {
  historyByThreadKey: Record<string, string[]>;
}

interface ThreadMessageHistoryStore extends ThreadMessageHistoryState {
  appendMessage: (threadKey: string, message: string) => void;
  clearThreadHistory: (threadKey: string) => void;
}

function sanitizeThreadHistory(history: unknown): string[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((entry): entry is string => typeof entry === "string")
    .reduce<string[]>(
      (nextHistory, entry) => appendThreadMessageHistoryEntry(nextHistory, entry),
      [],
    );
}

function sanitizePersistedState(persistedState: unknown): ThreadMessageHistoryState {
  if (!persistedState || typeof persistedState !== "object") {
    return { historyByThreadKey: {} };
  }

  const candidate = persistedState as PersistedThreadMessageHistoryState;
  return {
    historyByThreadKey: Object.fromEntries(
      Object.entries(candidate.historyByThreadKey ?? {}).flatMap(([threadKey, history]) => {
        if (!parseScopedThreadKey(threadKey)) {
          return [];
        }
        const sanitizedHistory = sanitizeThreadHistory(history);
        return sanitizedHistory.length > 0 ? [[threadKey, sanitizedHistory]] : [];
      }),
    ),
  };
}

export const useThreadMessageHistoryStore = create<ThreadMessageHistoryStore>()(
  persist(
    (set) => ({
      historyByThreadKey: {},
      appendMessage: (threadKey, message) =>
        set((state) => {
          if (!parseScopedThreadKey(threadKey)) {
            return state;
          }
          const previousHistory = state.historyByThreadKey[threadKey] ?? [];
          const nextHistory = appendThreadMessageHistoryEntry(previousHistory, message);
          if (
            previousHistory.length === nextHistory.length &&
            previousHistory.every((entry, index) => entry === nextHistory[index])
          ) {
            return state;
          }
          return {
            historyByThreadKey: {
              ...state.historyByThreadKey,
              [threadKey]: nextHistory,
            },
          };
        }),
      clearThreadHistory: (threadKey) =>
        set((state) => {
          if (!(threadKey in state.historyByThreadKey)) {
            return state;
          }
          const nextHistoryByThreadKey = { ...state.historyByThreadKey };
          delete nextHistoryByThreadKey[threadKey];
          return {
            historyByThreadKey: nextHistoryByThreadKey,
          };
        }),
    }),
    {
      name: THREAD_MESSAGE_HISTORY_STORAGE_KEY,
      storage: createJSONStorage(() => threadMessageHistoryStorage),
      partialize: (state) => ({
        historyByThreadKey: state.historyByThreadKey,
      }),
      merge: (persistedState, currentState) => ({
        ...currentState,
        ...sanitizePersistedState(persistedState),
      }),
    },
  ),
);
