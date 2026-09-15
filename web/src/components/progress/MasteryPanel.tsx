"use client";

import { Brain, Target } from "lucide-react";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import { QUIZ_PASS_MARK, type LevelCoverage, type TopicMastery } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

function accuracyTone(accuracy: number): Tone {
  if (accuracy >= 85) return "good";
  if (accuracy >= QUIZ_PASS_MARK) return "brand";
  if (accuracy >= 50) return "warn";
  return "bad";
}

export interface MasteryPanelProps {
  topics: TopicMastery[];
  levels: LevelCoverage[];
  className?: string;
}

/**
 * Per-topic mastery from the quiz mastery map.
 *
 * Two numbers per row and they mean different things. The bar is accuracy:
 * how often you get this topic right. The count next to it is coverage: how
 * much of the topic you have even seen. High accuracy on two of fourteen
 * questions is not mastery, and the row says so.
 */
export function MasteryPanel({ topics, levels, className }: MasteryPanelProps) {
  const seen = topics.filter((topic) => topic.seen > 0);

  return (
    <section
      aria-labelledby="mastery-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3
            id="mastery-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Topic mastery
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Lifetime accuracy per topic, weakest first. Coverage is how much of each topic you
            have actually seen.
          </p>
        </div>
        {seen.length > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[0.6875rem] font-medium text-muted">
            <Brain className="size-3.5 text-faint" aria-hidden="true" />
            <span className="tabular">
              {seen.length}/{topics.length} topics touched
            </span>
          </span>
        ) : null}
      </header>

      {seen.length === 0 ? (
        <EmptyState
          bare
          icon={Target}
          title="No topics measured yet"
          description={`There are ${topics.length} topics in the question bank, from match types to client comms. Each answer you give updates the accuracy for its topic, and anything under ${QUIZ_PASS_MARK}% becomes a weak area with a link straight back to the right quiz.`}
          action={
            <ButtonLink href="/quizzes/beginner" size="sm">
              Start with the fundamentals
            </ButtonLink>
          }
        />
      ) : (
        <>
          <ul className="divide-y divide-hairline">
            {[...seen]
              .sort((a, b) => a.accuracy - b.accuracy || b.answers - a.answers)
              .map((topic) => {
                const tone = accuracyTone(topic.accuracy);
                return (
                  <li key={topic.topic} className="flex flex-col gap-1.5 px-4 py-3 sm:px-5">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="truncate text-[0.8125rem] font-medium text-ink">
                        {topic.topic}
                      </span>
                      <span className={cn("tabular shrink-0 text-xs font-semibold", TONE_TEXT[tone])}>
                        {topic.accuracy}%
                      </span>
                    </div>
                    <div
                      className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2"
                      role="progressbar"
                      aria-valuenow={topic.accuracy}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${topic.topic} accuracy`}
                      aria-valuetext={`${topic.accuracy}% accuracy across ${topic.answers} answers`}
                    >
                      <div
                        className={cn("h-full rounded-full transition-[width] duration-500", TONE_SOLID_BG[tone])}
                        style={{ width: `${topic.accuracy}%` }}
                      />
                    </div>
                    <p className="tabular text-[0.6875rem] text-faint">
                      {topic.seen}/{topic.total} questions seen · {topic.mastered} mastered ·{" "}
                      {topic.answers} answer{topic.answers === 1 ? "" : "s"} given
                    </p>
                  </li>
                );
              })}
          </ul>

          <div className="border-t border-hairline px-4 py-3.5 sm:px-5">
            <p className="mb-2.5 text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
              Coverage by level
            </p>
            <ul className="grid gap-2 sm:grid-cols-2">
              {levels.map((level) => (
                <li key={level.level} className="flex items-center gap-2.5">
                  <span className="w-24 shrink-0 truncate text-[0.75rem] text-muted">
                    {level.label}
                  </span>
                  <span className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <span
                      className={cn("block h-full rounded-full", TONE_SOLID_BG[level.tone])}
                      style={{ width: `${level.percent}%` }}
                    />
                  </span>
                  <span className="tabular w-14 shrink-0 text-right text-[0.6875rem] text-faint">
                    {level.seen}/{level.total}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </section>
  );
}
