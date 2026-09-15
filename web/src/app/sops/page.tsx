import { ClipboardList, Clock, ListChecks, Repeat } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { sops } from "@/content/sops";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "SOPs",
  description:
    "Eight Amazon PPC standard operating procedures: daily health check, weekly search term analysis, bid optimisation, campaign launch, restructuring, monthly reporting, client onboarding and escalation. Each one with inputs, steps, decision rules, outputs and escalation criteria.",
  path: "/sops",
  keywords: [
    "Amazon PPC SOP",
    "daily health check",
    "search term analysis",
    "bid optimization procedure",
    "PPC client onboarding",
  ],
});

const items = toIndexItems(sops);

const DAILY = sops.filter((sop) => sop.meta?.Frequency?.startsWith("Daily")).length;
const WEEKLY = sops.filter((sop) => sop.meta?.Frequency?.startsWith("Weekly")).length;
const TOTAL_MINUTES = sops.reduce((sum, sop) => sum + sop.minutes, 0);

export default function SopsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Standard operating procedures"
        description="Eight procedures that cover the whole operating year of a PPC account — from the fifteen minutes you spend every morning to the four-hour restructure you do twice a year. Each one states its objective, inputs, steps, decision rules, outputs and escalation criteria, so two specialists working the same account produce the same work."
        breadcrumbs={[{ label: "SOPs" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Procedures"
            value={sops.length}
            icon={ClipboardList}
            tone="info"
            hint="Objective, inputs, steps, rules"
          />
          <StatTile
            label="Run daily"
            value={DAILY}
            icon={Repeat}
            tone="brand"
            hint="15 minutes per account"
          />
          <StatTile
            label="Run weekly"
            value={WEEKLY}
            icon={Clock}
            tone="ember"
            hint="Search term harvest and negate"
          />
          <StatTile
            label="Read time"
            value={TOTAL_MINUTES}
            unit="min"
            icon={ListChecks}
            tone="good"
            hint="The whole library, end to end"
          />
        </div>

        <Callout variant="info" title="Read them in order the first time" className="mb-8">
          SOP-01 to SOP-03 are the weekly rhythm of every account and assume no prior
          experience. SOP-04 and SOP-05 are build work. SOP-06 to SOP-08 are the client
          relationship. If you are new, run SOP-01 every morning for a week before you touch
          anything else.
        </Callout>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/sops"
            noun={["procedure", "procedures"]}
            accent="info"
            cardMetaCount={2}
            storageKey="view:sops"
          />
        </Suspense>
      </Container>
    </>
  );
}
