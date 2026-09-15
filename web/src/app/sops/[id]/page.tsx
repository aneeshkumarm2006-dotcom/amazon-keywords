import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { findSop, sops } from "@/content/sops";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return sops.map((sop) => ({ id: sop.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const sop = findSop(id);

  if (!sop) return { title: "SOP not found" };

  return docMetadata(sop, "/sops", "SOPs");
}

export default async function SopPage({ params }: Params) {
  const { id } = await params;
  const sop = findSop(id);

  if (!sop) notFound();

  const { position, previous, next } = neighbours(sops, sop.id);

  return (
    <>
      <DocLayout
        doc={sop}
        basePath="/sops"
        indexLabel="SOPs"
        position={position}
        previous={previous}
        next={next}
      />
      <DocResourceFooter doc={sop} basePath="/sops" indexLabel="SOPs" />
      <PageFeedback href={`/sops/${sop.id}`} title={sop.title} kind="SOP" />
    </>
  );
}
