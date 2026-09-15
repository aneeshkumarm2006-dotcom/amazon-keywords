import {
  ArrowRight,
  Calculator,
  ClipboardList,
  MessageSquareQuote,
  Search,
  Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { Section } from "@/components/layout/Section";
import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card, CardLink } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import { TOTAL_INTERVIEW_QUESTIONS } from "@/content/interviews";
import { TOTAL_QUESTIONS } from "@/content/quizzes";
import { kindsInOrder, resourceCount } from "@/content/registry";
import { pageMetadata } from "@/lib/site";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

export const metadata = pageMetadata({
  title: "PPC Academy — Amazon PPC training for Filipino VAs",
  // The home page already carries the site name; no "· PPC Academy" suffix.
  absoluteTitle: true,
  socialTitle: "PPC Academy — Amazon PPC training for Filipino VAs",
  description:
    "Work through the same system a $500K/month Amazon PPC manager uses: graded quizzes, interview answers, account case studies, SOPs, workflows, templates and live metric calculators. Free and open source.",
  path: "/",
  keywords: [
    "Amazon PPC training",
    "Amazon PPC for virtual assistants",
    "Filipino VA PPC",
    "Sponsored Products course",
    "ACoS",
    "PPC specialist career",
  ],
});

/* ------------------------------------------------------------------ *
 * Static content, all sourced from ../ppc-tools-for-va
 * ------------------------------------------------------------------ */

const CREDIBILITY: { value: string; label: string }[] = [
  { value: "10+ yrs", label: "Remote eCommerce" },
  { value: "$500K+/mo", label: "Managed ad spend" },
  { value: "6+ yrs", label: "Amazon Advertising" },
];

/**
 * Every number here is read from the live registry or from a content module's
 * own total — nothing is typed by hand. Add a case study and this band counts
 * it on the next build.
 */
const LIBRARY_STATS: {
  label: string;
  value: number;
  unit?: string;
  href: string;
  hint: string;
}[] = [
  {
    label: "Quiz questions",
    value: TOTAL_QUESTIONS,
    href: "/quizzes",
    hint: "5 difficulty levels",
  },
  {
    label: "Interview Q&As",
    value: TOTAL_INTERVIEW_QUESTIONS,
    href: "/interviews",
    hint: "9 competencies",
  },
  {
    label: "Case studies",
    value: resourceCount("case-study"),
    href: "/case-studies",
    hint: "Real before / after",
  },
  { label: "SOPs", value: resourceCount("sop"), href: "/sops", hint: "Daily to per-client" },
  {
    label: "Workflows",
    value: resourceCount("workflow"),
    href: "/workflows",
    hint: "Decision trees",
  },
  {
    label: "Templates",
    value: resourceCount("template"),
    href: "/templates",
    hint: "Builds, reports, audits",
  },
  {
    label: "Calculators",
    value: resourceCount("calculator"),
    href: "/calculators",
    hint: "Run the maths live",
  },
  {
    label: "Glossary terms",
    value: resourceCount("glossary"),
    href: "/glossary",
    hint: "Formula + worked example",
  },
];

const START_STEPS: {
  step: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  icon: LucideIcon;
  tone: Tone;
}[] = [
  {
    step: "01",
    title: "Find your baseline",
    description: `${TOTAL_QUESTIONS} questions, from match types to a client asking why ACoS doubled. Every answer comes with the reasoning, so a wrong pick teaches you something.`,
    href: "/quizzes",
    cta: "Take the quiz",
    icon: Target,
    tone: "brand",
  },
  {
    step: "02",
    title: "Learn the daily system",
    description:
      "Eight SOPs and six workflow maps: the 15-minute morning health check, weekly search-term analysis, bid passes, launches, restructures and escalation.",
    href: "/sops",
    cta: "Open the SOPs",
    icon: ClipboardList,
    tone: "info",
  },
  {
    step: "03",
    title: "Prove the maths",
    description:
      "Break-even ACoS, ROAS, bid adjustments and budget splits. Get fast enough that you can answer a margin question out loud on a client call.",
    href: "/calculators",
    cta: "Run the numbers",
    icon: Calculator,
    tone: "good",
  },
  {
    step: "04",
    title: "Go get the role",
    description: `${TOTAL_INTERVIEW_QUESTIONS} interview questions with ideal answers, key points and red flags, plus resume, portfolio and rate-negotiation guides built for remote hiring.`,
    href: "/interviews",
    cta: "Prepare for interviews",
    icon: MessageSquareQuote,
    tone: "ember",
  },
];

const FORMULAS: {
  name: string;
  abbr: string;
  formula: string;
  worked: string;
  meaning: string;
  tone: Tone;
}[] = [
  {
    name: "Advertising Cost of Sale",
    abbr: "ACoS",
    formula: "(Ad Spend ÷ Ad Revenue) × 100",
    worked: "($50 ÷ $200) × 100 = 25%",
    meaning:
      "The share of ad revenue eaten by ads. Compare it to your profit margin, never to someone else’s benchmark.",
    tone: "brand",
  },
  {
    name: "Return on Ad Spend",
    abbr: "ROAS",
    formula: "Ad Revenue ÷ Ad Spend",
    worked: "$200 ÷ $50 = 4.0x",
    meaning:
      "ACoS inverted. Useful when a client thinks in multiples rather than percentages — 25% ACoS is the same thing as 4.0x ROAS.",
    tone: "info",
  },
  {
    name: "Total Advertising Cost of Sale",
    abbr: "TACoS",
    formula: "Ad Spend ÷ Total Sales",
    worked: "$50 ÷ $500 = 10%",
    meaning:
      "Ad spend against organic plus ad-attributed revenue. A falling TACoS while sales grow is the signal that ads are feeding organic rank.",
    tone: "ember",
  },
];

const ACOS_BANDS: { range: string; tone: Tone; verdict: string; action: string }[] = [
  {
    range: "≤ 28%",
    tone: "good",
    verdict: "Profitable with headroom",
    action: "Raise bids 10–15% and take more impression share.",
  },
  {
    range: "28% – 35%",
    tone: "warn",
    verdict: "Profitable but thin",
    action: "Hold bids. Fix conversion rate before you spend more.",
  },
  {
    range: "> 35%",
    tone: "bad",
    verdict: "Losing money on ad sales",
    action: "Cut the bid 20–30%, or negate if two weeks do not move it.",
  },
];

const TOOL_STACK: {
  tool: string;
  price: string;
  bestFor: string;
  level: string;
  tone: Tone;
}[] = [
  {
    tool: "Amazon Campaign Manager",
    price: "Free",
    bestFor: "Learning basics",
    level: "Manual",
    tone: "neutral",
  },
  { tool: "Zon.Tools", price: "$9/mo", bestFor: "Budget beginners", level: "Rules-based", tone: "info" },
  { tool: "BidX", price: "$49/mo", bestFor: "Small-mid sellers", level: "Rules-based", tone: "info" },
  {
    tool: "PPC Entourage",
    price: "$50/mo",
    bestFor: "Budget-conscious",
    level: "Rules-based",
    tone: "info",
  },
  { tool: "Ad Badger", price: "$99/mo", bestFor: "Negative keywords", level: "Rules + AI", tone: "brand" },
  {
    tool: "Helium 10 Adtomic",
    price: "$149/mo",
    bestFor: "All-in-one",
    level: "AI-powered",
    tone: "brand",
  },
  {
    tool: "Teikametrics",
    price: "Custom",
    bestFor: "Multi-marketplace",
    level: "AI-driven",
    tone: "ember",
  },
  { tool: "Perpetua", price: "Custom", bestFor: "Enterprise", level: "Full AI", tone: "ember" },
  {
    tool: "Quartile",
    price: "Custom",
    bestFor: "$100K+/mo spend",
    level: "Full AI",
    tone: "ember",
  },
];

/* ------------------------------------------------------------------ *
 * Page
 * ------------------------------------------------------------------ */

function Hero() {
  return (
    <div className="relative overflow-hidden border-b border-hairline bg-surface">
      <div className="grid-field absolute inset-0" aria-hidden="true" />
      <div
        className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-brand/40 to-transparent dark:via-brand/60"
        aria-hidden="true"
      />

      <Container width="wide" className="relative py-14 sm:py-20 lg:py-24">
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_25rem] lg:gap-16">
          <div>
            <p className="font-mono text-[0.6875rem] font-medium tracking-[0.16em] text-brand uppercase">
              Free · Open source · MIT licensed
            </p>

            <h1 className="mt-4 text-[2.125rem] leading-[1.08] font-bold tracking-tight text-ink sm:text-5xl lg:text-[3.25rem]">
              Go from general VA to{" "}
              <span className="text-brand underline decoration-ember/70 decoration-[3px] underline-offset-[0.2em]">
                Amazon PPC specialist
              </span>
              .
            </h1>

            <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">
              Not a course you watch. The actual system a PPC manager runs: the 15-minute morning
              health check, the search-term report you have to action by Friday, the bid maths you
              defend on a client call, and the interview answer that gets you hired.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <ButtonLink href="/quizzes" size="lg" icon={Target}>
                Start the quiz
              </ButtonLink>
              <ButtonLink href="/search" size="lg" variant="secondary" icon={Search}>
                Browse resources
              </ButtonLink>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-1 gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-3">
              {CREDIBILITY.map((item) => (
                <div key={item.label} className="bg-surface px-4 py-3.5">
                  <dt className="text-[0.6875rem] tracking-[0.08em] text-muted uppercase">
                    {item.label}
                  </dt>
                  <dd className="tabular mt-1 text-lg font-semibold text-ink">{item.value}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-3 text-xs text-faint">
              Built from the working toolkit of Ryan Roland Dabao, Amazon PPC Lead Manager, Iloilo
              City.
            </p>
          </div>

          <Card as="panel" className="overflow-hidden">
            <div className="flex items-center justify-between gap-3 border-b border-hairline bg-surface-2 px-5 py-3">
              <p className="font-display text-sm font-semibold text-ink">
                Worked example — one keyword, one week
              </p>
              <Badge tone="brand" size="sm" variant="outline">
                Level 1
              </Badge>
            </div>

            <dl className="divide-y divide-hairline">
              {[
                { label: "Ad spend", value: "$50.00" },
                { label: "Ad revenue", value: "$200.00" },
                { label: "Product margin", value: "35%" },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between px-5 py-2.5">
                  <dt className="text-[0.8125rem] text-muted">{row.label}</dt>
                  <dd className="tabular text-sm font-medium text-ink">{row.value}</dd>
                </div>
              ))}
            </dl>

            <div className="border-t border-hairline bg-canvas px-5 py-4">
              <p className="font-mono text-[0.6875rem] tracking-[0.12em] text-faint uppercase">
                Results
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-good/30 bg-good-soft px-3 py-2.5">
                  <p className="text-[0.6875rem] tracking-[0.06em] text-muted uppercase">ACoS</p>
                  <p className="tabular mt-0.5 text-xl font-semibold text-good">25.0%</p>
                </div>
                <div className="rounded-lg border border-good/30 bg-good-soft px-3 py-2.5">
                  <p className="text-[0.6875rem] tracking-[0.06em] text-muted uppercase">ROAS</p>
                  <p className="tabular mt-0.5 text-xl font-semibold text-good">4.0x</p>
                </div>
              </div>
              <p className="mt-3.5 text-[0.8125rem] leading-relaxed text-muted">
                Break-even ACoS equals the margin, so 35% is the line. At 25% this keyword clears it
                by <span className="tabular font-semibold text-ink">10 points</span> — that is room
                to bid up, not a reason to celebrate and move on.
              </p>
              <Link
                href="/calculators"
                className="mt-3 inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                Open the ACoS calculator
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </Card>
        </div>
      </Container>
    </div>
  );
}

function StatBand() {
  return (
    <div className="border-b border-hairline bg-canvas">
      <Container width="wide" className="py-10 sm:py-12">
        <div className="mb-6 flex flex-wrap items-baseline justify-between gap-3">
          <h2 className="font-display text-sm font-semibold tracking-[0.08em] text-muted uppercase">
            What is in the library
          </h2>
          <p className="text-xs text-faint">
            Counted from the registry at build time, so these never drift from the pages.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {LIBRARY_STATS.map((stat) => (
            <StatTile
              key={stat.label}
              compact
              label={stat.label}
              value={stat.value}
              hint={stat.hint}
              href={stat.href}
            />
          ))}
        </div>
      </Container>
    </div>
  );
}

function StartHere() {
  return (
    <Section
      eyebrow="Start here"
      title="Four steps, in this order"
      description="Most VAs stall because they learn the vocabulary without ever running the loop. This is the loop."
      width="wide"
      id="start-here"
    >
      <ol className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {START_STEPS.map((step) => {
          const Icon = step.icon;
          return (
            <li key={step.step}>
              <CardLink href={step.href} className="flex h-full flex-col p-5">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-lg",
                      TONE_SOFT_BG[step.tone],
                    )}
                  >
                    <Icon
                      className={cn("size-[1.125rem]", TONE_ICON[step.tone])}
                      aria-hidden="true"
                    />
                  </span>
                  {/* `--hairline-strong` is a border token: 1.56:1 as text.
                      The step number is content, so it uses a text token. */}
                  <span className="tabular text-2xl font-semibold text-faint">
                    {step.step}
                  </span>
                </div>

                <h3 className="mt-4 font-display text-base leading-snug font-semibold text-ink">
                  {step.title}
                </h3>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{step.description}</p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  {step.cta}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </CardLink>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}

function ResourceGrid() {
  const kinds = kindsInOrder();

  return (
    <Section
      eyebrow="The library"
      title="Every kind of resource, in one place"
      description="Thirteen resource types, each one built to be used during real client work rather than read once and forgotten."
      width="wide"
      surface
      divided
      link={{ href: "/search", label: "Search everything" }}
    >
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kinds.map((meta) => {
          const Icon = meta.icon;
          const count = resourceCount(meta.kind);
          return (
            <li key={meta.kind}>
              <CardLink href={meta.href} className="flex h-full flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={cn(
                      "flex size-10 items-center justify-center rounded-xl",
                      TONE_SOFT_BG[meta.accent],
                    )}
                  >
                    <Icon className={cn("size-5", TONE_ICON[meta.accent])} aria-hidden="true" />
                  </span>
                  <Badge tone={meta.accent} size="sm">
                    <span className="tabular">{count}</span>
                  </Badge>
                </div>

                <h3 className="mt-4 font-display text-base font-semibold text-ink">
                  {meta.plural}
                </h3>
                <p className="mt-1.5 flex-1 text-sm leading-relaxed text-muted">
                  {meta.description}
                </p>

                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-brand">
                  Open {meta.plural.toLowerCase()}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </span>
              </CardLink>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function MetricExplainer() {
  return (
    <Section
      eyebrow="Metric literacy"
      title="The three numbers every interview opens with"
      description="If you can derive these out loud, with a worked example, you are already ahead of most applicants. Memorising the acronym is not the same as knowing the decision it drives."
      width="wide"
      divided
    >
      <div className="grid gap-4 lg:grid-cols-3">
        {FORMULAS.map((item) => (
          <Card key={item.abbr} className="flex flex-col p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="font-mono text-lg font-semibold tracking-tight text-ink">
                {item.abbr}
              </h3>
              <Badge tone={item.tone} size="sm" variant="outline">
                {item.name}
              </Badge>
            </div>

            <div
              className={cn(
                "mt-4 rounded-lg border px-3.5 py-3",
                TONE_SOFT_BG[item.tone],
                "border-hairline",
              )}
            >
              <p className="font-mono text-[0.8125rem] leading-relaxed font-medium text-ink">
                {item.formula}
              </p>
              <p className="tabular mt-1.5 text-xs text-muted">{item.worked}</p>
            </div>

            <p className="mt-4 flex-1 text-sm leading-relaxed text-muted">{item.meaning}</p>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Card className="overflow-hidden">
          <div className="border-b border-hairline px-5 py-3.5">
            <h3 className="font-display text-sm font-semibold text-ink">
              Reading ACoS against a 35% margin
            </h3>
            <p className="mt-1 text-xs text-muted">
              Break-even ACoS equals the profit margin. Everything below is judged against that
              line, not against a benchmark from someone else’s catalogue.
            </p>
          </div>

          <Table caption="ACoS bands for a product with a 35% profit margin">
            <THead>
              <TR>
                <TH>ACoS band</TH>
                <TH>Verdict</TH>
                <TH>What you do on Monday</TH>
              </TR>
            </THead>
            <TBody>
              {ACOS_BANDS.map((band) => (
                <TR key={band.range}>
                  <THRow className="whitespace-nowrap">
                    <Badge tone={band.tone} size="sm">
                      <span className="tabular">{band.range}</span>
                    </Badge>
                  </THRow>
                  <TD className="font-medium whitespace-nowrap">{band.verdict}</TD>
                  <TD className="text-muted">{band.action}</TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </Card>

        <Card className="flex flex-col justify-between gap-4 bg-surface-2 p-5">
          <div>
            <h3 className="font-display text-sm font-semibold text-ink">
              Why TACoS is the one to watch
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              ACoS can look excellent while the business quietly shrinks — you simply stopped
              bidding on anything hard. TACoS measures ad spend against{" "}
              <em className="text-ink not-italic">total</em> sales, so it catches the account that
              is winning the ad report and losing the P&amp;L.
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              A TACoS that falls while revenue rises is the clearest evidence you have that ads are
              driving organic rank, not just harvesting it.
            </p>
          </div>
          <Link
            href="/glossary"
            className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            See every metric defined
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </Card>
      </div>
    </Section>
  );
}

function ToolStack() {
  return (
    <Section
      eyebrow="Tool stack"
      title="Know what the tools cost before a client asks"
      description="Nine of the twelve tools compared in the automation guide, with the price band and how much of the work each one actually takes off your plate."
      width="wide"
      surface
      divided
      link={{ href: "/automation", label: "Full comparison" }}
    >
      <Table
        caption="Amazon PPC tool comparison: price, best fit and automation level"
        stickyFirstColumn
      >
        <THead>
          <TR>
            <TH>Tool</TH>
            <TH>Price</TH>
            <TH>Best for</TH>
            <TH>Automation level</TH>
          </TR>
        </THead>
        <TBody>
          {TOOL_STACK.map((row) => (
            <TR key={row.tool}>
              <THRow className="whitespace-nowrap">{row.tool}</THRow>
              <TD mono className="whitespace-nowrap">
                {row.price}
              </TD>
              <TD className="whitespace-nowrap text-muted">{row.bestFor}</TD>
              <TD>
                <Badge tone={row.tone} size="sm">
                  {row.level}
                </Badge>
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>

      <p className="mt-4 text-xs leading-relaxed text-faint">
        Prices are the published list rates recorded in the source toolkit. Helium 10 plans range
        from $79 to $229/month depending on tier; always confirm current pricing before quoting a
        client.
      </p>
    </Section>
  );
}

function AuthorBand() {
  return (
    <Section width="wide" divided tight>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-center">
        <div>
          <p className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
            Who made this
          </p>
          <h2 className="mt-3 text-2xl leading-tight font-bold text-ink sm:text-3xl">
            Ryan Roland Dabao — Amazon PPC Lead Manager and VA coach
          </h2>
          <p className="mt-4 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
            Based in Iloilo City, Philippines. Ten-plus years of remote eCommerce, six-plus years
            dedicated to Amazon Advertising, and ad budgets up to $500K a month across home decor,
            toys, consumables, supplements, cosmetics, sportswear and automotive categories.
          </p>
          <p className="mt-3 max-w-2xl text-[0.9375rem] leading-relaxed text-muted">
            Every SOP, workflow and case study here started as an internal document for training
            his own VA team. It is published under the MIT License so you can use it at work, adapt
            it for your coaching programme, or hand it to the next person on your team.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink
              href="https://linkedin.com/in/ryan-roland-dabao-55416187"
              external
              variant="secondary"
            >
              LinkedIn
            </ButtonLink>
            <ButtonLink href="https://youtube.com/@RyanRolandDabao" external variant="secondary">
              YouTube
            </ButtonLink>
            <ButtonLink href="/contribute" variant="ghost" iconAfter={ArrowRight}>
              Contribute a case study
            </ButtonLink>
          </div>
        </div>

        <Card as="panel" className="bg-surface-2 p-6">
          <p className="font-display text-base font-semibold text-ink">
            You do not need a course fee to start.
          </p>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            Take the diagnostic quiz, find the two levels you are weakest at, then work the SOPs
            that cover them. Come back and re-take it in a fortnight.
          </p>
          <div className="mt-5 flex flex-col gap-2.5">
            <ButtonLink href="/quizzes" icon={Target} fullWidth>
              Start the quiz
            </ButtonLink>
            <ButtonLink href="/paths" variant="secondary" fullWidth>
              See the learning paths
            </ButtonLink>
          </div>
        </Card>
      </div>
    </Section>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatBand />
      <StartHere />
      <ResourceGrid />
      <MetricExplainer />
      <ToolStack />
      <AuthorBand />
    </>
  );
}
