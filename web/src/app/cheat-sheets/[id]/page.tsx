import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageFeedback } from "@/components/community/PageFeedback";
import { neighbours } from "@/components/doc/data";
import { DocLayout } from "@/components/doc/DocLayout";
import { DocResourceFooter } from "@/components/related/DocResourceFooter";
import { cheatSheets, findCheatSheet } from "@/content/cheat-sheets";
import { docMetadata } from "@/lib/doc-seo";

interface Params {
  params: Promise<{ id: string }>;
}

export function generateStaticParams() {
  return cheatSheets.map((sheet) => ({ id: sheet.id }));
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const sheet = findCheatSheet(id);

  if (!sheet) return { title: "Cheat sheet not found" };

  return docMetadata(sheet, "/cheat-sheets", "Cheat sheets", {
    title: `${sheet.title} cheat sheet`,
  });
}

export default async function CheatSheetPage({ params }: Params) {
  const { id } = await params;
  const sheet = findCheatSheet(id);

  if (!sheet) notFound();

  const { position, previous, next } = neighbours(cheatSheets, sheet.id);

  return (
    <>
      <DocLayout
        doc={sheet}
        basePath="/cheat-sheets"
        indexLabel="Cheat sheets"
        position={position}
        previous={previous}
        next={next}
      />
      <DocResourceFooter doc={sheet} basePath="/cheat-sheets" indexLabel="Cheat sheets" />
      <PageFeedback
        href={`/cheat-sheets/${sheet.id}`}
        title={sheet.title}
        kind="Cheat sheet"
      />
    </>
  );
}
