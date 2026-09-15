"use client";

import { Zap } from "lucide-react";

import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import { LEVEL_TIERS, type ProgressOverview } from "@/lib/progress";
import { cn, formatNumber } from "@/lib/utils";

export interface XpPanelProps {
  overview: ProgressOverview;
  className?: string;
}

/**
 * Where the XP came from, and what the tiers are.
 *
 * Levels only motivate if the rules are visible, so the breakdown is itemised
 * and the whole ladder is listed with its threshold rather than revealed one
 * tier at a time.
 */
export function XpPanel({ overview, className }: XpPanelProps) {
  const { xp, level } = overview;
  const max = Math.max(1, ...xp.lines.map((line) => line.xp));

  return (
    <section
      aria-labelledby="xp-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3
            id="xp-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            XP breakdown
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Everything that earns points, and how much of your total each one is.
          </p>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-brand-soft px-2 py-1 text-[0.6875rem] font-semibold text-brand">
          <Zap className="size-3.5" aria-hidden="true" />
          <span className="tabular">{formatNumber(xp.total)} XP</span>
        </span>
      </header>

      <ul className="divide-y divide-hairline">
        {xp.lines.map((line) => (
          <li key={line.label} className="flex flex-col gap-1.5 px-4 py-3 sm:px-5">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[0.8125rem] font-medium text-ink">{line.label}</span>
              <span className={cn("tabular shrink-0 text-xs font-semibold", TONE_TEXT[line.tone])}>
                {line.xp > 0 ? `+${formatNumber(line.xp)}` : "0"}
              </span>
            </div>
            <div className="h-1 w-full overflow-hidden rounded-full bg-surface-2">
              <div
                className={cn("h-full rounded-full", TONE_SOLID_BG[line.tone])}
                style={{ width: `${Math.round((line.xp / max) * 100)}%` }}
              />
            </div>
            <p className="text-[0.6875rem] text-faint">{line.detail}</p>
          </li>
        ))}
      </ul>

      <div className="border-t border-hairline px-4 py-3.5 sm:px-5">
        <p className="mb-2.5 text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
          The ladder
        </p>
        <ol className="space-y-1">
          {LEVEL_TIERS.map((tier) => {
            const reached = xp.total >= tier.threshold;
            const current = tier.index === level.tier.index;
            return (
              <li
                key={tier.index}
                className={cn(
                  "flex items-center gap-2.5 rounded-lg px-2 py-1.5",
                  current && "bg-surface-2",
                )}
              >
                <span
                  className={cn(
                    "tabular flex size-6 shrink-0 items-center justify-center rounded-md text-[0.6875rem] font-semibold",
                    reached ? cn(TONE_SOLID_BG[tier.tone], "text-canvas") : "bg-surface-2 text-faint",
                  )}
                  aria-hidden="true"
                >
                  {tier.index}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cn(
                      "block truncate text-[0.8125rem] font-medium",
                      reached ? "text-ink" : "text-faint",
                    )}
                  >
                    {tier.name}
                    {current ? <span className="ml-1.5 text-[0.6875rem] text-brand">you are here</span> : null}
                  </span>
                  {current ? (
                    <span className="block text-[0.6875rem] leading-relaxed text-muted">
                      {tier.blurb}
                    </span>
                  ) : null}
                </span>
                <span className="tabular shrink-0 text-[0.6875rem] text-faint">
                  {formatNumber(tier.threshold)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
