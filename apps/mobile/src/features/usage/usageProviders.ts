import {
  defaultInstanceIdForDriver,
  USAGE_PROVIDER_DRIVERS,
  type ProviderInstanceId,
  type UsageProviderKind,
} from "@t3tools/contracts";
import { formatInstanceLabel } from "@t3tools/shared/usageFormat";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";

import { useMemo } from "react";

import { useAppearancePreferences } from "../settings/appearance/AppearancePreferencesProvider";

/**
 * Fallback series order when nothing has been reported yet. The chart stacks
 * from the bottom in this order, so it also fixes which band sits on top.
 */
const PROVIDER_ORDER: readonly UsageProviderKind[] = ["codex", "claude", "grok"];

const PROVIDER_LABEL: Record<UsageProviderKind, string> = {
  claude: "Claude Code",
  codex: "Codex",
  grok: "Grok Build",
};

/**
 * Shades for successive instances of one provider, brand color first, so a
 * second Claude account is visibly its own band. Claude's brand orange holds in
 * both themes; Codex and Grok are neutrals and must flip with the theme or their
 * bars vanish against the matching background.
 */
function useProviderShades(): Record<UsageProviderKind, readonly [string, ...string[]]> {
  const { themeAppearance: scheme } = useAppearancePreferences();
  // Stable identity: the series it feeds are a chart dependency, and a fresh
  // object every render would rebuild every bar on every unrelated re-render.
  return useMemo(
    () => ({
      claude: ["#d97757", "#a03e2b", "#f0b49a"],
      codex:
        scheme === "dark" ? ["#e6e6e6", "#8f8f96", "#4f4f57"] : ["#3c3c43", "#8f8f96", "#c7c7cf"],
      grok:
        scheme === "dark" ? ["#a1a1aa", "#71717a", "#3f3f46"] : ["#52525b", "#7a7a85", "#a8a8b3"],
    }),
    [scheme],
  );
}

/** One drawable series: a configured provider instance, or a stand-in for one. */
export interface UsageSeries {
  /** Key into the per-period `byInstance` maps. */
  readonly instanceId: ProviderInstanceId;
  readonly provider: UsageProviderKind;
  readonly label: string;
  readonly color: string;
  /** Null while the page has no totals to attribute to this series. */
  readonly totals: InstanceTotals | null;
}

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/u;

/**
 * The series the report draws.
 *
 * With nothing reported it still yields one entry per provider, standing in for
 * the default instance that will fill it, so the chart and legend keep their
 * shape.
 */
export function useUsageSeries(instances: readonly InstanceTotals[]): readonly UsageSeries[] {
  const shades = useProviderShades();

  return useMemo(() => {
    if (instances.length === 0) {
      return PROVIDER_ORDER.map((provider) => ({
        instanceId: defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[provider]),
        provider,
        label: PROVIDER_LABEL[provider],
        color: shades[provider][0],
        totals: null,
      }));
    }

    return instances.map((instance) => {
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
