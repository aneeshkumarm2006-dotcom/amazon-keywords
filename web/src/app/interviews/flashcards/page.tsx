import { Keyboard, Mic, Repeat, Volume2 } from "lucide-react";

import { Flashcards } from "@/components/interview/Flashcards";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { TOTAL_INTERVIEW_QUESTIONS, totalSpeakingMinutes } from "@/content/interviews";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Interview flashcards",
  description: `A rapid recall drill over ${TOTAL_INTERVIEW_QUESTIONS} Amazon PPC interview questions. Read the question, answer it out loud, reveal the ideal answer and key points, then mark whether you had it or send it back to your bookmarks.`,
  path: "/interviews/flashcards",
  keywords: ["PPC flashcards", "interview recall drill", "Amazon PPC revision"],
});

const HABITS = [
  {
    icon: Volume2,
    title: "Say it out loud, every time",
    blurb:
      "Silent recall feels like knowing. Spoken recall finds the sentence you cannot actually finish. If someone else is home, answer to them.",
  },
  {
    icon: Repeat,
    title: "Short sessions beat long ones",
    blurb:
      "Fifteen cards before work, fifteen after. Spacing the same questions across days is what moves them into the answers you can give under pressure.",
  },
  {
    icon: Mic,
    title: "Record yourself once a week",
    blurb:
      "Play it back. Filler words, a missing number, an answer that never lands on a recommendation — all of it is obvious on the recording and invisible in your head.",
  },
];

export default function FlashcardsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Interview prep"
        title="Interview flashcards"
        description="Question only, no hints. Answer it out loud in full, then reveal the model answer and mark yourself. Cards you miss go to your bookmarks so the next deck is harder than the last one."
        breadcrumbs={[
          { label: "Interview prep", href: "/interviews" },
          { label: "Flashcards" },
        ]}
        meta={
          <>
            <Badge tone="ember">{TOTAL_INTERVIEW_QUESTIONS} cards</Badge>
            <Badge tone="neutral">{totalSpeakingMinutes()} min of spoken answers</Badge>
            <Badge tone="neutral" icon={Keyboard}>
              Keyboard driven
            </Badge>
          </>
        }
        actions={
          <ButtonLink href="/interviews/mock" variant="secondary" icon={Mic}>
            Run a full mock instead
          </ButtonLink>
        }
      />

      <Container className="py-8 sm:py-10">
        <Flashcards />
      </Container>

      <Section
        eyebrow="Make it stick"
        title="Three habits that separate practice from rehearsal"
        surface
        divided
        tight
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {HABITS.map((habit) => (
            <li key={habit.title}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-ember-soft">
                  <habit.icon className="size-5 text-ember" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-semibold text-ink">{habit.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{habit.blurb}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
