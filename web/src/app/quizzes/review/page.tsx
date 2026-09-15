import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { ReviewQueuePanel } from "@/components/quiz/ReviewQueuePanel";
import { Badge } from "@/components/ui/Badge";
import { REVIEW_INTERVALS_DAYS } from "@/lib/quiz-session";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Review queue",
  description:
    "Spaced repetition for Amazon PPC. Every quiz question you answer incorrectly enters a Leitner queue and comes back after one, three, seven and twenty-one days until you have answered it correctly twice in a row.",
  path: "/quizzes/review",
  noindex: true,
  keywords: ["spaced repetition", "Leitner system", "Amazon PPC revision"],
});

export default function ReviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Train"
        title="Review queue"
        description="Missed questions do not disappear. Each one goes into a Leitner box and resurfaces on a widening schedule — answer it right and it moves further out, get it wrong and it comes straight back to the front. This is the fastest way to turn the twelve questions you keep getting wrong into twelve you never will."
        breadcrumbs={[{ label: "Quizzes", href: "/quizzes" }, { label: "Review queue" }]}
        meta={
          <>
            <Badge tone="neutral">Boxes: {REVIEW_INTERVALS_DAYS.length}</Badge>
            <Badge tone="neutral">
              Intervals: {REVIEW_INTERVALS_DAYS.slice(1).join(", ")} days
            </Badge>
            <Badge tone="neutral">Retires after 2 correct in a row</Badge>
          </>
        }
      />

      <Container className="py-8 sm:py-10">
        <ReviewQueuePanel />
      </Container>
    </>
  );
}
