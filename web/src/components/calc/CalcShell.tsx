"use client";

import { RotateCcw, SlidersHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { cn } from "@/lib/utils";

/**
 * The two-column frame shared by every calculator.
 *
 * Inputs on the left, sticky from `lg` up so the controls stay reachable
 * while long result sections scroll; on a phone the whole thing stacks and
 * the inputs come first, which is the order a person fills them in anyway.
 *
 * The shell also owns the two controls every tool must have: a reset back to
 * the shipped defaults, and a copy button that puts a plain-text version of
 * the whole result set on the clipboard — the form a VA pastes into Slack or
 * a client email.
 */
export interface CalcShellProps {
  inputs: ReactNode;
  inputsTitle?: string;
  /** Short line under the inputs heading. */
  inputsNote?: string;
  onReset: () => void;
  /** Plain text placed on the clipboard by the copy button. */
  copyText: string;
  /** Extra toolbar controls, e.g. a CSV export button. */
  actions?: ReactNode;
  children: ReactNode;
}

export function CalcShell({
  inputs,
  inputsTitle = "Inputs",
  inputsNote = "Saved in this browser — your numbers are still here when you come back.",
  onReset,
  copyText,
  actions,
  children,
}: CalcShellProps) {
  return (
    <div className="grid gap-5 lg:grid-cols-[19rem_minmax(0,1fr)] xl:grid-cols-[21rem_minmax(0,1fr)] xl:gap-6 [&>*]:min-w-0">
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <section className="rounded-2xl border border-hairline bg-surface">
          <header className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <SlidersHorizontal className="size-4 text-brand" aria-hidden="true" />
              {inputsTitle}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              icon={RotateCcw}
              onClick={onReset}
              aria-label="Reset all inputs to their default values"
            >
              Reset
            </Button>
          </header>
          <div className="grid gap-4 p-4">{inputs}</div>
          {inputsNote ? (
            <p className="border-t border-hairline px-4 py-2.5 text-[0.6875rem] leading-relaxed text-faint">
              {inputsNote}
            </p>
          ) : null}
        </section>
      </div>

      <div className="grid min-w-0 gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-display text-[0.9375rem] font-semibold text-ink">Results</h2>
          <div className="flex flex-wrap items-center gap-2">
            {actions}
            <CopyButton value={copyText} label="Copy results" />
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

/** A titled block inside the results column. */
export function CalcPanel({
  title,
  description,
  actions,
  className,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("min-w-0 rounded-xl border border-hairline bg-surface", className)}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
            {title}
          </h3>
          {description ? (
            <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex min-w-0 flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </header>
      <div className="p-4 sm:p-5">{children}</div>
    </section>
  );
}

/** Builds the plain-text report the copy button hands over. */
export function buildReport(
  title: string,
  sections: { heading: string; lines: [string, string][] }[],
): string {
  const parts = [title, "=".repeat(Math.min(title.length, 60))];
  for (const section of sections) {
    parts.push("", section.heading.toUpperCase());
    const width = Math.max(...section.lines.map(([label]) => label.length));
    for (const [label, value] of section.lines) {
      parts.push(`  ${label.padEnd(width)}  ${value}`);
    }
  }
  parts.push("", "Calculated with PPC Academy — /calculators");
  return parts.join("\n");
}
