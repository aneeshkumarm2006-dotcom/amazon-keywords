import { FileText, CircleDot, HandHeart, ListChecks, MessageSquareWarning } from "lucide-react";

import {
  ISSUES_URL,
  REPO_URL,
  RoadmapBoard,
  STATUS_META,
  statusCounts,
  claimableCount,
} from "@/components/community";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { TONE_SOLID_BG } from "@/components/ui/tone";
import { automationGuides } from "@/content/automation";
import { calculators } from "@/content/calculators";
import { careerGuides } from "@/content/career";
import { caseStudies } from "@/content/case-studies";
import { cheatSheets } from "@/content/cheat-sheets";
import { terms } from "@/content/glossary";
import { interviewQuestions } from "@/content/interviews";
import { allQuizQuestions } from "@/content/quizzes";
import { scripts } from "@/content/scripts";
import { sops } from "@/content/sops";
import { templates } from "@/content/templates";
import { workflows } from "@/content/workflows";
import { pageMetadata } from "@/lib/site";
import { cn } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Public roadmap",
  description:
    "What is shipped, what is in progress and what is unclaimed on the PPC tools toolkit — every item traced back to TODO.md, KANBAN.md or EXPANSION-PLAN.md, with a one-click claim link.",
  path: "/contribute/roadmap",
  type: "article",
  section: "Contribute",
  keywords: [
    "PPC toolkit roadmap",
    "open source roadmap",
    "contribute Amazon PPC",
    "good first issue",
  ],
});

/** Where the board's items come from, shown so nobody has to take our word. */
const SOURCES = [
  {
    file: "TODO.md",
    detail: "Nine items across high, medium and low priority. Six of them are now shipped.",
  },
  {
    file: "KANBAN.md",
    detail: "The to-do / in-progress / done split, and the original nine completed deliverables.",
  },
  {
    file: "EXPANSION-PLAN.md",
    detail: "Phases 2 to 10, from calculators through client resources to community tooling.",
  },
];

export default function RoadmapPage() {
  const counts: Record<string, number> = {
    quizQuestions: allQuizQuestions.length,
    interviewQuestions: interviewQuestions.length,
    caseStudies: caseStudies.length,
    sops: sops.length,
    workflows: workflows.length,
    templates: templates.length,
    cheatSheets: cheatSheets.length,
    glossaryTerms: terms.length,
    calculators: calculators.length,
    scripts: scripts.length,
    careerGuides: careerGuides.length,
    automationGuides: automationGuides.length,
  };

  const byStatus = statusCounts();
  const openItems = claimableCount();

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Public roadmap"
        description="Everything the toolkit has planned, grouped by where it actually stands. Each card names the file it came from, so you can read the original before you commit to anything — and claim it with one click when you do."
        width="wide"
        breadcrumbs={[{ label: "Contribute", href: "/contribute" }, { label: "Roadmap" }]}
        meta={
          <>
            <Badge tone="good" variant="soft">
              {byStatus.shipped} shipped
            </Badge>
            <Badge tone="ember" variant="soft">
              {byStatus["in-progress"]} in progress
            </Badge>
            <Badge tone="brand" variant="soft">
              {byStatus.next} next up
            </Badge>
            <Badge tone="neutral" variant="outline">
              {byStatus.backlog} backlog
            </Badge>
          </>
        }
        actions={
          <>
            <ButtonLink href="/contribute" variant="secondary" icon={ListChecks}>
              Submission forms
            </ButtonLink>
            <ButtonLink href={ISSUES_URL} icon={CircleDot} external>
              Issue tracker
            </ButtonLink>
          </>
        }
      />

      <Section width="wide" tight>
        {/* -------------------------------------------------- status legend */}
        <div className="mb-8 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
          {STATUS_META.map((status) => (
            <div key={status.id} className="min-w-0 bg-surface p-4">
              <p className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
                <span
                  className={cn("size-2.5 shrink-0 rounded-full", TONE_SOLID_BG[status.tone])}
                  aria-hidden="true"
                />
                {status.label}
                <span className="tabular ml-auto font-mono text-xs text-faint">
                  {byStatus[status.id]}
                </span>
              </p>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{status.blurb}</p>
            </div>
          ))}
        </div>

        <Callout variant="info" title="How to claim something" className="mb-8">
          <p>
            Press <strong>Claim this</strong> on a card. It opens a GitHub issue prefilled with
            the item, the file it came from, and two questions to answer: what scope you are
            taking and roughly when. A maintainer confirms it in the thread, and the item is
            yours. Splitting a large item into a smaller first slice is always welcome —{" "}
            {openItems} of the {byStatus.shipped + byStatus["in-progress"] + byStatus.next + byStatus.backlog}{" "}
            items are claimable right now.
          </p>
        </Callout>

        <RoadmapBoard counts={counts} />
      </Section>

      {/* -------------------------------------------------------- sources */}
      <Section
        width="wide"
        surface
        divided
        tight
        eyebrow="Provenance"
        title="Where this board comes from"
        description="Three files in the source repository. Nothing on the board was invented for this page — status is the only judgement call, and it reflects what is live on this site."
      >
        <ul className="grid gap-4 sm:grid-cols-3">
          {SOURCES.map((source) => (
            <li
              key={source.file}
              className="flex min-w-0 gap-3.5 rounded-xl border border-hairline bg-surface p-5"
            >
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                aria-hidden="true"
              >
                <FileText className="size-[1.125rem] text-faint" />
              </span>
              <div className="min-w-0">
                <p className="font-mono text-[0.8125rem] font-semibold text-ink">{source.file}</p>
                <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                  {source.detail}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <MessageSquareWarning className="size-4 shrink-0 text-warn" aria-hidden="true" />
              Nothing here matches what you want to build?
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              Propose it. An issue arguing for a resource that does not exist yet is a
              contribution in its own right, and the roadmap has been wrong before — the whole
              community system on this site started as a single &ldquo;Low Priority&rdquo; line.
            </p>
            <ButtonLink
              href={ISSUES_URL}
              variant="secondary"
              size="sm"
              icon={CircleDot}
              external
              className="mt-4"
            >
              Open an issue
            </ButtonLink>
          </div>

          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <HandHeart className="size-4 shrink-0 text-good" aria-hidden="true" />
              Smallest useful contribution
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              One quiz question takes about five minutes with the guided form, and the bank is
              already at {allQuizQuestions.length.toLocaleString("en-US")} because people kept
              adding one at a time. You do not have to take a roadmap item to be useful.
            </p>
            <ButtonLink
              href="/contribute#quiz-question"
              variant="secondary"
              size="sm"
              icon={ListChecks}
              className="mt-4"
            >
              Add a quiz question
            </ButtonLink>
          </div>
        </div>

        <p className="mt-8 text-xs leading-relaxed text-faint">
          Counts on the board are read from the live content modules at build time, so they cannot
          drift from what is actually published. Source of truth:{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-brand underline underline-offset-2"
          >
            projectamazonph/ppc-tools-for-va
          </a>
          .
        </p>
      </Section>
    </>
  );
}
