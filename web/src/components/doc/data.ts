import type { DocResource, Level, ResourceRef } from "@/types/content";

import { extractToc, toPlainText } from "./slug";

/**
 * Server-side projections of `DocResource`.
 *
 * Index pages must not ship whole document bodies to the browser — the SOP
 * library alone is well over 100KB of markdown. `toIndexItems` keeps the
 * fields a card needs plus a pre-lowercased haystack built from the title,
 * summary, tags, meta values and section headings, which is everything a
 * within-domain filter has to match on.
 */

export interface DocIndexItem {
  id: string;
  title: string;
  summary: string;
  tags: string[];
  minutes: number;
  level?: Level;
  meta?: Record<string, string>;
  /** Section headings, for the "what is inside" line on a list row. */
  sections: string[];
  /** Lowercased search haystack. */
  haystack: string;
}

export function toIndexItem(doc: DocResource): DocIndexItem {
  const sections = extractToc(doc.body)
    .filter((item) => item.depth === 2)
    .map((item) => item.text);

  const haystack = [
    doc.title,
    doc.summary,
    doc.tags.join(" "),
    doc.level ?? "",
    Object.entries(doc.meta ?? {})
      .map(([key, value]) => `${key} ${value}`)
      .join(" "),
    sections.join(" "),
  ]
    .join(" ")
    .toLowerCase();

  return {
    id: doc.id,
    title: doc.title,
    summary: doc.summary,
    tags: doc.tags,
    minutes: doc.minutes,
    level: doc.level,
    meta: doc.meta,
    sections,
    haystack,
  };
}

export function toIndexItems(docs: readonly DocResource[]): DocIndexItem[] {
  return docs.map(toIndexItem);
}

/** The document before and after `id` in its own domain. */
export function neighbours(
  docs: readonly DocResource[],
  id: string,
): {
  position: { index: number; total: number };
  previous?: { id: string; title: string };
  next?: { id: string; title: string };
} {
  const index = docs.findIndex((doc) => doc.id === id);
  const before = index > 0 ? docs[index - 1] : undefined;
  const after = index >= 0 && index < docs.length - 1 ? docs[index + 1] : undefined;

  return {
    position: { index: index + 1, total: docs.length },
    previous: before ? { id: before.id, title: before.title } : undefined,
    next: after ? { id: after.id, title: after.title } : undefined,
  };
}

/** The standard `ResourceRef` projection every doc domain re-exports. */
export function docRefs(
  docs: readonly DocResource[],
  basePath: string,
  updated: string,
): ResourceRef[] {
  return docs.map((doc) => ({
    id: doc.id,
    kind: doc.kind,
    title: doc.title,
    summary: doc.summary,
    href: `${basePath}/${doc.id}`,
    tags: doc.tags,
    level: doc.level,
    minutes: doc.minutes,
    body: toPlainText(doc.body),
    updated,
  }));
}
