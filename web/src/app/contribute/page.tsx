import {
  BookOpenCheck,
  GitMerge,
  CircleDot,
  ExternalLink,
  Map as MapIcon,
  MessageSquareShare,
  PencilLine,
  ShieldCheck,
  Star,
} from "lucide-react";
import Link from "next/link";

import {
  ContributionWorkbench,
  FeedbackLedger,
  CONTRIBUTING_URL,
  ISSUES_URL,
  REPO_URL,
} from "@/components/community";
import { claimableCount } from "@/components/community/roadmap-data";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { caseStudies } from "@/content/case-studies";
import { interviewQuestions } from "@/content/interviews";
import { allQuizQuestions } from "@/content/quizzes";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contribute",
  description:
    "Four guided ways to add to the PPC Academy library: submit a case study, add an interview question, propose a quiz question, or report an issue. Each form builds the markdown and hands it to a prefilled GitHub issue.",
  path: "/contribute",
  socialTitle: "Contribute to PPC Academy",
  keywords: [
    "contribute Amazon PPC",
    "PPC case study submission",
    "interview question submission",
    "open source PPC toolkit",
    "Filipino VA community",
  ],
});

/** How a submission actually travels, start to finish. */
const PIPELINE = [
  {
    icon: PencilLine,
    title: "You fill in the form",
    detail:
      "Step by step, validated as you go. Everything is kept in your browser, so a reload or a dead battery costs you nothing.",
  },
  {
    icon: MessageSquareShare,
    title: "It becomes markdown",
    detail:
      "The final step renders the exact issue body a maintainer will read — tables, headings, the lot. Copy it, or let the button carry it.",
  },
  {
    icon: CircleDot,
    title: "You open the issue",
    detail:
      "The link lands on GitHub with the title, body and labels already filled in. You are signed in as yourself; nothing is posted on your behalf.",
  },
  {
    icon: GitMerge,
    title: "It lands in the library",
    detail:
      "A maintainer checks it against the content guidelines, asks anything that is missing, then merges it into the repo and this site.",
  },
];

export default function ContributePage() {
  const quizCount = allQuizQuestions.length;
  const interviewCount = interviewQuestions.length;
  const caseCount = caseStudies.length;
  const openItems = claimableCount();

  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Contribute to the library"
        description="Every quiz question, SOP and case study here came from someone who had already done the work on a real account. This is how you add yours — four guided forms that write the markdown for you and hand it to GitHub, with nothing to sign up for and nothing collected."
        width="wide"
        breadcrumbs={[{ label: "Contribute" }]}
        meta={
          <>
            <Badge tone="brand" variant="soft">
              4 submission types
            </Badge>
            <Badge tone="neutral" variant="outline">
              {openItems} roadmap items unclaimed
            </Badge>
            <Badge tone="neutral" variant="outline">
              MIT licensed
            </Badge>
          </>
        }
        actions={
          <>
            <ButtonLink href="/contribute/roadmap" variant="secondary" icon={MapIcon}>
              See the roadmap
            </ButtonLink>
            <ButtonLink href={REPO_URL} icon={ExternalLink} external>
              Open the repo
            </ButtonLink>
          </>
        }
      />

      {/* ------------------------------------------------------ the forms */}
      <Section
        width="wide"
        eyebrow="Pick one"
        title="Four ways to contribute"
        description="Choose the kind of submission you have. Each card opens a real, validated form with a live preview of what gets filed — no blank issue box, no guessing at the format."
        tight
      >
        <ContributionWorkbench />
      </Section>

      {/* -------------------------------------------------------- pipeline */}
      <Section
        width="wide"
        surface
        divided
        tight
        eyebrow="What happens next"
        title="From your form to the library"
        description="No black box. Four steps, and you control the one that matters."
      >
        <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {PIPELINE.map((stage, index) => {
            const Icon = stage.icon;
            return (
              <li
                key={stage.title}
                className="relative flex min-w-0 flex-col gap-3 rounded-xl border border-hairline bg-surface p-5"
              >
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                    aria-hidden="true"
                  >
                    <Icon className="size-[1.125rem] text-brand" />
                  </span>
                  <span
                    className="font-mono text-xs text-faint tabular-nums"
                    aria-hidden="true"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </span>
                </div>
                <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                  <span className="sr-only">Step {index + 1}. </span>
                  {stage.title}
                </h3>
                <p className="text-[0.8125rem] leading-relaxed text-muted">{stage.detail}</p>
              </li>
            );
          })}
        </ol>

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <ShieldCheck className="size-4 shrink-0 text-good" aria-hidden="true" />
              Nothing is collected
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              This site is a static export with no server, no database and no analytics on your
              answers. Drafts and ratings live in your browser&rsquo;s own storage; the only thing
              that ever leaves is the issue you choose to open.
            </p>
          </div>
          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <BookOpenCheck className="size-4 shrink-0 text-brand" aria-hidden="true" />
              Read the bar first
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              The contributing guide sets a specific bar for each type — real before/after metrics
              on case studies, an explanation on every quiz answer, decision rules in every SOP.
            </p>
            <Link
              href="/contribute/guidelines"
              className="mt-3 inline-flex min-h-9 items-center text-[0.8125rem] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Guidelines and checklist
            </Link>
          </div>
          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h3 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <MapIcon className="size-4 shrink-0 text-ember" aria-hidden="true" />
              Or take something planned
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              {openItems} items on the public roadmap are specced and unclaimed — client-facing
              templates, a policy guide, failure case studies, repo CI. Claim one and it is yours.
            </p>
            <Link
              href="/contribute/roadmap"
              className="mt-3 inline-flex min-h-9 items-center text-[0.8125rem] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Open the roadmap board
            </Link>
          </div>
        </div>
      </Section>

      {/* -------------------------------------------------- your feedback */}
      <Section
        width="wide"
        divided
        tight
        eyebrow="Your device"
        title="Feedback you have left"
        description="Every reading page carries a 'Was this helpful?' block. Whatever you mark there collects here, so you can find the pages you flagged, export them, or delete the lot."
      >
        <FeedbackLedger />
      </Section>

      {/* ------------------------------------------------------- what needs */}
      <Section width="wide" surface divided tight>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <div className="min-w-0">
            <h2 className="font-display text-2xl leading-tight font-bold text-ink">
              What the library still needs most
            </h2>
            <p className="mt-2.5 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
              There are {caseCount} case studies, {interviewCount.toLocaleString("en-US")}{" "}
              interview questions and {quizCount.toLocaleString("en-US")} quiz questions here
              already. The gaps are the ones nobody enjoys writing: accounts that went wrong,
              questions from marketplaces outside the US, and the client-facing documents a VA
              hands over on day one.
            </p>
            <ul className="mt-5 flex flex-wrap gap-2">
              {[
                "Failure case studies",
                "UK and DE accounts",
                "Sponsored Brands video",
                "Client onboarding docs",
                "Policy and suspension appeals",
                "Category benchmarks",
              ].map((gap) => (
                <li key={gap}>
                  <span className="inline-flex min-h-8 items-center rounded-full border border-hairline bg-surface px-3 text-[0.8125rem] text-muted">
                    {gap}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex shrink-0 flex-col gap-2 lg:w-56">
            <ButtonLink href="/contribute#case-study" icon={Star}>
              Submit a case study
            </ButtonLink>
            <ButtonLink href={ISSUES_URL} variant="secondary" icon={CircleDot} external>
              Browse open issues
            </ButtonLink>
            <ButtonLink
              href={CONTRIBUTING_URL}
              variant="ghost"
              icon={BookOpenCheck}
              external
            >
              CONTRIBUTING.md
            </ButtonLink>
          </div>
        </div>
      </Section>

      <Container width="wide" className="pb-14">
        <p className="text-xs leading-relaxed text-faint">
          PPC Academy is built from{" "}
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-brand underline underline-offset-2"
          >
            projectamazonph/ppc-tools-for-va
          </a>
          , an MIT-licensed toolkit by and for the Filipino VA community. Contributions are
          credited in the repository&rsquo;s commit history and contributor list.
        </p>
      </Container>
    </>
  );
}
