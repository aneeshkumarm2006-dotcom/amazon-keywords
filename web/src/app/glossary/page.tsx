import { BookOpen, Link2, Sigma, Tags } from "lucide-react";

import { GlossaryBrowser } from "@/components/doc/GlossaryBrowser";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatTile } from "@/components/ui/StatTile";
import { categoriesInUse, terms } from "@/content/glossary";
import { findByHref } from "@/content/registry";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Glossary",
  description: `Plain-English definitions for ${terms.length} Amazon PPC terms — ACoS, TACoS, match types, placements, bidding strategies, ad types and the account vocabulary — each with its formula, a worked example and links to related terms.`,
  path: "/glossary",
  keywords: [
    "Amazon PPC glossary",
    "ACoS",
    "TACoS",
    "ROAS",
    "match types",
    "Sponsored Products",
    "PPC terminology",
  ],
});

const sorted = [...terms].sort((a, b) =>
  a.term.localeCompare(b.term, "en", { sensitivity: "base" }),
);

const WITH_FORMULA = terms.filter((entry) => entry.formula).length;
const CROSS_LINKS = terms.reduce((sum, entry) => sum + (entry.related?.length ?? 0), 0);
const CATEGORIES = categoriesInUse();

/**
 * Resolve every "see also" route to the title of the thing it points at, so
 * a cross-link reads "SOP-02: Weekly Search Term Report Analysis" instead of
 * a slug. Built on the server from the registry; the browser only ever sees
 * the finished strings.
 */
const LINK_TITLES: Record<string, string> = Object.fromEntries(
  Array.from(new Set(terms.flatMap((entry) => entry.seeAlso ?? []))).map((href) => [
    href,
    findByHref(href)?.title ?? href,
  ]),
);

export default function GlossaryPage() {
  return (
    <>
      <PageHeader
        eyebrow="Reference"
        title="Amazon PPC glossary"
        description="Every acronym a PPC specialist is expected to know cold, defined in the plainest English the concept allows. Where a term is arithmetic, the formula is stated in full and worked through on a real number — because being able to define ACoS and being able to calculate it in front of a client are different skills."
        breadcrumbs={[{ label: "Glossary" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Terms"
            value={terms.length}
            icon={BookOpen}
            tone="brand"
            hint="Metrics to account vocabulary"
          />
          <StatTile
            label="With formulas"
            value={WITH_FORMULA}
            icon={Sigma}
            tone="info"
            hint="Stated and worked through"
          />
          <StatTile
            label="Categories"
            value={CATEGORIES.length}
            icon={Tags}
            tone="ember"
            hint="Filter to one at a time"
          />
          <StatTile
            label="Cross-links"
            value={CROSS_LINKS}
            icon={Link2}
            tone="good"
            hint="Between related terms"
          />
        </div>

        <GlossaryBrowser
          terms={sorted}
          categories={CATEGORIES}
          linkTitles={LINK_TITLES}
        />
      </Container>
    </>
  );
}
