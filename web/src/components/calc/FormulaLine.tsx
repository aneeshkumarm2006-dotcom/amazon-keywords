import type { ReactNode } from "react";

import { TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

/**
 * A formula with this page's actual numbers substituted into it.
 *
 * The point is to make the tool teachable rather than magical: a VA who reads
 * `0.30 x 29.99 x 0.10 = $0.90` once can reproduce the bid maths in a client
 * call without the calculator. The substituted line is the one that matters,
 * so it gets the readable size; the symbolic line above it is the reference.
 */
export interface FormulaLineProps {
  label: string;
  /** Symbolic form, e.g. "Ad spend ÷ Ad revenue × 100". */
  formula: string;
  /** The same expression with the live inputs in it. */
  substituted: string;
  /** The answer. */
  result: string;
  tone?: Tone;
  /** One line of context under the formula. */
  note?: ReactNode;
}

export function FormulaLine({
  label,
  formula,
  substituted,
  result,
  tone = "brand",
  note,
}: FormulaLineProps) {
  return (
    <div className="min-w-0 rounded-lg border border-hairline bg-surface-2 px-3.5 py-3">
      <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
        {label}
      </p>
      <div className="scroll-well mt-1.5 overflow-x-auto">
        <p className="font-mono text-[0.75rem] whitespace-nowrap text-faint">{formula}</p>
        <p className="mt-1 font-mono text-[0.8125rem] whitespace-nowrap text-ink">
          {substituted}
          <span className="px-1.5 text-faint">=</span>
          <span className={cn("font-semibold", TONE_TEXT[tone])}>{result}</span>
        </p>
      </div>
      {note ? <p className="mt-2 text-xs leading-relaxed text-muted">{note}</p> : null}
    </div>
  );
}

/** A titled panel holding a stack of `FormulaLine`s. */
export function FormulaStack({
  title = "The maths, with your numbers in it",
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="min-w-0 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
      <h3 className="font-display text-[0.9375rem] font-semibold text-ink">{title}</h3>
      {description ? (
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
      ) : null}
      <div className="mt-3.5 grid gap-2.5 [&>*]:min-w-0">{children}</div>
    </section>
  );
}
