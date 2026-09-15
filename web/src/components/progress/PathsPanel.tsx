"use client";

import { ArrowRight, BadgeCheck, Route } from "lucide-react";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import type { PathProgress } from "@/lib/progress";
import { cn, formatMinutes } from "@/lib/utils";

export interface PathsPanelProps {
  paths: PathProgress[];
  className?: string;
}

/**
 * Learning paths on the dashboard.
 *
 * Started paths come first with their next step; unstarted ones are listed
 * underneath as suggestions rather than hidden, because "nothing in progress"
 * is a state that should still offer the obvious next move.
 */
export function PathsPanel({ paths, className }: PathsPanelProps) {
  const active = paths.filter((entry) => entry.started && !entry.complete);
  const finished = paths.filter((entry) => entry.complete);
  const untouched = paths.filter((entry) => !entry.started);
  const ordered = [...active, ...finished, ...untouched];

  return (
    <section
      aria-labelledby="paths-panel-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3
            id="paths-panel-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Learning paths
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            {active.length > 0
              ? "In progress first, with the step you stopped at."
              : "Four sequenced routes through the library. Pick the one that matches your next milestone."}
          </p>
        </div>
        <Link
          href="/paths"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-1 text-[0.8125rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          All paths
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Link>
      </header>

      {ordered.length === 0 ? (
        <EmptyState
          bare
          icon={Route}
          title="No paths available"
          description="Learning paths sequence the library into a reading order. They will appear here as soon as one is published."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {ordered.map((entry) => (
            <li key={entry.path.id}>
              <Link
                href={entry.path.href}
                className="group flex flex-col gap-2 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate font-display text-[0.9375rem] font-semibold text-ink group-hover:text-brand">
                    {entry.path.title}
                  </span>
                  <span
                    className={cn(
                      "tabular shrink-0 text-xs font-semibold",
                      entry.complete ? TONE_TEXT.good : TONE_TEXT[entry.path.tone],
                    )}
                  >
                    {entry.percent}%
                  </span>
                </div>

                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div
                    className={cn(
                      "h-full rounded-full transition-[width] duration-500",
                      TONE_SOLID_BG[entry.complete ? "good" : entry.path.tone],
                    )}
                    style={{ width: `${entry.percent}%` }}
                  />
                </div>

                <p className="flex flex-wrap items-center gap-x-2 text-[0.75rem] text-faint">
                  <span className="tabular">
                    {entry.done}/{entry.total} steps
                  </span>
                  {entry.complete ? (
                    <span className="inline-flex items-center gap-1 text-good">
                      <BadgeCheck className="size-3.5" aria-hidden="true" />
                      Complete
                    </span>
                  ) : (
                    <>
                      <span className="tabular">· {formatMinutes(entry.minutesLeft)} left</span>
                      {entry.nextStep ? (
                        <span className="min-w-0 basis-full truncate text-muted">
                          Next: {entry.nextStep.step.title}
                        </span>
                      ) : null}
                    </>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {active.length === 0 && untouched.length > 0 ? (
        <div className="border-t border-hairline px-4 py-3.5 sm:px-5">
          <ButtonLink href={untouched[0].path.href} size="sm" iconAfter={ArrowRight}>
            Start {untouched[0].path.shortTitle}
          </ButtonLink>
        </div>
      ) : null}
    </section>
  );
}
