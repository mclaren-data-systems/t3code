/**
 * Presentation rules for provider subscription usage.
 *
 * The wire carries "percent of the window used" because that is what both
 * providers report. Users ask the opposite question — how much is left — so
 * every number rendered here is remaining, and the word "left" is always
 * attached to it. The bar still fills with consumption, matching the context
 * window meter directly above it in the composer.
 *
 * @module SubscriptionUsage.logic
 */
import type {
  ProviderSubscriptionUsage,
  ProviderSubscriptionUsageWindow,
} from "@t3tools/contracts";

/** A snapshot older than this is not worth showing as a live number. */
export const SUBSCRIPTION_USAGE_STALE_AFTER_MS = 60 * 60 * 1000;

export function remainingPercent(window: ProviderSubscriptionUsageWindow): number {
  return Math.max(0, Math.min(100, 100 - window.usedPercent));
}

/** Whole numbers except near exhaustion, where the last percent is the useful one. */
export function formatRemainingPercent(window: ProviderSubscriptionUsageWindow): string {
  const remaining = remainingPercent(window);
  if (remaining > 0 && remaining < 1) {
    return `${remaining.toFixed(1).replace(/\.0$/, "")}% left`;
  }
  return `${Math.round(remaining)}% left`;
}

/**
 * The window a user is most likely to hit next — the most consumed one. This is
 * what the picker trigger summarises when there is only room for one number.
 */
export function tightestWindow(
  usage: ProviderSubscriptionUsage | undefined,
): ProviderSubscriptionUsageWindow | undefined {
  if (!usage || usage.windows.length === 0) {
    return undefined;
  }
  return usage.windows.reduce((tightest, window) =>
    window.usedPercent > tightest.usedPercent ? window : tightest,
  );
}

/**
 * Formats the reset time as a short countdown. Returns undefined once the
 * window has rolled over, because a negative countdown is worse than silence —
 * the next probe will carry the fresh window.
 */
export function formatResetCountdown(
  resetsAt: string | undefined,
  nowMs: number,
): string | undefined {
  if (!resetsAt) {
    return undefined;
  }
  const resetMs = Date.parse(resetsAt);
  if (Number.isNaN(resetMs)) {
    return undefined;
  }
  const remainingMs = resetMs - nowMs;
  if (remainingMs <= 0) {
    return undefined;
  }

  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) {
    return `resets in ${totalMinutes}m`;
  }
  const totalHours = Math.floor(totalMinutes / 60);
  if (totalHours < 24) {
    const minutes = totalMinutes % 60;
    return minutes === 0 ? `resets in ${totalHours}h` : `resets in ${totalHours}h ${minutes}m`;
  }
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  return hours === 0 ? `resets in ${days}d` : `resets in ${days}d ${hours}h`;
}

/**
 * Usage worth rendering, or undefined.
 *
 * A snapshot is dropped once it ages out: the server only refreshes it when a
 * provider status refresh runs, so a tab left open overnight would otherwise
 * keep showing yesterday's allowance as though it were current.
 */
export function usableSubscriptionUsage(
  usage: ProviderSubscriptionUsage | undefined,
  nowMs: number,
): ProviderSubscriptionUsage | undefined {
  if (!usage || usage.windows.length === 0) {
    return undefined;
  }
  const collectedMs = Date.parse(usage.collectedAt);
  if (Number.isNaN(collectedMs)) {
    return undefined;
  }
  // A clock skewed into the future still describes a snapshot we just took.
  if (nowMs - collectedMs > SUBSCRIPTION_USAGE_STALE_AFTER_MS) {
    return undefined;
  }
  return usage;
}

/**
 * Bar colour thresholds, matching the context window meter's convention so the
 * two meters in the same popover read the same way.
 */
export function usageBarColor(window: ProviderSubscriptionUsageWindow): string {
  if (window.usedPercent >= 90) {
    return "var(--color-error)";
  }
  if (window.usedPercent >= 75) {
    return "var(--color-warning)";
  }
  return "color-mix(in oklab, var(--color-muted-foreground) 72%, transparent)";
}
