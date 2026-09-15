import { ArrowDownRight, ArrowRight, ArrowUpRight, MoveRight } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { TONE_SOFT_BG, TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { CaseStudyMetric, MetricDirection } from "@/types/content";

import { metricView, type MetricView } from "./data";

const DIRECTION_ICON: Record<MetricDirection, LucideIcon> = {
  up: ArrowUpRight,
  down: ArrowDownRight,
  flat: ArrowRight,
};

export interface MetricTileProps {
  view: MetricView;
  className?: string;
}

/**
 * One before/after tile.
 *
 * Colour is direction-aware rather than direction-literal: a metric whose
 * `better` is "lower" turns green when it falls, and the same fall on a
 * "higher" metric turns red. The arrow still shows the raw movement, so the
 * tile never hides which way the number actually went.
 */
export function MetricTile({ view, className }: MetricTileProps) {
  const DirectionIcon = DIRECTION_ICON[view.direction];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-2.5 overflow-hidden rounded-xl border border-hairline bg-surface p-4 pl-[1.125rem]",
        className,
      )}
    >
      {/* These tiles are rendered straight into MetricGrid's <dl>, and a
          grouping div there may contain nothing but <dt> and <dd>. So the
          accent bar and the delta chip sit inside the <dd> rather than beside
          it — the delta is part of the definition anyway. */}
      <dt className="text-[0.6875rem] leading-tight font-medium tracking-[0.08em] text-muted uppercase">
        {view.label}
      </dt>

      <dd className="flex flex-col gap-2.5">
        <span
          className={cn("absolute inset-y-0 left-0 w-[3px]", TONE_SOLID_BG[view.tone])}
          aria-hidden="true"
        />

        <span className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="tabular text-[0.9375rem] leading-none text-faint">
            {view.beforeText}
          </span>
          <MoveRight className="size-3.5 shrink-0 self-center text-faint" aria-hidden="true" />
          <span className={cn("tabular text-2xl leading-none font-semibold", TONE_TEXT[view.tone])}>
            {view.afterText}
          </span>
        </span>

        {view.deltaText ? (
          <p
            className={cn(
              "inline-flex w-fit items-center gap-1 rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold",
              TONE_SOFT_BG[view.tone],
              TONE_TEXT[view.tone],
            )}
          >
            <DirectionIcon className="size-3" aria-hidden="true" />
            <span className="tabular">{view.deltaText}</span>
            <span className="sr-only">
              {view.improved === null
                ? ""
                : view.improved
                  ? " — an improvement"
                  : " — worse than before"}
            </span>
          </p>
        ) : null}
      </dd>
    </div>
  );
}

export interface MetricGridProps {
  metrics: CaseStudyMetric[];
  className?: string;
  /** Screen-reader name for the list. */
  label?: string;
}

export function MetricGrid({ metrics, className, label }: MetricGridProps) {
  return (
    <dl
      className={cn("grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4", className)}
      aria-label={label}
    >
      {metrics.map((metric) => (
        <MetricTile key={metric.label} view={metricView(metric)} />
      ))}
    </dl>
  );
}

/**
 * The dense one-line version used on gallery cards and in compare rows:
 * "ACoS 93% → 35%" with the after value carrying the tone.
 */
export function MetricInline({
  view,
  showLabel = true,
  className,
}: {
  view: MetricView;
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex flex-wrap items-baseline gap-x-1.5", className)}>
      {showLabel ? (
        <span className="text-[0.6875rem] font-medium tracking-[0.06em] text-muted uppercase">
          {view.label}
        </span>
      ) : null}
      <span className="tabular text-[0.8125rem] text-faint">{view.beforeText}</span>
      <span className="text-faint" aria-hidden="true">
        →
      </span>
      <span className="sr-only">to</span>
      <span className={cn("tabular text-[0.9375rem] font-semibold", TONE_TEXT[view.tone])}>
        {view.afterText}
      </span>
    </span>
  );
}
