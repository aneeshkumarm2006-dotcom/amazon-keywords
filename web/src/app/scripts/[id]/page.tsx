import {
  ArrowLeft,
  ArrowRight,
  Clock,
  MonitorPlay,
  Repeat,
  Terminal,
  Timer,
  Wrench,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { RelatedRail } from "@/components/related/RelatedRail";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { LANGUAGES, findScript, relatedScripts, scripts } from "@/content/scripts";
import { pageMetadata } from "@/lib/site";
import { articleNode, breadcrumbNode } from "@/lib/structured-data";
import { formatMinutes, humanize } from "@/lib/utils";

import { PrereqChecklist } from "../_components/PrereqChecklist";
import { ScriptCode } from "../_components/ScriptCode";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return scripts.map((script) => ({ id: script.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const script = findScript(id);
  if (!script) return { title: "Script not found" };

  return pageMetadata({
    title: script.title,
    description: `${script.summary} ${LANGUAGES[script.language].label}, ${script.prerequisites.length} prerequisites, full code with a line-by-line explanation.`,
    socialTitle: `${script.title} · PPC Academy`,
    path: `/scripts/${script.id}`,
    type: "article",
    section: "Automation scripts",
    keywords: [...script.tags, LANGUAGES[script.language].label, "Amazon PPC automation"],
  });
}

export default async function ScriptPage({ params }: Params) {
  const { id } = await params;
  const script = findScript(id);
  if (!script) notFound();

  const meta = LANGUAGES[script.language];
  const index = scripts.findIndex((entry) => entry.id === script.id);
  const previous = index > 0 ? scripts[index - 1] : undefined;
  const next = index < scripts.length - 1 ? scripts[index + 1] : undefined;
  const related = relatedScripts(script.id);

  const facts = [
    { icon: Wrench, label: "Replaces", value: script.automates },
    { icon: Repeat, label: "Run it", value: script.frequency },
    { icon: Timer, label: "Gives back", value: script.saves },
    { icon: MonitorPlay, label: "Runs in", value: meta.runsIn },
  ];

  return (
    <>
      <JsonLd
        id="script-schema"
        data={[
          articleNode({
            title: script.title,
            description: script.summary,
            path: `/scripts/${script.id}`,
            section: "Automation scripts",
            keywords: [...script.tags, meta.label],
            minutes: script.minutes,
          }),
          breadcrumbNode(
            [{ name: "Scripts", path: "/scripts" }, { name: script.title }],
            `/scripts/${script.id}`,
          ),
        ]}
      />

      <PageHeader
        eyebrow={meta.label}
        title={script.title}
        description={script.summary}
        width="wide"
        breadcrumbs={[{ label: "Scripts", href: "/scripts" }, { label: script.title }]}
        meta={
          <>
            <Badge tone="brand">{humanize(script.difficulty)}</Badge>
            <Badge tone="neutral" icon={Clock}>
              {formatMinutes(script.minutes)} to set up
            </Badge>
            <Badge tone="neutral" variant="outline">
              {script.code.trim().split("\n").length} lines
            </Badge>
            {script.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} tone="neutral" variant="outline">
                {tag}
              </Badge>
            ))}
          </>
        }
        actions={
          <ButtonLink href="/scripts" variant="secondary" icon={Terminal}>
            All scripts
          </ButtonLink>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <dl className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 [&>*]:min-w-0">
          {facts.map((fact) => (
            <div
              key={fact.label}
              className="rounded-xl border border-hairline bg-surface p-4"
            >
              <dt className="flex items-center gap-2 text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
                <fact.icon className="size-3.5 text-faint" aria-hidden="true" />
                {fact.label}
              </dt>
              <dd className="mt-1.5 text-[0.875rem] leading-relaxed text-ink">{fact.value}</dd>
            </div>
          ))}
        </dl>

        <div className="mb-8">
          <PrereqChecklist scriptId={script.id} prerequisites={script.prerequisites} />
        </div>

        <ScriptCode
          code={script.code}
          language={script.language}
          fileName={script.fileName}
          explanation={script.explanation}
        />

        <section className="mt-10 grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] xl:items-start [&>*]:min-w-0">
          <div className="min-w-0 rounded-xl border border-hairline bg-surface">
            <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
              <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                How to run this
              </h2>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                First run takes about {formatMinutes(script.minutes)}. Every run after that is a
                couple of minutes.
              </p>
            </header>
            <ol className="divide-y divide-hairline">
              {script.steps.map((step, stepIndex) => (
                <li key={step.title} className="flex gap-3.5 px-4 py-4 sm:px-5">
                  <span className="tabular flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-semibold text-brand">
                    {stepIndex + 1}
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-display text-[0.875rem] font-semibold text-ink">
                      {step.title}
                    </h3>
                    <p className="mt-1 text-[0.875rem] leading-relaxed text-muted">
                      {step.detail}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>

          <div className="min-w-0 rounded-xl border border-hairline bg-surface">
            <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
              <h2 className="font-display text-[0.9375rem] font-semibold text-ink">
                What you should see
              </h2>
              <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                If your output looks nothing like this, the column names are the first thing to
                check.
              </p>
            </header>
            <div className="p-4 sm:p-5">
              <div className="scroll-well overflow-x-auto rounded-lg border border-hairline bg-surface-2 p-3.5">
                <pre className="font-mono text-[0.75rem] leading-[1.7] whitespace-pre text-ink">
                  {script.expectedOutput}
                </pre>
              </div>
              <p className="mt-3.5 text-[0.875rem] leading-relaxed text-muted">
                {script.outputNote}
              </p>
            </div>
          </div>
        </section>

        {related.length > 0 ? (
          <section className="mt-10">
            <h2 className="font-display text-lg font-semibold text-ink">Pairs well with</h2>
            <ul className="mt-4 grid gap-3 md:grid-cols-3 [&>*]:min-w-0">
              {related.map((entry) => (
                <li key={entry.id} className="flex">
                  <Link
                    href={entry.href}
                    className="group flex w-full flex-col rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="text-[0.6875rem] tracking-[0.08em] text-muted uppercase">
                      {LANGUAGES[entry.language].label}
                    </span>
                    <span className="mt-1 font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                      {entry.title}
                    </span>
                    <span className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">
                      {entry.automates}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        <nav
          aria-label="Other scripts"
          className="mt-8 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={previous.href}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <ArrowLeft className="size-4 shrink-0 text-faint" aria-hidden="true" />
              <span className="min-w-0">
                <span className="block text-[0.6875rem] tracking-[0.08em] text-muted uppercase">
                  Previous
                </span>
                <span className="block truncate font-display text-[0.9375rem] font-semibold text-ink">
                  {previous.title}
                </span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link
              href={next.href}
              className="flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4 text-right transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:justify-end"
            >
              <span className="min-w-0">
                <span className="block text-[0.6875rem] tracking-[0.08em] text-muted uppercase">
                  Next
                </span>
                <span className="block truncate font-display text-[0.9375rem] font-semibold text-ink">
                  {next.title}
                </span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
            </Link>
          ) : null}
        </nav>
      </Container>

      <RelatedRail
        href={`/scripts/${script.id}`}
        exclude={related.map((entry) => entry.href)}
      />
    </>
  );
}
