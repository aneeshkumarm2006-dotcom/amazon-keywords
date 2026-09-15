"use client";

import { Check } from "lucide-react";
import { useId, useState } from "react";

import { Progress } from "@/components/ui/Progress";
import { cn } from "@/lib/utils";

export interface KeyPointsChecklistProps {
  points: string[];
  /** Indexes already ticked. Omit to let the component own the state. */
  checked?: number[];
  /** Provide with `checked` to run it as a controlled list. */
  onToggle?: (index: number) => void;
  /** Heading above the list. */
  title?: string;
  hint?: string;
  /** Shows a progress bar and an x-of-y readout under the list. */
  showProgress?: boolean;
  className?: string;
}

/**
 * The key points an interviewer listens for, as a self-scoring checklist.
 *
 * Runs controlled inside the mock assessment step, where the ticks are part of
 * the attempt record, and uncontrolled on the deep-dive page, where they are
 * just a way to check your own answer against the model one.
 */
export function KeyPointsChecklist({
  points,
  checked,
  onToggle,
  title = "Tick everything your answer covered",
  hint,
  showProgress = true,
  className,
}: KeyPointsChecklistProps) {
  const baseId = useId();
  const [own, setOwn] = useState<number[]>([]);
  const controlled = Array.isArray(checked) && typeof onToggle === "function";
  const active = controlled ? (checked as number[]) : own;

  const toggle = (index: number) => {
    if (controlled) {
      onToggle?.(index);
      return;
    }
    setOwn((previous) =>
      previous.includes(index)
        ? previous.filter((entry) => entry !== index)
        : [...previous, index],
    );
  };

  const done = active.length;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div>
        <h3 className="font-display text-[0.9375rem] font-semibold text-ink">{title}</h3>
        {hint ? <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{hint}</p> : null}
      </div>

      <ul className="flex flex-col gap-1.5">
        {points.map((point, index) => {
          const on = active.includes(index);
          const id = `${baseId}-point-${index}`;
          return (
            <li key={point}>
              <button
                id={id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggle(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  on
                    ? "border-good/30 bg-good-soft"
                    : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-2",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border transition-colors",
                    on ? "border-good bg-good text-on-good" : "border-hairline-strong bg-surface",
                  )}
                >
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
                <span
                  className={cn(
                    "text-[0.875rem] leading-relaxed",
                    on ? "text-ink" : "text-muted",
                  )}
                >
                  {point}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {showProgress ? (
        <Progress
          value={done}
          max={points.length}
          label="Points covered"
          readout={`${done} / ${points.length}`}
          tone={done === points.length ? "good" : done > 0 ? "brand" : "neutral"}
          size="sm"
        />
      ) : null}
    </div>
  );
}
