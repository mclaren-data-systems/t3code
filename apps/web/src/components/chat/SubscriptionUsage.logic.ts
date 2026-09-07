/**
 * Presentation rules for provider subscription usage in the composer.
 *
 * The wire carries "percent of the window used" because that is what both
 * providers report. Users ask the opposite question — how much is left — so
 * every number rendered here is remaining, and the word "left" is always
 * attached to it. The bar still fills with consumption, matching the context
 * window meter directly above it in the composer.
 *
 * @module SubscriptionUsage.logic
 */
import type { ServerProviderUsageLimits, ServerProviderUsageWindow } from "@t3tools/contracts";

/** A snapshot older than this is not worth showing as a live number. */
export const SUBSCRIPTION_USAGE_STALE_AFTER_MS = 60 * 60 * 1000;

export function remainingPercent(window: ServerProviderUsageWindow): number {
  return Math.max(0, Math.min(100, 100 - window.usedPercent));
}

/** Whole numbers except near exhaustion, where the last percent is the useful one. */
export function formatRemainingPercent(window: ServerProviderUsageWindow): string {
  const remaining = remainingPercent(window);
  if (remaining > 0 && remaining < 1) {
    return `${remaining.toFixed(1).replace(/\.0$/, "")}% left`;
  }
  return `${Math.round(remaining)}% left`;
}

/**
 * Usage worth rendering, or undefined.
 *
 * An `unavailable` snapshot (API-key account, failed probe) has nothing to draw
 * here — the Limits view explains those; the composer just stays quiet. A
 * snapshot is also dropped once it ages out: the server refreshes it on the
 * provider status cadence and mid-turn, so a tab left open overnight would
 * otherwise keep showing yesterday's allowance as though it were current.
 */
export function usableSubscriptionUsage(
  limits: ServerProviderUsageLimits | undefined,
  nowMs: number,
): ServerProviderUsageLimits | undefined {
  if (!limits || limits.unavailable || limits.windows.length === 0) {
    return undefined;
  }
  const checkedMs = Date.parse(limits.checkedAt);
  if (Number.isNaN(checkedMs)) {
    return undefined;
  }
  // A clock skewed into the future still describes a snapshot we just took.
  if (nowMs - checkedMs > SUBSCRIPTION_USAGE_STALE_AFTER_MS) {
    return undefined;
  }
  return limits;
}

/**
 * Bar colour thresholds, matching the context window meter's convention so the
 * two meters in the same popover read the same way.
 */
export function usageBarColor(window: ServerProviderUsageWindow): string {
  if (window.usedPercent >= 90) {
    return "var(--color-error)";
  }
  if (window.usedPercent >= 75) {
    return "var(--color-warning)";
  }
  return "color-mix(in oklab, var(--color-muted-foreground) 72%, transparent)";
}
