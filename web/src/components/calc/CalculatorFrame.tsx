import {
  ArrowLeft,
  ArrowRight,
  Calculator,
  CircleHelp,
  Clock,
  Download,
  FileSpreadsheet,
  Sigma,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { RelatedRail } from "@/components/related/RelatedRail";
import { JsonLd } from "@/components/seo/JsonLd";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { calculators, type CalculatorEntry } from "@/content/calculators";
import { withBasePath } from "@/lib/site";
import { breadcrumbNode, calculatorNode } from "@/lib/structured-data";
import { formatMinutes, humanize } from "@/lib/utils";

/**
 * The page chrome every calculator route shares.
 *
 * A server component on purpose: the header, the reference copy and the
 * prev/next navigation are static, so only the tool itself — passed in as
 * `children` — ships as a client island.
 */

export function CalculatorFrame({
  calculator,
  children,
}: {
  calculator: CalculatorEntry;
  children: ReactNode;
}) {
  const index = calculators.findIndex((entry) => entry.id === calculator.id);
  const previous = index > 0 ? calculators[index - 1] : undefined;
  const next = index >= 0 && index < calculators.length - 1 ? calculators[index + 1] : undefined;

  return (
    <>
      <JsonLd
        id="calculator-schema"
        data={[
          calculatorNode({
            name: calculator.title,
            description: `${calculator.question} ${calculator.summary}`,
            path: calculator.href,
          }),
          breadcrumbNode(
            [{ name: "Calculators", path: "/calculators" }, { name: calculator.title }],
            calculator.href,
          ),
        ]}
      />

      <PageHeader
        eyebrow="Calculator"
        title={calculator.title}
        description={calculator.summary}
        width="wide"
        breadcrumbs={[{ label: "Calculators", href: "/calculators" }, { label: calculator.title }]}
        meta={
          <>
            <Badge tone="brand" icon={CircleHelp}>
              {humanize(calculator.level)}
            </Badge>
            <Badge tone="neutral" icon={Clock}>
              {formatMinutes(calculator.minutes)}
            </Badge>
            {calculator.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} tone="neutral" variant="outline">
                {tag}
              </Badge>
            ))}
          </>
        }
        actions={
          calculator.workbook ? (
            <ButtonLink
              href={withBasePath(`/downloads/${calculator.workbook.file}`)}
              variant="secondary"
              icon={Download}
              external
            >
              Download the workbook
            </ButtonLink>
          ) : (
            <ButtonLink href="/calculators" variant="secondary" icon={Calculator}>
              All calculators
            </ButtonLink>
          )
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-6 rounded-xl border border-hairline bg-surface px-4 py-3.5 sm:px-5">
          <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
            The question this answers
          </p>
          <p className="mt-1 font-display text-[1.0625rem] leading-snug font-semibold text-ink">
            {calculator.question}
          </p>
        </div>

        {children}

        <section className="mt-10 grid gap-5 lg:grid-cols-2">
          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <Sigma className="size-4 text-brand" aria-hidden="true" />
              Formulas used
            </h2>
            <dl className="mt-3.5 grid gap-2.5 [&>*]:min-w-0">
              {calculator.formulas.map((formula) => (
                <div
                  key={formula.label}
                  className="rounded-lg border border-hairline bg-surface-2 px-3.5 py-2.5"
                >
                  <dt className="text-[0.8125rem] font-medium text-ink">{formula.label}</dt>
                  <dd className="scroll-well mt-1 overflow-x-auto font-mono text-xs whitespace-nowrap text-muted">
                    {formula.expression}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="min-w-0 rounded-xl border border-hairline bg-surface p-5">
            <h2 className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink">
              <Calculator className="size-4 text-brand" aria-hidden="true" />
              What it gives you
            </h2>
            <ul className="mt-3.5 grid gap-2">
              {calculator.outputs.map((output) => (
                <li key={output} className="flex gap-2.5 text-[0.875rem] leading-relaxed text-muted">
                  <span
                    className="mt-[0.5em] size-1.5 shrink-0 rounded-full bg-brand"
                    aria-hidden="true"
                  />
                  <span>{output}</span>
                </li>
              ))}
            </ul>

            {calculator.workbook ? (
              <div className="mt-5 flex flex-wrap items-center gap-3 border-t border-hairline pt-4">
                <FileSpreadsheet className="size-4 shrink-0 text-faint" aria-hidden="true" />
                <div className="min-w-0 flex-1">
                  <p className="text-[0.8125rem] font-medium text-ink">
                    {calculator.workbook.label}
                  </p>
                  <p className="text-xs text-muted">
                    {calculator.workbook.sheets.join(" · ")} ·{" "}
                    {Math.round(calculator.workbook.bytes / 1024)} KB
                  </p>
                </div>
                <ButtonLink
                  href={withBasePath(`/downloads/${calculator.workbook.file}`)}
                  variant="secondary"
                  size="sm"
                  icon={Download}
                  external
                >
                  XLSX
                </ButtonLink>
              </div>
            ) : null}
          </div>
        </section>

        <nav
          aria-label="Other calculators"
          className="mt-8 grid gap-3 border-t border-hairline pt-6 sm:grid-cols-2"
        >
          {previous ? (
            <Link
              href={previous.href}
              className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
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
              className="group flex items-center gap-3 rounded-xl border border-hairline bg-surface p-4 text-right transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:justify-end"
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

      {/* The pager above already covers the neighbouring calculators, so the
          rail is told to skip them and reach into the rest of the library. */}
      <RelatedRail
        href={calculator.href}
        exclude={[previous?.href, next?.href].filter((href): href is string => Boolean(href))}
      />
    </>
  );
}
