import type { ProviderInstanceId, UsageProviderKind } from "@t3tools/contracts";
import { formatInstanceLabel } from "@t3tools/shared/usageFormat";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";
import { useMemo } from "react";

import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";

/**
 * Series and table order. The chart stacks providers from the bottom in this
 * order, so it also fixes which band sits on top of the bars.
 */
export const PROVIDER_ORDER: readonly UsageProviderKind[] = [
  "codex",
  "claude",
  "grok",
  "cursor",
  "opencode",
  "antigravity",
];

export const PROVIDER_LABEL: Record<UsageProviderKind, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok Build",
  cursor: "Cursor",
  opencode: "OpenCode",
  antigravity: "Antigravity",
};

/**
 * Claude's brand orange holds in both themes; Codex and Grok are neutrals and
 * must flip with the theme or their bars vanish against the matching background.
 */
export function useProviderColors(): Record<UsageProviderKind, string> {
  const { themeAppearance: scheme } = useAppearancePreferences();
  return {
    claude: "#d97757",
    codex: scheme === "dark" ? "#e6e6e6" : "#3c3c43",
    grok: scheme === "dark" ? "#a1a1aa" : "#52525b",
    cursor: "#8b8b8b",
    opencode: "#5b9bbd",
    antigravity: "#8c7bd1",
  };
}

/**
 * Neutral steps for cost and token mixes, so they never borrow a provider's
 * color. Matches the web steps: oklab mixes of the codex ink into the
 * background, above the 15 ΔE separation floor for adjacent segments.
 */
export function useUsageMixColors() {
  const { themeAppearance: scheme } = useAppearancePreferences();
  const dark = scheme === "dark";
  return {
    input: dark ? "#737373" : "#848484",
    cacheRead: dark ? "#282828" : "#c0c0c0",
    cacheWrite: dark ? "#949494" : "#6d6d6d",
    output: dark ? "#e6e6e6" : "#3c3c43",
    other: dark ? "#494949" : "#a3a3a3",
    standard: dark ? "#313131" : "#b8b8b8",
    fast: dark ? "#838383" : "#797979",
    ultrafast: dark ? "#e6e6e6" : "#3c3c43",
  };
}

/**
 * Shades for the second and later instances of one provider, so a second
 * Claude account is visibly its own band. The first instance keeps the brand
 * color from {@link useProviderColors}. Codex and Grok flip with the theme
 * like their brand neutrals do.
 */
function useProviderShades(): Record<UsageProviderKind, readonly string[]> {
  const { themeAppearance: scheme } = useAppearancePreferences();
  // Stable identity: the series it feeds are a chart dependency, and a fresh
  // object every render would rebuild every bar on every unrelated re-render.
  return useMemo(
    () => ({
      claude: ["#a03e2b", "#f0b49a"],
      codex: scheme === "dark" ? ["#8f8f96", "#4f4f57"] : ["#8f8f96", "#c7c7cf"],
      grok: scheme === "dark" ? ["#71717a", "#3f3f46"] : ["#7a7a85", "#a8a8b3"],
      cursor: ["#5f5f5f", "#b8b8b8"],
      opencode: ["#3a6f8c", "#9cc6dc"],
      antigravity: ["#5f4fa6", "#bcb2e6"],
    }),
    [scheme],
  );
}

/** One drawable series: a configured provider instance with activity. */
export interface UsageSeries {
  /** Key into the per-period `byInstance` maps. */
  readonly instanceId: ProviderInstanceId;
  readonly provider: UsageProviderKind;
  readonly label: string;
  readonly color: string;
  readonly totals: InstanceTotals;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/u;

/**
 * The series the report draws: one per provider instance that spent anything,
 * so two Claude accounts read as two bands rather than one merged one.
 */
export function useUsageSeries(instances: readonly InstanceTotals[]): readonly UsageSeries[] {
  const colors = useProviderColors();
  const shades = useProviderShades();
  const { themeAppearance: scheme } = useAppearancePreferences();

  return useMemo(
    () =>
      instances
        .filter((instance) => instance.totalTokens > 0 || instance.costUsd > 0)
        .map((instance) => {
          const ramp = shades[instance.provider];
          const accent = instance.accentColor?.trim();
          return {
            instanceId: instance.instanceId,
            provider: instance.provider,
            label: formatInstanceLabel({
              instanceId: instance.instanceId,
              displayName: instance.displayName,
              isDefaultInstance: instance.isDefaultInstance,
              brandLabel: PROVIDER_LABEL[instance.provider],
            }),
            // A user who picked an accent color for an instance already told us
            // how they recognise it; the ramp is only for instances without one.
            color:
              accent && HEX_COLOR.test(accent)
                ? accent
                : instance.shadeIndex === 0 || ramp.length === 0
                  ? colors[instance.provider]
                  : (ramp[(instance.shadeIndex - 1) % ramp.length] ?? colors[instance.provider]),
            totals: instance,
          };
        }),
    // useProviderColors returns a fresh object per render; key on the scheme
    // it derives from instead.
    [instances, shades, scheme],
  );
}
