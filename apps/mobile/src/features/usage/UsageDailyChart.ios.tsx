import { Chart, Host, type ChartDataPoint } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";
import { useMemo } from "react";

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
 * Native Swift Charts daily bars. Points sharing an x value stack, so emitting
 * one point per instance per day yields per-instance bands whose stack height
 * is the day's total; changes animate natively.
 *
 * Axes are hidden: 30-90 categorical day labels cannot fit on a phone, so the
 * screen renders its own edge labels under the chart instead.
 */
export function UsageDailyChart({ days, daily, metric, height, series }: UsageDailyChartProps) {
  const data = useMemo((): ChartDataPoint[] => {
    return buildChartDays(days, daily, metric, series).flatMap((day) =>
      day.values.map((entry) => ({
        x: day.day,
        y: entry.value,
        color: entry.color,
      })),
    );
  }, [days, daily, metric, series]);

  return (
    <Host style={{ height, width: "100%" }}>
      <Chart
        type="bar"
        data={data}
        animate
        showGrid={false}
        barStyle={{ cornerRadius: 2 }}
        modifiers={[frame({ height })]}
      />
    </Host>
  );
}
