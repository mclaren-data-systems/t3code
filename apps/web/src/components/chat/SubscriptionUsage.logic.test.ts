import { describe, expect, it } from "vite-plus/test";
import type { ServerProviderUsageLimits, ServerProviderUsageWindow } from "@t3tools/contracts";

import {
  formatRemainingPercent,
  SUBSCRIPTION_USAGE_STALE_AFTER_MS,
  usableSubscriptionUsage,
} from "./SubscriptionUsage.logic";

const NOW_MS = Date.parse("2026-08-25T12:00:00.000Z");

function makeWindow(usedPercent: number): ServerProviderUsageWindow {
  return { id: "five_hour", kind: "session", label: "Session", usedPercent };
}

function makeLimits(overrides?: Partial<ServerProviderUsageLimits>): ServerProviderUsageLimits {
  return {
    windows: [makeWindow(40)],
    checkedAt: "2026-08-25T11:59:00.000Z",
    ...overrides,
  };
}

describe("formatRemainingPercent", () => {
  it("reports what is left, not what is spent", () => {
    expect(formatRemainingPercent(makeWindow(40))).toBe("60% left");
    expect(formatRemainingPercent(makeWindow(0))).toBe("100% left");
    expect(formatRemainingPercent(makeWindow(100))).toBe("0% left");
  });

  it("keeps a decimal only in the last percent, where it changes the decision", () => {
    expect(formatRemainingPercent(makeWindow(99.7))).toBe("0.3% left");
    expect(formatRemainingPercent(makeWindow(55.4))).toBe("45% left");
  });
});

describe("usableSubscriptionUsage", () => {
  it("passes a fresh snapshot through", () => {
    const limits = makeLimits();
    expect(usableSubscriptionUsage(limits, NOW_MS)).toBe(limits);
  });

  it("drops a snapshot old enough to be misleading", () => {
    const stale = makeLimits({
      checkedAt: new Date(NOW_MS - SUBSCRIPTION_USAGE_STALE_AFTER_MS - 1).toISOString(),
    });
    expect(usableSubscriptionUsage(stale, NOW_MS)).toBeUndefined();
  });

  it("keeps a snapshot from a clock skewed into the future", () => {
    const skewed = makeLimits({ checkedAt: new Date(NOW_MS + 60_000).toISOString() });
    expect(usableSubscriptionUsage(skewed, NOW_MS)).toBe(skewed);
  });

  it("stays quiet for accounts with nothing to report", () => {
    expect(
      usableSubscriptionUsage(
        makeLimits({ windows: [], unavailable: { reason: "unsupported" } }),
        NOW_MS,
      ),
    ).toBeUndefined();
    expect(
      usableSubscriptionUsage(makeLimits({ unavailable: { reason: "probeFailed" } }), NOW_MS),
    ).toBeUndefined();
  });

  it("drops empty and malformed snapshots", () => {
    expect(usableSubscriptionUsage(undefined, NOW_MS)).toBeUndefined();
    expect(usableSubscriptionUsage(makeLimits({ windows: [] }), NOW_MS)).toBeUndefined();
    expect(usableSubscriptionUsage(makeLimits({ checkedAt: "nope" }), NOW_MS)).toBeUndefined();
  });
});
