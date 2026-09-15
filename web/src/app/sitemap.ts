import type { MetadataRoute } from "next";

import { allResources } from "@/content/registry";
import { absoluteUrl } from "@/lib/site";

/**
 * The sitemap, generated from the same registry the site navigates by.
 *
 * `output: "export"` writes this to `out/sitemap.xml` at build time, so the
 * file is static like everything else. Every URL here is either a hand-listed
 * hub route or a `ResourceRef.href` from `src/content/registry.ts`, which
 * means a new resource shows up in the sitemap the moment its domain
 * registers it — there is no second list to keep in step.
 *
 * Deliberately excluded:
 *   - `/quizzes/*​/results` and `/quizzes/review/*` — these render from
 *     localStorage, so a crawler only ever sees the empty state.
 *   - `/offline` — the service-worker fallback shell.
 *   - `/search` is included (it is a real landing page) but scores low.
 */

type Entry = MetadataRoute.Sitemap[number];
type ChangeFrequency = NonNullable<Entry["changeFrequency"]>;

/** Newest `updated` stamp in the library, used for hub pages. */
const LIBRARY_UPDATED =
  allResources
    .map((resource) => resource.updated)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1) ?? "2026-09-15";

interface HubRoute {
  path: string;
  priority: number;
  changeFrequency: ChangeFrequency;
}

/**
 * Hub and tool routes. Detail routes are never listed here — they come from
 * the registry below, so this list only grows when a genuinely new section
 * lands.
 */
const HUB_ROUTES: HubRoute[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },

  // Train
  { path: "/paths", priority: 0.9, changeFrequency: "monthly" },
  { path: "/quizzes", priority: 0.9, changeFrequency: "monthly" },
  { path: "/interviews", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies", priority: 0.9, changeFrequency: "monthly" },
  { path: "/case-studies/compare", priority: 0.6, changeFrequency: "monthly" },
  { path: "/interviews/mock", priority: 0.7, changeFrequency: "monthly" },
  { path: "/interviews/flashcards", priority: 0.7, changeFrequency: "monthly" },

  // Operate
  { path: "/sops", priority: 0.9, changeFrequency: "monthly" },
  { path: "/workflows", priority: 0.8, changeFrequency: "monthly" },
  { path: "/templates", priority: 0.8, changeFrequency: "monthly" },
  { path: "/automation", priority: 0.8, changeFrequency: "monthly" },

  // Reference
  { path: "/cheat-sheets", priority: 0.8, changeFrequency: "monthly" },
  { path: "/glossary", priority: 0.8, changeFrequency: "monthly" },
  { path: "/calculators", priority: 0.8, changeFrequency: "monthly" },
  { path: "/scripts", priority: 0.8, changeFrequency: "monthly" },

  // Career and meta
  { path: "/career", priority: 0.8, changeFrequency: "monthly" },
  { path: "/dashboard", priority: 0.4, changeFrequency: "yearly" },
  { path: "/search", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contribute", priority: 0.5, changeFrequency: "monthly" },
  { path: "/contribute/guidelines", priority: 0.4, changeFrequency: "yearly" },
  { path: "/contribute/roadmap", priority: 0.4, changeFrequency: "monthly" },
];

/** Resource routes that are anchors on a hub page rather than pages of their own. */
function isAnchorOnly(href: string): boolean {
  return href.includes("#");
}

/** Per-kind priority, so a case study outranks a glossary anchor. */
const KIND_PRIORITY: Record<string, number> = {
  path: 0.8,
  "case-study": 0.8,
  sop: 0.8,
  workflow: 0.7,
  template: 0.7,
  quiz: 0.7,
  calculator: 0.7,
  "cheat-sheet": 0.7,
  career: 0.7,
  automation: 0.6,
  interview: 0.6,
  glossary: 0.5,
};

export default function sitemap(): MetadataRoute.Sitemap {
  const seen = new Set<string>();
  const entries: MetadataRoute.Sitemap = [];

  const push = (
    path: string,
    priority: number,
    changeFrequency: ChangeFrequency,
    lastModified: string,
  ) => {
    const url = absoluteUrl(path);
    if (seen.has(url)) return;
    seen.add(url);
    entries.push({ url, lastModified: new Date(lastModified), changeFrequency, priority });
  };

  for (const route of HUB_ROUTES) {
    push(route.path, route.priority, route.changeFrequency, LIBRARY_UPDATED);
  }

  // Every registered resource that has a page of its own.
  for (const resource of allResources) {
    if (isAnchorOnly(resource.href)) continue;
    push(
      resource.href,
      KIND_PRIORITY[resource.kind] ?? 0.6,
      "monthly",
      resource.updated ?? LIBRARY_UPDATED,
    );
  }

  return entries;
}

export const dynamic = "force-static";
