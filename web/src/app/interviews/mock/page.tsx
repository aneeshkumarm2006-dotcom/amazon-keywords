import { ClipboardCheck, Clock3, Mic, ShieldCheck } from "lucide-react";

import { MockInterview } from "@/components/interview/MockInterview";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import { PASS_MARK, SCORE_BANDS, TOTAL_INTERVIEW_QUESTIONS } from "@/content/interviews";
import { pageMetadata } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Mock interview simulator",
  description: `Run a timed Amazon PPC mock interview from a bank of ${TOTAL_INTERVIEW_QUESTIONS} questions. Pick the categories, length and clock, type your answers, then score yourself against the ideal answer and get a report with per-category scores, time spent and the weak areas to revisit.`,
  path: "/interviews/mock",
  keywords: ["mock interview", "Amazon PPC interview practice", "timed interview drill"],
});

const STEPS = [
  {
    icon: Mic,
    title: "1. Answer it cold",
    blurb:
      "One question at a time, with an optional clock. Type the answer the way you would say it — full sentences, the number first, then the reasoning.",
  },
  {
    icon: ClipboardCheck,
    title: "2. Score yourself honestly",
    blurb:
      "The ideal answer appears with its key points as a checklist. Tick only what you actually said, then rate the answer 0, 1 or 2 by the coaching rubric.",
  },
  {
    icon: Clock3,
    title: "3. Read the report",
    blurb:
      "Per-category scores, time spent per question, the points you missed, and the categories to revisit before the real interview.",
  },
];

export default function MockInterviewPage() {
  return (
    <>
      <PageHeader
        eyebrow="Interview prep"
        title="Mock interview simulator"
        description="A real screening call is 30 to 45 minutes of answering out loud with no notes. This is the closest practice to it: pick the shape of the interview, answer under a clock, then mark yourself against the model answer the way a coach would."
        breadcrumbs={[
          { label: "Interview prep", href: "/interviews" },
          { label: "Mock interview" },
        ]}
        meta={
          <>
            <Badge tone="ember">{TOTAL_INTERVIEW_QUESTIONS} questions in the pool</Badge>
            <Badge tone="neutral">Pass at {PASS_MARK}%</Badge>
            <Badge tone="neutral">Answers saved in your browser</Badge>
          </>
        }
      />

      <Container className="py-8 sm:py-10">
        <MockInterview />
      </Container>

      <Section
        eyebrow="How it works"
        title="Three steps, one honest number at the end"
        description="The score is only as useful as the marking. Tick what you said, not what you meant."
        surface
        divided
        tight
      >
        <ul className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li key={step.title}>
              <Card className="flex h-full flex-col gap-3 p-5">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-soft">
                  <step.icon className="size-5 text-brand" aria-hidden="true" />
                </span>
                <h3 className="font-display text-base font-semibold text-ink">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted">{step.blurb}</p>
              </Card>
            </li>
          ))}
        </ul>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Card className="p-5">
            <h3 className="font-display text-base font-semibold text-ink">The scoring rubric</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted">
              Taken from the coaching guide in the source bank, where 70 out of 100 is a pass and
              the coach allows 60 seconds per answer.
            </p>
            <ul className="mt-4 flex flex-col gap-2">
              {SCORE_BANDS.map((band) => (
                <li key={band.score} className="flex items-start gap-3">
                  <span
                    className={cn(
                      "tabular flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      TONE_SOFT_BG[band.tone],
                      TONE_TEXT[band.tone],
                    )}
                  >
                    {band.score}
                  </span>
                  <span className="text-sm leading-relaxed text-ink">
                    <span className="font-semibold">{band.label}</span> — {band.description}
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="flex items-start gap-3 p-5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-good-soft">
              <ShieldCheck className="size-4.5 text-good" aria-hidden="true" />
            </span>
            <div>
              <h3 className="font-display text-base font-semibold text-ink">
                Your answers stay on this device
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted">
                Everything you type is written to your own browser storage so an unfinished
                interview survives a refresh or a closed tab. Nothing is uploaded, there is no
                account, and clearing site data clears your attempt history. Attempts are capped at
                the twenty most recent.
              </p>
            </div>
          </Card>
        </div>
      </Section>
    </>
  );
}
