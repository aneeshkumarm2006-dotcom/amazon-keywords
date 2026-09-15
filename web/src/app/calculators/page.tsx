import {
  ArrowRight,
  Calculator,
  Clock,
  Crosshair,
  Download,
  FileSpreadsheet,
  Gauge,
  ListFilter,
  type LucideIcon,
  Receipt,
  Scale,
  Sigma,
  Terminal,
  TrendingUp,
  Wallet,
} from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { calculatorWorkbooks, calculators } from "@/content/calculators";
import { pageMetadata, withBasePath } from "@/lib/site";
import { formatMinutes, humanize } from "@/lib/utils";

export const metadata = pageMetadata({
  title: "Calculators",
  description:
    "Seven interactive Amazon PPC calculators: ACoS and ROAS with a profitability gauge, bid maths per match type, full unit economics with variants, a 70/20/10 budget planner, a keyword ROI grid with harvest and negate lists, break-even ACoS and TACoS. Every one recalculates live, shows the formula with your numbers in it, and saves your inputs in the browser.",
  path: "/calculators",
  keywords: [
    "Amazon PPC calculator",
    "ACoS calculator",
    "ROAS calculator",
    "break-even ACoS",
    "bid calculator",
    "PPC budget planner",
    "keyword ROI",
    "TACoS",
  ],
});

const ICONS: Record<string, LucideIcon> = {
  Gauge,
  Crosshair,
  Receipt,
  Wallet,
  ListFilter,
  Scale,
  TrendingUp,
};

const workbooks = calculatorWorkbooks();

const CHAIN = [
  {
    step: "1",
    title: "Start with the unit",
    body: "Price minus every cost that is not advertising gives the profit per unit, and that profit as a share of price is the break-even ACoS.",
    href: "/calculators/profit-margin",
    label: "Profit margin",
  },
  {
    step: "2",
    title: "Pick a target",
    body: "Decide how much of that margin advertising is allowed to eat. What is left is the target ACoS — a business decision, not a calculation.",
    href: "/calculators/break-even-acos",
    label: "Break-even ACoS",
  },
  {
    step: "3",
    title: "Turn the target into a bid",
    body: "Target ACoS multiplied by price multiplied by conversion rate is the most you can pay for a click. Discount it, then split it by match type.",
    href: "/calculators/bid",
    label: "Bid calculator",
  },
  {
    step: "4",
    title: "Turn the target into a budget",
    body: "Revenue target multiplied by target ACoS is the monthly spend. Split it 70/20/10 and divide by days to get the daily cap per campaign.",
    href: "/calculators/budget-planner",
    label: "Budget planner",
  },
  {
    step: "5",
    title: "Check what it bought",
    body: "Score the search term report against the target, harvest the winners, negate the waste — then read TACoS to see whether organic is compounding.",
    href: "/calculators/keyword-roi",
    label: "Keyword ROI",
  },
];

export default function CalculatorsPage() {
  const totalMinutes = calculators.reduce((total, entry) => total + entry.minutes, 0);
  const totalFields = calculators.reduce((total, entry) => total + entry.fields.length, 0);
  const totalKb = Math.round(
    workbooks.reduce((total, entry) => total + entry.workbook.bytes, 0) / 1024,
  );

  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Calculators"
        description="The maths a PPC specialist does every day, as seven tools that recalculate as you type. Each one ships with working defaults, shows its formula with your numbers substituted in, explains what the answer means, and remembers your inputs in this browser. No sign-up, no server — everything runs on your machine."
        width="wide"
        breadcrumbs={[{ label: "Calculators" }]}
        actions={
          <ButtonLink href="/scripts" variant="secondary" icon={Terminal}>
            Automation scripts
          </ButtonLink>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Calculators"
            value={calculators.length}
            icon={Calculator}
            tone="brand"
            hint="From a four-minute break-even check to a full keyword grid"
          />
          <StatTile
            label="Inputs across all tools"
            value={totalFields}
            icon={Sigma}
            tone="good"
            hint="Every one labelled, with units and a helper line"
          />
          <StatTile
            label="Time to work through them"
            value={formatMinutes(totalMinutes)}
            icon={Clock}
            tone="info"
            hint="Start with profit margin — everything else depends on it"
          />
          <StatTile
            label="Source workbooks"
            value={`${workbooks.length} files`}
            icon={FileSpreadsheet}
            tone="ember"
            hint={`${totalKb} KB of XLSX, free to download below`}
          />
        </div>

        <Callout variant="info" title="Two rules before you trust any of these" className="mb-8">
          <p>
            <strong>Break-even ACoS equals your profit margin before advertising.</strong> Every tool
            here derives from that one identity, so if the margin is wrong every downstream number
            is wrong. Get the cost stack right first.
          </p>
          <p>
            <strong>A calculator prices a decision, it does not make one.</strong> Max CPC tells you
            what a click is worth at today&rsquo;s conversion rate. Whether to pay it depends on
            stock, season, rank and what the client is actually optimising for.
          </p>
        </Callout>

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {calculators.map((entry) => {
            const Icon = ICONS[entry.iconName] ?? Calculator;
            return (
              <li key={entry.id} className="flex">
                <Link
                  href={entry.href}
                  className="group flex w-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
                      <Icon className="size-[1.125rem] text-brand" aria-hidden="true" />
                    </span>
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <Badge tone="neutral" size="sm">
                        {humanize(entry.level)}
                      </Badge>
                      <Badge tone="neutral" size="sm" variant="outline">
                        {formatMinutes(entry.minutes)}
                      </Badge>
                    </div>
                  </div>

                  <h2 className="mt-3.5 font-display text-base leading-snug font-semibold text-ink">
                    {entry.title}
                  </h2>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed font-medium text-brand">
                    {entry.question}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{entry.summary}</p>

                  <ul className="mt-3.5 grid gap-1.5">
                    {entry.outputs.slice(0, 3).map((output) => (
                      <li
                        key={output}
                        className="flex gap-2 text-[0.8125rem] leading-relaxed text-muted"
                      >
                        <span
                          className="mt-[0.55em] size-1 shrink-0 rounded-full bg-hairline-strong"
                          aria-hidden="true"
                        />
                        <span>{output}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-auto flex items-center gap-1.5 pt-4 text-[0.8125rem] font-medium text-brand">
                    Open the calculator
                    <ArrowRight
                      className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </Container>

      <Section
        eyebrow="How they fit together"
        title="One chain of arithmetic, five links"
        description="These are not seven unrelated tools. Each one hands its answer to the next, and the whole chain starts with a number most sellers get wrong: the true cost of a unit."
        width="wide"
        surface
        divided
        tight
      >
        <ol className="grid gap-3 lg:grid-cols-5">
          {CHAIN.map((link) => (
            <li
              key={link.step}
              className="flex flex-col rounded-xl border border-hairline bg-surface p-4"
            >
              <span className="tabular text-xs font-semibold text-brand">Step {link.step}</span>
              <h3 className="mt-1.5 font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                {link.title}
              </h3>
              <p className="mt-1.5 text-[0.8125rem] leading-relaxed text-muted">{link.body}</p>
              <Link
                href={link.href}
                className="mt-auto inline-flex items-center gap-1 pt-3 text-[0.8125rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {link.label}
                <ArrowRight className="size-3.5" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ol>
      </Section>

      <Section
        eyebrow="Originals"
        title="The spreadsheets these were built from"
        description="The web versions add live recalculation, sensitivity tables and charts. The workbooks are still the right answer when you need to hand a client something they can edit offline, or when you are working without a browser tab to spare."
        width="wide"
        divided
        tight
      >
        <Table caption="The five source workbooks, their sheets and file sizes.">
          <THead>
            <TR>
              <TH>Workbook</TH>
              <TH>Sheets</TH>
              <TH>Web version</TH>
              <TH numeric>Size</TH>
              <TH numeric>Download</TH>
            </TR>
          </THead>
          <TBody>
            {workbooks.map(({ calculator, workbook }) => (
              <TR key={workbook.file}>
                <THRow>
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="size-4 shrink-0 text-good" aria-hidden="true" />
                    {workbook.label}
                  </span>
                  <span className="mt-0.5 block font-mono text-xs font-normal text-faint">
                    {workbook.file}
                  </span>
                </THRow>
                <TD className="text-muted">{workbook.sheets.join(", ")}</TD>
                <TD>
                  <Link
                    href={calculator.href}
                    className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {calculator.title}
                  </Link>
                </TD>
                <TD numeric mono className="text-muted">
                  {Math.round(workbook.bytes / 1024)} KB
                </TD>
                <TD numeric>
                  <ButtonLink
                    href={withBasePath(`/downloads/${workbook.file}`)}
                    variant="secondary"
                    size="sm"
                    icon={Download}
                    external
                    aria-label={`Download ${workbook.label} as XLSX`}
                  >
                    XLSX
                  </ButtonLink>
                </TD>
              </TR>
            ))}
          </TBody>
        </Table>

        <p className="mt-4 text-[0.8125rem] leading-relaxed text-muted">
          Files are served straight from this site with no tracking. Two of the tools above —
          break-even ACoS and TACoS — have no workbook: they were written for the web, because the
          useful part of both is the live comparison rather than the arithmetic.
        </p>
      </Section>
    </>
  );
}
