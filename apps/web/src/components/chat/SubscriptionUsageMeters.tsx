import type { ServerProviderUsageLimits } from "@t3tools/contracts";
import { formatResetsIn } from "@t3tools/shared/usageLimits";

import { cn } from "~/lib/utils";
import {
  formatRemainingPercent,
  remainingPercent,
  usageBarColor,
} from "./SubscriptionUsage.logic";

/**
 * One row per subscription window: what it is, how much is left, and when it
 * rolls over. Shared by the composer's context bubble and the model picker so
 * the two never drift apart.
 *
 * `nowMs` is passed in rather than read here so the component stays pure and
 * the countdown does not re-render on its own — these numbers move on the
 * order of minutes, and a self-ticking meter in the composer is exactly the
 * kind of continuous repaint this app avoids.
 */
export function SubscriptionUsageMeters(props: {
  usage: ServerProviderUsageLimits;
  nowMs: number;
  className?: string;
}) {
  const { usage, nowMs } = props;

  return (
    <div className={cn("flex flex-col gap-2", props.className)}>
      {usage.windows.map((window) => {
        const remaining = remainingPercent(window);
        const countdown = formatResetsIn(window, nowMs);
        return (
          <div key={window.id} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3 text-[11px] leading-4">
              <span className="truncate text-secondary-label">{window.label}</span>
              <span className="shrink-0 font-medium tabular-nums text-secondary-label">
                {formatRemainingPercent(window)}
              </span>
            </div>
            <div
              className="h-1 w-full overflow-hidden rounded-full bg-muted/60"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(remaining)}
              aria-label={`${window.label} allowance remaining`}
            >
              <div
                className="h-full rounded-full transition-[width,background-color] duration-500 ease-out motion-reduce:transition-none"
                style={{
                  width: `${Math.max(0, Math.min(100, window.usedPercent))}%`,
                  backgroundColor: usageBarColor(window),
                }}
              />
            </div>
            {countdown ? (
              <div className="text-[10px] leading-3 text-muted-foreground/70">{countdown}</div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
