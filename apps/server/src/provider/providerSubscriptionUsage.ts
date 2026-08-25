/**
 * Normalizes each provider's native rate-limit snapshot into the shared
 * `ProviderSubscriptionUsage` contract.
 *
 * Providers describe the same idea in different shapes. Codex reports two
 * anonymous windows (`primary`/`secondary`) identified only by duration in
 * minutes; Claude reports named windows (`five_hour`, `seven_day`, per-model
 * weekly buckets) whose labels partly come from the server. Both express
 * consumption as "percent of the window used", so that is the one number the
 * contract carries and every client renders.
 *
 * Everything here is pure and defensive: these inputs cross a CLI boundary and
 * one is an explicitly experimental API, so each field is validated rather than
 * trusted, and a shape we do not recognise yields no window instead of a wrong
 * one.
 *
 * @module providerSubscriptionUsage
 */
import * as DateTime from "effect/DateTime";
import * as Option from "effect/Option";

import type {
  ProviderSubscriptionUsage,
  ProviderSubscriptionUsageWindow,
} from "@t3tools/contracts";

/**
 * Epoch values above this are already milliseconds. `1e11` seconds is the year
 * 5138; `1e11` milliseconds is 1973, so no real reset time is ambiguous.
 */
const SECONDS_EPOCH_CEILING = 1e11;

/** Percentages outside 0-100 are provider bugs; clamp rather than render them. */
function normalizePercent(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return undefined;
  }
  return Math.max(0, Math.min(100, value));
}

function normalizeLabel(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Codex reports `resetsAt` as epoch seconds, Claude as an ISO string. Both
 * arrive here as `unknown` and leave as ISO, or absent when unusable — a
 * malformed reset time must not sink the window's percentage.
 */
function normalizeResetsAt(value: unknown): string | undefined {
  if (typeof value === "string") {
    return Option.match(DateTime.make(value), {
      onNone: () => undefined,
      onSome: DateTime.formatIso,
    });
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    // Codex sends seconds. Anything already in milliseconds would land tens of
    // thousands of years out, so scale by magnitude rather than trusting each
    // provider to keep its unit stable.
    const millis = value > SECONDS_EPOCH_CEILING ? value : value * 1000;
    return Option.match(DateTime.make(millis), {
      onNone: () => undefined,
      onSome: DateTime.formatIso,
    });
  }
  return undefined;
}

/**
 * Turns a window duration into the label a user recognises. Codex only tells us
 * the length, so "5 hour" and "Weekly" are derived rather than reported.
 */
export function formatWindowDurationLabel(minutes: number | undefined): string | undefined {
  if (minutes === undefined || !Number.isFinite(minutes) || minutes <= 0) {
    return undefined;
  }
  if (minutes % (60 * 24 * 7) === 0) {
    const weeks = minutes / (60 * 24 * 7);
    return weeks === 1 ? "Weekly" : `${weeks} week`;
  }
  if (minutes % (60 * 24) === 0) {
    const days = minutes / (60 * 24);
    return days === 1 ? "Daily" : `${days} day`;
  }
  if (minutes % 60 === 0) {
    return `${minutes / 60} hour`;
  }
  return `${minutes} min`;
}

function makeWindow(input: {
  readonly id: string;
  readonly label: string;
  readonly usedPercent: number | undefined;
  readonly resetsAt: unknown;
}): ProviderSubscriptionUsageWindow | undefined {
  if (input.usedPercent === undefined) {
    return undefined;
  }
  const resetsAt = normalizeResetsAt(input.resetsAt);
  return {
    id: input.id,
    label: input.label,
    usedPercent: input.usedPercent,
    ...(resetsAt ? { resetsAt } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

/**
 * Codex `account/rateLimits/read` (and the identically-shaped
 * `account/rateLimits/updated` notification) into the shared contract.
 *
 * Both carry the windows one level down, under `rateLimits`, so the whole
 * response can be handed here directly; a bare snapshot is still accepted so a
 * caller that has already unwrapped is not forced to re-wrap.
 *
 * `planType` is surfaced as the plan label; `credits` is deliberately dropped
 * here because a credit balance is not a window and has no percentage to draw.
 */
export function normalizeCodexSubscriptionUsage(input: {
  readonly snapshot: unknown;
  readonly collectedAt: string;
}): ProviderSubscriptionUsage | undefined {
  const payload = asRecord(input.snapshot);
  if (!payload) {
    return undefined;
  }
  const snapshot = asRecord(payload.rateLimits) ?? payload;

  const windows: Array<ProviderSubscriptionUsageWindow> = [];
  for (const [key, fallbackLabel] of [
    ["primary", "Primary"],
    ["secondary", "Secondary"],
  ] as const) {
    const raw = asRecord(snapshot[key]);
    if (!raw) {
      continue;
    }
    const durationMinutes =
      typeof raw.windowDurationMins === "number" ? raw.windowDurationMins : undefined;
    const window = makeWindow({
      id: key,
      label: formatWindowDurationLabel(durationMinutes) ?? fallbackLabel,
      usedPercent: normalizePercent(raw.usedPercent),
      resetsAt: raw.resetsAt,
    });
    if (window) {
      windows.push(window);
    }
  }

  if (windows.length === 0) {
    return undefined;
  }

  // "unknown" is Codex's own placeholder, not a plan worth showing.
  const planType = normalizeLabel(snapshot.planType);
  const planLabel = planType && planType !== "unknown" ? planType : undefined;

  return {
    ...(planLabel ? { planLabel } : {}),
    windows,
    collectedAt: input.collectedAt,
  };
}

/**
 * Fixed Claude windows, in the order they should read. `seven_day_oauth_apps`
 * is omitted: it measures third-party OAuth app usage, which is not what a user
 * driving Claude through T3 Code is spending.
 */
const CLAUDE_WINDOW_LABELS: ReadonlyArray<readonly [string, string]> = [
  ["five_hour", "5 hour"],
  ["seven_day", "Weekly"],
  ["seven_day_opus", "Weekly (Opus)"],
  ["seven_day_sonnet", "Weekly (Sonnet)"],
];

/**
 * Claude's experimental structured `/usage` response into the shared contract.
 *
 * `model_scoped` is additive on the Anthropic side — it carries per-model weekly
 * buckets with server-supplied labels (Fable, for instance) and is simply absent
 * on SDK versions that predate it, which is why it is read positionally rather
 * than by a known key set.
 */
export function normalizeClaudeSubscriptionUsage(input: {
  readonly response: unknown;
  readonly collectedAt: string;
}): ProviderSubscriptionUsage | undefined {
  const response = asRecord(input.response);
  if (!response) {
    return undefined;
  }
  // `rate_limits_available` is false for API-key, Bedrock and Vertex sessions.
  // Those have no subscription to report and must show nothing at all.
  if (response.rate_limits_available === false) {
    return undefined;
  }
  const rateLimits = asRecord(response.rate_limits);
  if (!rateLimits) {
    return undefined;
  }

  const windows: Array<ProviderSubscriptionUsageWindow> = [];
  for (const [key, label] of CLAUDE_WINDOW_LABELS) {
    const raw = asRecord(rateLimits[key]);
    if (!raw) {
      continue;
    }
    const window = makeWindow({
      id: key,
      label,
      usedPercent: normalizePercent(raw.utilization),
      resetsAt: raw.resets_at,
    });
    if (window) {
      windows.push(window);
    }
  }

  const modelScoped = rateLimits.model_scoped;
  if (Array.isArray(modelScoped)) {
    for (const [index, entry] of modelScoped.entries()) {
      const raw = asRecord(entry);
      if (!raw) {
        continue;
      }
      const displayName = normalizeLabel(raw.display_name);
      if (!displayName) {
        continue;
      }
      const window = makeWindow({
        // Labels are server-supplied and could collide; the index keeps the id
        // unique without inventing a name the provider did not give us.
        id: `model_scoped:${index}:${displayName}`,
        label: `Weekly (${displayName})`,
        usedPercent: normalizePercent(raw.utilization),
        resetsAt: raw.resets_at,
      });
      if (window) {
        windows.push(window);
      }
    }
  }

  // Overage spend is a real limit users hit, and the only one expressed as a
  // budget rather than a window. It is reported only while actually enabled.
  const extraUsage = asRecord(rateLimits.extra_usage);
  if (extraUsage?.is_enabled === true) {
    const window = makeWindow({
      id: "extra_usage",
      label: "Extra usage",
      usedPercent: normalizePercent(extraUsage.utilization),
      resetsAt: undefined,
    });
    if (window) {
      windows.push(window);
    }
  }

  if (windows.length === 0) {
    return undefined;
  }

  const planLabel = normalizeLabel(response.subscription_type);

  return {
    ...(planLabel ? { planLabel } : {}),
    windows,
    collectedAt: input.collectedAt,
  };
}
