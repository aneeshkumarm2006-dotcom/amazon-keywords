"use client";

import { useCallback, type ChangeEvent } from "react";

import { cn } from "@/lib/utils";

/**
 * A what-if control.
 *
 * Sliders are for the inputs a person wants to *sweep* — "what happens if I
 * push spend up 40%" — as opposed to the inputs they know exactly, which stay
 * as typed fields. The live readout sits in the label so the value is legible
 * without dragging, and the datalist marks give the thumb something to aim at.
 */
export interface ScenarioSliderProps {
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step?: number;
  /** Formats the live readout and the tick labels. */
  format: (value: number) => string;
  hint?: string;
  /** Values to mark on the track. */
  marks?: number[];
  className?: string;
}

export function ScenarioSlider({
  id,
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  format,
  hint,
  marks,
  className,
}: ScenarioSliderProps) {
  const handle = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      onChange(Number(event.target.value));
    },
    [onChange],
  );

  const listId = marks && marks.length > 0 ? `${id}-marks` : undefined;

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-[0.8125rem] font-medium text-ink">
          {label}
        </label>
        <output
          htmlFor={id}
          className="tabular text-[0.8125rem] font-semibold text-brand"
        >
          {format(value)}
        </output>
      </div>

      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handle}
        list={listId}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-11 w-full cursor-pointer accent-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
      />

      {listId ? (
        <datalist id={listId}>
          {marks?.map((mark) => (
            <option key={mark} value={mark} label={format(mark)} />
          ))}
        </datalist>
      ) : null}

      <div className="flex items-center justify-between">
        <span className="tabular text-[0.6875rem] text-faint">{format(min)}</span>
        {hint ? (
          <span id={`${id}-hint`} className="px-2 text-center text-[0.6875rem] text-faint">
            {hint}
          </span>
        ) : null}
        <span className="tabular text-[0.6875rem] text-faint">{format(max)}</span>
      </div>
    </div>
  );
}
