import { ArrowRight, Check, TriangleAlert } from "lucide-react";

import { Markdown } from "@/components/doc/Markdown";
import { Callout } from "@/components/ui/Callout";
import type { InterviewEntry } from "@/content/interviews";
import { cn } from "@/lib/utils";

export interface AnswerBodyProps {
  entry: InterviewEntry;
  /** Replaces the static key-point list, e.g. with an interactive checklist. */
  keyPointsSlot?: React.ReactNode;
  /** Drops the follow-ups block on dense surfaces. */
  hideFollowUps?: boolean;
  /** Heading level used for the internal section titles. */
  headingClassName?: string;
  className?: string;
}

/**
 * The full model answer: markdown guidance, the points an interviewer listens
 * for, the red flags that lose the job, and the follow-ups a good interviewer
 * asks next.
 *
 * Server-rendered on the deep-dive page and reused inside the bank browser,
 * the flashcard reveal and the mock assessment step.
 */
export function AnswerBody({
  entry,
  keyPointsSlot,
  hideFollowUps,
  headingClassName,
  className,
}: AnswerBodyProps) {
  const heading = cn(
    "font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase",
    headingClassName,
  );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <section>
        <h2 className={heading}>Ideal answer</h2>
        <Markdown className="mt-3 text-[0.9375rem]">{entry.idealAnswer}</Markdown>
      </section>

      {keyPointsSlot ?? (
        <section>
          <h2 className={heading}>What the interviewer listens for</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {entry.keyPoints.map((point) => (
              <li
                key={point}
                className="flex items-start gap-2.5 rounded-lg border border-hairline bg-surface p-3"
              >
                <Check
                  className="mt-0.5 size-4 shrink-0 text-good"
                  strokeWidth={2.5}
                  aria-hidden="true"
                />
                <span className="text-[0.875rem] leading-relaxed text-ink">{point}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {entry.redFlags && entry.redFlags.length > 0 ? (
        <section>
          <h2 className={heading}>Red flags</h2>
          <Callout
            variant="danger"
            icon={TriangleAlert}
            title="Answers that lose the job"
            className="mt-3"
          >
            <ul className="flex flex-col gap-1.5">
              {entry.redFlags.map((flag) => (
                <li key={flag} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-bad"
                  />
                  <span className="text-[0.875rem] leading-relaxed">{flag}</span>
                </li>
              ))}
            </ul>
          </Callout>
        </section>
      ) : null}

      {!hideFollowUps && entry.followUps && entry.followUps.length > 0 ? (
        <section>
          <h2 className={heading}>Likely follow-ups</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {entry.followUps.map((followUp) => (
              <li key={followUp} className="flex items-start gap-2.5">
                <ArrowRight
                  className="mt-1 size-3.5 shrink-0 text-ember"
                  aria-hidden="true"
                />
                <span className="text-[0.875rem] leading-relaxed text-muted italic">
                  {followUp}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
