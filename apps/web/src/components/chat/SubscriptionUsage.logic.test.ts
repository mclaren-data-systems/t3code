import { describe, expect, it } from "vite-plus/test";
import type { ProviderSubscriptionUsage } from "@t3tools/contracts";

import {
  formatRemainingPercent,
  formatResetCountdown,
  SUBSCRIPTION_USAGE_STALE_AFTER_MS,
  tightestWindow,
  usableSubscriptionUsage,
} from "./SubscriptionUsage.logic";

const NOW_MS = Date.parse("2026-08-25T12:00:00.000Z");

function makeUsage(overrides?: Partial<ProviderSubscriptionUsage>): ProviderSubscriptionUsage {
  return {
    windows: [{ id: "five_hour", label: "5 hour", usedPercent: 40 }],
    collectedAt: "2026-08-25T11:59:00.000Z",
    ...overrides,
  };
}

describe("formatRemainingPercent", () => {
  it("reports what is left, not what is spent", () => {
    expect(formatRemainingPercent({ id: "a", label: "a", usedPercent: 40 })).toBe("60% left");
    expect(formatRemainingPercent({ id: "a", label: "a", usedPercent: 0 })).toBe("100% left");
    expect(formatRemainingPercent({ id: "a", label: "a", usedPercent: 100 })).toBe("0% left");
  });

  it("keeps a decimal only in the last percent, where it changes the decision", () => {
    expect(formatRemainingPercent({ id: "a", label: "a", usedPercent: 99.7 })).toBe("0.3% left");
    expect(formatRemainingPercent({ id: "a", label: "a", usedPercent: 55.4 })).toBe("45% left");
  });
});

describe("tightestWindow", () => {
  it("picks the window the user will hit first", () => {
    const usage = makeUsage({
      windows: [
        { id: "five_hour", label: "5 hour", usedPercent: 20 },
        { id: "seven_day", label: "Weekly", usedPercent: 88 },
        { id: "model", label: "Weekly (Fable)", usedPercent: 55 },
      ],
    });

    expect(tightestWindow(usage)?.id).toBe("seven_day");
  });

  it("has no answer without windows", () => {
    expect(tightestWindow(undefined)).toBeUndefined();
    expect(tightestWindow(makeUsage({ windows: [] }))).toBeUndefined();
  });
});

describe("formatResetCountdown", () => {
  it("scales the unit to the distance", () => {
    expect(formatResetCountdown("2026-08-25T12:45:00.000Z", NOW_MS)).toBe("resets in 45m");
    expect(formatResetCountdown("2026-08-25T15:00:00.000Z", NOW_MS)).toBe("resets in 3h");
    expect(formatResetCountdown("2026-08-25T15:20:00.000Z", NOW_MS)).toBe("resets in 3h 20m");
    expect(formatResetCountdown("2026-08-28T12:00:00.000Z", NOW_MS)).toBe("resets in 3d");
    expect(formatResetCountdown("2026-08-28T18:00:00.000Z", NOW_MS)).toBe("resets in 3d 6h");
  });

  it("says nothing rather than counting backwards past a rollover", () => {
    expect(formatResetCountdown("2026-08-25T11:00:00.000Z", NOW_MS)).toBeUndefined();
    expect(formatResetCountdown("2026-08-25T12:00:00.000Z", NOW_MS)).toBeUndefined();
  });

  it("says nothing for a missing or unparseable reset time", () => {
    expect(formatResetCountdown(undefined, NOW_MS)).toBeUndefined();
    expect(formatResetCountdown("later", NOW_MS)).toBeUndefined();
  });
});

describe("usableSubscriptionUsage", () => {
  it("passes a fresh snapshot through", () => {
    const usage = makeUsage();
    expect(usableSubscriptionUsage(usage, NOW_MS)).toBe(usage);
  });

  it("drops a snapshot old enough to be misleading", () => {
    const stale = makeUsage({
      collectedAt: new Date(NOW_MS - SUBSCRIPTION_USAGE_STALE_AFTER_MS - 1).toISOString(),
    });
    expect(usableSubscriptionUsage(stale, NOW_MS)).toBeUndefined();
  });

  it("keeps a snapshot from a clock skewed into the future", () => {
    const skewed = makeUsage({ collectedAt: new Date(NOW_MS + 60_000).toISOString() });
    expect(usableSubscriptionUsage(skewed, NOW_MS)).toBe(skewed);
  });

  it("drops empty and malformed snapshots", () => {
    expect(usableSubscriptionUsage(undefined, NOW_MS)).toBeUndefined();
    expect(usableSubscriptionUsage(makeUsage({ windows: [] }), NOW_MS)).toBeUndefined();
    expect(usableSubscriptionUsage(makeUsage({ collectedAt: "nope" }), NOW_MS)).toBeUndefined();
  });
});
