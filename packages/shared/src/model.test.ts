import { describe, expect, it } from "vitest";
import {
  CURSOR_MODEL_FAMILY_OPTIONS,
  CURSOR_REASONING_OPTIONS,
  DEFAULT_MODEL,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_REASONING_EFFORT_BY_PROVIDER,
  MODEL_OPTIONS,
  MODEL_OPTIONS_BY_PROVIDER,
  REASONING_EFFORT_OPTIONS_BY_PROVIDER,
} from "@t3tools/contracts";

import {
  applyClaudePromptEffortPrefix,
  getEffectiveClaudeCodeEffort,
  getDefaultModel,
  getDefaultReasoningEffort,
  getCursorModelFamilyOptions,
  getModelOptions,
  getReasoningEffortOptions,
  inferProviderForModel,
  isClaudeUltrathinkPrompt,
  normalizeClaudeModelOptions,
  normalizeCodexModelOptions,
  normalizeModelSlug,
  parseCursorModelSelection,
  resolveCursorPickerModelSlug,
  resolveCursorModelFromSelection,
  resolveReasoningEffortForProvider,
  resolveSelectableModel,
  resolveModelSlug,
  resolveModelSlugForProvider,
  supportsClaudeAdaptiveReasoning,
  supportsClaudeFastMode,
  supportsClaudeMaxEffort,
  supportsClaudeThinkingToggle,
  supportsClaudeUltrathinkKeyword,
} from "./model";

describe("normalizeModelSlug", () => {
  it("maps known aliases to canonical slugs", () => {
    expect(normalizeModelSlug("5.3")).toBe("gpt-5.3-codex");
    expect(normalizeModelSlug("gpt-5.3")).toBe("gpt-5.3-codex");
  });

  it("returns null for empty or missing values", () => {
    expect(normalizeModelSlug("")).toBeNull();
    expect(normalizeModelSlug("   ")).toBeNull();
    expect(normalizeModelSlug(null)).toBeNull();
    expect(normalizeModelSlug(undefined)).toBeNull();
  });

  it("preserves non-aliased model slugs", () => {
    expect(normalizeModelSlug("gpt-5.2")).toBe("gpt-5.2");
    expect(normalizeModelSlug("gpt-5.2-codex")).toBe("gpt-5.2-codex");
  });

  it("uses provider-specific aliases", () => {
    expect(normalizeModelSlug("sonnet", "claudeAgent")).toBe("claude-sonnet-4-6");
    expect(normalizeModelSlug("opus-4.6", "claudeAgent")).toBe("claude-opus-4-6");
    expect(normalizeModelSlug("claude-haiku-4-5-20251001", "claudeAgent")).toBe("claude-haiku-4-5");
    expect(normalizeModelSlug("composer", "cursor")).toBe("composer-1.5");
    expect(normalizeModelSlug("gpt-5.3-codex-spark", "cursor")).toBe("gpt-5.3-codex-spark-preview");
    expect(normalizeModelSlug("gpt-5.4", "cursor")).toBe("gpt-5.4-medium");
    expect(normalizeModelSlug("gpt-5.2-codex", "cursor")).toBe("gpt-5.2-codex");
    expect(normalizeModelSlug("gemini-3.1", "cursor")).toBe("gemini-3.1-pro");
    expect(normalizeModelSlug("claude-4.6-sonnet-thinking", "cursor")).toBe("sonnet-4.6-thinking");
    expect(normalizeModelSlug("claude-4.5-sonnet-thinking", "cursor")).toBe("sonnet-4.5-thinking");
  });

  it("does not leak prototype properties as aliases", () => {
    expect(normalizeModelSlug("toString")).toBe("toString");
    expect(normalizeModelSlug("constructor")).toBe("constructor");
  });

  it("uses provider-specific aliases", () => {
    expect(normalizeModelSlug("sonnet", "claudeAgent")).toBe("claude-sonnet-4-6");
    expect(normalizeModelSlug("opus-4.6", "claudeAgent")).toBe("claude-opus-4-6");
    expect(normalizeModelSlug("claude-haiku-4-5-20251001", "claudeAgent")).toBe("claude-haiku-4-5");
  });
});

describe("resolveModelSlug", () => {
  it("returns default only when the model is missing", () => {
    expect(resolveModelSlug(undefined)).toBe(DEFAULT_MODEL);
    expect(resolveModelSlug(null)).toBe(DEFAULT_MODEL);
  });

  it("preserves unknown custom models", () => {
    expect(resolveModelSlug("gpt-4.1")).toBe(DEFAULT_MODEL);
    expect(resolveModelSlug("custom/internal-model")).toBe(DEFAULT_MODEL);
  });

  it("resolves only supported model options", () => {
    for (const model of MODEL_OPTIONS) {
      expect(resolveModelSlug(model.slug)).toBe(model.slug);
    }
  });

  it("supports provider-aware resolution", () => {
    expect(resolveModelSlugForProvider("claudeAgent", undefined)).toBe(
      DEFAULT_MODEL_BY_PROVIDER.claudeAgent,
    );
    expect(resolveModelSlugForProvider("claudeAgent", "sonnet")).toBe("claude-sonnet-4-6");
    expect(resolveModelSlugForProvider("claudeAgent", "gpt-5.3-codex")).toBe(
      DEFAULT_MODEL_BY_PROVIDER.claudeAgent,
    );
    expect(resolveModelSlugForProvider("cursor", undefined)).toBe(DEFAULT_MODEL_BY_PROVIDER.cursor);
    expect(resolveModelSlugForProvider("cursor", "composer")).toBe("composer-1.5");
    expect(resolveModelSlugForProvider("cursor", "gpt-5.3-codex-high-fast")).toBe(
      "gpt-5.3-codex-high-fast",
    );
    expect(resolveModelSlugForProvider("cursor", "claude-sonnet-4-6")).toBe(
      DEFAULT_MODEL_BY_PROVIDER.cursor,
    );
  });

  it("keeps codex defaults for backward compatibility", () => {
    expect(getDefaultModel()).toBe(DEFAULT_MODEL);
    expect(getModelOptions()).toEqual(MODEL_OPTIONS);
    expect(getModelOptions("claudeAgent")).toEqual(MODEL_OPTIONS_BY_PROVIDER.claudeAgent);
    expect(getModelOptions("cursor")).toEqual(MODEL_OPTIONS_BY_PROVIDER.cursor);
    expect(getCursorModelFamilyOptions()).toEqual(CURSOR_MODEL_FAMILY_OPTIONS);
  });
});

describe("cursor model selection", () => {
  it("includes the expected cursor reasoning levels and families", () => {
    expect(CURSOR_REASONING_OPTIONS).toEqual(["low", "normal", "high", "xhigh"]);
    expect(getCursorModelFamilyOptions().map((option) => option.slug)).toContain("gpt-5.3-codex");
    expect(getCursorModelFamilyOptions().map((option) => option.slug)).toContain("gpt-5.2-codex");
    expect(getCursorModelFamilyOptions().map((option) => option.slug)).toContain("gpt-5.4-medium");
    expect(getCursorModelFamilyOptions().map((option) => option.slug)).toContain("opus-4.6");
    expect(getCursorModelFamilyOptions().map((option) => option.slug)).toContain("sonnet-4.5");
  });

  it("parses codex reasoning and fast mode variants", () => {
    expect(parseCursorModelSelection("gpt-5.3-codex-high-fast")).toEqual({
      family: "gpt-5.3-codex",
      reasoning: "high",
      fast: true,
      thinking: false,
    });
    expect(parseCursorModelSelection("gpt-5.2-codex")).toEqual({
      family: "gpt-5.2-codex",
      reasoning: "normal",
      fast: false,
      thinking: false,
    });
  });

  it("parses newer cursor codex reasoning variants", () => {
    expect(parseCursorModelSelection("gpt-5.2-codex-high-fast")).toEqual({
      family: "gpt-5.2-codex",
      reasoning: "high",
      fast: true,
      thinking: false,
    });
    expect(
      resolveCursorModelFromSelection({
        family: "gpt-5.2-codex",
        reasoning: "xhigh",
        fast: true,
      }),
    ).toBe("gpt-5.2-codex-xhigh-fast");
  });

  it("parses and resolves thinking variants", () => {
    expect(parseCursorModelSelection("sonnet-4.6-thinking")).toEqual({
      family: "sonnet-4.6",
      reasoning: "normal",
      fast: false,
      thinking: true,
    });
    expect(
      resolveCursorModelFromSelection({
        family: "sonnet-4.6",
        thinking: true,
      }),
    ).toBe("sonnet-4.6-thinking");
    expect(parseCursorModelSelection("sonnet-4.5-thinking")).toEqual({
      family: "sonnet-4.5",
      reasoning: "normal",
      fast: false,
      thinking: true,
    });
  });

  it("resolves codex family selections into concrete model ids", () => {
    expect(
      resolveCursorModelFromSelection({
        family: "gpt-5.3-codex",
        reasoning: "xhigh",
        fast: true,
      }),
    ).toBe("gpt-5.3-codex-xhigh-fast");
  });

  it("collapses trait-backed cursor variants to a single picker option", () => {
    expect(resolveCursorPickerModelSlug("gpt-5.2-codex-high-fast")).toBe("gpt-5.2-codex");
    expect(resolveCursorPickerModelSlug("opus-4.6-thinking")).toBe("opus-4.6");
    expect(resolveCursorPickerModelSlug("sonnet-4.5-thinking")).toBe("sonnet-4.5");
    expect(resolveCursorPickerModelSlug("gpt-5.4-high-fast")).toBe("gpt-5.4-high-fast");
  });
});

describe("resolveSelectableModel", () => {
  it("resolves exact slug matches", () => {
    expect(
      resolveSelectableModel("codex", "gpt-5.3-codex", [
        { slug: "gpt-5.4", name: "GPT-5.4" },
        { slug: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
      ]),
    ).toBe("gpt-5.3-codex");
  });

  it("resolves case-insensitive display-name matches", () => {
    expect(
      resolveSelectableModel("codex", "gpt-5.3 codex", [
        { slug: "gpt-5.4", name: "GPT-5.4" },
        { slug: "gpt-5.3-codex", name: "GPT-5.3 Codex" },
      ]),
    ).toBe("gpt-5.3-codex");
  });

  it("resolves provider-specific aliases after normalization", () => {
    expect(
      resolveSelectableModel("claudeAgent", "sonnet", [
        { slug: "claude-opus-4-6", name: "Claude Opus 4.6" },
        { slug: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      ]),
    ).toBe("claude-sonnet-4-6");
  });

  it("returns null for empty input", () => {
    expect(resolveSelectableModel("codex", "", [{ slug: "gpt-5.4", name: "GPT-5.4" }])).toBeNull();
    expect(
      resolveSelectableModel("codex", "   ", [{ slug: "gpt-5.4", name: "GPT-5.4" }]),
    ).toBeNull();
    expect(
      resolveSelectableModel("codex", null, [{ slug: "gpt-5.4", name: "GPT-5.4" }]),
    ).toBeNull();
  });

  it("returns null for unknown values that are not present in options", () => {
    expect(
      resolveSelectableModel("codex", "gpt-4.1", [{ slug: "gpt-5.4", name: "GPT-5.4" }]),
    ).toBeNull();
  });

  it("does not accept normalized custom-looking slugs unless they exist in options", () => {
    expect(
      resolveSelectableModel("codex", "custom/internal-model", [
        { slug: "gpt-5.4", name: "GPT-5.4" },
      ]),
    ).toBeNull();
  });

  it("respects provider boundaries", () => {
    expect(
      resolveSelectableModel("codex", "sonnet", [{ slug: "gpt-5.3-codex", name: "GPT-5.3 Codex" }]),
    ).toBeNull();
    expect(
      resolveSelectableModel("claudeAgent", "5.3", [
        { slug: "claude-sonnet-4-6", name: "Claude Sonnet 4.6" },
      ]),
    ).toBeNull();
  });
});

describe("getReasoningEffortOptions", () => {
  it("returns codex reasoning options for codex", () => {
    expect(getReasoningEffortOptions("codex")).toEqual(REASONING_EFFORT_OPTIONS_BY_PROVIDER.codex);
  });

  it("returns claude effort options for Opus 4.6", () => {
    expect(getReasoningEffortOptions("claudeAgent", "claude-opus-4-6")).toEqual([
      "low",
      "medium",
      "high",
      "max",
      "ultrathink",
    ]);
  });

  it("returns claude effort options for Sonnet 4.6", () => {
    expect(getReasoningEffortOptions("claudeAgent", "claude-sonnet-4-6")).toEqual([
      "low",
      "medium",
      "high",
      "ultrathink",
    ]);
  });

  it("returns no claude effort options for Haiku 4.5", () => {
    expect(getReasoningEffortOptions("claudeAgent", "claude-haiku-4-5")).toEqual([]);
  });

  it("returns no reasoning options for cursor", () => {
    expect(getReasoningEffortOptions("cursor")).toEqual([]);
  });
});

describe("inferProviderForModel", () => {
  it("detects known provider model slugs", () => {
    expect(inferProviderForModel("gpt-5.3-codex")).toBe("codex");
    expect(inferProviderForModel("claude-sonnet-4-6")).toBe("claudeAgent");
    expect(inferProviderForModel("sonnet")).toBe("claudeAgent");
  });

  it("falls back when the model is unknown", () => {
    expect(inferProviderForModel("custom/internal-model")).toBe("codex");
    expect(inferProviderForModel("custom/internal-model", "claudeAgent")).toBe("claudeAgent");
  });

  it("treats claude-prefixed custom slugs as claude", () => {
    expect(inferProviderForModel("claude-custom-internal")).toBe("claudeAgent");
  });
});

describe("getDefaultReasoningEffort", () => {
  it("returns provider-scoped defaults", () => {
    expect(getDefaultReasoningEffort("codex")).toBe(DEFAULT_REASONING_EFFORT_BY_PROVIDER.codex);
    expect(getDefaultReasoningEffort("claudeAgent")).toBe(
      DEFAULT_REASONING_EFFORT_BY_PROVIDER.claudeAgent,
    );
    expect(getDefaultReasoningEffort("cursor")).toBe(DEFAULT_REASONING_EFFORT_BY_PROVIDER.cursor);
  });
});

describe("resolveReasoningEffortForProvider", () => {
  it("accepts provider-scoped effort values", () => {
    expect(resolveReasoningEffortForProvider("codex", "xhigh")).toBe("xhigh");
    expect(resolveReasoningEffortForProvider("claudeAgent", "ultrathink")).toBe("ultrathink");
  });

  it("rejects effort values from the wrong provider", () => {
    expect(resolveReasoningEffortForProvider("codex", "max")).toBeNull();
    expect(resolveReasoningEffortForProvider("claudeAgent", "xhigh")).toBeNull();
  });
});

describe("applyClaudePromptEffortPrefix", () => {
  it("prefixes ultrathink prompts exactly once", () => {
    expect(applyClaudePromptEffortPrefix("Investigate this", "ultrathink")).toBe(
      "Ultrathink:\nInvestigate this",
    );
    expect(applyClaudePromptEffortPrefix("Ultrathink:\nInvestigate this", "ultrathink")).toBe(
      "Ultrathink:\nInvestigate this",
    );
  });

  it("leaves non-ultrathink prompts unchanged", () => {
    expect(applyClaudePromptEffortPrefix("Investigate this", "high")).toBe("Investigate this");
  });
});

describe("getEffectiveClaudeCodeEffort", () => {
  it("does not persist ultrathink into Claude runtime configuration", () => {
    expect(getEffectiveClaudeCodeEffort("ultrathink")).toBeNull();
    expect(getEffectiveClaudeCodeEffort("high")).toBe("high");
  });

  it("returns null when no claude effort is selected", () => {
    expect(getEffectiveClaudeCodeEffort(null)).toBeNull();
    expect(getEffectiveClaudeCodeEffort(undefined)).toBeNull();
  });
});

describe("normalizeCodexModelOptions", () => {
  it("drops default-only codex options", () => {
    expect(
      normalizeCodexModelOptions({ reasoningEffort: "high", fastMode: false }),
    ).toBeUndefined();
  });

  it("preserves non-default codex options", () => {
    expect(normalizeCodexModelOptions({ reasoningEffort: "xhigh", fastMode: true })).toEqual({
      reasoningEffort: "xhigh",
      fastMode: true,
    });
  });
});

describe("normalizeClaudeModelOptions", () => {
  it("drops unsupported fast mode and max effort for Sonnet", () => {
    expect(
      normalizeClaudeModelOptions("claude-sonnet-4-6", {
        effort: "max",
        fastMode: true,
      }),
    ).toBeUndefined();
  });

  it("keeps the Haiku thinking toggle and removes unsupported effort", () => {
    expect(
      normalizeClaudeModelOptions("claude-haiku-4-5", {
        thinking: false,
        effort: "high",
      }),
    ).toEqual({
      thinking: false,
    });
  });
});

describe("supportsClaudeAdaptiveReasoning", () => {
  it("only enables adaptive reasoning for Opus 4.6 and Sonnet 4.6", () => {
    expect(supportsClaudeAdaptiveReasoning("claude-opus-4-6")).toBe(true);
    expect(supportsClaudeAdaptiveReasoning("claude-sonnet-4-6")).toBe(true);
    expect(supportsClaudeAdaptiveReasoning("claude-haiku-4-5")).toBe(false);
    expect(supportsClaudeAdaptiveReasoning(undefined)).toBe(false);
  });
});

describe("supportsClaudeMaxEffort", () => {
  it("only enables max effort for Opus 4.6", () => {
    expect(supportsClaudeMaxEffort("claude-opus-4-6")).toBe(true);
    expect(supportsClaudeMaxEffort("claude-sonnet-4-6")).toBe(false);
    expect(supportsClaudeMaxEffort("claude-haiku-4-5")).toBe(false);
    expect(supportsClaudeMaxEffort(undefined)).toBe(false);
  });
});

describe("supportsClaudeFastMode", () => {
  it("only enables Claude fast mode for Opus 4.6", () => {
    expect(supportsClaudeFastMode("claude-opus-4-6")).toBe(true);
    expect(supportsClaudeFastMode("opus")).toBe(true);
    expect(supportsClaudeFastMode("claude-sonnet-4-6")).toBe(false);
    expect(supportsClaudeFastMode("claude-haiku-4-5")).toBe(false);
    expect(supportsClaudeFastMode(undefined)).toBe(false);
  });
});

describe("supportsClaudeUltrathinkKeyword", () => {
  it("only enables ultrathink keyword handling for Opus 4.6 and Sonnet 4.6", () => {
    expect(supportsClaudeUltrathinkKeyword("claude-opus-4-6")).toBe(true);
    expect(supportsClaudeUltrathinkKeyword("claude-sonnet-4-6")).toBe(true);
    expect(supportsClaudeUltrathinkKeyword("claude-haiku-4-5")).toBe(false);
  });
});

describe("supportsClaudeThinkingToggle", () => {
  it("only enables the Claude thinking toggle for Haiku 4.5", () => {
    expect(supportsClaudeThinkingToggle("claude-opus-4-6")).toBe(false);
    expect(supportsClaudeThinkingToggle("claude-sonnet-4-6")).toBe(false);
    expect(supportsClaudeThinkingToggle("claude-haiku-4-5")).toBe(true);
    expect(supportsClaudeThinkingToggle("haiku")).toBe(true);
    expect(supportsClaudeThinkingToggle(undefined)).toBe(false);
  });
});

describe("isClaudeUltrathinkPrompt", () => {
  it("detects ultrathink prompts case-insensitively", () => {
    expect(isClaudeUltrathinkPrompt("Please ultrathink about this")).toBe(true);
    expect(isClaudeUltrathinkPrompt("Ultrathink:\nInvestigate")).toBe(true);
    expect(isClaudeUltrathinkPrompt("Think hard about this")).toBe(false);
    expect(isClaudeUltrathinkPrompt(undefined)).toBe(false);
  });
});
