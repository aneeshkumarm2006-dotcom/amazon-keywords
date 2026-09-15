import { Bot, DollarSign, Gauge, Wrench } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { automationGuides } from "@/content/automation";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Automation",
  description:
    "Eight Amazon PPC automation guides: what automation actually automates, twelve tools compared with 2026 pricing, the fifteen-rule library, Adtomic setup, DIY Google Sheets scripts, automate versus manual, and the five-level maturity model.",
  path: "/automation",
  keywords: [
    "Amazon PPC automation",
    "PPC bid rules",
    "Adtomic",
    "PPC tool comparison",
    "automation maturity model",
  ],
});

const items = toIndexItems(automationGuides);

export default function AutomationPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Automation"
        description="Automation handles the mechanical work; you handle the strategic work. These eight guides cover which tasks belong on each side of that line, what the twelve main tools cost and do, the rule set to configure on day one, and the capacity ladder that takes a specialist from two accounts to fifteen."
        breadcrumbs={[{ label: "Automation" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Guides"
            value={automationGuides.length}
            icon={Bot}
            tone="info"
            hint="Strategy, tools, rules, scripts"
          />
          <StatTile
            label="Tools compared"
            value={12}
            icon={Wrench}
            tone="brand"
            hint="Free to enterprise, 4 tiers"
          />
          <StatTile
            label="Production rules"
            value={15}
            icon={Gauge}
            tone="ember"
            hint="Bids, budgets, negatives"
          />
          <StatTile
            label="Cheapest tool"
            value="$9"
            unit="/mo"
            icon={DollarSign}
            tone="good"
            hint="Free stack also documented"
          />
        </div>

        <Callout variant="warn" title="Learn the manual work first" className="mb-8">
          A specialist who reaches tool-assisted automation without ever having run a search term
          report by hand cannot tell when the tool is wrong — and the tool is wrong often enough
          to matter. Months one and two of the training path are manual on purpose.
        </Callout>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/automation"
            noun={["guide", "guides"]}
            accent="info"
            cardMetaCount={2}
            storageKey="view:automation"
          />
        </Suspense>
      </Container>
    </>
  );
}
