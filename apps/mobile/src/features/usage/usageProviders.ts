import type { ProviderInstanceId, UsageProviderKind } from "@t3tools/contracts";
import { formatInstanceLabel } from "@t3tools/shared/usageFormat";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";

import { useMemo } from "react";

import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";

/**
 * Fallback series order when nothing has been reported yet. The chart stacks
 * from the bottom in this order, so it also fixes which band sits on top.
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

type ProviderShades = Record<UsageProviderKind, readonly [string, ...string[]]>;

/**
 * Shades for successive instances of one provider, brand color first, so a
 * second Claude account is visibly its own band. Claude's brand orange holds in
 * both themes; Codex and Grok are neutrals and must flip with the theme or their
 * bars vanish against the matching background.
 */
function useProviderShades(): ProviderShades {
  const { themeAppearance: scheme } = useAppearancePreferences();
  // Stable identity: the series it feeds are a chart dependency, and a fresh
  // object every render would rebuild every bar on every unrelated re-render.
  return useMemo(
    (): ProviderShades => ({
      claude: ["#d97757", "#a03e2b", "#f0b49a"],
      codex:
        scheme === "dark" ? ["#e6e6e6", "#8f8f96", "#4f4f57"] : ["#3c3c43", "#8f8f96", "#c7c7cf"],
      grok:
        scheme === "dark" ? ["#a1a1aa", "#71717a", "#3f3f46"] : ["#52525b", "#7a7a85", "#a8a8b3"],
      cursor: ["#8b8b8b", "#5e5e5e", "#b8b8b8"],
      opencode: ["#5b9bbd", "#3a6f8c", "#9cc6dd"],
      antigravity: ["#8c7bd1", "#5f4fa3", "#bcb2e6"],
    }),
    [scheme],
  );
}

/**
 * Brand color per provider kind, the first shade of each ramp. The Limits views
 * color by provider rather than by instance, so they read the ramp's head.
 */
export function useProviderColors(): Record<UsageProviderKind, string> {
  const shades = useProviderShades();
  return useMemo(
    () => ({
      claude: shades.claude[0],
      codex: shades.codex[0],
      grok: shades.grok[0],
      cursor: shades.cursor[0],
      opencode: shades.opencode[0],
      antigravity: shades.antigravity[0],
    }),
    [shades],
  );
}

/** One drawable series: a configured provider instance, or a stand-in for one. */
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
 * The series the report draws, one per provider instance with real activity, so
 * a configured-but-idle second account adds no empty band or row.
 */
export function useUsageSeries(instances: readonly InstanceTotals[]): readonly UsageSeries[] {
  const shades = useProviderShades();

  return useMemo(() => {
    // Provider order first, then the ramp slot, so a single-account setup keeps
    // upstream's stacking and one provider's accounts sit together.
    const ordered = instances
      .filter((instance) => instance.totalTokens > 0 || instance.costUsd > 0)
      .sort(
        (a, b) =>
          PROVIDER_ORDER.indexOf(a.provider) - PROVIDER_ORDER.indexOf(b.provider) ||
          a.shadeIndex - b.shadeIndex,
      );
    return ordered.map((instance): UsageSeries => {
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
        // A user who picked an accent color for an instance already told us how
        // they recognise it; the ramp is only for instances that never got one.
        color:
          accent && HEX_COLOR.test(accent)
            ? accent
            : (ramp[instance.shadeIndex % ramp.length] ?? ramp[0]),
        totals: instance,
      };
    });
  }, [instances, shades]);
}
