import type { ResourceKind } from "@/types/content";

import { RESOURCE_INDEX, type ResourceIndexEntry } from "@/content/resource-index";

/**
 * What "completed" can be counted against.
 *
 * This lives apart from `progress.ts` for one reason: `progress.ts` reaches
 * the localStorage layer, which pulls in `useSyncExternalStore` and therefore
 * cannot be imported by a server component. A page that only wants the
 * denominator — "12 of 80 resources" — imports this instead.
 *
 * It counts from `src/content/resource-index.ts` rather than the registry.
 * Both list the same resources, but the registry carries every document body
 * with it, and this module is reachable from the progress controls on nearly
 * every page.
 */

/**
 * Kinds that carry a mark-as-complete control. Glossary terms are anchors on
 * one page and interview questions have their own practised flag in
 * `interview-progress.ts`, so neither is counted here.
 */
export const TRACKED_KINDS: ResourceKind[] = [
  "sop",
  "workflow",
  "template",
  "automation",
  "script",
  "career",
  "cheat-sheet",
  "case-study",
  "calculator",
  "quiz",
];

export const trackedResources: ResourceIndexEntry[] = RESOURCE_INDEX.filter((resource) =>
  TRACKED_KINDS.includes(resource.kind),
);

export const TRACKED_IDS: ReadonlySet<string> = new Set(
  trackedResources.map((resource) => resource.id),
);
