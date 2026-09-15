import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { WorkflowDiagram } from "@/components/doc/WorkflowDiagram";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { findWorkflow, workflows } from "@/content/workflows";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

/** Anchor shared by the diagram heading and its contents-rail entry. */
const DIAGRAM_ID = "the-flow";

export function generateStaticParams() {
  return workflows.map((workflow) => ({ id: workflow.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const workflow = findWorkflow(id);

  if (!workflow) return { title: "Workflow not found" };

  return docMetadata(workflow, "/workflows", "Workflows");
}

export default async function WorkflowPage({ params }: Params) {
  const { id } = await params;
  const workflow = findWorkflow(id);

  if (!workflow) notFound();

  const { position, previous, next } = neighbours(workflows, workflow.id);

  return (
    <>
      <DocLayout
        doc={workflow}
        basePath="/workflows"
        indexLabel="Workflows"
        position={position}
        previous={previous}
        next={next}
        tocPrefix={[{ id: DIAGRAM_ID, text: workflow.diagramTitle, depth: 2 }]}
      >
        <WorkflowDiagram
          id={DIAGRAM_ID}
          stages={workflow.stages}
          title={workflow.diagramTitle}
        />
      </DocLayout>
      <DocResourceFooter doc={workflow} basePath="/workflows" indexLabel="Workflows" />
      <PageFeedback
        href={`/workflows/${workflow.id}`}
        title={workflow.title}
        kind="Workflow"
      />
    </>
  );
}
