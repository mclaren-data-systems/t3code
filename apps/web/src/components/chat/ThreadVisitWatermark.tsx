import { useAtomMount } from "@effect/atom-react";
import { scopedThreadKey } from "@t3tools/client-runtime/environment";
import { parseThreadKey, threadKey } from "@t3tools/client-runtime/state/entities";
import { createThreadVisitTracker } from "@t3tools/client-runtime/state/thread-visits";
import { type ScopedThreadRef } from "@t3tools/contracts";
import { Atom } from "effect/reactivity";

import { useUiStateStore } from "../../uiStateStore";
import { environmentThreadShells, threadEnvironment } from "../../state/threads";

const threadVisitTracker = createThreadVisitTracker({
  threadShellAtom: environmentThreadShells.threadShellAtom,
  visit: threadEnvironment.visit,
  markLocalVisit: (ref, visitedAt) =>
    useUiStateStore.getState().markThreadVisited(scopedThreadKey(ref), visitedAt),
});

// Reading a finished thread acknowledges its completion, which the sidebar's green dot keys on. Stamped
// at the run's completedAt so a later completion still signals; visits stamped elsewhere (Woke dismiss,
// archive) leave it alone. Subscribed outside React like the visit tracker, so shell ticks never render.
const threadCompletionAcknowledger = Atom.family((key: string) => {
  const ref = parseThreadKey(key);
  return Atom.make((get) => {
    get.subscribe(
      environmentThreadShells.threadShellAtom(ref),
      (shell) => {
        const completedAt = shell?.latestRun?.completedAt;
        if (!completedAt) return;
        useUiStateStore
          .getState()
          .markThreadCompletionAcknowledged(scopedThreadKey(ref), completedAt);
      },
      { immediate: true },
    );
  }).pipe(Atom.withLabel(`thread-completion-acknowledger:${key}`));
});

// The visit watermark is the one part of the chat view that follows the
// shell's updatedAt, which ticks while a run streams. The tracker subscribes to
// it outside React, so ChatView keeps reading the quiet shell.
export function ThreadVisitWatermark(props: { readonly threadRef: ScopedThreadRef }) {
  useAtomMount(threadVisitTracker(props.threadRef));
  useAtomMount(threadCompletionAcknowledger(threadKey(props.threadRef)));
  return null;
}
