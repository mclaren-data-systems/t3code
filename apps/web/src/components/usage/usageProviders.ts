import {
  defaultInstanceIdForDriver,
  USAGE_PROVIDER_DRIVERS,
  type ProviderInstanceId,
  type UsageProviderKind,
} from "@t3tools/contracts";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";
import { formatInstanceLabel } from "@t3tools/shared/usageFormat";

import { normalizeProviderAccentColor } from "../../providerInstances";
import { ClaudeAI, type Icon, OpenAI } from "../Icons";

type UsageProviderPresentation = {
  readonly label: string;
  /**
   * Shades for successive instances of this provider, brand color first. A
   * second Claude account draws in the second shade, so the two lines stay
   * apart without either of them losing the provider's identity. Cycled if a
   * user somehow configures more instances than there are shades.
   */
  readonly colors: readonly [string, ...string[]];
  readonly mark: Icon;
};

/**
 * Exhaustive presentation for providers supported by the usage contract.
 * Declaration order is reused by every chart and table, so adding a provider
 * only requires its contract support and one entry here.
 */
export const PROVIDER_PRESENTATION = {
  codex: {
    label: "Codex",
    // Codex is neutral by design, so its extra shades stay neutral: mixing a
    // hue in would read as a different product rather than a second account.
    colors: [
      "var(--contrast-foreground)",
      "var(--muted-foreground)",
      "color-mix(in oklab, var(--foreground) 45%, var(--background))",
    ],
    mark: OpenAI,
  },
  claude: {
    label: "Claude Code",
    colors: ["#d97757", "#a03e2b", "#f0b49a"],
    mark: ClaudeAI,
  },
} satisfies Record<UsageProviderKind, UsageProviderPresentation>;

/** Stable provider reading order across charts, summaries, tables, and hover rows. */
export const PROVIDER_ORDER = Object.keys(PROVIDER_PRESENTATION) as UsageProviderKind[];

/** True when a series has something worth drawing, whichever metric is shown. */
function hasUsageActivity(totals: {
  readonly costUsd: number;
  readonly totalTokens: number;
}): boolean {
  return totals.totalTokens > 0 || totals.costUsd > 0;
}

/** Providers with real activity, independent of the metric currently displayed. */
export function providersWithUsage(
  totals: readonly {
    readonly provider: UsageProviderKind;
    readonly costUsd: number;
    readonly totalTokens: number;
  }[],
): readonly UsageProviderKind[] {
  const active = new Set(totals.filter(hasUsageActivity).map((entry) => entry.provider));
  return PROVIDER_ORDER.filter((provider) => active.has(provider));
}

/**
 * One drawable series on the report: a configured provider instance, or — when
 * nothing has been reported yet — a provider kind standing in for the instance
 * that will fill it.
 */
export interface UsageSeries {
  /** Key into the per-period `byInstance` maps. */
  readonly instanceId: ProviderInstanceId;
  readonly provider: UsageProviderKind;
  readonly label: string;
  readonly color: string;
  /** Null while the page has no totals to attribute to this series. */
  readonly totals: InstanceTotals | null;
}

function seriesColor(instance: InstanceTotals): string {
  const { colors } = PROVIDER_PRESENTATION[instance.provider];
  // A user who picked an accent color for an instance already told us how they
  // recognise it; the ramp is only for instances that never got one.
  return (
    normalizeProviderAccentColor(instance.accentColor ?? undefined) ??
    colors[instance.shadeIndex % colors.length] ??
    colors[0]
  );
}

/**
 * The series the report draws, richest first.
 *
 * Only instances with real activity get a row, so a configured-but-idle second
 * account does not add an empty line to every chart and table. With nothing
 * reported at all the page still shows a row per provider so the layout does
 * not collapse to a bare headline.
 */
export function buildUsageSeries(instances: readonly InstanceTotals[]): readonly UsageSeries[] {
  const active = instances.filter(hasUsageActivity);
  if (active.length === 0) {
    return PROVIDER_ORDER.map((provider) => ({
      // The row stands in for the instance that will fill it once something is
      // reported, which for an untouched install is the provider's default.
      instanceId: defaultInstanceIdForDriver(USAGE_PROVIDER_DRIVERS[provider]),
      provider,
      label: PROVIDER_PRESENTATION[provider].label,
      color: PROVIDER_PRESENTATION[provider].colors[0],
      totals: null,
    }));
  }

  return active.map((instance) => ({
    instanceId: instance.instanceId,
    provider: instance.provider,
    label: formatInstanceLabel({
      instanceId: instance.instanceId,
      displayName: instance.displayName,
      isDefaultInstance: instance.isDefaultInstance,
      brandLabel: PROVIDER_PRESENTATION[instance.provider].label,
    }),
    color: seriesColor(instance),
    totals: instance,
  }));
}
