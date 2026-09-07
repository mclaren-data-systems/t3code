import { ProviderInstanceId } from "@t3tools/contracts";
import { describe, expect, it } from "vite-plus/test";

import { buildPeriodColumns } from "./UsageProviderChart";
import { providersWithUsage } from "./usageProviders";

const CODEX = ProviderInstanceId.make("codex");
const CLAUDE = ProviderInstanceId.make("claudeAgent");
const CLAUDE_WORK = ProviderInstanceId.make("claudeAgent_work");
const PI = ProviderInstanceId.make("pi");

/** Series carry more than the columns need; only the key is read here. */
const series = (...instanceIds: readonly ProviderInstanceId[]) =>
  instanceIds.map((instanceId) => ({ instanceId }));

describe("buildPeriodColumns", () => {
  const days = ["2026-08-01", "2026-08-02", "2026-08-03"];
  const byDay = new Map([
    [
      "2026-08-01",
      {
        day: "2026-08-01",
        costUsd: 35,
        totalTokens: 350,
        byInstance: new Map([
          [CODEX, { costUsd: 10, totalTokens: 100 }],
          [CLAUDE, { costUsd: 20, totalTokens: 200 }],
          [PI, { costUsd: 5, totalTokens: 50 }],
        ]),
      },
    ],
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
  const all = series(CODEX, CLAUDE, PI);

  it("keeps band values absolute rather than cumulative", () => {
    const [first] = buildPeriodColumns(days, byDay, "cost", all);

    expect(first?.bands).toEqual([
      { instanceId: "codex", value: 10 },
      { instanceId: "claudeAgent", value: 20 },
      { instanceId: "pi", value: 5 },
    ]);
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
