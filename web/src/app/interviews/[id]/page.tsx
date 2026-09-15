import { ArrowLeft, ArrowRight, Clock, Mic, Quote, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AnswerBody } from "@/components/interview/AnswerBody";
import { KeyPointsChecklist } from "@/components/interview/KeyPointsChecklist";
import { CATEGORY_ICONS, formatDuration } from "@/components/interview/meta";
import { QuestionActions } from "@/components/interview/QuestionActions";
import { QuestionChips } from "@/components/interview/QuestionChips";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { RelatedRail } from "@/components/related/RelatedRail";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import {
  CATEGORY_META,
  LEVEL_META,
  UPDATED,
  findInterviewQuestion,
  interviewQuestions,
  neighbours,
  relatedQuestions,
} from "@/content/interviews";
import { pageMetadata } from "@/lib/site";
import { articleNode, breadcrumbNode } from "@/lib/structured-data";
import { cn, truncate } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return interviewQuestions.map((entry) => ({ id: entry.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const entry = findInterviewQuestion(id);

  if (!entry) return { title: "Interview question not found" };

  const description = `${entry.category} interview question for an Amazon PPC specialist. ${entry.keyPoints[0]}. Includes the ideal answer, the key points an interviewer listens for, the red flags that lose the job and the likely follow-ups.`;

  return pageMetadata({
    title: truncate(entry.question, 68),
    socialTitle: entry.question,
    description,
    path: `/interviews/${entry.id}`,
    type: "article",
    section: entry.category,
    published: UPDATED,
    modified: UPDATED,
    keywords: [...entry.tags, entry.category, "Amazon PPC interview question"],
  });
}

export default async function InterviewQuestionPage({ params }: Params) {
  const { id } = await params;
  const entry = findInterviewQuestion(id);

  if (!entry) notFound();

  const category = CATEGORY_META[entry.category];
  const level = LEVEL_META[entry.level];
  const Icon = CATEGORY_ICONS[entry.category];
  const { previous, next } = neighbours(entry.id);
  const related = relatedQuestions(entry.id, 4);
  const position = interviewQuestions.findIndex((candidate) => candidate.id === entry.id) + 1;

  return (
    <>
      <JsonLd
        id="interview-schema"
        data={[
          articleNode({
            title: entry.question,
            description: category.whenAsked,
            path: `/interviews/${entry.id}`,
            section: entry.category,
            keywords: entry.tags,
            published: UPDATED,
            modified: UPDATED,
          }),
          breadcrumbNode(
            [
              { name: "Interview prep", path: "/interviews" },
              { name: truncate(entry.question, 48) },
            ],
            `/interviews/${entry.id}`,
          ),
        ]}
      />

      <PageHeader
        eyebrow={category.category}
        title={entry.question}
        description={category.whenAsked}
        breadcrumbs={[
          { label: "Interview prep", href: "/interviews" },
          { label: truncate(entry.question, 48) },
        ]}
        width="wide"
        meta={<QuestionChips entry={entry} size="md" showSource />}
        actions={<QuestionActions id={entry.id} />}
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
          {/* ------------------------------------------------------- answer */}
          <article>
            <AnswerBody
              entry={entry}
              keyPointsSlot={
                <section>
                  <h2 className="mb-3 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
                    What the interviewer listens for
                  </h2>
                  <KeyPointsChecklist
                    points={entry.keyPoints}
                    title="Check your own answer against these"
                    hint="Say your answer out loud first, then tick what you actually covered. Anything unticked is what to rehearse."
                  />
                </section>
              }
            />

            {/* ------------------------------------------------------- pager */}
            <nav
              aria-label="Question pager"
              className="mt-10 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
            >
              {previous ? (
                <Link
                  href={`/interviews/${previous.id}`}
                  className="group flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface p-4 transition-colors hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    Previous
                  </span>
                  <span className="text-[0.875rem] leading-snug font-medium text-ink">
                    {previous.question}
                  </span>
                  <span className="text-xs text-faint">
                    {CATEGORY_META[previous.category].short}
                  </span>
                </Link>
              ) : (
                <span aria-hidden="true" />
              )}

              {next ? (
                <Link
                  href={`/interviews/${next.id}`}
                  className="group flex flex-col gap-1.5 rounded-xl border border-hairline bg-surface p-4 text-right transition-colors hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:items-end"
                >
                  <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
                    Next
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </span>
                  <span className="text-[0.875rem] leading-snug font-medium text-ink">
                    {next.question}
                  </span>
                  <span className="text-xs text-faint">{CATEGORY_META[next.category].short}</span>
                </Link>
              ) : null}
            </nav>
          </article>

          {/* ------------------------------------------------------ sidebar */}
          <aside className="flex flex-col gap-5 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-xl border border-hairline bg-surface p-5">
              <div className="flex items-center gap-2.5">
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-lg",
                    TONE_SOFT_BG[category.tone],
                  )}
                >
                  <Icon className={cn("size-4", TONE_ICON[category.tone])} aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <p className="font-display text-[0.9375rem] font-semibold text-ink">
                    {category.category}
                  </p>
                  <p className="text-xs text-faint">
                    Question {position} of {interviewQuestions.length}
                  </p>
                </div>
              </div>

              <p className="mt-3 text-[0.8125rem] leading-relaxed text-muted">
                {category.description}
              </p>

              <dl className="mt-4 flex flex-col gap-2 border-t border-hairline pt-4 text-[0.8125rem]">
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Difficulty</dt>
                  <dd className="font-medium text-ink">{level.label}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <dt className="text-muted">Spoken length</dt>
                  <dd className="tabular inline-flex items-center gap-1.5 font-medium text-ink">
                    <Clock className="size-3.5 text-faint" aria-hidden="true" />
                    {formatDuration(entry.answerSeconds)}
                  </dd>
                </div>
                {entry.source ? (
                  <div className="flex items-baseline justify-between gap-3">
                    <dt className="text-muted">Source bank</dt>
                    <dd className="text-right font-medium text-ink">{entry.source}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-1.5 border-t border-hairline pt-4">
                {entry.tags.map((tag) => (
                  <Badge key={tag} tone="neutral" size="sm" variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>

            {related.length > 0 ? (
              <div className="rounded-xl border border-hairline bg-surface">
                <div className="flex items-center gap-2 border-b border-hairline px-5 py-3.5">
                  <Quote className="size-3.5 text-faint" aria-hidden="true" />
                  <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                    Asked alongside this
                  </h2>
                </div>
                <ul className="divide-y divide-hairline">
                  {related.map((item) => (
                    <li key={item.id}>
                      <Link
                        href={`/interviews/${item.id}`}
                        className="block px-5 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                      >
                        <span className="block text-[0.8125rem] leading-snug font-medium text-ink">
                          {item.question}
                        </span>
                        <span className="mt-1 block text-xs text-faint">
                          {CATEGORY_META[item.category].short} · {LEVEL_META[item.level].label}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <div className="flex flex-col gap-2 rounded-xl border border-hairline bg-surface-2 p-5">
              <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                Can you say it under pressure?
              </h2>
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                Reading a model answer is easy. Run it against a clock and score yourself before
                you decide you know it.
              </p>
              <div className="mt-1 flex flex-wrap gap-2">
                <ButtonLink href="/interviews/mock" size="sm" icon={Mic}>
                  Mock interview
                </ButtonLink>
                <ButtonLink href="/interviews/flashcards" size="sm" variant="secondary" icon={Zap}>
                  Flashcards
                </ButtonLink>
              </div>
            </div>
          </aside>
        </div>
      </Container>

      {/* The sidebar already lists sibling questions in the same competency,
          so the rail is pointed away from the interview bank and at the SOPs,
          case studies and cheat sheets that back the answer up. */}
      <RelatedRail
        href={`/interviews/${entry.id}`}
        exclude={related.map((candidate) => `/interviews/${candidate.id}`)}
        options={{ limit: 4, perKind: 1 }}
      />
    </>
  );
}
