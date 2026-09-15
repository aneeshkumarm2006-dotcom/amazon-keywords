"use client";

import { ArrowRight, ShieldCheck, TriangleAlert } from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import { QUIZ_PASS_MARK, type WeakArea } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

function scoreTone(score: number): Tone {
  if (score >= 60) return "warn";
  if (score >= 35) return "ember";
  return "bad";
}

export interface WeakAreasPanelProps {
  areas: WeakArea[];
  /** True when the learner has answered nothing yet. */
  untested: boolean;
  className?: string;
}

/**
 * What to fix next, ranked worst first, each with a link that goes straight
 * to the thing that fixes it rather than to a hub page.
 *
 * Two different sources feed this: lifetime quiz accuracy per topic, and the
 * per-category self-scores from your most recent mock interview. Both are
 * shown with their sample size, because a 40% on two answers and a 40% on
 * twenty answers deserve different reactions.
 */
export function WeakAreasPanel({ areas, untested, className }: WeakAreasPanelProps) {
  return (
    <section
      aria-labelledby="weak-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
        <h3
          id="weak-heading"
          className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
        >
          Fix these next
        </h3>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Quiz topics and interview categories scoring under the pass mark, weakest first.
        </p>
      </header>

      {areas.length === 0 ? (
        <EmptyState
          bare
          icon={untested ? TriangleAlert : ShieldCheck}
          title={untested ? "Nothing measured yet" : "Nothing under the pass mark"}
          description={
            untested
              ? `Answer a quiz or sit a mock interview and anything scoring under ${QUIZ_PASS_MARK}% lands here with a link straight back to the material that fixes it.`
              : `Every topic you have answered is at or above ${QUIZ_PASS_MARK}%, and your last mock had no category below the pass mark. Widen the coverage rather than re-drilling what already works.`
          }
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {areas.map((area) => {
            const tone = scoreTone(area.score);
            return (
              <li key={area.id}>
                <Link
                  href={area.href}
                  className="group flex items-start gap-3 px-4 py-3.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
                >
                  <span
                    className={cn(
                      "tabular mt-0.5 flex size-11 shrink-0 flex-col items-center justify-center rounded-lg text-sm font-semibold",
                      TONE_SOFT_BG[tone],
                      TONE_TEXT[tone],
                    )}
                    aria-hidden="true"
                  >
                    {area.score}%
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                        {area.label}
                      </span>
                      <span className="text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
                        {area.source}
                      </span>
                    </span>
                    <span className="mt-1 block text-[0.8125rem] leading-relaxed text-muted">
                      {area.why}
                    </span>
                    <span className="mt-1.5 inline-flex items-center gap-1 text-[0.8125rem] font-medium text-brand">
                      {area.action}
                      <ArrowRight
                        className="size-3.5 transition-transform group-hover:translate-x-0.5"
                        aria-hidden="true"
                      />
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
