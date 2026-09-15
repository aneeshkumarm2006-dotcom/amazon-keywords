import { BookOpen, Printer, ScrollText, Sigma } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { cheatSheets } from "@/content/cheat-sheets";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Cheat sheets",
  description:
    "Eight one-page Amazon PPC references: metrics and formulas, match types, campaign structure, the search term report, negative keywords, ad types, reporting and tools. Every formula stated in full, with worked, checked arithmetic.",
  path: "/cheat-sheets",
  keywords: [
    "Amazon PPC cheat sheet",
    "ACoS formula",
    "match type reference",
    "campaign structure",
    "negative keywords",
  ],
});

const items = toIndexItems(cheatSheets);
const TOTAL_MINUTES = cheatSheets.reduce((sum, sheet) => sum + sheet.minutes, 0);

export default function CheatSheetsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Cheat sheets"
        description="Eight references built to be open in a second tab during a client call or a live interview screen-share. Formulas stated in full, worked examples with arithmetic you can check, and planning bands that are honestly labelled as planning bands rather than dressed up as measured category data."
        breadcrumbs={[{ label: "Cheat sheets" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Cheat sheets"
            value={cheatSheets.length}
            icon={ScrollText}
            tone="neutral"
            hint="One page each"
          />
          <StatTile
            label="Metrics defined"
            value={16}
            icon={Sigma}
            tone="brand"
            hint="Every one with its formula"
          />
          <StatTile
            label="Read the lot"
            value={TOTAL_MINUTES}
            unit="min"
            icon={BookOpen}
            tone="info"
            hint="Cover to cover"
          />
          <StatTile
            label="Print-ready"
            value="Yes"
            icon={Printer}
            tone="good"
            hint="Rails drop out automatically"
          />
        </div>

        <Callout variant="info" title="Start with metrics, then match types" className="mb-8">
          The metrics sheet defines the vocabulary every other sheet uses, and the match types
          sheet explains the single decision that causes the most avoidable waste in a new
          account. Between them they cover most of what an interview screen will ask.
        </Callout>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/cheat-sheets"
            noun={["cheat sheet", "cheat sheets"]}
            accent="neutral"
            cardMetaCount={2}
            storageKey="view:cheat-sheets"
          />
        </Suspense>
      </Container>
    </>
  );
}
