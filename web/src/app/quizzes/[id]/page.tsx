import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageProgress } from "@/components/progress/PageProgress";
import { QuizRunner } from "@/components/quiz/QuizRunner";
import { JsonLd } from "@/components/seo/JsonLd";
import { LEVEL_META, PASS_MARK, findQuiz, quizzes } from "@/content/quizzes";
import { pageMetadata } from "@/lib/site";
import { breadcrumbNode, quizNode } from "@/lib/structured-data";
import { humanize } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

/** The six graded sets plus the runner for a locally built custom quiz. */
export function generateStaticParams() {
  return [...quizzes.map((quiz) => ({ id: quiz.id })), { id: "custom" }];
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;

  if (id === "custom") {
    return pageMetadata({
      title: "Custom quiz",
      description:
        "Run the custom quiz you built from the levels, topics and length you chose, or drill the questions you missed in a previous attempt.",
      path: "/quizzes/custom",
      noindex: true,
    });
  }

  const quiz = findQuiz(id);
  if (!quiz) return { title: "Quiz not found" };

  return pageMetadata({
    title: quiz.title,
    description: `${quiz.summary} ${quiz.questions.length} questions, about ${quiz.minutes} minutes, pass mark ${PASS_MARK}%.`,
    socialTitle: `${quiz.title} · PPC Academy`,
    path: `/quizzes/${quiz.id}`,
    keywords: ["Amazon PPC quiz", quiz.topic, quiz.level],
  });
}

export default async function QuizPage({ params }: Params) {
  const { id } = await params;
  const isCustom = id === "custom";
  const quiz = isCustom ? undefined : findQuiz(id);

  if (!isCustom && !quiz) notFound();

  const title = isCustom ? "Custom quiz" : (quiz as NonNullable<typeof quiz>).title;
  const description = isCustom
    ? "Built from the levels, topics and length you picked on the quiz hub. Rebuild it any time — the last configuration is remembered."
    : (quiz as NonNullable<typeof quiz>).summary;

  return (
    <>
      {/* A graded question set really is a schema.org Quiz. The custom
          runner has no fixed question list, so it gets no markup. */}
      {quiz ? (
        <JsonLd
          id="quiz-schema"
          data={[
            quizNode({
              name: quiz.title,
              description: quiz.summary,
              path: `/quizzes/${quiz.id}`,
              questions: quiz.questions.length,
              minutes: quiz.minutes,
              level: humanize(quiz.level),
            }),
            breadcrumbNode(
              [{ name: "Quizzes", path: "/quizzes" }, { name: quiz.title }],
              `/quizzes/${quiz.id}`,
            ),
          ]}
        />
      ) : null}

      <PageHeader
        eyebrow={quiz ? LEVEL_META[quiz.level].ordinal : "Custom"}
        title={title}
        description={description}
        breadcrumbs={[{ label: "Quizzes", href: "/quizzes" }, { label: title }]}
      />

      <Container className="py-8 sm:py-10">
        <QuizRunner
          source={isCustom ? { kind: "custom" } : { kind: "quiz", quizId: id }}
          eyebrow={quiz ? `${LEVEL_META[quiz.level].ordinal} · ${quiz.topic}` : "Custom build"}
        />
      </Container>

      {quiz ? (
        <PageProgress
          href={`/quizzes/${quiz.id}`}
          title={quiz.title}
          width="default"
          className="pb-12 sm:pb-14"
        />
      ) : null}
    </>
  );
}
