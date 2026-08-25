import { describe, expect, it } from "@effect/vitest";

import {
  formatWindowDurationLabel,
  normalizeClaudeSubscriptionUsage,
  normalizeCodexSubscriptionUsage,
} from "./providerSubscriptionUsage.ts";

const COLLECTED_AT = "2026-08-25T12:00:00.000Z";

describe("formatWindowDurationLabel", () => {
  it("names the durations the two providers actually use", () => {
    expect(formatWindowDurationLabel(300)).toBe("5 hour");
    expect(formatWindowDurationLabel(10_080)).toBe("Weekly");
    expect(formatWindowDurationLabel(1_440)).toBe("Daily");
    expect(formatWindowDurationLabel(20_160)).toBe("2 week");
    expect(formatWindowDurationLabel(90)).toBe("90 min");
  });

  it("has no label for a nonsense duration", () => {
    expect(formatWindowDurationLabel(0)).toBeUndefined();
    expect(formatWindowDurationLabel(-5)).toBeUndefined();
    expect(formatWindowDurationLabel(Number.NaN)).toBeUndefined();
    expect(formatWindowDurationLabel(undefined)).toBeUndefined();
  });
});

describe("normalizeCodexSubscriptionUsage", () => {
  it("labels anonymous windows by their duration and converts epoch seconds", () => {
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: {
        planType: "pro",
        primary: { usedPercent: 42, resetsAt: 1_790_000_000, windowDurationMins: 300 },
        secondary: { usedPercent: 7, resetsAt: 1_790_500_000, windowDurationMins: 10_080 },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.planLabel).toBe("pro");
    expect(usage?.collectedAt).toBe(COLLECTED_AT);
    expect(usage?.windows).toEqual([
      { id: "primary", label: "5 hour", usedPercent: 42, resetsAt: "2026-09-21T14:13:20.000Z" },
      { id: "secondary", label: "Weekly", usedPercent: 7, resetsAt: "2026-09-27T09:06:40.000Z" },
    ]);
  });

  it("unwraps the `rateLimits` envelope the read response and notification both use", () => {
    // `V2GetAccountRateLimitsResponse` nests the windows one level down. Handing
    // the whole response over used to yield zero windows, so Codex usage never
    // appeared at all.
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: {
        rateLimits: {
          planType: "plus",
          primary: { usedPercent: 12, windowDurationMins: 300 },
          secondary: { usedPercent: 34, windowDurationMins: 10_080 },
        },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.planLabel).toBe("plus");
    expect(usage?.windows).toEqual([
      { id: "primary", label: "5 hour", usedPercent: 12 },
      { id: "secondary", label: "Weekly", usedPercent: 34 },
    ]);
  });

  it("falls back to positional labels when the duration is missing", () => {
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: { primary: { usedPercent: 10 } },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows).toEqual([{ id: "primary", label: "Primary", usedPercent: 10 }]);
  });

  it("treats Codex's own 'unknown' plan placeholder as no plan", () => {
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: { planType: "unknown", primary: { usedPercent: 10, windowDurationMins: 300 } },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.planLabel).toBeUndefined();
  });

  it("keeps the percentage when the reset time is unusable", () => {
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: {
        primary: { usedPercent: 55, resetsAt: "not-a-date", windowDurationMins: 300 },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows).toEqual([{ id: "primary", label: "5 hour", usedPercent: 55 }]);
  });

  it("clamps out-of-range percentages rather than rendering them", () => {
    const usage = normalizeCodexSubscriptionUsage({
      snapshot: {
        primary: { usedPercent: 140, windowDurationMins: 300 },
        secondary: { usedPercent: -3, windowDurationMins: 10_080 },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows.map((window) => window.usedPercent)).toEqual([100, 0]);
  });

  it("reports nothing when no window carries a usable percentage", () => {
    expect(
      normalizeCodexSubscriptionUsage({ snapshot: undefined, collectedAt: COLLECTED_AT }),
    ).toBeUndefined();
    expect(
      normalizeCodexSubscriptionUsage({ snapshot: {}, collectedAt: COLLECTED_AT }),
    ).toBeUndefined();
    expect(
      normalizeCodexSubscriptionUsage({
        snapshot: { primary: { usedPercent: "42" } },
        collectedAt: COLLECTED_AT,
      }),
    ).toBeUndefined();
  });
});

describe("normalizeClaudeSubscriptionUsage", () => {
  it("reads every fixed window plus the server-labelled per-model buckets", () => {
    const usage = normalizeClaudeSubscriptionUsage({
      response: {
        subscription_type: "max",
        rate_limits_available: true,
        rate_limits: {
          five_hour: { utilization: 31, resets_at: "2026-08-25T17:00:00.000Z" },
          seven_day: { utilization: 64, resets_at: "2026-08-29T00:00:00.000Z" },
          seven_day_opus: { utilization: 12, resets_at: null },
          model_scoped: [{ display_name: "Fable", utilization: 8, resets_at: null }],
        },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.planLabel).toBe("max");
    expect(usage?.windows).toEqual([
      { id: "five_hour", label: "5 hour", usedPercent: 31, resetsAt: "2026-08-25T17:00:00.000Z" },
      { id: "seven_day", label: "Weekly", usedPercent: 64, resetsAt: "2026-08-29T00:00:00.000Z" },
      { id: "seven_day_opus", label: "Weekly (Opus)", usedPercent: 12 },
      { id: "model_scoped:0:Fable", label: "Weekly (Fable)", usedPercent: 8 },
    ]);
  });

  it("omits third-party OAuth app usage, which is not the user's own spend", () => {
    const usage = normalizeClaudeSubscriptionUsage({
      response: {
        rate_limits: {
          five_hour: { utilization: 5 },
          seven_day_oauth_apps: { utilization: 99 },
        },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows.map((window) => window.id)).toEqual(["five_hour"]);
  });

  it("reports overage only while it is actually enabled", () => {
    const enabled = normalizeClaudeSubscriptionUsage({
      response: {
        rate_limits: {
          five_hour: { utilization: 5 },
          extra_usage: { is_enabled: true, utilization: 20 },
        },
      },
      collectedAt: COLLECTED_AT,
    });
    expect(enabled?.windows.at(-1)).toEqual({
      id: "extra_usage",
      label: "Extra usage",
      usedPercent: 20,
    });

    const disabled = normalizeClaudeSubscriptionUsage({
      response: {
        rate_limits: {
          five_hour: { utilization: 5 },
          extra_usage: { is_enabled: false, utilization: 20 },
        },
      },
      collectedAt: COLLECTED_AT,
    });
    expect(disabled?.windows.map((window) => window.id)).toEqual(["five_hour"]);
  });

  it("reports nothing for a session that has no plan limits", () => {
    expect(
      normalizeClaudeSubscriptionUsage({
        response: { rate_limits_available: false, rate_limits: null },
        collectedAt: COLLECTED_AT,
      }),
    ).toBeUndefined();
  });

  it("survives an SDK that predates the per-model buckets", () => {
    const usage = normalizeClaudeSubscriptionUsage({
      response: { rate_limits: { five_hour: { utilization: 3 } } },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows).toEqual([{ id: "five_hour", label: "5 hour", usedPercent: 3 }]);
  });

  it("skips per-model buckets that carry no usable label", () => {
    const usage = normalizeClaudeSubscriptionUsage({
      response: {
        rate_limits: {
          model_scoped: [
            { display_name: "   ", utilization: 8 },
            { utilization: 9 },
            { display_name: "Fable", utilization: 10 },
          ],
        },
      },
      collectedAt: COLLECTED_AT,
    });

    expect(usage?.windows).toEqual([
      { id: "model_scoped:2:Fable", label: "Weekly (Fable)", usedPercent: 10 },
    ]);
  });

  it("reports nothing when the response is not a usage payload at all", () => {
    expect(
      normalizeClaudeSubscriptionUsage({ response: undefined, collectedAt: COLLECTED_AT }),
    ).toBeUndefined();
    expect(
      normalizeClaudeSubscriptionUsage({ response: "nope", collectedAt: COLLECTED_AT }),
    ).toBeUndefined();
    expect(
      normalizeClaudeSubscriptionUsage({ response: {}, collectedAt: COLLECTED_AT }),
    ).toBeUndefined();
  });
});
