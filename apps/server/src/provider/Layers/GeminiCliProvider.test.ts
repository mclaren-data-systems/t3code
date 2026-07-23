import * as NodeAssert from "node:assert/strict";

import * as Schema from "effect/Schema";
import { describe, it } from "vite-plus/test";

import { GenericProviderSettings } from "@t3tools/contracts";
import { makePendingGeminiCliProvider } from "./GeminiCliProvider.ts";

const decodeSettings = Schema.decodeSync(GenericProviderSettings);

/**
 * The Gemini "Thinking Budget" selector was inert — its value was never read
 * by the adapter and never reached the Gemini CLI. It was removed (rather than
 * shipping a control that does nothing). This guard keeps it gone: an upstream
 * sync that re-adds the descriptor without real wiring will fail here.
 */
describe("GeminiCliProvider capabilities", () => {
  it("does not expose the removed (inert) thinkingBudget selector", () => {
    const draft = makePendingGeminiCliProvider(decodeSettings({ enabled: true }));

    const builtIn = draft.models.find((model) => !model.isCustom);
    if (!builtIn) {
      NodeAssert.fail("expected a built-in gemini model");
    }

    const descriptors = builtIn.capabilities?.optionDescriptors ?? [];
    NodeAssert.ok(
      !descriptors.some((descriptor) => descriptor.id === "thinkingBudget"),
      "thinkingBudget was inert; keep it removed until wired to the Gemini CLI",
    );
  });
});
