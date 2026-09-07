import { Chart, Host, type ChartDataPoint } from "@expo/ui/swift-ui";
import { frame } from "@expo/ui/swift-ui/modifiers";

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

export function UsageDailyChart({ days, daily, metric, height, series }: UsageDailyChartProps) {
  const data: ChartDataPoint[] = buildChartDays(days, daily, metric, series).flatMap((day) =>
    day.values.map((entry) => ({
      x: day.day,
      y: entry.value,
      color: entry.color,
    })),
  );

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
