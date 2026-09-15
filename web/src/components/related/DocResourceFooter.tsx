import { JsonLd } from "@/components/seo/JsonLd";
import { findByHref } from "@/content/registry";
import { articleNode, breadcrumbNode } from "@/lib/structured-data";
import type { DocResource } from "@/types/content";

import { RelatedRail } from "./RelatedRail";

/**
 * The shared tail of a long-form document page: structured data, then the
 * related / used-in block.
 *
 * SOPs, workflows, templates, automation guides, career guides and cheat
 * sheets all render the same document shape, so they all close the same way.
 * Keeping it in one component means the `Article` node, the breadcrumb trail
 * and the cross-link rail cannot drift between six routes.
 */

export interface DocResourceFooterProps {
  doc: DocResource;
  /** Index route for the domain, e.g. "/sops". */
  basePath: string;
  /** How the index is named — matches the visible breadcrumb, e.g. "SOPs". */
  indexLabel: string;
}

export function DocResourceFooter({ doc, basePath, indexLabel }: DocResourceFooterProps) {
  const href = `${basePath}/${doc.id}`;
  const ref = findByHref(href);

  return (
    <>
      <JsonLd
        id="resource-schema"
        data={[
          articleNode({
            title: doc.title,
            description: doc.summary,
            path: href,
            body: ref?.body,
            section: indexLabel,
            keywords: doc.tags,
            published: ref?.updated,
            modified: ref?.updated,
            minutes: doc.minutes,
          }),
          breadcrumbNode([{ name: indexLabel, path: basePath }, { name: doc.title }], href),
        ]}
      />
      <RelatedRail href={href} />
    </>
  );
}
