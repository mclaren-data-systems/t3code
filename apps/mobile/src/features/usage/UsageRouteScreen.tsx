import { useNavigation } from "@react-navigation/native";
import type { DailyTotals, MergedUsage } from "@t3tools/shared/usageMerge";
import {
  enumerateDays,
  enumerateHourStarts,
  formatCount,
  formatDayShort,
  formatHourShort,
  formatPercent,
  formatTokens,
  formatUsd,
  makeWindow,
} from "@t3tools/shared/usageFormat";
import { useMemo, useState } from "react";
import { Platform, Pressable, RefreshControl, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AndroidScreenHeader } from "../../components/AndroidScreenHeader";
import { AppText as Text } from "../../components/AppText";
import { NativeStackScreenOptions } from "../../native/StackHeader";
import { useUsage, type EnvironmentUsageStatus } from "../../state/usage";
import { SettingsSection } from "../settings/components/SettingsSection";
import { UsageDailyChart } from "./UsageDailyChart";
import { UsageLimitsSection } from "./UsageLimitsSection";
import type { UsageChartMetric } from "./usageChartData";
import { useUsageSeries, type UsageSeries } from "./usageProviders";

const WINDOW_OPTIONS = [
  { days: 1, label: "Past 24h" },
  { days: 7, label: "7 days" },
  { days: 30, label: "30 days" },
  { days: 90, label: "90 days" },
] as const;

const CHART_HEIGHT = 180;

export function UsageRouteScreen() {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [windowSelection, setWindowSelection] = useState(() => ({
    days: 30,
    window: makeWindow(30),
  }));
  const [metric, setMetric] = useState<UsageChartMetric>("cost");
  const { days: windowDays, window } = windowSelection;
  const isPast24Hours = windowDays === 1;
  const { merged, environments, isPending, isPartial, refresh } = useUsage(window);

  const days = useMemo(
    () => enumerateDays(window.sinceDay, window.untilDay),
    [window.sinceDay, window.untilDay],
  );
  const chartDays = useMemo(
    () =>
      isPast24Hours && window.sinceTime !== undefined && window.untilTime !== undefined
        ? enumerateHourStarts(window.sinceTime, window.untilTime)
        : days,
    [days, isPast24Hours, window.sinceTime, window.untilTime],
  );
  const chartTotals = useMemo(
    (): readonly DailyTotals[] =>
      isPast24Hours
        ? merged.hourly.map((hour) => ({
            day: hour.hourStart,
            costUsd: hour.costUsd,
            totalTokens: hour.totalTokens,
            byInstance: hour.byInstance,
          }))
        : merged.daily,
    [isPast24Hours, merged.daily, merged.hourly],
  );
  // One band per configured provider instance, so two Claude accounts read as
  // two bands rather than one merged one.
  const series = useUsageSeries(merged.instances);

  // The pull spinner tracks re-scans of environments that have answered
  // before. The initial scan renders its own placeholder, and an unreachable
  // environment stays pending forever — neither may pin the spinner on.
  const refreshing = environments.some((entry) => entry.isPending && entry.summary !== null);
  const selectWindow = (days: number) => {
    setWindowSelection({
      days,
      window: makeWindow(days, undefined, days === 1 ? "hour" : "day"),
    });
  };
  const refreshWindow = () => {
    const nextWindow = makeWindow(windowDays, undefined, isPast24Hours ? "hour" : "day");
    if (
      nextWindow.sinceDay === window.sinceDay &&
      nextWindow.untilDay === window.untilDay &&
      nextWindow.sinceTime === window.sinceTime &&
      nextWindow.untilTime === window.untilTime
    ) {
      refresh();
    } else {
      setWindowSelection({ days: windowDays, window: nextWindow });
    }
  };

  return (
    <View collapsable={false} className="flex-1 bg-sheet">
      {Platform.OS === "android" ? (
        <>
          <NativeStackScreenOptions options={{ headerShown: false }} />
          <AndroidScreenHeader title="Usage" onBack={() => navigation.goBack()} />
        </>
      ) : null}
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerClassName="gap-6 px-5 pt-4"
        contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 18) + 18 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshWindow} />}
      >
        <SegmentedControl
          options={WINDOW_OPTIONS.map((option) => ({ value: option.days, label: option.label }))}
          selected={windowDays}
          onSelect={selectWindow}
        />

        <UsageCoverageNotice environments={environments} merged={merged} isPartial={isPartial} />

        {isPending ? (
          <Text className="py-16 text-center text-base text-foreground-muted">
            Scanning provider transcripts…
          </Text>
        ) : environments.length === 0 ? (
          <Text className="py-16 text-center text-base text-foreground-muted">
            Connect an environment to see usage.
          </Text>
        ) : (
          <>
            <ChartCard
              merged={merged}
              days={chartDays}
              daily={chartTotals}
              metric={metric}
              onMetricChange={setMetric}
              sinceDay={window.sinceDay}
              untilDay={window.untilDay}
              isPast24Hours={isPast24Hours}
              series={series}
              timeZone={window.timeZone}
            />
            <ProviderSection series={series} metric={metric} />
            <UsageLimitsSection />
            <TotalsSection merged={merged} isPast24Hours={isPast24Hours} />
            <ModelsSection merged={merged} series={series} />
          </>
        )}
      </ScrollView>
    </View>
  );
}

function SegmentedControl<Value extends number | string>(props: {
  readonly options: readonly { readonly value: Value; readonly label: string }[];
  readonly selected: Value;
  readonly onSelect: (value: Value) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-full border-continuous bg-card">
      {props.options.map((option) => {
        const active = option.value === props.selected;
        return (
          <Pressable
            key={String(option.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => props.onSelect(option.value)}
            className={
              active
                ? "flex-1 items-center rounded-full bg-subtle-strong py-2"
                : "flex-1 items-center py-2"
            }
          >
            <Text
              className={
                active ? "text-sm font-t3-medium text-foreground" : "text-sm text-foreground-muted"
              }
            >
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** Headline figure, the animated daily chart, and its legend, in one card. */
function ChartCard(props: {
  readonly merged: MergedUsage;
  readonly days: readonly string[];
  readonly daily: readonly DailyTotals[];
  readonly metric: UsageChartMetric;
  readonly onMetricChange: (metric: UsageChartMetric) => void;
  readonly sinceDay: string;
  readonly untilDay: string;
  readonly isPast24Hours: boolean;
  readonly series: readonly UsageSeries[];
  readonly timeZone: string;
}) {
  const { merged, metric } = props;
  const hasActivity = props.daily.some((period) => period.totalTokens > 0);

  return (
    <View className="gap-4 rounded-[24px] border-continuous bg-card p-4">
      <View className="flex-row items-start justify-between gap-3">
        <View className="min-w-0 flex-1 gap-0.5">
          <Text className="text-sm text-foreground-muted">
            {metric === "cost" ? "Raw token cost" : "Processed tokens"}
          </Text>
          <Text className="text-4xl font-t3-bold tabular-nums text-foreground">
            {metric === "cost" ? `${formatUsd(merged.costUsd)}*` : formatTokens(merged.totalTokens)}
          </Text>
          <Text className="text-sm text-foreground-muted">
            {metric === "cost"
              ? "* if billed at full API rate"
              : `Across ${formatCount(merged.sessions)} sessions`}
          </Text>
        </View>
        <MetricToggle metric={metric} onChange={props.onMetricChange} />
      </View>

      {hasActivity ? (
        <UsageDailyChart
          days={props.days}
          daily={props.daily}
          metric={metric}
          height={CHART_HEIGHT}
          series={props.series}
        />
      ) : (
        <View style={{ height: CHART_HEIGHT }} className="items-center justify-center">
          <Text className="text-base text-foreground-muted">No activity in this window.</Text>
        </View>
      )}

      <View className="flex-row items-center justify-between">
        <Text className="text-xs text-foreground-tertiary">
          {props.isPast24Hours
            ? formatHourShort(props.days[0] ?? "", props.timeZone)
            : formatDayShort(props.sinceDay)}
        </Text>
        <View className="flex-row items-center gap-4">
          {props.series.map((entry) => (
            <View key={entry.instanceId} className="flex-row items-center gap-1.5">
              <View className="size-2 rounded-full" style={{ backgroundColor: entry.color }} />
              <Text className="text-xs text-foreground-muted" numberOfLines={1}>
                {entry.label}
              </Text>
            </View>
          ))}
        </View>
        <Text className="text-xs text-foreground-tertiary">
          {props.isPast24Hours
            ? formatHourShort(props.days[props.days.length - 1] ?? "", props.timeZone)
            : formatDayShort(props.untilDay)}
        </Text>
      </View>
    </View>
  );
}

function MetricToggle(props: {
  readonly metric: UsageChartMetric;
  readonly onChange: (metric: UsageChartMetric) => void;
}) {
  return (
    <View className="flex-row overflow-hidden rounded-full bg-subtle">
      {(["cost", "tokens"] as const).map((option) => {
        const active = option === props.metric;
        return (
          <Pressable
            key={option}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onPress={() => props.onChange(option)}
            className={active ? "rounded-full bg-subtle-strong px-3 py-1.5" : "px-3 py-1.5"}
          >
            <Text
              className={
                active
                  ? "text-xs font-t3-medium uppercase text-foreground"
                  : "text-xs uppercase text-foreground-muted"
              }
            >
              {option}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** One row per configured provider instance, not per provider kind. */
function ProviderSection(props: {
  readonly series: readonly UsageSeries[];
  readonly metric: UsageChartMetric;
}) {
  const { metric } = props;
  const reported = props.series.filter((entry) => entry.totals !== null);
  if (reported.length === 0) return null;

  // Ranked by whatever the toggle is showing, so the rows always descend.
  // .sort() on a copy, not .toSorted(): Hermes doesn't ship the ES2023 method.
  const ordered = [...reported].sort((a, b) =>
    metric === "cost"
      ? (b.totals?.costUsd ?? 0) - (a.totals?.costUsd ?? 0)
      : (b.totals?.totalTokens ?? 0) - (a.totals?.totalTokens ?? 0),
  );

  return (
    <SettingsSection title="Providers" card>
      {ordered.map((entry, index) => {
        const totals = entry.totals;
        const share = (metric === "cost" ? totals?.costShare : totals?.tokenShare) ?? 0;
        return (
          <View
            key={entry.instanceId}
            className={index === 0 ? "gap-2 p-4" : "gap-2 border-t border-border-subtle p-4"}
          >
            <View className="flex-row items-baseline justify-between gap-3">
              <View className="min-w-0 flex-1 flex-row items-center gap-2">
                <View
                  className="size-2.5 shrink-0 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <Text className="text-lg text-foreground" numberOfLines={1}>
                  {entry.label}
                </Text>
              </View>
              <Text className="text-lg tabular-nums text-foreground">
                {metric === "cost"
                  ? formatUsd(totals?.costUsd ?? 0)
                  : formatTokens(totals?.totalTokens ?? 0)}
              </Text>
            </View>
            <View className="h-1 flex-row overflow-hidden rounded-full bg-subtle">
              <View
                className="h-full rounded-full"
                style={{ flex: share, backgroundColor: entry.color }}
              />
              <View style={{ flex: 1 - share }} />
            </View>
            <Text className="text-sm text-foreground-muted">
              {metric === "cost"
                ? `${formatPercent(share)} of cost · ${formatTokens(totals?.totalTokens ?? 0)} tokens`
                : `${formatPercent(share)} of tokens · ${formatUsd(totals?.costUsd ?? 0)}`}
            </Text>
          </View>
        );
      })}
    </SettingsSection>
  );
}

function TotalsSection(props: { readonly merged: MergedUsage; readonly isPast24Hours: boolean }) {
  const { merged } = props;
  const activePeriods = (props.isPast24Hours ? merged.hourly : merged.daily).filter(
    (period) => period.totalTokens > 0,
  ).length;
  const periodAverage = activePeriods === 0 ? 0 : merged.totalTokens / activePeriods;
  const observedInput = merged.uncachedInputTokens + merged.cachedInputTokens;
  const cachedShare = observedInput === 0 ? 0 : merged.cachedInputTokens / observedInput;

  return (
    <SettingsSection title="Totals" card>
      <View className="flex-row flex-wrap">
        <MetricCell
          label="Processed tokens"
          value={formatTokens(merged.totalTokens)}
          detail={`${formatTokens(periodAverage)} per active ${props.isPast24Hours ? "hour" : "day"}`}
        />
        <MetricCell
          label="Cache savings"
          value={formatUsd(merged.costQuality.cacheSavingsUsd)}
          detail={
            merged.costUsd > 0
              ? `${(merged.costQuality.cacheSavingsUsd / merged.costUsd).toFixed(1)}x the raw cost`
              : "vs full input rates"
          }
        />
        <MetricCell
          label="Cached input"
          value={formatTokens(merged.cachedInputTokens)}
          detail={`${formatPercent(cachedShare)} of observed input`}
        />
        <MetricCell
          label="Uncached input"
          value={formatTokens(merged.uncachedInputTokens)}
          detail={`${formatTokens(merged.cacheCreationTokens)} cache writes`}
        />
        <MetricCell
          label="Output"
          value={formatTokens(merged.outputTokens)}
          detail={`incl. ${formatTokens(merged.reasoningTokens)} reasoning`}
        />
        <MetricCell
          label="Unpriced"
          value={formatPercent(merged.costQuality.unpricedShare)}
          detail="of records, excluded from cost"
        />
      </View>
    </SettingsSection>
  );
}

function MetricCell(props: {
  readonly label: string;
  readonly value: string;
  readonly detail: string;
}) {
  return (
    <View className="w-1/2 gap-0.5 p-4">
      <Text className="text-sm text-foreground-muted">{props.label}</Text>
      <Text className="text-xl font-t3-medium tabular-nums text-foreground">{props.value}</Text>
      <Text className="text-xs text-foreground-tertiary">{props.detail}</Text>
    </View>
  );
}

function ModelsSection(props: {
  readonly merged: MergedUsage;
  readonly series: readonly UsageSeries[];
}) {
  const { merged } = props;
  if (merged.models.length === 0) return null;

  const byInstance = new Map(props.series.map((entry) => [entry.instanceId as string, entry]));
  // A model row names its instance only when the provider it belongs to has
  // more than one; otherwise the row would repeat what the section already says.
  const providerCounts = new Map<string, number>();
  for (const entry of props.series) {
    if (entry.totals === null) continue;
    providerCounts.set(entry.provider, (providerCounts.get(entry.provider) ?? 0) + 1);
  }

  return (
    <SettingsSection title="By model" card>
      {merged.models.map((model, index) => {
        const instance = byInstance.get(model.instanceId);
        const label =
          instance !== undefined && (providerCounts.get(model.provider) ?? 0) > 1
            ? instance.label
            : null;
        return (
          <View
            key={`${model.instanceId}:${model.model}`}
            className={
              index === 0
                ? "flex-row items-center gap-3 p-4"
                : "flex-row items-center gap-3 border-t border-border-subtle p-4"
            }
          >
            <View
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: instance?.color ?? "transparent" }}
            />
            <View className="min-w-0 flex-1 gap-0.5">
              <Text className="text-base text-foreground" numberOfLines={1}>
                {model.model}
              </Text>
              <Text className="text-sm text-foreground-muted">
                {label === null ? "" : `${label} · `}
                {formatPercent(model.costShare)} of cost · {formatTokens(model.totalTokens)} tokens
              </Text>
            </View>
            <Text className="text-base tabular-nums text-foreground">
              {formatUsd(model.costUsd)}
            </Text>
          </View>
        );
      })}
    </SettingsSection>
  );
}

/**
 * Says plainly when the totals are incomplete: an environment still answering,
 * one that failed, or one whose transcripts another environment already
 * reported.
 */
function UsageCoverageNotice(props: {
  readonly environments: readonly EnvironmentUsageStatus[];
  readonly merged: MergedUsage;
  readonly isPartial: boolean;
}) {
  const failed = props.environments.filter((environment) => environment.error !== null);
  const stale = props.environments.filter((environment) =>
    props.merged.staleEnvironments.includes(environment.environmentId),
  );
  const duplicateSources = props.merged.duplicateSources;
  if (
    failed.length === 0 &&
    stale.length === 0 &&
    duplicateSources.length === 0 &&
    !props.isPartial
  ) {
    return null;
  }

  return (
    <View className="gap-1 rounded-[16px] border-continuous bg-card px-4 py-3">
      {props.isPartial ? (
        <Text className="text-sm text-foreground-muted">
          Some environments are still reporting. Totals are partial.
        </Text>
      ) : null}
      {failed.map((environment) => (
        <Text key={environment.environmentId} className="text-sm text-foreground-muted">
          {environment.label} could not report usage.
        </Text>
      ))}
      {stale.map((environment) => (
        <Text key={environment.environmentId} className="text-sm text-foreground-muted">
          {environment.label} runs an older server version and is excluded from totals.
        </Text>
      ))}
      {duplicateSources.length > 0 ? (
        <Text className="text-sm text-foreground-muted">
          Counted once across environments sharing a transcript directory:{" "}
          {duplicateSources.join(", ")}
        </Text>
      ) : null}
    </View>
  );
}
