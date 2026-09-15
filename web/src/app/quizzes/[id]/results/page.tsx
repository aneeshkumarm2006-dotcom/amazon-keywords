import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuizResultsView } from "@/components/quiz/QuizResultsView";
import { findQuiz, quizzes } from "@/content/quizzes";
import { pageMetadata } from "@/lib/site";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return [...quizzes.map((quiz) => ({ id: quiz.id })), { id: "custom" }];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const quiz = findQuiz(id);
  const name = id === "custom" ? "Custom quiz" : (quiz?.title ?? "Quiz");

  return pageMetadata({
    title: `${name} results`,
    description: `Your most recent ${name.toLowerCase()} attempt: score against the pass mark, accuracy by level and topic, time per question, and every question you missed with its explanation.`,
    path: `/quizzes/${id}/results`,
    noindex: true,
  });
}

export default async function QuizResultsPage({ params }: Params) {
  const { id } = await params;
  const isCustom = id === "custom";
  const quiz = isCustom ? undefined : findQuiz(id);

  if (!isCustom && !quiz) notFound();

  const title = isCustom ? "Custom quiz" : (quiz as NonNullable<typeof quiz>).title;

  return (
    <>
      <PageHeader
        eyebrow="Results"
        title={`${title} results`}
        description="The breakdown of your latest attempt, stored in this browser. Switch between recent attempts to see whether the weak topics are moving."
        breadcrumbs={[
          { label: "Quizzes", href: "/quizzes" },
          { label: title, href: `/quizzes/${id}` },
          { label: "Results" },
        ]}
      />

      <Container className="py-8 sm:py-10">
        <QuizResultsView
          quizId={id}
          retakeHref={`/quizzes/${id}`}
          emptyTitle={`No ${title.toLowerCase()} attempt recorded yet`}
          emptyDescription="Finish the quiz once and this page will show your score, the per-topic breakdown and every question you missed."
        />
      </Container>
    </>
  );
}
