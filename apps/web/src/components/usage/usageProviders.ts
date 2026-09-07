import type { ProviderInstanceId, UsageProviderKind } from "@t3tools/contracts";
import { formatInstanceLabel } from "@t3tools/shared/usageFormat";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";

import { normalizeProviderAccentColor } from "../../providerInstances";
import {
  AntigravityIcon,
  ClaudeAI,
  CursorIcon,
  GrokIcon,
  type Icon,
  OpenAI,
  OpenCodeIcon,
} from "../Icons";

type UsageProviderPresentation = {
  readonly label: string;
  readonly color: string;
  /**
   * Shades for the second and later instances of this provider. A second
   * Claude account draws in the first shade, so the two lines stay apart
   * without either of them losing the provider's identity. Cycled if a user
   * somehow configures more instances than there are shades.
   */
  readonly shades: readonly string[];
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
    color: "var(--contrast-foreground)",
    // Codex is neutral by design, so its extra shades stay neutral: mixing a
    // hue in would read as a different product rather than a second account.
    shades: [
      "var(--muted-foreground)",
      "color-mix(in oklab, var(--foreground) 45%, var(--background))",
    ],
    mark: OpenAI,
  },
  claude: {
    label: "Claude Code",
    color: "#d97757",
    shades: ["#a03e2b", "#f0b49a"],
    mark: ClaudeAI,
  },
  grok: {
    label: "Grok Build",
    // Contrast-aware neutral between the Codex series and muted chart chrome.
    color: "color-mix(in oklab, var(--contrast-foreground) 72%, var(--background))",
    shades: [
      "color-mix(in oklab, var(--contrast-foreground) 48%, var(--background))",
      "color-mix(in oklab, var(--contrast-foreground) 30%, var(--background))",
    ],
    mark: GrokIcon,
  },
  cursor: { label: "Cursor", color: "#8b8b8b", shades: ["#5f5f5f", "#b8b8b8"], mark: CursorIcon },
  opencode: {
    label: "OpenCode",
    color: "#5b9bbd",
    shades: ["#3a6f8c", "#9cc6dc"],
    mark: OpenCodeIcon,
  },
  antigravity: {
    label: "Antigravity",
    color: "#8c7bd1",
    shades: ["#5f4fa6", "#bcb2e6"],
    mark: AntigravityIcon,
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
  const { color, shades } = PROVIDER_PRESENTATION[instance.provider];
  // A user who picked an accent color for an instance already told us how they
  // recognise it; the ramp is only for instances that never got one.
  const configured = normalizeProviderAccentColor(instance.accentColor ?? undefined);
  if (configured) return configured;
  if (instance.shadeIndex === 0 || shades.length === 0) return color;
  return shades[(instance.shadeIndex - 1) % shades.length] ?? color;
}

/**
 * The series the report draws, richest first.
 *
 * Only instances with real activity get a row, so a configured-but-idle second
 * account does not add an empty line to every chart and table.
 */
export function buildUsageSeries(instances: readonly InstanceTotals[]): readonly UsageSeries[] {
  const active = instances.filter(hasUsageActivity);
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
