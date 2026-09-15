import { BookOpenCheck, Eye, Keyboard, ShieldCheck, Timer } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { QuizHub } from "@/components/quiz/QuizHub";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import {
  LEVEL_META,
  LEVEL_ORDER,
  PASS_MARK,
  TOTAL_QUESTIONS,
  levelCounts,
  quizzes,
  topicCounts,
} from "@/content/quizzes";
import { MODE_META, QUIZ_MODES } from "@/lib/quiz-session";
import { assertReferenceIndex, assertResourceIndex } from "@/lib/related";
import { pageMetadata } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Quizzes",
  description: `${TOTAL_QUESTIONS} graded Amazon PPC quiz questions across five levels — match types, metrics, search term analysis, bidding, budgets, structure, seasonality and client management. Practice, exam and flashcard modes with instant explanations, a spaced-repetition review queue and a ${PASS_MARK}% pass mark.`,
  path: "/quizzes",
  keywords: [
    "Amazon PPC quiz",
    "PPC test questions",
    "Sponsored Products quiz",
    "PPC certification practice",
  ],
});

const MODE_ICONS = {
  practice: BookOpenCheck,
  exam: Timer,
  flashcard: Eye,
} as const;

const counts = levelCounts();
const topics = topicCounts();

/**
 * Build-time guard. This hub is a server component, so calling it here costs
 * the browser nothing and makes a stale reference label a build failure.
 */
assertReferenceIndex();
assertResourceIndex();

export default function QuizzesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Train"
        title="Amazon PPC quizzes"
        description={`${TOTAL_QUESTIONS} questions across five difficulty levels, from match-type basics to broken-account scenarios. Every question has four plausible answers, one right one, and an explanation that tells you why — plus a link to the SOP, cheat sheet or glossary entry it comes from.`}
        breadcrumbs={[{ label: "Quizzes" }]}
        width="wide"
        meta={
          <>
            <Badge tone="brand">{TOTAL_QUESTIONS} questions</Badge>
            <Badge tone="neutral">{quizzes.length} graded sets</Badge>
            <Badge tone="neutral">{topics.length} topics</Badge>
            <Badge tone="neutral">Pass at {PASS_MARK}%</Badge>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <QuizHub />
      </Container>

      <Section
        eyebrow="How it works"
        title="Three ways to run the same question bank"
        description="Pick the mode that matches what you are doing: learning something new, checking whether you would pass, or drilling recall before an interview."
        width="wide"
        surface
        divided
        tight
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {QUIZ_MODES.map((mode) => {
            const meta = MODE_META[mode];
            const Icon = MODE_ICONS[mode];
            return (
              <li key={mode}>
                <Card className="flex h-full flex-col gap-3 p-5">
                  <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft">
                    <Icon className="size-5 text-brand" aria-hidden="true" />
                  </span>
                  <h3 className="font-display text-base font-semibold text-ink">{meta.label}</h3>
                  <p className="text-sm leading-relaxed text-muted">{meta.blurb}</p>
                </Card>
              </li>
            );
          })}
        </ul>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="flex items-start gap-3 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-info-soft">
              <Keyboard className="size-4.5 text-info" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Keyboard first, mouse optional
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  1
                </kbd>
                –
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  4
                </kbd>{" "}
                answers,{" "}
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  Enter
                </kbd>{" "}
                advances,{" "}
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  F
                </kbd>{" "}
                flags a question for review,{" "}
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  S
                </kbd>{" "}
                skips and{" "}
                <kbd className="rounded border border-hairline bg-surface-2 px-1 font-mono text-xs">
                  P
                </kbd>{" "}
                pauses the exam clock.
              </p>
            </div>
          </Card>

          <Card className="flex items-start gap-3 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-good-soft">
              <ShieldCheck className="size-4.5 text-good" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Your progress stays in your browser
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Sessions resume where you left them, attempts are kept with a full breakdown, and
                every question you miss enters a spaced-repetition queue. Nothing is uploaded and
                no account is needed — clearing site data clears your history.
              </p>
            </div>
          </Card>
        </div>
      </Section>

      <Section
        eyebrow="Coverage"
        title="What the bank tests"
        description="Question counts by level and by topic, so you can see where the depth is before you start."
        width="wide"
        divided
        tight
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <ul className="flex flex-col gap-3 lg:col-span-2">
            {LEVEL_ORDER.map((level) => {
              const meta = LEVEL_META[level];
              return (
                <li key={level}>
                  <Card className="flex items-start gap-3 p-4">
                    <span
                      className={cn(
                        "tabular flex size-10 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                        TONE_SOFT_BG[meta.tone],
                        TONE_ICON[meta.tone],
                      )}
                    >
                      {counts[level]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[0.9375rem] font-semibold text-ink">
                        {meta.ordinal} — {meta.label}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{meta.tagline}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <Card className="lg:col-span-3">
            <div className="border-b border-hairline px-5 py-4">
              <h3 className="font-display text-base font-semibold text-ink">Topics</h3>
              <p className="mt-1 text-sm text-muted">
                Every question carries one topic tag. Results break your score down by tag so you
                know what to study, not just that you scored badly.
              </p>
            </div>
            <ul className="grid grid-cols-2 gap-px bg-hairline sm:grid-cols-3">
              {topics.map(({ topic, count }) => (
                <li
                  key={topic}
                  className="flex items-baseline justify-between gap-2 bg-surface px-4 py-3"
                >
                  <span className="min-w-0 truncate text-sm text-ink">{topic}</span>
                  <span className="tabular text-xs font-semibold text-faint">{count}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </Section>
    </>
  );
}
