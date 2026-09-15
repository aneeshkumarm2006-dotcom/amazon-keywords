import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { careerGuides, findCareerGuide } from "@/content/career";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return careerGuides.map((guide) => ({ id: guide.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const guide = findCareerGuide(id);

  if (!guide) return { title: "Career resource not found" };

  return docMetadata(guide, "/career", "Career");
}

export default async function CareerGuidePage({ params }: Params) {
  const { id } = await params;
  const guide = findCareerGuide(id);

  if (!guide) notFound();

  const { position, previous, next } = neighbours(careerGuides, guide.id);

  return (
    <>
      <DocLayout
        doc={guide}
        basePath="/career"
        indexLabel="Career"
        position={position}
        previous={previous}
        next={next}
      />
      <DocResourceFooter doc={guide} basePath="/career" indexLabel="Career" />
      <PageFeedback
        href={`/career/${guide.id}`}
        title={guide.title}
        kind="Career guide"
      />
    </>
  );
}
