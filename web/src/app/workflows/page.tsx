import { GitBranch, Layers, Repeat, Workflow as WorkflowIcon } from "lucide-react";
import { Suspense } from "react";

import { toIndexItems } from "@/components/doc/data";
import { DocIndex } from "@/components/doc/DocIndex";
import { Container } from "@/components/layout/Container";
import { PageHeader } from "@/components/layout/PageHeader";
import { Callout } from "@/components/ui/Callout";
import { StatTile } from "@/components/ui/StatTile";
import { workflows } from "@/content/workflows";
import { pageMetadata } from "@/lib/site";

export const metadata = pageMetadata({
  title: "Workflows",
  description:
    "Six Amazon PPC process maps and decision trees rendered as structured, responsive steps: the keyword research to optimisation loop, search term harvesting, campaign structure decisions, reporting, seasonal preparation and A/B testing.",
  path: "/workflows",
  keywords: [
    "Amazon PPC workflow",
    "keyword research process",
    "search term harvesting",
    "campaign structure decision tree",
  ],
});

const items = toIndexItems(workflows);

const STAGES = workflows.reduce((sum, workflow) => sum + workflow.stages.length, 0);
const DECISIONS = workflows.reduce(
  (sum, workflow) =>
    sum +
    workflow.stages.reduce(
      (inner, stage) => inner + stage.nodes.filter((node) => node.kind === "decision").length,
      0,
    ),
  0,
);
const BRANCHES = workflows.reduce(
  (sum, workflow) =>
    sum +
    workflow.stages.reduce(
      (inner, stage) =>
        inner + stage.nodes.reduce((n, node) => n + (node.branches?.length ?? 0), 0),
      0,
    ),
  0,
);

export default function WorkflowsPage() {
  return (
    <>
      <PageHeader
        eyebrow="Operate"
        title="Workflows and decision trees"
        description="Six processes drawn as steps rather than prose. Each one is a numbered rail you can follow live during a client call, with every branch point stated as a numeric test rather than a judgement call — so two specialists working the same account reach the same decision."
        breadcrumbs={[{ label: "Workflows" }]}
        width="wide"
      />

      <Container width="wide" className="py-8 sm:py-10">
        <div className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Workflows"
            value={workflows.length}
            icon={WorkflowIcon}
            tone="brand"
            hint="Research, harvest, structure, report"
          />
          <StatTile
            label="Stages"
            value={STAGES}
            icon={Layers}
            tone="info"
            hint="Across all six maps"
          />
          <StatTile
            label="Decision points"
            value={DECISIONS}
            icon={GitBranch}
            tone="ember"
            hint="Every one has a numeric test"
          />
          <StatTile
            label="Branches"
            value={BRANCHES}
            icon={Repeat}
            tone="good"
            hint="Condition to action"
          />
        </div>

        <Callout variant="info" title="Built to be followed, not admired" className="mb-8">
          The source library draws these as ASCII box diagrams. Here every stage is real markup:
          it reflows to a phone, reads correctly in a screen reader, and prints without a
          scrollbar. The decision tables from the original are kept underneath each diagram.
        </Callout>

        <Suspense fallback={<div className="h-11 rounded-lg border border-hairline bg-surface" />}>
          <DocIndex
            items={items}
            basePath="/workflows"
            noun={["workflow", "workflows"]}
            accent="brand"
            cardMetaCount={2}
            storageKey="view:workflows"
          />
        </Suspense>
      </Container>
    </>
  );
}
