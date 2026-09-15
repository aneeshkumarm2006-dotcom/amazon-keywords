import { useCallback, useMemo } from "react";

import { storageGet, storageSet, useLocalStorage } from "@/lib/storage";

/**
 * Recent and popular searches, persisted through `src/lib/storage.ts`.
 *
 * This lives beside `src/lib/search.ts` rather than inside it, and is
 * re-exported from there so `@/lib/search` stays the single public API. The
 * split is deliberate: the command palette is mounted in the root layout on
 * every page and needs the history immediately, while the Fuse index pulls
 * in the whole content registry and is loaded lazily the first time the
 * palette opens. Keeping the history dependency-free is what makes that
 * possible.
 */

export const RECENT_SEARCHES_KEY = "search:recent";
export const SEARCH_COUNTS_KEY = "search:counts";
export const MAX_RECENT_SEARCHES = 8;

/** A query has to be repeated before it outranks the curated list. */
const POPULAR_THRESHOLD = 2;

const NO_RECENTS: string[] = [];
const NO_COUNTS: Record<string, number> = {};

/**
 * The searches worth putting in front of a reader who has not typed yet.
 * Every one of these returns results against the shipped library.
 */
export const CURATED_SEARCHES: string[] = [
  "ACoS",
  "negative keywords",
  "search term report",
  "match types",
  "campaign structure",
  "break-even",
  "budget pacing",
  "Helium 10",
  "client onboarding",
  "dayparting",
];

export function normaliseQuery(query: string): string {
  return query.trim().replace(/\s+/g, " ");
}

export function getRecentSearches(): string[] {
  const stored = storageGet<string[]>(RECENT_SEARCHES_KEY, NO_RECENTS);
  return Array.isArray(stored) ? stored.filter((entry) => typeof entry === "string") : [];
}

export function getSearchCounts(): Record<string, number> {
  const stored = storageGet<Record<string, number>>(SEARCH_COUNTS_KEY, NO_COUNTS);
  return stored && typeof stored === "object" ? stored : {};
}

/**
 * Record a query the reader actually meant.
 *
 * Stored entries that the new query starts with are dropped, so typing
 * "negative" and then "negative keywords" leaves one useful entry rather
 * than a trail of half-finished ones.
 */
export function rememberSearch(query: string): void {
  const clean = normaliseQuery(query);
  if (clean.length < 2) return;
  const lower = clean.toLowerCase();

  const kept = getRecentSearches().filter((entry) => {
    const candidate = entry.toLowerCase();
    if (candidate === lower) return false;
    return !(candidate.length >= 3 && lower.startsWith(candidate));
  });
  storageSet(RECENT_SEARCHES_KEY, [clean, ...kept].slice(0, MAX_RECENT_SEARCHES));

  const counts = { ...getSearchCounts() };
  counts[lower] = (counts[lower] ?? 0) + 1;
  storageSet(SEARCH_COUNTS_KEY, counts);
}

export function forgetSearch(query: string): void {
  const lower = query.trim().toLowerCase();
  storageSet(
    RECENT_SEARCHES_KEY,
    getRecentSearches().filter((entry) => entry.toLowerCase() !== lower),
  );
}

export function clearRecentSearches(): void {
  storageSet(RECENT_SEARCHES_KEY, NO_RECENTS);
}

function mergePopular(counts: Record<string, number>, limit: number): string[] {
  const repeated = Object.entries(counts)
    .filter(([, count]) => count >= POPULAR_THRESHOLD)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([query]) => query);

  const out: string[] = [];
  const taken = new Set<string>();

  for (const query of [...repeated, ...CURATED_SEARCHES]) {
    const key = query.toLowerCase();
    if (taken.has(key)) continue;
    taken.add(key);
    out.push(query);
    if (out.length >= limit) break;
  }

  return out;
}

/** Popular searches: this reader's repeats first, then the curated list. */
export function popularSearches(limit = 6): string[] {
  return mergePopular(getSearchCounts(), limit);
}

export interface RecentSearches {
  recent: string[];
  /** True once the value reflects what is actually in storage. */
  ready: boolean;
  remember: (query: string) => void;
  forget: (query: string) => void;
  clear: () => void;
}

/** Recent searches, live across tabs and every component on the key. */
export function useRecentSearches(): RecentSearches {
  const [recent, , { ready }] = useLocalStorage<string[]>(RECENT_SEARCHES_KEY, NO_RECENTS);

  const remember = useCallback((query: string) => rememberSearch(query), []);
  const forget = useCallback((query: string) => forgetSearch(query), []);
  const clear = useCallback(() => clearRecentSearches(), []);

  const list = useMemo(
    () => (Array.isArray(recent) ? recent.filter((entry) => typeof entry === "string") : []),
    [recent],
  );

  return { recent: list, ready, remember, forget, clear };
}

/** Popular searches as a hook, so repeats promote themselves as you use it. */
export function usePopularSearches(limit = 6): string[] {
  const [counts] = useLocalStorage<Record<string, number>>(SEARCH_COUNTS_KEY, NO_COUNTS);
  return useMemo(
    () => mergePopular(counts && typeof counts === "object" ? counts : {}, limit),
    [counts, limit],
  );
}
