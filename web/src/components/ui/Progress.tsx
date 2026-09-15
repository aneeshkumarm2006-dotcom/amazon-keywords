import { cn, clamp, formatPercent } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { TONE_SOLID_BG, TONE_TEXT } from "./tone";

export interface ProgressProps {
  value: number;
  max?: number;
  /** Visible label above the bar. */
  label?: string;
  /** Right-aligned readout. Defaults to a percentage. */
  readout?: string;
  tone?: Tone;
  size?: "sm" | "md";
  /** Hide the label row entirely (bar still gets an accessible name). */
  hideLabel?: boolean;
  srLabel?: string;
  className?: string;
}

export function Progress({
  value,
  max = 100,
  label,
  readout,
  tone = "brand",
  size = "md",
  hideLabel,
  srLabel,
  className,
}: ProgressProps) {
  const safeMax = max > 0 ? max : 100;
  const bounded = clamp(value, 0, safeMax);
  const pct = (bounded / safeMax) * 100;
  const text = readout ?? formatPercent(pct, 0);

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && !hideLabel ? (
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-[0.8125rem] font-medium text-ink">{label}</span>
          <span className={cn("tabular text-xs font-semibold", TONE_TEXT[tone])}>{text}</span>
        </div>
      ) : null}
      <div
        role="progressbar"
        aria-valuenow={Math.round(bounded)}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={srLabel ?? label ?? "Progress"}
        aria-valuetext={text}
        className={cn(
          "w-full overflow-hidden rounded-full bg-surface-2",
          size === "sm" ? "h-1.5" : "h-2.5",
        )}
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", TONE_SOLID_BG[tone])}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export interface StepProgressProps {
  current: number;
  total: number;
  label?: string;
  tone?: Tone;
  className?: string;
}

/** Segmented progress — one notch per step. Used by quizzes and paths. */
export function StepProgress({
  current,
  total,
  label,
  tone = "brand",
  className,
}: StepProgressProps) {
  const done = clamp(current, 0, total);
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[0.8125rem] font-medium text-ink">{label ?? "Progress"}</span>
        <span className="tabular text-xs text-muted">
          {done} / {total}
        </span>
      </div>
      <div
        className="flex gap-1"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-label={label ?? "Progress"}
        aria-valuetext={`Step ${done} of ${total}`}
      >
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors duration-300",
              index < done ? TONE_SOLID_BG[tone] : "bg-surface-2",
            )}
          />
        ))}
      </div>
    </div>
  );
}
