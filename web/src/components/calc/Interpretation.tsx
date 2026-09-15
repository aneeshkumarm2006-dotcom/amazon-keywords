import type { ReactNode } from "react";

import { Callout, type CalloutVariant } from "@/components/ui/Callout";
import type { Tone } from "@/types/content";

/**
 * "So what?" — the paragraph that turns a number into a decision.
 *
 * Every calculator ends in one of these. The tone tracks the verdict, the
 * body explains what the result means in account terms, and `next` is the
 * literal list of things to go and do in Campaign Manager.
 */
const TONE_VARIANT: Record<Tone, CalloutVariant> = {
  neutral: "info",
  brand: "info",
  info: "info",
  good: "success",
  ember: "warn",
  warn: "warn",
  bad: "danger",
};

export interface InterpretationProps {
  tone: Tone;
  title: string;
  children: ReactNode;
  /** Concrete next actions, rendered as an ordered list. */
  next?: string[];
}

export function Interpretation({ tone, title, children, next }: InterpretationProps) {
  return (
    <Callout variant={TONE_VARIANT[tone]} title={title}>
      <div className="text-[0.875rem] leading-relaxed">{children}</div>
      {next && next.length > 0 ? (
        <div>
          <p className="mt-3 mb-1.5 text-[0.6875rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Do this next
          </p>
          <ol className="grid gap-1.5 text-[0.875rem] leading-relaxed">
            {next.map((step, index) => (
              <li key={step} className="flex gap-2.5">
                <span className="tabular mt-px shrink-0 text-xs font-semibold text-muted">
                  {index + 1}.
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </Callout>
  );
}
