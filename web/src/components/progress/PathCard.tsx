"use client";

import { ArrowRight, BadgeCheck, Clock, Layers, ListChecks } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import type { LearningPathDoc } from "@/content/paths";
import { cn, formatMinutes, humanize } from "@/lib/utils";

import { usePathProgress } from "./useProgress";

export interface PathCardProps {
  path: LearningPathDoc;
  className?: string;
}

/**
 * One path on the index. The whole card is a link; the progress bar and the
 * next-step line come from localStorage after hydration, so a first-time
 * visitor sees a complete, honest card with a zeroed bar rather than a
 * skeleton.
 */
export function PathCard({ path, className }: PathCardProps) {
  const progress = usePathProgress(path);

  return (
    <Link
      href={path.href}
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-hairline bg-surface pt-6",
        "transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        className,
      )}
    >
      <span
        className={cn(
          "absolute inset-x-0 top-0 h-[3px] opacity-80 transition-opacity group-hover:opacity-100",
          TONE_SOLID_BG[path.tone],
        )}
        aria-hidden="true"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-3 px-5 pb-5">
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone={path.tone} size="sm">
            {humanize(path.level)}
          </Badge>
          <span className="text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
            {path.cadence}
          </span>
          {progress.complete ? (
            <Badge tone="good" size="sm" icon={BadgeCheck}>
              Complete
            </Badge>
          ) : null}
        </div>

        <h3 className="font-display text-lg leading-snug font-semibold text-ink group-hover:text-brand">
          {path.title}
        </h3>

        <p className="text-[0.875rem] leading-relaxed text-muted">{path.summary}</p>

        <dl className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.75rem] text-faint">
          <div className="flex items-center gap-1.5">
            <Layers className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Modules</dt>
            <dd className="tabular">{path.modules.length} modules</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <ListChecks className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Steps</dt>
            <dd className="tabular">{path.stepCount} steps</dd>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="size-3.5" aria-hidden="true" />
            <dt className="sr-only">Estimated time</dt>
            <dd className="tabular">{formatMinutes(path.minutes)}</dd>
          </div>
        </dl>

        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex items-baseline justify-between gap-3">
            <span className="tabular text-[0.75rem] text-muted">
              {progress.done} of {progress.total} steps
            </span>
            <span className={cn("tabular text-xs font-semibold", TONE_TEXT[path.tone])}>
              {progress.percent}%
            </span>
          </div>
          <div
            className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
            role="progressbar"
            aria-valuenow={progress.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${path.title} progress`}
            aria-valuetext={`${progress.done} of ${progress.total} steps complete`}
          >
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-500",
                TONE_SOLID_BG[progress.complete ? "good" : path.tone],
              )}
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-hairline px-5 py-3.5">
        <span className="min-w-0 truncate text-[0.8125rem] text-muted">
          {progress.complete
            ? "Finished — open your certificate"
            : progress.nextStep
              ? `Next: ${progress.nextStep.step.title}`
              : "Ready when you are"}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1 text-[0.8125rem] font-medium text-brand">
          {progress.started ? "Continue" : "Start"}
          <ArrowRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
      </div>
    </Link>
  );
}
