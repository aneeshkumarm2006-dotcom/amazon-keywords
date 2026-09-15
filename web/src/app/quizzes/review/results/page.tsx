
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { QuizResultsView } from "@/components/quiz/QuizResultsView";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Review session results",
  description:
    "The breakdown of your most recent spaced-repetition review session: score, accuracy by level and topic, time per question, and every question still to be nailed.",
  path: "/quizzes/review/results",
  noindex: true,
});

export default function ReviewResultsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Results"
        title="Review session results"
        description="How the last pass through your review queue went. Questions you got right moved to a longer interval; the rest came straight back to the front of the queue."
        breadcrumbs={[
          { label: "Quizzes", href: "/quizzes" },
          { label: "Review queue", href: "/quizzes/review" },
          { label: "Results" },
        ]}
      />

      <Container className="py-8 sm:py-10">
        <QuizResultsView
          quizId="review"
          retakeHref="/quizzes/review"
          emptyTitle="No review session recorded yet"
          emptyDescription="Run the review queue once and this page will show the breakdown, along with every question that still needs work."
        />
      </Container>
    </>
  );
}
