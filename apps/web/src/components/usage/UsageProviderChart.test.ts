import { ProviderInstanceId } from "@t3tools/contracts";
import type { InstanceTotals } from "@t3tools/shared/usageMerge";
import { describe, expect, it } from "vite-plus/test";

import { buildPeriodColumns, niceScale } from "./UsageProviderChart";
import { buildUsageSeries, PROVIDER_PRESENTATION, providersWithUsage } from "./usageProviders";

const CODEX = ProviderInstanceId.make("codex");
const CLAUDE = ProviderInstanceId.make("claudeAgent");
const CLAUDE_WORK = ProviderInstanceId.make("claudeAgent_work");

/** Series carry more than the columns need; only the key is read here. */
const series = (...instanceIds: readonly ProviderInstanceId[]) =>
  instanceIds.map((instanceId) => ({ instanceId }));

describe("niceScale", () => {
  it("never puts the peak above the top of the scale", () => {
    // Regression: an earlier version stopped at the last step below the peak,
    // so the tallest day was drawn past the plot and clipped.
    for (const peak of [1122.71, 999, 1, 0.04, 1_400_000_000, 37.5, 5000, 100.001]) {
      const { max } = niceScale(peak, 4);
      expect(max, `peak ${peak}`).toBeGreaterThanOrEqual(peak);
    }
  });

  it("starts at zero and ends at the maximum", () => {
    const { max, ticks } = niceScale(1122.71, 4);

    expect(ticks[0]).toBe(0);
    expect(ticks[ticks.length - 1]).toBeCloseTo(max, 6);
  });

  it("uses evenly spaced 1/2/5 steps", () => {
    const { ticks } = niceScale(1122.71, 4);
    const steps = ticks.slice(1).map((tick, index) => tick - (ticks[index] ?? 0));

    for (const step of steps) expect(step).toBeCloseTo(steps[0] ?? 0, 6);
    const [first = 0] = steps;
    const normalized = first / 10 ** Math.floor(Math.log10(first));
    expect([1, 2, 5, 10]).toContain(Math.round(normalized));
  });

  it("keeps the tick count near the requested resolution", () => {
    const { ticks } = niceScale(1122.71, 4);
    expect(ticks.length).toBeGreaterThanOrEqual(3);
    expect(ticks.length).toBeLessThanOrEqual(7);
  });

  it("degrades to a single zero tick with no data", () => {
    expect(niceScale(0, 4)).toEqual({ max: 0, ticks: [0] });
  });
});

describe("buildPeriodColumns", () => {
  const days = ["2026-08-01", "2026-08-02", "2026-08-03"];
  const byDay = new Map([
    [
      "2026-08-01",
      {
        day: "2026-08-01",
        costUsd: 30,
        totalTokens: 300,
        byInstance: new Map([
          [CODEX, { costUsd: 10, totalTokens: 100 }],
          [CLAUDE, { costUsd: 20, totalTokens: 200 }],
        ]),
      },
    ],
    // 2026-08-02 is deliberately absent: a day with no activity.
    [
      "2026-08-03",
      {
        day: "2026-08-03",
        costUsd: 5,
        totalTokens: 50,
        byInstance: new Map([[CLAUDE, { costUsd: 5, totalTokens: 50 }]]),
      },
    ],
  ]);
  const both = series(CODEX, CLAUDE);

  it("plots each day on its own", () => {
    expect(buildPeriodColumns(days, byDay, "cost", both).map((column) => column.total)).toEqual([
      30, 0, 5,
    ]);
  });

  it("reads the requested metric", () => {
    expect(buildPeriodColumns(days, byDay, "tokens", both).map((column) => column.total)).toEqual([
      300, 0, 50,
    ]);
  });

  it("keeps band values absolute rather than cumulative", () => {
    // Regression: the bands were once stack offsets, which drew Claude Code
    // permanently above Codex regardless of which provider spent more.
    const [first] = buildPeriodColumns(days, byDay, "cost", both);

    expect(first?.bands).toEqual([
      { instanceId: "codex", value: 10 },
      { instanceId: "claudeAgent", value: 20 },
    ]);
  });

  it("reports the total as the sum of its bands", () => {
    for (const column of buildPeriodColumns(days, byDay, "cost", both)) {
      const sum = column.bands.reduce((running, band) => running + band.value, 0);
      expect(column.total).toBeCloseTo(sum, 9);
    }
  });

  it("gives each instance of one provider its own band", () => {
    const twoClaudes = new Map([
      [
        "2026-08-01",
        {
          day: "2026-08-01",
          costUsd: 30,
          totalTokens: 300,
          byInstance: new Map([
            [CLAUDE, { costUsd: 20, totalTokens: 200 }],
            [CLAUDE_WORK, { costUsd: 10, totalTokens: 100 }],
          ]),
        },
      ],
    ]);
    const [first] = buildPeriodColumns(
      ["2026-08-01"],
      twoClaudes,
      "cost",
      series(CLAUDE, CLAUDE_WORK),
    );

    expect(first?.bands).toEqual([
      { instanceId: "claudeAgent", value: 20 },
      { instanceId: "claudeAgent_work", value: 10 },
    ]);
  });
});

describe("providersWithUsage", () => {
  it("omits providers with no cost or tokens", () => {
    expect(
      providersWithUsage([
        { provider: "codex", costUsd: 0, totalTokens: 0 },
        { provider: "claude", costUsd: 0, totalTokens: 200 },
      ]),
    ).toEqual(["claude"]);
  });
});

describe("buildUsageSeries", () => {
  const instance = (
    overrides: Partial<InstanceTotals> & Pick<InstanceTotals, "instanceId" | "provider">,
  ): InstanceTotals => ({
    displayName: null,
    accentColor: null,
    isDefaultInstance: false,
    shadeIndex: 0,
    costUsd: 1,
    totalTokens: 1_000,
    records: 1,
    sessions: 1,
    costShare: 0,
    tokenShare: 0,
    ...overrides,
  });

  it("keeps provider reading order with each provider's accounts together", () => {
    // Instances arrive richest first; the page still reads Codex before Claude
    // and the default account before an added one, like the single-account page.
    const series = buildUsageSeries([
      instance({ instanceId: CLAUDE_WORK, provider: "claude", shadeIndex: 1, costUsd: 30 }),
      instance({ instanceId: CODEX, provider: "codex", isDefaultInstance: true, costUsd: 20 }),
      instance({ instanceId: CLAUDE, provider: "claude", isDefaultInstance: true, costUsd: 10 }),
      instance({
        instanceId: ProviderInstanceId.make("grok"),
        provider: "grok",
        costUsd: 0,
        totalTokens: 0,
      }),
    ]);

    expect(series.map((entry) => entry.instanceId)).toEqual([CODEX, CLAUDE, CLAUDE_WORK]);
  });

  it("labels and colours each account on its own", () => {
    const [personal, work] = buildUsageSeries([
      instance({ instanceId: CLAUDE, provider: "claude", isDefaultInstance: true }),
      instance({
        instanceId: CLAUDE_WORK,
        provider: "claude",
        displayName: "Work",
        accentColor: "#123456",
        shadeIndex: 1,
      }),
    ]);

    expect(personal?.label).toBe("Claude Code");
    expect(personal?.color).toBe(PROVIDER_PRESENTATION.claude.colors[0]);
    expect(work?.label).toBe("Work");
    expect(work?.color).toBe("#123456");
  });

  it("falls back to the ramp shade when an account has no usable accent", () => {
    const [work] = buildUsageSeries([
      instance({ instanceId: CLAUDE_WORK, provider: "claude", accentColor: "blue", shadeIndex: 1 }),
    ]);

    expect(work?.color).toBe(PROVIDER_PRESENTATION.claude.colors[1]);
  });
});

describe("hourly chart columns", () => {
  it("zero-fills inactive hours and preserves hourly instance values", () => {
    const byHour = new Map([
      [
        "2026-08-11T09:37:00.000Z",
        {
          day: "2026-08-11",
          hourStart: "2026-08-11T09:37:00.000Z",
          costUsd: 4,
          totalTokens: 40,
          byInstance: new Map([[CODEX, { costUsd: 4, totalTokens: 40 }]]),
        },
      ],
    ]);

    expect(
      buildPeriodColumns(
        ["2026-08-11T08:37:00.000Z", "2026-08-11T09:37:00.000Z", "2026-08-11T10:37:00.000Z"],
        byHour,
        "cost",
        series(CODEX, CLAUDE),
      ).map((column) => column.total),
    ).toEqual([0, 4, 0]);
  });
});
