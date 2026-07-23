import * as NodeAssert from "node:assert/strict";

import * as Schema from "effect/Schema";
import { describe, it } from "vite-plus/test";

import { CopilotSettings } from "../Drivers/CopilotSettings.ts";
import { makePendingCopilotProvider } from "./CopilotProvider.ts";

const decodeCopilotSettings = Schema.decodeSync(CopilotSettings);

/**
 * Regression guard: the Copilot adapter has always read, validated and
 * forwarded a `reasoningEffort` selection, but the capability descriptor was
 * an empty array, so the trait never surfaced in the UI. This test pins the
 * descriptor's presence and its intentionally opt-in shape (no default), so a
 * future refactor cannot silently re-hide it or introduce a forced default
 * that would be auto-dispatched and rejected on models lacking that effort.
 */
describe("CopilotProvider reasoning effort", () => {
  it("exposes an opt-in reasoningEffort select on copilot models", () => {
    const settings = decodeCopilotSettings({ enabled: true, customModels: ["gpt-5"] });
    const draft = makePendingCopilotProvider(settings);

    const model = draft.models[0];
    NodeAssert.ok(model, "expected at least one copilot model");

    const descriptors = model.capabilities?.optionDescriptors ?? [];
    const effort = descriptors.find((descriptor) => descriptor.id === "reasoningEffort");
    if (!effort || effort.type !== "select") {
      NodeAssert.fail("reasoningEffort select descriptor must be present");
    }

    NodeAssert.deepEqual(
      effort.options.map((option) => option.id),
      ["low", "medium", "high", "xhigh"],
    );

    // Opt-in semantics: no currentValue and no isDefault, so an untouched
    // selector dispatches nothing and the adapter's per-model validation is
    // skipped — preserving the prior "no effort" behavior on models that do
    // not advertise the picked effort in supportedReasoningEfforts.
    NodeAssert.equal(effort.currentValue, undefined);
    NodeAssert.ok(
      effort.options.every((option) => option.isDefault !== true),
      "no reasoningEffort option may be marked isDefault (opt-in)",
    );
  });
});
