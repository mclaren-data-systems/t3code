/**
 * Shapes merged daily totals into the per-day instance stacks both chart
 * implementations (Swift Charts on iOS, plain views elsewhere) render.
 *
 * @module usageChartData
 */
import type { DailyTotals } from "@t3tools/shared/usageMerge";

import type { UsageSeries } from "./usageProviders";

export type UsageChartMetric = "cost" | "tokens";

export interface UsageChartDay {
  readonly day: string;
  /** In series order, i.e. bottom of the stack first. */
  readonly values: readonly {
    readonly instanceId: string;
    readonly color: string;
    readonly value: number;
  }[];
  readonly total: number;
}

/** One entry per day in the window, zero-filled where nothing happened. */
export function buildChartDays(
  days: readonly string[],
  daily: readonly DailyTotals[],
  metric: UsageChartMetric,
  series: readonly UsageSeries[],
): readonly UsageChartDay[] {
  const byDay = new Map(daily.map((totals) => [totals.day, totals]));
  return days.map((day) => {
    const totals = byDay.get(day);
    const values = series.map((entry) => {
      const cell = totals?.byInstance.get(entry.instanceId);
      const value = cell === undefined ? 0 : metric === "cost" ? cell.costUsd : cell.totalTokens;
      return { instanceId: entry.instanceId as string, color: entry.color, value };
    });
    return {
      day,
      values,
      total: values.reduce((sum, entry) => sum + entry.value, 0),
    };
  });
}
