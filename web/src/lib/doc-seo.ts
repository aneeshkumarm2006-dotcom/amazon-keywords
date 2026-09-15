import type { Metadata } from "next";

import { findByHref } from "@/content/registry";
import type { DocResource } from "@/types/content";

import { pageMetadata, type PageMetaInput } from "./site";

/**
 * Metadata for one long-form document route.
 *
 * Six domains — SOPs, workflows, templates, automation, career and cheat
 * sheets — share the `DocResource` shape and therefore share their metadata
 * exactly. Keeping the builder here means a change to how documents describe
 * themselves lands in six routes at once instead of drifting across six
 * near-identical copies.
 *
 * The `updated` stamp comes from the registry rather than the document, so
 * the date in `article:modified_time` is the same one the sitemap publishes
 * for that URL — they cannot disagree.
 */
export function docMetadata(
  doc: DocResource,
  basePath: string,
  section: string,
  overrides: Partial<PageMetaInput> = {},
): Metadata {
  const href = `${basePath}/${doc.id}`;
  const updated = findByHref(href)?.updated;

  return pageMetadata({
    title: doc.title,
    description: doc.summary,
    path: href,
    type: "article",
    section,
    published: updated,
    modified: updated,
    keywords: [...doc.tags, section],
    ...overrides,
  });
}
