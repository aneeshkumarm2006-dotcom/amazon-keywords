import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarRange,
  Globe2,
  Lightbulb,
  Quote,
  Scale,
  Store,
  Wallet,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { shortTitle, summarise } from "@/components/case-study/data";
import { RESULT_TYPE_TONE, acosTone } from "@/components/case-study/data";
import { MetricGrid } from "@/components/case-study/MetricGrid";
import { TimelineCharts } from "@/components/case-study/TimelineCharts";
import { PageFeedback } from "@/components/community/PageFeedback";
import { Markdown } from "@/components/doc/Markdown";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { PageProgress } from "@/components/progress/PageProgress";
import { RelatedRail } from "@/components/related/RelatedRail";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import {
  RESULT_TYPE_DESCRIPTION,
  RESULT_TYPE_LABEL,
  caseStudies,
  findCaseStudy,
  relatedCaseStudies,
} from "@/content/case-studies";
import { pageMetadata } from "@/lib/site";
import { articleNode, breadcrumbNode } from "@/lib/structured-data";
import { cn, formatCurrency, formatMinutes, humanize } from "@/lib/utils";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return caseStudies.map((study) => ({ id: study.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const study = findCaseStudy(id);

  if (!study) return { title: "Case study not found" };

  return pageMetadata({
    title: study.title,
    description: study.summary,
    path: `/case-studies/${study.id}`,
    type: "article",
    section: "Case studies",
    published: study.updated,
    modified: study.updated,
    keywords: [...study.tags, study.category, "Amazon PPC case study"],
  });
}

export default async function CaseStudyPage({ params }: Params) {
  const { id } = await params;
  const study = findCaseStudy(id);

  if (!study) notFound();

  const index = caseStudies.findIndex((entry) => entry.id === study.id);
  const previous = index > 0 ? caseStudies[index - 1] : undefined;
  const next = index < caseStudies.length - 1 ? caseStudies[index + 1] : undefined;
  const related = relatedCaseStudies(study.id, 3);
  const summary = summarise(study);
  const tone = RESULT_TYPE_TONE[study.resultType];

  const profile: { icon: typeof Building2; label: string; value: string }[] = [
    { icon: Building2, label: "Client", value: study.client },
    { icon: CalendarRange, label: "Timeframe", value: study.timeframe },
    { icon: Wallet, label: "Ad spend", value: study.adSpend },
    { icon: Globe2, label: "Marketplace", value: study.marketplace },
  ];

  return (
    <>
      <JsonLd
        id="case-study-schema"
        data={[
          articleNode({
            title: study.title,
            description: study.summary,
            path: `/case-studies/${study.id}`,
            section: "Case studies",
            keywords: [...study.tags, study.category],
            published: study.updated,
            modified: study.updated,
            minutes: study.minutes,
          }),
          breadcrumbNode(
            [
              { name: "Case studies", path: "/case-studies" },
              { name: shortTitle(study.title) },
            ],
            `/case-studies/${study.id}`,
          ),
        ]}
      />

      <PageHeader
        eyebrow={`${study.category} · ${RESULT_TYPE_LABEL[study.resultType]}`}
        title={study.title}
        description={study.summary}
        width="wide"
        breadcrumbs={[
          { label: "Case studies", href: "/case-studies" },
          { label: shortTitle(study.title) },
        ]}
        meta={
          <>
            <Badge tone={tone} variant="soft" icon={BadgeCheck}>
              {RESULT_TYPE_LABEL[study.resultType]}
            </Badge>
            <Badge tone="neutral" variant="outline">
              {humanize(study.level)}
            </Badge>
            <Badge tone="neutral">{formatMinutes(study.minutes)} read</Badge>
            <Badge tone="neutral">
              {summary.points} reporting {summary.points === 1 ? "period" : "periods"}
            </Badge>
            {study.source ? (
              <Badge tone="neutral" variant="outline" icon={Quote}>
                Source: {study.source}
              </Badge>
            ) : null}
          </>
        }
        actions={
          <ButtonLink
            href={`/case-studies/compare?ids=${study.id}`}
            variant="secondary"
            icon={Scale}
          >
            Compare this account
          </ButtonLink>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        {/* -------------------------------------------------- account profile */}
        <section aria-labelledby="profile-heading" className="mb-10">
          <h2 id="profile-heading" className="sr-only">
            Account profile
          </h2>
          <dl className="grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
            {profile.map(({ icon: Icon, label, value }) => (
              // A grouping <div> inside a <dl> may contain nothing but <dt> and
              // <dd>, so the icon rides inside the <dt> and is taken out of flow
              // rather than sitting beside it as a third child.
              <div key={label} className="relative min-w-0 bg-surface p-4 pl-[3.75rem]">
                <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
                  <span className="absolute top-[1.125rem] left-4 flex size-8 items-center justify-center rounded-lg bg-surface-2">
                    <Icon className="size-4 text-faint" aria-hidden="true" />
                  </span>
                  {label}
                </dt>
                <dd className="mt-1 text-[0.8125rem] leading-relaxed text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* ------------------------------------------------------ key metrics */}
        <section aria-labelledby="metrics-heading" className="mb-10">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="metrics-heading" className="font-display text-xl font-bold text-ink">
                What changed
              </h2>
              <p className="mt-1.5 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
                Before and after for every metric the account reported. Colour follows the
                direction that is good for that metric, so a falling ACoS and a rising conversion
                rate are both green.
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-2 rounded-lg border border-hairline bg-surface px-3 py-2 text-[0.8125rem]",
              )}
            >
              <span className="text-muted">Blended over the engagement</span>
              <span
                className={cn(
                  "tabular font-semibold",
                  TONE_TEXT[acosTone(summary.blendedAcos)],
                )}
              >
                {summary.blendedAcos}% ACoS
              </span>
              <span className="text-faint" aria-hidden="true">
                ·
              </span>
              <span className="tabular font-semibold text-ink">{summary.blendedRoas}x ROAS</span>
            </span>
          </div>
          <MetricGrid metrics={study.metrics} label="Before and after metrics" />
        </section>

        {/* ----------------------------------------------------------- charts */}
        <section aria-labelledby="charts-heading" className="mb-10">
          <h2 id="charts-heading" className="mb-1.5 font-display text-xl font-bold text-ink">
            The money, period by period
          </h2>
          <p className="mb-4 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
            {formatCurrency(summary.totalSpend, 0)} of ad spend against{" "}
            {formatCurrency(summary.totalRevenue, 0)} of ad revenue across {summary.points}{" "}
            reporting periods, from {summary.firstPeriod} to {summary.lastPeriod}.
          </p>
          <TimelineCharts points={study.timeline} subject={shortTitle(study.title)} />
        </section>

        {/* ------------------------------------------------- narrative + aside */}
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
          <div className="min-w-0 space-y-10">
            <section aria-labelledby="challenge-heading">
              <h2 id="challenge-heading" className="mb-3 font-display text-xl font-bold text-ink">
                The challenge
              </h2>
              <div className="rounded-xl border border-hairline bg-surface p-5 sm:p-6">
                <Markdown>{study.challenge}</Markdown>
              </div>
            </section>

            <section aria-labelledby="approach-heading">
              <h2 id="approach-heading" className="mb-1.5 font-display text-xl font-bold text-ink">
                The approach, step by step
              </h2>
              <p className="mb-4 text-[0.9375rem] leading-relaxed text-muted">
                {study.approach.length} steps in the order they were executed. Every one is
                something a VA can do inside Seller Central, Campaign Manager or a spreadsheet.
              </p>
              <ol className="space-y-3">
                {study.approach.map((step, position) => (
                  <li
                    key={step.slice(0, 48)}
                    className="relative flex gap-4 rounded-xl border border-hairline bg-surface p-4 pl-4 sm:p-5"
                  >
                    <span
                      className={cn(
                        "flex size-8 shrink-0 items-center justify-center rounded-lg text-[0.8125rem] font-semibold",
                        "bg-surface-2 font-mono text-brand tabular-nums",
                      )}
                      aria-hidden="true"
                    >
                      {String(position + 1).padStart(2, "0")}
                    </span>
                    <p className="min-w-0 flex-1 text-[0.9375rem] leading-relaxed text-ink">
                      <span className="sr-only">Step {position + 1}. </span>
                      {step}
                    </p>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="results-heading">
              <h2 id="results-heading" className="mb-3 font-display text-xl font-bold text-ink">
                The results
              </h2>
              <div
                className={cn(
                  "relative overflow-hidden rounded-xl border border-hairline bg-surface p-5 pl-6 sm:p-6 sm:pl-7",
                )}
              >
                <span
                  className={cn("absolute inset-y-0 left-0 w-[3px]", TONE_SOLID_BG[tone])}
                  aria-hidden="true"
                />
                <Markdown>{study.results}</Markdown>
              </div>
            </section>

            <section aria-labelledby="lessons-heading">
              <h2 id="lessons-heading" className="mb-3 font-display text-xl font-bold text-ink">
                What to take from it
              </h2>
              <ul className="divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface">
                {study.lessons.map((lesson) => (
                  <li key={lesson.slice(0, 48)} className="flex gap-3 p-4 sm:px-5">
                    <Lightbulb
                      className="mt-0.5 size-[1.125rem] shrink-0 text-ember"
                      aria-hidden="true"
                    />
                    <p className="min-w-0 text-[0.9375rem] leading-relaxed text-ink">{lesson}</p>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* --------------------------------------------------------- aside */}
          <aside className="min-w-0 space-y-6 lg:sticky lg:top-24 lg:self-start">
            <section
              aria-labelledby="playbook-heading"
              className="rounded-xl border border-hairline bg-surface"
            >
              <h2
                id="playbook-heading"
                className="border-b border-hairline px-4 py-3 font-display text-[0.9375rem] font-semibold text-ink"
              >
                The playbook used
              </h2>
              <ul className="divide-y divide-hairline">
                {study.playbook.map((entry) => (
                  <li key={entry.href}>
                    <Link
                      href={entry.href}
                      className="group flex flex-col gap-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                    >
                      <span className="flex items-center gap-1.5 text-[0.8125rem] font-medium text-ink group-hover:text-brand">
                        {entry.label}
                        <ArrowRight
                          className="size-3.5 shrink-0 text-faint group-hover:text-brand"
                          aria-hidden="true"
                        />
                      </span>
                      <span className="text-xs leading-relaxed text-muted">{entry.note}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>

            <section
              aria-labelledby="context-heading"
              className="rounded-xl border border-hairline bg-surface p-4"
            >
              <h2
                id="context-heading"
                className="mb-2 font-display text-[0.9375rem] font-semibold text-ink"
              >
                {RESULT_TYPE_LABEL[study.resultType]}
              </h2>
              <p className="text-[0.8125rem] leading-relaxed text-muted">
                {RESULT_TYPE_DESCRIPTION[study.resultType]}
              </p>
              <Link
                href={`/case-studies?type=${study.resultType}`}
                className="mt-3 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                See every {RESULT_TYPE_LABEL[study.resultType].toLowerCase()}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </section>

            <section
              aria-labelledby="tags-heading"
              className="rounded-xl border border-hairline bg-surface p-4"
            >
              <h2
                id="tags-heading"
                className="mb-2.5 font-display text-[0.9375rem] font-semibold text-ink"
              >
                Tags
              </h2>
              <ul className="flex flex-wrap gap-1.5">
                {study.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      href={`/case-studies?tag=${encodeURIComponent(tag)}`}
                      className="inline-flex min-h-8 items-center rounded-full border border-hairline bg-surface px-2.5 text-xs font-medium text-muted transition-colors hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {tag}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
                <Store className="size-3.5" aria-hidden="true" />
                {study.category}
              </p>
            </section>
          </aside>
        </div>

        {/* --------------------------------------------------------- related */}
        {related.length > 0 ? (
          <section aria-labelledby="related-heading" className="mt-12 border-t border-hairline pt-8">
            <h2 id="related-heading" className="mb-1.5 font-display text-xl font-bold text-ink">
              Read next
            </h2>
            <p className="mb-5 text-[0.9375rem] text-muted">
              Closest to this one by result type, tags and category.
            </p>
            <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => {
                const entrySummary = summarise(entry);
                const entryTone = RESULT_TYPE_TONE[entry.resultType];
                return (
                  <li key={entry.id} className="flex">
                    <Link
                      href={`/case-studies/${entry.id}`}
                      className="group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border border-hairline bg-surface p-5 pt-6 transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      <span
                        className={cn(
                          "absolute inset-x-0 top-0 h-[3px] opacity-70 transition-opacity group-hover:opacity-100",
                          TONE_SOLID_BG[entryTone],
                        )}
                        aria-hidden="true"
                      />
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Badge tone={entryTone} size="sm">
                          {RESULT_TYPE_LABEL[entry.resultType]}
                        </Badge>
                        <span className="text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
                          {entry.category}
                        </span>
                      </span>
                      <span className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                        {entry.title}
                      </span>
                      <span className="text-[0.8125rem] leading-relaxed text-muted">
                        {entry.summary}
                      </span>
                      <span className="tabular mt-auto pt-2 text-[0.8125rem] text-faint">
                        ACoS {entrySummary.firstAcos}% → {entrySummary.lastAcos}%
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : null}

        {/* ------------------------------------------------------ prev / next */}
        <nav
          aria-label="Case study pagination"
          className="mt-10 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={`/case-studies/${previous.id}`}
              className="group flex flex-col gap-1 rounded-xl border border-hairline bg-surface p-4 transition-colors hover:border-hairline-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
                <ArrowLeft className="size-3.5" aria-hidden="true" />
                Previous
              </span>
              <span className="text-[0.875rem] leading-snug font-medium text-ink group-hover:text-brand">
                {shortTitle(previous.title)}
              </span>
            </Link>
          ) : (
            <span aria-hidden="true" />
          )}
          {next ? (
            <Link
              href={`/case-studies/${next.id}`}
              className="group flex flex-col items-end gap-1 rounded-xl border border-hairline bg-surface p-4 text-right transition-colors hover:border-hairline-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:col-start-2"
            >
              <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
                Next
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </span>
              <span className="text-[0.875rem] leading-snug font-medium text-ink group-hover:text-brand">
                {shortTitle(next.title)}
              </span>
            </Link>
          ) : null}
        </nav>
      </Container>

      <PageProgress href={`/case-studies/${study.id}`} title={study.title} />

      {/* Everything this study already links to — its sibling studies above
          and its playbook in the aside — is excluded so the rail adds
          genuinely new destinations rather than repeating the page. */}
      <RelatedRail
        href={`/case-studies/${study.id}`}
        exclude={[
          ...related.map((entry) => `/case-studies/${entry.id}`),
          ...study.playbook.map((entry) => entry.href),
        ]}
      />

      <PageFeedback
        href={`/case-studies/${study.id}`}
        title={study.title}
        kind="Case study"
      />
    </>
  );
}
