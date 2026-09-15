import {
  Award,
  BookOpenCheck,
  ExternalLink,
  GitCommitHorizontal,
  GitPullRequest,
  HeartHandshake,
  Scale,
  Users,
} from "lucide-react";
import Link from "next/link";

import {
  CONTRIBUTING_MARKDOWN,
  CONTRIBUTING_URL,
  GROWTH_TARGETS,
  PULLS_URL,
  REPO_URL,
  StandardsChecklist,
} from "@/components/community";
import { Markdown } from "@/components/doc/Markdown";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Contribution guidelines",
  description:
    "The contributing guide for the PPC tools toolkit: how to report issues, suggest improvements and add content, the bar each resource type has to clear, and the code of conduct.",
  path: "/contribute/guidelines",
  type: "article",
  section: "Contribute",
  keywords: [
    "contributing guidelines",
    "Amazon PPC toolkit",
    "open source contribution",
    "content standards",
    "code of conduct",
  ],
});

/** How contributors are credited. Everything here is a repo fact, not a promise. */
const RECOGNITION = [
  {
    icon: GitCommitHorizontal,
    title: "Your commits carry your name",
    detail:
      "Merged pull requests keep their author. You appear in the repository's contributor list and in the blame on every line you wrote — the record follows you to the next client or employer.",
  },
  {
    icon: Award,
    title: "Resources credit their source",
    detail:
      "The code of conduct is explicit: credit original sources. A case study you submit keeps your attribution on the entry, and questions sourced from a real interview say so.",
  },
  {
    icon: Scale,
    title: "MIT licensed, both ways",
    detail:
      "The toolkit is MIT licensed, so what you contribute stays free for every VA who comes after you — and what you take from it is yours to use on client work without asking.",
  },
  {
    icon: HeartHandshake,
    title: "No gatekeeping",
    detail:
      "Straight from the code of conduct: be respectful and constructive, focus on helping VAs succeed, share knowledge freely. A first submission is reviewed the same way as a tenth.",
  },
];

export default function GuidelinesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Community"
        title="Contribution guidelines"
        description="The full contributing guide from the source repository, plus a checklist you can work through before you submit. Read the section for your resource type — the bar is different for a case study than for a quiz question."
        width="wide"
        breadcrumbs={[{ label: "Contribute", href: "/contribute" }, { label: "Guidelines" }]}
        meta={
          <>
            <Badge tone="neutral" variant="outline">
              Source: .github/CONTRIBUTING.md
            </Badge>
            <Badge tone="neutral" variant="outline">
              MIT licensed
            </Badge>
          </>
        }
        actions={
          <>
            <ButtonLink href="/contribute" variant="secondary" icon={BookOpenCheck}>
              Back to the forms
            </ButtonLink>
            <ButtonLink href={CONTRIBUTING_URL} icon={ExternalLink} external>
              View on GitHub
            </ButtonLink>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_17rem] lg:gap-10">
          {/* ------------------------------------------------ the guide */}
          <div className="min-w-0">
            <article className="rounded-2xl border border-hairline bg-surface p-5 sm:p-7">
              <div className="mb-5 border-b border-hairline pb-5">
                <h2 className="font-display text-2xl leading-tight font-bold text-ink">
                  Contributing to PPC Tools for VA
                </h2>
                <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
                  Thank you for your interest in contributing. This toolkit is built by and for
                  the Filipino VA community.
                </p>
              </div>
              <Markdown>{CONTRIBUTING_MARKDOWN}</Markdown>
            </article>

            <Callout variant="info" title="One difference on this site" className="mt-6">
              <p>
                The guide asks you to open an issue with details and screenshots. The{" "}
                <Link href="/contribute">contribution forms</Link> do the first half for you —
                they compose the issue body in the format a maintainer expects. Add the
                screenshots after the issue opens.
              </p>
            </Callout>
          </div>

          {/* ------------------------------------------------------ aside */}
          <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:self-start">
            <section className="rounded-xl border border-hairline bg-surface p-5">
              <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                The short version
              </h2>
              <ul className="mt-3 space-y-2.5 text-[0.8125rem] leading-relaxed text-muted">
                <li className="flex gap-2.5">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>Real numbers, or no numbers.</span>
                </li>
                <li className="flex gap-2.5">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>Say what did not work, not only what did.</span>
                </li>
                <li className="flex gap-2.5">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>Anonymise clients. Credit sources.</span>
                </li>
                <li className="flex gap-2.5">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>Test every formula before you submit it.</span>
                </li>
                <li className="flex gap-2.5">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>No theory without practice.</span>
                </li>
              </ul>
            </section>

            <section className="rounded-xl border border-hairline bg-surface p-5">
              <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                Sending a pull request
              </h2>
              <ol className="mt-3 space-y-2 text-[0.8125rem] leading-relaxed text-muted">
                {[
                  "Fork the repository",
                  "Create a feature branch",
                  "Make your changes",
                  "Test thoroughly — especially Excel formulas",
                  "Submit a pull request",
                ].map((step, index) => (
                  <li key={step} className="flex gap-2.5">
                    <span
                      className="font-mono text-xs text-faint tabular-nums"
                      aria-hidden="true"
                    >
                      {index + 1}.
                    </span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <ButtonLink
                href={PULLS_URL}
                variant="secondary"
                size="sm"
                icon={GitPullRequest}
                external
                className="mt-4"
              >
                Open pull requests
              </ButtonLink>
            </section>
          </aside>
        </div>
      </Container>

      {/* --------------------------------------------------- the checklist */}
      <Section
        width="wide"
        surface
        divided
        tight
        eyebrow="Before you submit"
        title="Content standards checklist"
        description="Every line restates a rule from the guide above. Tick as you go — the ticks are saved in this browser, so you can write a long case study across two sittings."
      >
        <StandardsChecklist />
      </Section>

      {/* -------------------------------------------------------- credit */}
      <Section
        width="wide"
        divided
        tight
        eyebrow="Recognition"
        title="What you get out of contributing"
        description="Nobody is paying for submissions. Here is the honest list of what a merged contribution is actually worth."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {RECOGNITION.map((entry) => {
            const Icon = entry.icon;
            return (
              <li
                key={entry.title}
                className="flex min-w-0 gap-4 rounded-xl border border-hairline bg-surface p-5"
              >
                <span
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                  aria-hidden="true"
                >
                  <Icon className="size-[1.125rem] text-ember" />
                </span>
                <div className="min-w-0">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                    {entry.title}
                  </h3>
                  <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                    {entry.detail}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>

        <div className="mt-8 min-w-0 rounded-xl border border-hairline bg-surface p-5 sm:p-6">
          <h3 className="flex items-center gap-2 font-display text-[1.0625rem] font-semibold text-ink">
            <Users className="size-4 shrink-0 text-brand" aria-hidden="true" />
            Where the project is trying to get to
          </h3>
          <p className="mt-2 max-w-2xl text-[0.875rem] leading-relaxed text-muted">
            The published six-month targets from <code>EXPANSION-PLAN.md</code>. They are goals,
            not a scoreboard — but they are the reason a fifth contributor matters more here than
            on a repo with five hundred.
          </p>

          <div className="scroll-well mt-4 overflow-x-auto">
            <table className="w-full min-w-[26rem] border-collapse text-left text-sm">
              <caption className="sr-only">
                Published growth targets for the PPC tools repository
              </caption>
              <thead>
                <tr className="border-b border-hairline">
                  <th scope="col" className="py-2.5 pr-4 font-medium text-muted">
                    Metric
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium text-muted">
                    At launch
                  </th>
                  <th scope="col" className="py-2.5 pr-4 text-right font-medium text-muted">
                    3 months
                  </th>
                  <th scope="col" className="py-2.5 text-right font-medium text-muted">
                    6 months
                  </th>
                </tr>
              </thead>
              <tbody>
                {GROWTH_TARGETS.map((row) => (
                  <tr key={row.metric} className="border-b border-hairline last:border-0">
                    <th scope="row" className="py-2.5 pr-4 font-medium text-ink">
                      {row.metric}
                    </th>
                    <td className="tabular py-2.5 pr-4 text-right font-mono text-muted">
                      {row.current}
                    </td>
                    <td className="tabular py-2.5 pr-4 text-right font-mono text-muted">
                      {row.threeMonths}
                    </td>
                    <td className="tabular py-2.5 text-right font-mono font-semibold text-ink">
                      {row.sixMonths}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-2.5">
          <ButtonLink href="/contribute" icon={BookOpenCheck}>
            Start a submission
          </ButtonLink>
          <ButtonLink href="/contribute/roadmap" variant="secondary">
            See what needs building
          </ButtonLink>
          <ButtonLink href={REPO_URL} variant="ghost" icon={ExternalLink} external>
            projectamazonph/ppc-tools-for-va
          </ButtonLink>
        </div>
      </Section>
    </>
  );
}
