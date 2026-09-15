import { Drama, Layers, MessageSquareQuote, Mic, Timer, Zap } from "lucide-react";

import { BankBrowser } from "@/components/interview/BankBrowser";
import { categoryIcon } from "@/components/interview/meta";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  LEVEL_ORDER,
  PASS_MARK,
  SOURCE_CATEGORIES,
  TOTAL_INTERVIEW_QUESTIONS,
  categoryCounts,
  interviewQuestions,
  levelCounts,
  sourcedQuestions,
  totalSpeakingMinutes,
} from "@/content/interviews";
import { pageMetadata } from "@/lib/site";
import { breadcrumbNode, faqNode, toPlainProse } from "@/lib/structured-data";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Interview prep",
  description: `${TOTAL_INTERVIEW_QUESTIONS} Amazon PPC interview questions across nine competencies, each with a model answer, the key points an interviewer listens for, the red flags that lose the job, and the follow-ups that come next. Includes a mock interview simulator and a flashcard drill.`,
  path: "/interviews",
  keywords: [
    "Amazon PPC interview questions",
    "PPC specialist interview",
    "PPC interview answers",
    "virtual assistant interview prep",
  ],
});

const counts = categoryCounts();
const levels = levelCounts();
const sourced = sourcedQuestions().length;
const speaking = totalSpeakingMinutes();

/**
 * `FAQPage` markup for this hub.
 *
 * The browser below expands every question inline with its full model
 * answer, so the schema describes content that really is on the page. It is
 * capped at two questions per competency rather than the whole bank: all of
 * them would add roughly 70KB of JSON to a page Google truncates anyway, and
 * eighteen representative pairs carry the same signal at a tenth of the
 * weight.
 */
const FAQ_PER_CATEGORY = 2;
const FAQ_ANSWER_CHARS = 520;

const FAQ_ENTRIES = CATEGORY_ORDER.flatMap((category) =>
  interviewQuestions
    .filter((entry) => entry.category === category)
    .slice(0, FAQ_PER_CATEGORY)
    .map((entry) => ({
      question: entry.question,
      answer: toPlainProse(entry.idealAnswer, FAQ_ANSWER_CHARS),
    })),
);

const DRILLS = [
  {
    href: "/interviews/mock",
    icon: Mic,
    title: "Mock interview",
    blurb:
      "Pick the categories, the length and the clock. Answer one question at a time in a text box, then score yourself against the model answer and get a report of your weak areas.",
    cta: "Run a mock",
  },
  {
    href: "/interviews/flashcards",
    icon: Zap,
    title: "Flashcards",
    blurb:
      "Question only, no prompts. Answer it out loud, reveal, and mark whether you had it. The fastest way to find the questions you can only half answer.",
    cta: "Start the drill",
  },
  {
    href: "/quizzes",
    icon: Layers,
    title: "Knowledge quizzes",
    blurb:
      "Interviews test whether you can explain it. Quizzes test whether you know it. Run the graded sets first if the fundamentals are still shaky.",
    cta: "Open the quizzes",
  },
];

export default function InterviewsPage() {
  return (
    <>
      <JsonLd
        id="interviews-faq"
        data={[
          faqNode(FAQ_ENTRIES, "/interviews"),
          breadcrumbNode([{ name: "Interview prep" }], "/interviews"),
        ]}
      />

      <PageHeader
        eyebrow="Train"
        title="Amazon PPC interview prep"
        description={`Every question a hiring manager is likely to ask a remote PPC specialist, with a model answer written for a Filipino VA: what to say, what the interviewer is listening for, what loses the job, and the follow-up that comes next. All ${sourced} questions from the source bank are here, expanded to ${TOTAL_INTERVIEW_QUESTIONS} across nine competencies.`}
        breadcrumbs={[{ label: "Interview prep" }]}
        width="wide"
        meta={
          <>
            <Badge tone="ember">{TOTAL_INTERVIEW_QUESTIONS} questions</Badge>
            <Badge tone="neutral">{CATEGORY_ORDER.length} competencies</Badge>
            <Badge tone="neutral">{speaking} min of spoken answers</Badge>
            <Badge tone="neutral">Pass a mock at {PASS_MARK}%</Badge>
          </>
        }
        actions={
          <>
            <ButtonLink href="/interviews/mock" icon={Mic}>
              Start a mock interview
            </ButtonLink>
            <ButtonLink href="/interviews/flashcards" variant="secondary" icon={Zap}>
              Flashcards
            </ButtonLink>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <BankBrowser />
      </Container>

      <Section
        eyebrow="Drill it"
        title="Three ways to practise the same bank"
        description="Reading an answer is not the same as saying it. Each of these forces a different kind of recall."
        width="wide"
        surface
        divided
        tight
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {DRILLS.map((drill) => (
            <li key={drill.href}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-ember-soft">
                  <drill.icon className="size-5 text-ember" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-semibold text-ink">{drill.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{drill.blurb}</p>
                <ButtonLink
                  href={drill.href}
                  variant="secondary"
                  size="sm"
                  className="mt-auto w-fit"
                >
                  {drill.cta}
                </ButtonLink>
              </Card>
            </li>
          ))}
        </ul>
      </Section>

      <Section
        eyebrow="Coverage"
        title="What the bank tests"
        description="Nine competencies, five difficulty bands. The category tells you who asks it; the band tells you how deep the answer has to go."
        width="wide"
        divided
        tight
      >
        <div className="grid gap-4 lg:grid-cols-5">
          <ul className="flex flex-col gap-2 lg:col-span-2">
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
                      {levels[level]}
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-[0.9375rem] font-semibold text-ink">
                        {meta.label}
                      </p>
                      <p className="mt-0.5 text-sm leading-relaxed text-muted">{meta.blurb}</p>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>

          <ul className="grid gap-3 sm:grid-cols-2 lg:col-span-3 lg:content-start">
            {CATEGORY_ORDER.map((category) => {
              const meta = CATEGORY_META[category];
              const Icon = categoryIcon(category);
              return (
                <li key={category}>
                  <Card className="flex h-full flex-col gap-2 p-4">
                    <div className="flex items-center gap-2">
                      <span
                        className={cn(
                          "flex size-7 shrink-0 items-center justify-center rounded-md",
                          TONE_SOFT_BG[meta.tone],
                        )}
                      >
                        <Icon className={cn("size-3.5", TONE_ICON[meta.tone])} aria-hidden="true" />
                      </span>
                      <h3 className="min-w-0 flex-1 truncate font-display text-[0.9375rem] font-semibold text-ink">
                        {meta.category}
                      </h3>
                      <span className="tabular text-xs font-semibold text-faint">
                        {counts[category]}
                      </span>
                    </div>
                    <p className="text-[0.8125rem] leading-relaxed text-muted">{meta.blurb}</p>
                    <p className="mt-auto flex items-start gap-1.5 pt-1 text-xs text-faint">
                      <Timer className="mt-0.5 size-3 shrink-0" aria-hidden="true" />
                      {meta.whenAsked}
                    </p>
                  </Card>
                </li>
              );
            })}
          </ul>
        </div>
      </Section>

      <Section
        eyebrow="Provenance"
        title="Where these questions come from"
        description="Sixty questions are ported from the PPC toolkit's own interview bank, with their original answer guidance preserved and each one tagged with the category it came from. The rest were written to fill the gaps that bank left — structure, reporting, troubleshooting and live role-play."
        width="wide"
        surface
        divided
        tight
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <ul className="flex flex-col gap-2 lg:col-span-2">
            {SOURCE_CATEGORIES.map((entry) => (
              <li
                key={entry.label}
                className="flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-lg border border-hairline bg-surface px-4 py-3"
              >
                <span className="tabular text-sm font-semibold text-ink">
                  {entry.count}
                </span>
                <span className="text-sm font-medium text-ink">{entry.label}</span>
                <span className="text-[0.8125rem] text-muted">{entry.note}</span>
              </li>
            ))}
          </ul>

          <Card className="flex flex-col gap-3 p-5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft">
              <MessageSquareQuote className="size-5 text-brand" aria-hidden="true" />
            </span>
            <h3 className="font-display text-base font-semibold text-ink">
              How the coach scores it
            </h3>
            <p className="text-sm leading-relaxed text-muted">
              The source bank scores each answer 0 for a miss, 1 for partial, and 2 for a complete
              answer with an example, passing at {PASS_MARK} out of 100. The mock interview uses
              exactly that rubric, so a score here means the same thing a coach would mean by it.
            </p>
            <p className="flex items-start gap-2 text-sm leading-relaxed text-muted">
              <Drama className="mt-0.5 size-4 shrink-0 text-ember" aria-hidden="true" />
              Practise out loud. Reading an answer silently is how candidates convince themselves
              they are ready.
            </p>
          </Card>
        </div>
      </Section>
    </>
  );
}
