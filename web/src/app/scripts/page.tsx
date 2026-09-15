import { Bot, Calculator, Code2, FileCode2, ListTree, Terminal } from "lucide-react";

import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Section } from "@/components/layout/Section";
import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import {
  LANGUAGES,
  languagesInUse,
  ppcTools,
  scriptLibraryStats,
  scripts,
} from "@/content/scripts";
import { formatNumber } from "@/lib/utils";

import { ScriptLibrary, type ScriptCard } from "./_components/ScriptLibrary";
import { ToolComparison } from "./_components/ToolComparison";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Automation scripts",
  description:
    "Fourteen runnable Amazon PPC automation assets in Python, Google Apps Script, SQL and spreadsheet formulas: search term harvesting, negative keyword mining, ACoS-band bid rules, budget pacing alerts, dayparting, placement pivots, duplicate keyword detection, bulk sheet generation, rank tracking and a weekly report emailer. Every one with the full code, a line-by-line explanation, prerequisites and the expected output.",
  path: "/scripts",
  keywords: [
    "Amazon PPC automation",
    "Google Apps Script PPC",
    "search term harvesting script",
    "negative keyword automation",
    "PPC bulk sheet",
    "Amazon PPC tools comparison",
  ],
});

const cards: ScriptCard[] = scripts.map((script) => ({
  id: script.id,
  title: script.title,
  summary: script.summary,
  href: script.href,
  language: script.language,
  difficulty: script.difficulty,
  minutes: script.minutes,
  automates: script.automates,
  frequency: script.frequency,
  saves: script.saves,
  lines: script.code.trim().split("\n").length,
  tags: script.tags,
}));

const stats = scriptLibraryStats();

export default function ScriptsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Automation scripts"
        description="Fourteen assets that do the mechanical half of PPC work: read a report, apply the rules, write a file you can upload. Nothing here calls an API you do not have access to, nothing needs a paid tool, and every one comes with the reasoning behind each line rather than a copy-paste block and good luck."
        width="wide"
        breadcrumbs={[{ label: "Scripts" }]}
        actions={
          <>
            <ButtonLink href="/calculators" variant="secondary" icon={Calculator}>
              Calculators
            </ButtonLink>
            <ButtonLink href="/automation" variant="secondary" icon={Bot}>
              Automation guide
            </ButtonLink>
          </>
        }
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Runnable assets"
            value={stats.count}
            icon={Terminal}
            tone="brand"
            hint="Each one tested against a real report shape"
          />
          <StatTile
            label="Languages"
            value={stats.languages}
            icon={Code2}
            tone="info"
            hint="Python, Apps Script, SQL and sheet formulas"
          />
          <StatTile
            label="Lines of code"
            value={formatNumber(stats.lines)}
            icon={FileCode2}
            tone="good"
            hint="No minified blobs, no dependencies to install"
          />
          <StatTile
            label="Line-by-line notes"
            value={stats.annotations}
            icon={ListTree}
            tone="ember"
            hint={`Plus ${stats.steps} setup steps across the library`}
          />
        </div>

        <Callout
          variant="info"
          title="Automate the execution, keep the decisions"
          className="mb-8"
        >
          <p>
            Every asset here automates something mechanical: arithmetic, filtering, pivoting,
            formatting, sending. Not one of them decides strategy, writes to a client, or changes a
            campaign on its own — each writes a file or a tab for you to read first.
          </p>
          <p>
            That split is deliberate. A VA who can do both the mechanical and the strategic work is
            worth two or three times one who only runs tools, and the fastest way to lose an account
            is a script that negated a brand term at 3am while nobody was looking.
          </p>
        </Callout>

        <ScriptLibrary scripts={cards} />
      </Container>

      <Section
        eyebrow="Pick a language"
        title="Four ways to run the same rules"
        description="The bid bands and the negative keyword rules are identical across the library. What changes is where the code lives, who can see it, and how much permission you need to run it."
        width="wide"
        surface
        divided
        tight
      >
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {languagesInUse().map((language) => {
            const meta = LANGUAGES[language];
            const count = scripts.filter((script) => script.language === language).length;
            return (
              <li
                key={language}
                className="flex flex-col rounded-xl border border-hairline bg-surface p-5"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <h3 className="font-display text-base font-semibold text-ink">{meta.label}</h3>
                  <span className="tabular text-xs text-faint">
                    {count} asset{count === 1 ? "" : "s"}
                  </span>
                </div>
                <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">{meta.blurb}</p>
                <p className="mt-auto pt-3.5 text-xs leading-relaxed text-faint">
                  <span className="font-medium text-muted">Runs in:</span> {meta.runsIn}
                </p>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section
        eyebrow="Buy or build"
        title="Twelve PPC tools, and what they are worth at your hourly rate"
        description="Before writing a script, check whether a tool already does it for less than your time costs. The ROI column applies the source guide's formula with a rate you set: hours saved multiplied by your rate multiplied by four weeks, minus the subscription."
        width="wide"
        divided
        tight
        link={{ href: "/automation/tool-comparison", label: "Read the full tool guide" }}
      >
        <ToolComparison tools={ppcTools} />
      </Section>
    </>
  );
}
