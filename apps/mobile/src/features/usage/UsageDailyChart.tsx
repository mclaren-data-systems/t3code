import { useMemo } from "react";
import { View } from "react-native";

import type { DailyTotals } from "@t3tools/shared/usageMerge";

import { buildChartDays, type UsageChartMetric } from "./usageChartData";
import type { UsageSeries } from "./usageProviders";

export interface UsageDailyChartProps {
  readonly days: readonly string[];
  readonly daily: readonly DailyTotals[];
  readonly metric: UsageChartMetric;
  readonly height: number;
  /** One band per provider instance, bottom of the stack first. */
  readonly series: readonly UsageSeries[];
}

/**
 * Stacked daily bars drawn with plain views. Android and any platform without
 * Swift Charts land here; iOS resolves `UsageDailyChart.ios.tsx` instead.
 */
export function UsageDailyChart({ days, daily, metric, height, series }: UsageDailyChartProps) {
  const chartDays = useMemo(
    () => buildChartDays(days, daily, metric, series),
    [days, daily, metric, series],
  );
  const max = chartDays.reduce((peak, day) => Math.max(peak, day.total), 0);

  return (
    <View style={{ height }} className="flex-row items-end gap-px">
      {/* column-reverse stacks the bottom-first provider values upward
          without reversing the array (Hermes lacks Array#toReversed). */}
      {chartDays.map((day) => (
        <View key={day.day} className="h-full flex-1 flex-col-reverse overflow-hidden rounded-sm">
          {day.values.map((entry) => (
            <View
              key={entry.instanceId}
              style={{
                height: max === 0 ? 0 : (entry.value / max) * height,
                backgroundColor: entry.color,
              }}
            />
          ))}
        </View>
      ))}
    </View>
  );
}
