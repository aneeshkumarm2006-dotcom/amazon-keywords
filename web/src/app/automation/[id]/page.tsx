import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { automationGuides, findAutomationGuide } from "@/content/automation";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return automationGuides.map((guide) => ({ id: guide.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const guide = findAutomationGuide(id);

  if (!guide) return { title: "Automation guide not found" };

  return docMetadata(guide, "/automation", "Automation");
}

export default async function AutomationGuidePage({ params }: Params) {
  const { id } = await params;
  const guide = findAutomationGuide(id);

  if (!guide) notFound();

  const { position, previous, next } = neighbours(automationGuides, guide.id);

  return (
    <>
      <DocLayout
        doc={guide}
        basePath="/automation"
        indexLabel="Automation"
        position={position}
        previous={previous}
        next={next}
      />
      <DocResourceFooter doc={guide} basePath="/automation" indexLabel="Automation" />
      <PageFeedback
        href={`/automation/${guide.id}`}
        title={guide.title}
        kind="Automation guide"
      />
    </>
  );
}
