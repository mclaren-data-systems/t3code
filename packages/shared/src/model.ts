import {
  CLAUDE_CODE_EFFORT_OPTIONS,
  CLAUDE_CODE_EFFORT_OPTIONS_BY_PROVIDER,
  CODEX_REASONING_EFFORT_OPTIONS,
  CURSOR_MODEL_FAMILY_OPTIONS,
  CURSOR_REASONING_OPTIONS,
  DEFAULT_CLAUDE_CODE_EFFORT_BY_PROVIDER,
  DEFAULT_MODEL_BY_PROVIDER,
  DEFAULT_REASONING_EFFORT_BY_PROVIDER,
  MODEL_OPTIONS_BY_PROVIDER,
  MODEL_SLUG_ALIASES_BY_PROVIDER,
  REASONING_EFFORT_OPTIONS_BY_PROVIDER,
  type ClaudeModelOptions,
  type ClaudeCodeEffort,
  type CodexModelOptions,
  type CodexReasoningEffort,
  type CursorModelFamily,
  type CursorModelSlug,
  type CursorReasoningOption,
  type ModelSlug,
  type ProviderReasoningEffort,
  type ProviderKind,
} from "@t3tools/contracts";

type CursorModelCapability = {
  readonly supportsReasoning: boolean;
  readonly supportsFast: boolean;
  readonly supportsThinking: boolean;
  readonly defaultReasoning: CursorReasoningOption;
  readonly defaultThinking: boolean;
};

const CURSOR_MODEL_CAPABILITY_BY_FAMILY: Record<CursorModelFamily, CursorModelCapability> = {
  auto: {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "composer-1.5": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "composer-1": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.3-codex": {
    supportsReasoning: true,
    supportsFast: true,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.2-codex": {
    supportsReasoning: true,
    supportsFast: true,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.2": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.2-high": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.1-codex-max": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.1-codex-max-high": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-medium": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-medium-fast": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-high": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-high-fast": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-xhigh": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.4-xhigh-fast": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.3-codex-spark-preview": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "opus-4.6": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: true,
    defaultReasoning: "normal",
    defaultThinking: true,
  },
  "opus-4.5": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: true,
    defaultReasoning: "normal",
    defaultThinking: true,
  },
  "sonnet-4.6": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: true,
    defaultReasoning: "normal",
    defaultThinking: true,
  },
  "sonnet-4.5": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: true,
    defaultReasoning: "normal",
    defaultThinking: true,
  },
  "gemini-3.1-pro": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  grok: {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.1-high": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gemini-3-pro": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gemini-3-flash": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "gpt-5.1-codex-mini": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
  "kimi-k2.5": {
    supportsReasoning: false,
    supportsFast: false,
    supportsThinking: false,
    defaultReasoning: "normal",
    defaultThinking: false,
  },
};

const MODEL_SLUG_SET_BY_PROVIDER: Record<ProviderKind, ReadonlySet<ModelSlug>> = {
  codex: new Set(MODEL_OPTIONS_BY_PROVIDER.codex.map((option) => option.slug)),
  copilot: new Set(MODEL_OPTIONS_BY_PROVIDER.copilot.map((option) => option.slug)),
  claudeAgent: new Set(MODEL_OPTIONS_BY_PROVIDER.claudeAgent.map((option) => option.slug)),
  cursor: new Set(MODEL_OPTIONS_BY_PROVIDER.cursor.map((option) => option.slug)),
  opencode: new Set(MODEL_OPTIONS_BY_PROVIDER.opencode.map((option) => option.slug)),
  kilo: new Set(MODEL_OPTIONS_BY_PROVIDER.kilo.map((option) => option.slug)),
  geminiCli: new Set(MODEL_OPTIONS_BY_PROVIDER.geminiCli.map((option) => option.slug)),
  amp: new Set(MODEL_OPTIONS_BY_PROVIDER.amp.map((option) => option.slug)),
};

const CURSOR_MODEL_FAMILY_SET = new Set<CursorModelFamily>(
  CURSOR_MODEL_FAMILY_OPTIONS.map((option) => option.slug),
);

const CLAUDE_OPUS_4_6_MODEL = "claude-opus-4-6";
const CLAUDE_SONNET_4_6_MODEL = "claude-sonnet-4-6";
const CLAUDE_HAIKU_4_5_MODEL = "claude-haiku-4-5";

export interface CursorModelSelection {
  readonly family: CursorModelFamily;
  readonly reasoning: CursorReasoningOption;
  readonly fast: boolean;
  readonly thinking: boolean;
}

export interface SelectableModelOption {
  slug: string;
  name: string;
}

export function getModelOptions(provider: ProviderKind = "codex") {
  return MODEL_OPTIONS_BY_PROVIDER[provider];
}

export function getCursorModelFamilyOptions() {
  return CURSOR_MODEL_FAMILY_OPTIONS;
}

export function getCursorModelCapabilities(family: CursorModelFamily) {
  return CURSOR_MODEL_CAPABILITY_BY_FAMILY[family];
}

function fallbackCursorModelFamily(): CursorModelFamily {
  const fallback = parseCursorModelSelection(DEFAULT_MODEL_BY_PROVIDER.cursor);
  return fallback.family;
}

function resolveCursorModelFamily(model: string | null | undefined): CursorModelFamily {
  const normalized = normalizeModelSlug(model, "cursor");
  if (!normalized) {
    return fallbackCursorModelFamily();
  }

  if (
    normalized === "gpt-5.3-codex" ||
    normalized === "gpt-5.3-codex-fast" ||
    normalized === "gpt-5.3-codex-low" ||
    normalized === "gpt-5.3-codex-low-fast" ||
    normalized === "gpt-5.3-codex-high" ||
    normalized === "gpt-5.3-codex-high-fast" ||
    normalized === "gpt-5.3-codex-xhigh" ||
    normalized === "gpt-5.3-codex-xhigh-fast"
  ) {
    return "gpt-5.3-codex";
  }
  if (
    normalized === "gpt-5.2-codex" ||
    normalized === "gpt-5.2-codex-fast" ||
    normalized === "gpt-5.2-codex-low" ||
    normalized === "gpt-5.2-codex-low-fast" ||
    normalized === "gpt-5.2-codex-high" ||
    normalized === "gpt-5.2-codex-high-fast" ||
    normalized === "gpt-5.2-codex-xhigh" ||
    normalized === "gpt-5.2-codex-xhigh-fast"
  ) {
    return "gpt-5.2-codex";
  }

  if (normalized === "sonnet-4.6-thinking") {
    return "sonnet-4.6";
  }
  if (normalized === "sonnet-4.5-thinking") {
    return "sonnet-4.5";
  }
  if (normalized === "opus-4.6-thinking") {
    return "opus-4.6";
  }
  if (normalized === "opus-4.5-thinking") {
    return "opus-4.5";
  }

  return CURSOR_MODEL_FAMILY_SET.has(normalized as CursorModelFamily)
    ? (normalized as CursorModelFamily)
    : fallbackCursorModelFamily();
}

function resolveCursorReasoning(model: CursorModelSlug): CursorReasoningOption {
  if (model.includes("-xhigh")) return "xhigh";
  if (model.includes("-high")) return "high";
  if (model.includes("-low")) return "low";
  return "normal";
}

export function parseCursorModelSelection(model: string | null | undefined): CursorModelSelection {
  const family = resolveCursorModelFamily(model);
  const capability = CURSOR_MODEL_CAPABILITY_BY_FAMILY[family];
  const normalized = resolveModelSlugForProvider("cursor", model) as CursorModelSlug;

  if (capability.supportsReasoning) {
    return {
      family,
      reasoning: resolveCursorReasoning(normalized),
      fast: normalized.endsWith("-fast"),
      thinking: false,
    };
  }

  if (capability.supportsThinking) {
    return {
      family,
      reasoning: capability.defaultReasoning,
      fast: false,
      thinking: normalized.endsWith("-thinking"),
    };
  }

  return {
    family,
    reasoning: capability.defaultReasoning,
    fast: false,
    thinking: capability.defaultThinking,
  };
}

export function resolveCursorPickerModelSlug(
  model: string | null | undefined,
): CursorModelSlug | CursorModelFamily {
  const selection = parseCursorModelSelection(model);
  const capability = CURSOR_MODEL_CAPABILITY_BY_FAMILY[selection.family];
  const normalized = resolveModelSlugForProvider("cursor", model) as CursorModelSlug;
  return capability.supportsReasoning || capability.supportsThinking
    ? selection.family
    : normalized;
}

export function resolveCursorModelFromSelection(input: {
  readonly family: CursorModelFamily;
  readonly reasoning?: CursorReasoningOption | null;
  readonly fast?: boolean;
  readonly thinking?: boolean;
}): CursorModelSlug {
  const family = resolveCursorModelFamily(input.family);
  const capability = CURSOR_MODEL_CAPABILITY_BY_FAMILY[family];

  if (capability.supportsReasoning) {
    const reasoning = CURSOR_REASONING_OPTIONS.includes(input.reasoning ?? "normal")
      ? (input.reasoning ?? "normal")
      : capability.defaultReasoning;
    const reasoningSuffix = reasoning === "normal" ? "" : `-${reasoning}`;
    const fastSuffix = input.fast ? "-fast" : "";
    const candidate = `${family}${reasoningSuffix}${fastSuffix}`;
    return resolveModelSlugForProvider("cursor", candidate) as CursorModelSlug;
  }

  if (capability.supportsThinking) {
    const candidate = input.thinking ? `${family}-thinking` : family;
    return resolveModelSlugForProvider("cursor", candidate) as CursorModelSlug;
  }

  return resolveModelSlugForProvider("cursor", family) as CursorModelSlug;
}

export function getDefaultModel(provider: ProviderKind = "codex"): ModelSlug {
  return DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function supportsClaudeFastMode(model: string | null | undefined): boolean {
  return normalizeModelSlug(model, "claudeAgent") === CLAUDE_OPUS_4_6_MODEL;
}

export function supportsClaudeAdaptiveReasoning(model: string | null | undefined): boolean {
  const normalized = normalizeModelSlug(model, "claudeAgent");
  return normalized === CLAUDE_OPUS_4_6_MODEL || normalized === CLAUDE_SONNET_4_6_MODEL;
}

export function supportsClaudeMaxEffort(model: string | null | undefined): boolean {
  return normalizeModelSlug(model, "claudeAgent") === CLAUDE_OPUS_4_6_MODEL;
}

export function supportsClaudeUltrathinkKeyword(model: string | null | undefined): boolean {
  return supportsClaudeAdaptiveReasoning(model);
}

export function supportsClaudeThinkingToggle(model: string | null | undefined): boolean {
  return normalizeModelSlug(model, "claudeAgent") === CLAUDE_HAIKU_4_5_MODEL;
}

export function isClaudeUltrathinkPrompt(text: string | null | undefined): boolean {
  return typeof text === "string" && /\bultrathink\b/i.test(text);
}

export function normalizeModelSlug(
  model: string | null | undefined,
  provider: ProviderKind = "codex",
): ModelSlug | null {
  if (typeof model !== "string") {
    return null;
  }

  const trimmed = model.trim();
  if (!trimmed) {
    return null;
  }

  const aliases = MODEL_SLUG_ALIASES_BY_PROVIDER[provider] as Record<string, ModelSlug>;
  const aliased = Object.prototype.hasOwnProperty.call(aliases, trimmed)
    ? aliases[trimmed]
    : undefined;
  return typeof aliased === "string" ? aliased : (trimmed as ModelSlug);
}

export function resolveSelectableModel(
  provider: ProviderKind,
  value: string | null | undefined,
  options: ReadonlyArray<SelectableModelOption>,
): ModelSlug | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const direct = options.find((option) => option.slug === trimmed);
  if (direct) {
    return direct.slug;
  }

  const byName = options.find((option) => option.name.toLowerCase() === trimmed.toLowerCase());
  if (byName) {
    return byName.slug;
  }

  const normalized = normalizeModelSlug(trimmed, provider);
  if (!normalized) {
    return null;
  }

  const resolved = options.find((option) => option.slug === normalized);
  return resolved ? resolved.slug : null;
}

export function resolveModelSlug(
  model: string | null | undefined,
  provider: ProviderKind = "codex",
): ModelSlug {
  const normalized = normalizeModelSlug(model, provider);
  if (!normalized) {
    return DEFAULT_MODEL_BY_PROVIDER[provider];
  }

  const catalog = MODEL_SLUG_SET_BY_PROVIDER[provider];
  if (catalog.size === 0) {
    return normalized;
  }

  return catalog.has(normalized) ? normalized : DEFAULT_MODEL_BY_PROVIDER[provider];
}

export function resolveModelSlugForProvider(
  provider: ProviderKind,
  model: string | null | undefined,
): ModelSlug {
  return resolveModelSlug(model, provider);
}

export function inferProviderForModel(
  model: string | null | undefined,
  fallback: ProviderKind = "codex",
): ProviderKind {
  const normalizedClaude = normalizeModelSlug(model, "claudeAgent");
  if (normalizedClaude && MODEL_SLUG_SET_BY_PROVIDER.claudeAgent.has(normalizedClaude)) {
    return "claudeAgent";
  }

  const normalizedCodex = normalizeModelSlug(model, "codex");
  if (normalizedCodex && MODEL_SLUG_SET_BY_PROVIDER.codex.has(normalizedCodex)) {
    return "codex";
  }

  return typeof model === "string" && model.trim().startsWith("claude-") ? "claudeAgent" : fallback;
}

export function getReasoningEffortOptions(provider: "codex"): ReadonlyArray<CodexReasoningEffort>;
export function getReasoningEffortOptions(
  provider: "claudeAgent",
  model?: string | null | undefined,
): ReadonlyArray<ClaudeCodeEffort>;
export function getReasoningEffortOptions(
  provider?: ProviderKind,
  model?: string | null | undefined,
): ReadonlyArray<ProviderReasoningEffort>;
export function getReasoningEffortOptions(
  provider: ProviderKind = "codex",
  model?: string | null | undefined,
): ReadonlyArray<ProviderReasoningEffort> {
  if (provider === "claudeAgent") {
    if (supportsClaudeMaxEffort(model)) {
      return ["low", "medium", "high", "max", "ultrathink"];
    }
    if (supportsClaudeAdaptiveReasoning(model)) {
      return ["low", "medium", "high", "ultrathink"];
    }
    return [];
  }
  return REASONING_EFFORT_OPTIONS_BY_PROVIDER[provider];
}

export function getDefaultReasoningEffort(provider: "codex"): CodexReasoningEffort;
export function getDefaultReasoningEffort(provider: "claudeAgent"): ClaudeCodeEffort;
export function getDefaultReasoningEffort(provider?: ProviderKind): ProviderReasoningEffort | null;
export function getDefaultReasoningEffort(
  provider: ProviderKind = "codex",
): ProviderReasoningEffort | null {
  return DEFAULT_REASONING_EFFORT_BY_PROVIDER[provider];
}

export function getClaudeCodeEffortOptions(
  provider: ProviderKind = "claudeAgent",
): ReadonlyArray<ClaudeCodeEffort> {
  return CLAUDE_CODE_EFFORT_OPTIONS_BY_PROVIDER[provider];
}

export function getDefaultClaudeCodeEffort(provider: "claudeAgent"): ClaudeCodeEffort;
export function getDefaultClaudeCodeEffort(provider: ProviderKind): ClaudeCodeEffort | null;
export function getDefaultClaudeCodeEffort(
  provider: ProviderKind = "claudeAgent",
): ClaudeCodeEffort | null {
  return DEFAULT_CLAUDE_CODE_EFFORT_BY_PROVIDER[provider];
}

export function resolveReasoningEffortForProvider(
  provider: "codex",
  effort: string | null | undefined,
): CodexReasoningEffort | null;
export function resolveReasoningEffortForProvider(
  provider: "claudeAgent",
  effort: string | null | undefined,
): ClaudeCodeEffort | null;
export function resolveReasoningEffortForProvider(
  provider: ProviderKind,
  effort: string | null | undefined,
): ProviderReasoningEffort | null;
export function resolveReasoningEffortForProvider(
  provider: ProviderKind,
  effort: string | null | undefined,
): ProviderReasoningEffort | null {
  if (typeof effort !== "string") {
    return null;
  }

  const trimmed = effort.trim();
  if (!trimmed) {
    return null;
  }

  const options = REASONING_EFFORT_OPTIONS_BY_PROVIDER[provider] as ReadonlyArray<string>;
  return options.includes(trimmed) ? (trimmed as ProviderReasoningEffort) : null;
}

export function getEffectiveClaudeCodeEffort(
  effort: ClaudeCodeEffort | null | undefined,
): Exclude<ClaudeCodeEffort, "ultrathink"> | null {
  if (!effort) {
    return null;
  }
  return effort === "ultrathink" ? null : effort;
}

export function normalizeCodexModelOptions(
  modelOptions: CodexModelOptions | null | undefined,
): CodexModelOptions | undefined {
  const defaultReasoningEffort = getDefaultReasoningEffort("codex");
  const reasoningEffort =
    resolveReasoningEffortForProvider("codex", modelOptions?.reasoningEffort) ??
    defaultReasoningEffort;
  const fastModeEnabled = modelOptions?.fastMode === true;
  const nextOptions: CodexModelOptions = {
    ...(reasoningEffort !== defaultReasoningEffort ? { reasoningEffort } : {}),
    ...(fastModeEnabled ? { fastMode: true } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function normalizeClaudeModelOptions(
  model: string | null | undefined,
  modelOptions: ClaudeModelOptions | null | undefined,
): ClaudeModelOptions | undefined {
  const reasoningOptions = getReasoningEffortOptions("claudeAgent", model);
  const defaultReasoningEffort = getDefaultReasoningEffort("claudeAgent");
  const resolvedEffort = resolveReasoningEffortForProvider("claudeAgent", modelOptions?.effort);
  const effort =
    resolvedEffort &&
    resolvedEffort !== "ultrathink" &&
    reasoningOptions.includes(resolvedEffort) &&
    resolvedEffort !== defaultReasoningEffort
      ? resolvedEffort
      : undefined;
  const thinking =
    supportsClaudeThinkingToggle(model) && modelOptions?.thinking === false ? false : undefined;
  const fastMode =
    supportsClaudeFastMode(model) && modelOptions?.fastMode === true ? true : undefined;
  const nextOptions: ClaudeModelOptions = {
    ...(thinking === false ? { thinking: false } : {}),
    ...(effort ? { effort } : {}),
    ...(fastMode ? { fastMode: true } : {}),
  };
  return Object.keys(nextOptions).length > 0 ? nextOptions : undefined;
}

export function applyClaudePromptEffortPrefix(
  text: string,
  effort: ClaudeCodeEffort | null | undefined,
): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return trimmed;
  }
  if (effort !== "ultrathink") {
    return trimmed;
  }
  if (trimmed.startsWith("Ultrathink:")) {
    return trimmed;
  }
  return `Ultrathink:\n${trimmed}`;
}

export { CLAUDE_CODE_EFFORT_OPTIONS, CODEX_REASONING_EFFORT_OPTIONS };
