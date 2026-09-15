import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { findTemplate, templates } from "@/content/templates";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return templates.map((template) => ({ id: template.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const template = findTemplate(id);

  if (!template) return { title: "Template not found" };

  return docMetadata(template, "/templates", "Templates");
}

export default async function TemplatePage({ params }: Params) {
  const { id } = await params;
  const template = findTemplate(id);

  if (!template) notFound();

  const { position, previous, next } = neighbours(templates, template.id);

  return (
    <>
      <DocLayout
        doc={template}
        basePath="/templates"
        indexLabel="Templates"
        position={position}
        previous={previous}
        next={next}
      />
      <DocResourceFooter doc={template} basePath="/templates" indexLabel="Templates" />
      <PageFeedback
        href={`/templates/${template.id}`}
        title={template.title}
        kind="Template"
      />
    </>
  );
}
