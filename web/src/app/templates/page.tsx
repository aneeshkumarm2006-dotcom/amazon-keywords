import { Columns3, FileSpreadsheet, Mail, SquareCheckBig } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { templates } from "@/content/templates";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Templates",
  description:
    "Seven ready-to-use Amazon PPC templates: campaign build sheet, search term analysis grid, monthly performance report, client communication emails, keyword research sheet, campaign audit checklist and A/B test tracker.",
  path: "/templates",
  keywords: [
    "Amazon PPC template",
    "campaign build sheet",
    "PPC report template",
    "campaign audit checklist",
  ],
});

const items = toIndexItems(templates);

export default function TemplatesPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Templates"
        description="Seven documents that turn a specialist's judgement into something a team can repeat. Spreadsheets you fill in before you touch the console, reports a client can read in ninety seconds, and the three emails you will send hundreds of times. Every column and every block is explained, with worked example rows."
        breadcrumbs={[{ label: "Templates" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Templates"
            value={templates.length}
            icon={FileSpreadsheet}
            tone="warn"
            hint="Sheets, reports, emails"
          />
          <StatTile
            label="Spreadsheets"
            value={4}
            icon={Columns3}
            tone="brand"
            hint="Build, search terms, research, tests"
          />
          <StatTile
            label="Client messages"
            value={3}
            icon={Mail}
            tone="info"
            hint="Weekly, monthly, escalation"
          />
          <StatTile
            label="Audit checks"
            value={26}
            icon={SquareCheckBig}
            tone="good"
            hint="Across six audit blocks"
          />
        </div>

        <Callout variant="info" title="Copy the code blocks, not the page" className="mb-8">
          Every template on these pages is inside a copyable block. Hover a block and use the
          copy button, then paste it into Sheets, a document or your email client and replace
          the bracketed fields.
        </Callout>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/templates"
            noun={["template", "templates"]}
            accent="warn"
            cardMetaCount={2}
            storageKey="view:templates"
          />
        </Suspense>
      </Container>
    </>
  );
}
