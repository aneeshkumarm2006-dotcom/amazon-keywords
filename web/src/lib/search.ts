import Fuse, {
  type FuseOptionKey,
  type FuseResult,
  type FuseResultMatch,
  type IFuseOptions,
} from "fuse.js";
import { KIND_META, KIND_ORDER, allResources } from "@/content/registry";
import type { Level, ResourceKind, ResourceRef } from "@/types/content";

import {
  literalRanges,
  normaliseRanges,
  splitTerms,
  windowAround,
  type HighlightRange,
  type TextWindow,
} from "./highlight";

/**
 * Site-wide search.
 *
 * Everything browsable registers a `ResourceRef` in `src/content/registry.ts`,
 * so one Fuse index over `allResources` covers quizzes, SOPs, workflows,
 * templates, case studies, glossary terms — the lot. This module owns:
 *
 *   - the index and its weighted keys (`createIndex`, `search`)
 *   - match highlighting as React nodes, never `dangerouslySetInnerHTML`
 *   - facet counts by kind, level and tag
 *   - recent + popular searches, persisted through `src/lib/storage.ts`
 *   - near-miss term suggestions for the zero-results state
 *
 * Fuse decides *which* resources come back. Highlighting deliberately does
 * not reuse Fuse's fuzzy indices when the query appears literally in the
 * text: a reader searching "search term report" expects those three words
 * marked, not the scattered characters a bitap match happens to land on.
 * Literal ranges first, Fuse's indices as the fallback.
 */

/* ------------------------------------------------------------------ *
 * Index
 * ------------------------------------------------------------------ */

/**
 * Kind metadata, re-exported.
 *
 * `@/content/registry` pulls in every content domain, so importing it from a
 * component that ships in the shared bundle would put the whole library on
 * every page. Callers that already load this module — which owns that cost
 * by definition — take the metadata from here instead.
 */
export { KIND_META, KIND_ORDER, type KindMeta } from "@/content/registry";

export type SearchKey = "title" | "tags" | "summary" | "body";

/** Weighted fields. Title dominates; the body is a tiebreaker, not a driver. */
export const SEARCH_KEYS: FuseOptionKey<ResourceRef>[] = [
  { name: "title", weight: 0.5 },
  { name: "tags", weight: 0.2 },
  { name: "summary", weight: 0.2 },
  { name: "body", weight: 0.1 },
];

export const SEARCH_OPTIONS: IFuseOptions<ResourceRef> = {
  keys: SEARCH_KEYS,
  includeMatches: true,
  includeScore: true,
  threshold: 0.35,
  ignoreLocation: true,
  minMatchCharLength: 2,
  findAllMatches: false,
  shouldSort: true,
};

/** Queries shorter than this skip Fuse and use a literal substring filter. */
const MIN_FUZZY_LENGTH = 2;

/** Build an index. Pass a subset to scope search to one collection. */
export function createIndex(
  resources: readonly ResourceRef[] = allResources,
): Fuse<ResourceRef> {
  return new Fuse(resources, SEARCH_OPTIONS);
}

let defaultIndex: Fuse<ResourceRef> | null = null;
const scopedIndexes = new WeakMap<readonly ResourceRef[], Fuse<ResourceRef>>();

/** The shared index over every registered resource, built on first use. */
export function getIndex(): Fuse<ResourceRef> {
  defaultIndex ??= createIndex();
  return defaultIndex;
}

function indexFor(resources: readonly ResourceRef[]): Fuse<ResourceRef> {
  if (resources === allResources) return getIndex();
  const cached = scopedIndexes.get(resources);
  if (cached) return cached;
  const built = createIndex(resources);
  scopedIndexes.set(resources, built);
  return built;
}

/* ------------------------------------------------------------------ *
 * Highlighting and snippets
 *
 * The range maths lives in `src/lib/highlight.ts` — no Fuse, no registry —
 * and is re-exported here so a caller needs one import.
 * ------------------------------------------------------------------ */

export {
  HIGHLIGHT_CLASS,
  MIN_MATCH_LENGTH,
  highlight,
  literalRanges,
  normaliseRanges,
  splitHighlight,
  splitTerms,
  subsequenceRanges,
  windowAround,
  type HighlightRange,
  type HighlightSegment,
  type TextWindow,
} from "./highlight";

export interface SearchSnippet extends TextWindow {
  /** Which field the window was cut from. */
  key: SearchKey;
}

const SNIPPET_RADIUS = 120;

/** A readable window of one field, opening just before its strongest match. */
export function buildSnippet(
  key: SearchKey,
  text: string,
  ranges: readonly HighlightRange[],
  radius = SNIPPET_RADIUS,
): SearchSnippet {
  return { key, ...windowAround(text, ranges, radius) };
}

/* ------------------------------------------------------------------ *
 * Results
 * ------------------------------------------------------------------ */

export interface SearchHit {
  resource: ResourceRef;
  /** Fuse score: 0 is a perfect match, 1 is the worst kept. */
  score: number;
  /** `score` inverted onto 0-100 for display. */
  relevance: number;
  titleRanges: HighlightRange[];
  summaryRanges: HighlightRange[];
  /** A window of the body, only when the body is where the match landed. */
  snippet?: SearchSnippet;
  matchedTags: string[];
  matchedKeys: SearchKey[];
}

function fuseRangesFor(
  matches: readonly FuseResultMatch[] | undefined,
  key: SearchKey,
): HighlightRange[] {
  if (!matches) return [];
  const match = matches.find((candidate) => candidate.key === key);
  return match ? normaliseRanges(match.indices) : [];
}

function fuseMatchedTags(
  matches: readonly FuseResultMatch[] | undefined,
  resource: ResourceRef,
): string[] {
  if (!matches) return [];
  return matches
    .filter((match) => match.key === "tags")
    .map((match) => match.value ?? "")
    .filter((value) => value.length > 0 && resource.tags.includes(value));
}

function toRelevance(score: number): number {
  return Math.max(1, Math.min(100, Math.round((1 - score) * 100)));
}

/**
 * Some domains index a body that opens with the summary — a glossary entry's
 * body is its definition plus the formula and the example. Repeating that
 * text under the summary on a result card is noise, so a snippet that only
 * restates the summary is dropped.
 */
function echoesSummary(snippet: SearchSnippet, summary: string): boolean {
  const body = snippet.text.replace(/…/g, "").trim().toLowerCase();
  const head = summary.trim().toLowerCase();
  if (body.length === 0) return true;
  if (head.includes(body) || body.includes(head)) return true;
  return head.includes(body.slice(0, 60));
}

function buildHit(
  resource: ResourceRef,
  score: number,
  matches: readonly FuseResultMatch[] | undefined,
  terms: readonly string[],
): SearchHit {
  const literalTitle = literalRanges(resource.title, terms);
  const literalSummary = literalRanges(resource.summary, terms);
  const body = resource.body ?? "";
  const literalBody = literalRanges(body, terms);

  const titleRanges = literalTitle.length > 0 ? literalTitle : fuseRangesFor(matches, "title");
  const summaryRanges =
    literalSummary.length > 0 ? literalSummary : fuseRangesFor(matches, "summary");

  const literalTags = resource.tags.filter((tag) => literalRanges(tag, terms).length > 0);
  const matchedTags = literalTags.length > 0 ? literalTags : fuseMatchedTags(matches, resource);

  const bodyRanges = literalBody.length > 0 ? literalBody : fuseRangesFor(matches, "body");
  const cut =
    body.length > 0 && bodyRanges.length > 0 ? buildSnippet("body", body, bodyRanges) : undefined;
  const snippet = cut && !echoesSummary(cut, resource.summary) ? cut : undefined;

  const matchedKeys: SearchKey[] = [];
  if (titleRanges.length > 0) matchedKeys.push("title");
  if (matchedTags.length > 0) matchedKeys.push("tags");
  if (summaryRanges.length > 0) matchedKeys.push("summary");
  if (snippet) matchedKeys.push("body");

  return {
    resource,
    score,
    relevance: toRelevance(score),
    titleRanges,
    summaryRanges,
    snippet,
    matchedTags,
    matchedKeys,
  };
}

function plainHit(resource: ResourceRef): SearchHit {
  return {
    resource,
    score: 0,
    relevance: 100,
    titleRanges: [],
    summaryRanges: [],
    matchedTags: [],
    matchedKeys: [],
  };
}

/**
 * One- character queries never reach Fuse: at that length a fuzzy match is
 * noise, while a literal prefix filter is exactly what the reader meant.
 */
function literalSearch(
  resources: readonly ResourceRef[],
  query: string,
  terms: readonly string[],
): SearchHit[] {
  const needle = query.toLowerCase();
  const out: SearchHit[] = [];

  for (const resource of resources) {
    const inTitle = resource.title.toLowerCase().includes(needle);
    const inTags = resource.tags.some((tag) => tag.toLowerCase().includes(needle));
    if (!inTitle && !inTags) continue;
    out.push(buildHit(resource, inTitle ? 0.05 : 0.2, undefined, terms));
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Facets
 * ------------------------------------------------------------------ */

export type FacetDimension = "kinds" | "levels" | "tags";

export interface FacetSelection {
  kinds: ResourceKind[];
  levels: Level[];
  tags: string[];
}

export const EMPTY_SELECTION: FacetSelection = { kinds: [], levels: [], tags: [] };

export const LEVEL_ORDER: Level[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "scenario",
];

export function selectionIsEmpty(selection: FacetSelection): boolean {
  return (
    selection.kinds.length === 0 &&
    selection.levels.length === 0 &&
    selection.tags.length === 0
  );
}

export function selectionCount(selection: FacetSelection): number {
  return selection.kinds.length + selection.levels.length + selection.tags.length;
}

/**
 * OR inside a dimension, AND across dimensions — the behaviour every faceted
 * search has. `ignore` leaves one dimension out, which is what lets the
 * counts next to each option stay honest while that dimension is filtered.
 */
export function matchesSelection(
  resource: ResourceRef,
  selection: FacetSelection,
  ignore?: FacetDimension,
): boolean {
  if (
    ignore !== "kinds" &&
    selection.kinds.length > 0 &&
    !selection.kinds.includes(resource.kind)
  ) {
    return false;
  }
  if (
    ignore !== "levels" &&
    selection.levels.length > 0 &&
    (!resource.level || !selection.levels.includes(resource.level))
  ) {
    return false;
  }
  if (
    ignore !== "tags" &&
    selection.tags.length > 0 &&
    !selection.tags.some((tag) => resource.tags.includes(tag))
  ) {
    return false;
  }
  return true;
}

export function applyFacets(hits: readonly SearchHit[], selection: FacetSelection): SearchHit[] {
  if (selectionIsEmpty(selection)) return [...hits];
  return hits.filter((hit) => matchesSelection(hit.resource, selection));
}

export interface FacetBucket<T extends string> {
  value: T;
  count: number;
  selected: boolean;
}

export interface Facets {
  kinds: FacetBucket<ResourceKind>[];
  levels: FacetBucket<Level>[];
  tags: FacetBucket<string>[];
  /** Hits left once every dimension is applied. */
  total: number;
}

function countBy<T extends string>(
  hits: readonly SearchHit[],
  selection: FacetSelection,
  dimension: FacetDimension,
  valuesOf: (resource: ResourceRef) => readonly T[],
): Map<T, number> {
  const counts = new Map<T, number>();
  for (const hit of hits) {
    if (!matchesSelection(hit.resource, selection, dimension)) continue;
    for (const value of valuesOf(hit.resource)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return counts;
}

/**
 * Counts for every facet option, given the hits for the current query.
 * Pass the *unfiltered* hits — this applies the selection itself.
 */
export function computeFacets(
  hits: readonly SearchHit[],
  selection: FacetSelection,
  options: { tagLimit?: number } = {},
): Facets {
  const kindCounts = countBy<ResourceKind>(hits, selection, "kinds", (resource) => [
    resource.kind,
  ]);
  const levelCounts = countBy<Level>(hits, selection, "levels", (resource) =>
    resource.level ? [resource.level] : [],
  );
  const tagCounts = countBy<string>(hits, selection, "tags", (resource) => resource.tags);

  const kinds = KIND_ORDER.filter(
    (kind) => (kindCounts.get(kind) ?? 0) > 0 || selection.kinds.includes(kind),
  ).map((kind) => ({
    value: kind,
    count: kindCounts.get(kind) ?? 0,
    selected: selection.kinds.includes(kind),
  }));

  const levels = LEVEL_ORDER.filter(
    (level) => (levelCounts.get(level) ?? 0) > 0 || selection.levels.includes(level),
  ).map((level) => ({
    value: level,
    count: levelCounts.get(level) ?? 0,
    selected: selection.levels.includes(level),
  }));

  const tagLimit = options.tagLimit ?? Number.POSITIVE_INFINITY;
  const ranked = Array.from(tagCounts.entries())
    .filter(([tag, count]) => count > 0 || selection.tags.includes(tag))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

  const selectedFirst = [
    ...ranked.filter(([tag]) => selection.tags.includes(tag)),
    ...ranked.filter(([tag]) => !selection.tags.includes(tag)),
  ];

  const tags = selectedFirst.slice(0, tagLimit).map(([tag, count]) => ({
    value: tag,
    count,
    selected: selection.tags.includes(tag),
  }));

  return {
    kinds,
    levels,
    tags,
    total: hits.filter((hit) => matchesSelection(hit.resource, selection)).length,
  };
}

function toggleValue<T extends string>(list: readonly T[], value: T): T[] {
  return list.includes(value) ? list.filter((entry) => entry !== value) : [...list, value];
}

/** Toggle one value inside one dimension, returning a new selection. */
export function toggleFacet(
  selection: FacetSelection,
  dimension: FacetDimension,
  value: string,
): FacetSelection {
  switch (dimension) {
    case "kinds":
      return { ...selection, kinds: toggleValue(selection.kinds, value as ResourceKind) };
    case "levels":
      return { ...selection, levels: toggleValue(selection.levels, value as Level) };
    default:
      return { ...selection, tags: toggleValue(selection.tags, value) };
  }
}

/* ------------------------------------------------------------------ *
 * Sorting + the search entry point
 * ------------------------------------------------------------------ */

export type SearchSortKey = "relevance" | "title" | "time";

export const SEARCH_SORTS: { value: SearchSortKey; label: string }[] = [
  { value: "relevance", label: "Best match" },
  { value: "title", label: "Title A-Z" },
  { value: "time", label: "Quickest first" },
];

function sortHits(hits: SearchHit[], sort: SearchSortKey): SearchHit[] {
  if (sort === "title") {
    return [...hits].sort((a, b) => a.resource.title.localeCompare(b.resource.title));
  }
  if (sort === "time") {
    return [...hits].sort(
      (a, b) =>
        (a.resource.minutes ?? Number.POSITIVE_INFINITY) -
          (b.resource.minutes ?? Number.POSITIVE_INFINITY) ||
        a.resource.title.localeCompare(b.resource.title),
    );
  }
  // Relevance: Fuse already ordered the list, and Array#sort is stable, so an
  // empty query keeps registration order.
  return [...hits].sort((a, b) => a.score - b.score);
}

export interface SearchOptions {
  /** Reuse an index built with `createIndex`. */
  index?: Fuse<ResourceRef>;
  /** Search a subset. Indexes for a stable array reference are cached. */
  resources?: readonly ResourceRef[];
  selection?: FacetSelection;
  sort?: SearchSortKey;
  limit?: number;
}

/**
 * Search every registered resource.
 *
 * An empty query is not an error: it returns the whole (filtered) library in
 * registration order, which is what the facet sidebar needs when a reader
 * picks a type before typing anything.
 */
export function search(query: string, options: SearchOptions = {}): SearchHit[] {
  const resources = options.resources ?? allResources;
  const trimmed = query.trim();
  const terms = splitTerms(trimmed);

  let hits: SearchHit[];
  if (trimmed.length === 0) {
    hits = resources.map(plainHit);
  } else if (trimmed.length < MIN_FUZZY_LENGTH) {
    hits = literalSearch(resources, trimmed, terms);
  } else {
    const index = options.index ?? indexFor(resources);
    hits = index
      .search(trimmed)
      .map((result: FuseResult<ResourceRef>) =>
        buildHit(result.item, result.score ?? 0, result.matches, terms),
      );
  }

  if (options.selection) hits = applyFacets(hits, options.selection);
  hits = sortHits(hits, options.sort ?? "relevance");

  return typeof options.limit === "number" ? hits.slice(0, options.limit) : hits;
}

/* ------------------------------------------------------------------ *
 * Near-miss suggestions
 * ------------------------------------------------------------------ */

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "when",
  "what",
  "how",
  "why",
  "into",
  "onto",
  "over",
  "per",
  "are",
  "was",
  "its",
  "not",
  "but",
  "all",
  "one",
  "two",
  "out",
  "off",
  "own",
  "who",
  "can",
]);

let vocabularyIndex: Fuse<{ term: string }> | null = null;

function buildVocabulary(): string[] {
  const seen = new Map<string, string>();

  const add = (raw: string) => {
    const term = raw.trim();
    if (term.length < 3) return;
    const key = term.toLowerCase();
    if (STOPWORDS.has(key)) return;
    if (!seen.has(key)) seen.set(key, term);
  };

  for (const kind of KIND_ORDER) add(KIND_META[kind].label);

  for (const resource of allResources) {
    for (const tag of resource.tags) add(tag);
    for (const word of resource.title.split(/[^\p{L}\p{N}]+/u)) {
      add(word.replace(/^\d+$/, ""));
    }
  }

  return Array.from(seen.values());
}

function getVocabularyIndex(): Fuse<{ term: string }> {
  vocabularyIndex ??= new Fuse(
    buildVocabulary().map((term) => ({ term })),
    {
      keys: ["term"],
      threshold: 0.45,
      ignoreLocation: true,
      minMatchCharLength: 2,
      includeScore: true,
    },
  );
  return vocabularyIndex;
}

/**
 * "Did you mean" terms for a query that found nothing — drawn from the words
 * that actually appear in resource titles and tags, so every suggestion is
 * guaranteed to return something.
 */
export function suggestTerms(query: string, limit = 5): string[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const asked = new Set(splitTerms(trimmed));
  const index = getVocabularyIndex();
  const candidates = [trimmed, ...splitTerms(trimmed).sort((a, b) => b.length - a.length)];
  const out: string[] = [];
  const taken = new Set<string>();

  for (const candidate of candidates) {
    if (candidate.length < 2) continue;
    for (const result of index.search(candidate, { limit: limit * 3 })) {
      const term = result.item.term;
      const key = term.toLowerCase();
      if (taken.has(key) || asked.has(key)) continue;
      taken.add(key);
      out.push(term);
      if (out.length >= limit) return out;
    }
  }

  return out;
}

let looseIndex: Fuse<ResourceRef> | null = null;

/** The closest resources to a query that returned nothing at full precision. */
export function suggestResources(query: string, limit = 4): ResourceRef[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  looseIndex ??= new Fuse(allResources, {
    keys: [
      { name: "title", weight: 0.6 },
      { name: "tags", weight: 0.25 },
      { name: "summary", weight: 0.15 },
    ],
    threshold: 0.6,
    ignoreLocation: true,
    minMatchCharLength: 2,
  });

  return looseIndex.search(trimmed, { limit }).map((result) => result.item);
}

/* ------------------------------------------------------------------ *
 * Recent and popular searches
 *
 * Implemented in `search-history.ts` — storage only, no index — and
 * re-exported here so `@/lib/search` stays the one import a caller needs.
 * ------------------------------------------------------------------ */

export {
  CURATED_SEARCHES,
  MAX_RECENT_SEARCHES,
  RECENT_SEARCHES_KEY,
  SEARCH_COUNTS_KEY,
  clearRecentSearches,
  forgetSearch,
  getRecentSearches,
  getSearchCounts,
  normaliseQuery,
  popularSearches,
  rememberSearch,
  useRecentSearches,
  usePopularSearches,
  type RecentSearches,
} from "./search-history";
