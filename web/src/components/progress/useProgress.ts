"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import type { LearningPathDoc } from "@/content/paths";
import {
  EMPTY_OVERVIEW,
  DEFAULT_PROFILE,
  getActivity,
  getActivityByDay,
  getAllPathProgress,
  getBookmarkMap,
  getBookmarks,
  getLevelCoverage,
  getOverview,
  getPathProgress,
  getProfile,
  getScoreTrend,
  getTopicMastery,
  getWeakAreas,
  isBookmarked,
  isComplete,
  type ActivityEvent,
  type BookmarkRow,
  type DayActivity,
  type LevelCoverage,
  type PathProgress,
  type Profile,
  type ProgressOverview,
  type ScorePoint,
  type TopicMastery,
  type WeakArea,
} from "@/lib/progress";

/**
 * React bindings for the progress layer.
 *
 * `lib/progress.ts` stays a plain module so server components can import its
 * types and constants. Everything that has to re-render when localStorage
 * changes lives here, behind the client boundary.
 *
 * The store is the `ppc-academy:` namespace itself: `storage.ts` dispatches a
 * `ppc-academy:storage` event on every write in this tab and the browser
 * dispatches `storage` for writes in other tabs. A module-level counter turns
 * both into one version number, and each hook caches its computed snapshot
 * against that version so `useSyncExternalStore` sees a stable value between
 * writes.
 */

const CHANGE_EVENT = "ppc-academy:storage";

let version = 0;
let bound = false;
const listeners = new Set<() => void>();

function handleChange(): void {
  version += 1;
  for (const listener of listeners) listener();
}

function bind(): void {
  if (bound || typeof window === "undefined") return;
  bound = true;
  window.addEventListener("storage", handleChange);
  window.addEventListener(CHANGE_EVENT, handleChange);
}

function subscribe(onStoreChange: () => void): () => void {
  bind();
  listeners.add(onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
  };
}

/**
 * Read a derived value from storage.
 *
 * `compute` must be referentially stable — pass a module-level function or
 * wrap it in `useCallback`. `serverValue` is what the server render and the
 * hydrating render see, so it must be a stable constant too.
 */
export function useProgressSnapshot<T>(compute: () => T, serverValue: T): T {
  const cache = useRef<{ compute: () => T; version: number; value: T } | null>(null);

  const getSnapshot = useCallback(() => {
    const cached = cache.current;
    if (cached && cached.compute === compute && cached.version === version) {
      return cached.value;
    }
    const value = compute();
    cache.current = { compute, version, value };
    return value;
  }, [compute]);

  const getServerSnapshot = useCallback(() => serverValue, [serverValue]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

/* ------------------------------------------------------------------ *
 * Stable empties — identity matters for the server snapshot
 * ------------------------------------------------------------------ */

const NO_EVENTS: ActivityEvent[] = [];
const NO_BOOKMARKS: BookmarkRow[] = [];
const NO_TREND: ScorePoint[] = [];
const NO_WEAK: WeakArea[] = [];
const NO_MASTERY: TopicMastery[] = [];
const NO_COVERAGE: LevelCoverage[] = [];
const NO_DAYS: DayActivity[] = [];
const NO_PATHS: PathProgress[] = [];

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

/** True once the client has taken over from the server-rendered markup. */
export { useIsHydrated as useHydrated } from "@/lib/storage";

export function useOverview(): ProgressOverview {
  return useProgressSnapshot(getOverview, EMPTY_OVERVIEW);
}

export function useProfile(): Profile {
  return useProgressSnapshot(getProfile, DEFAULT_PROFILE);
}

export function useBookmarkRows(): BookmarkRow[] {
  return useProgressSnapshot(getBookmarks, NO_BOOKMARKS);
}

export function useScoreTrend(): ScorePoint[] {
  return useProgressSnapshot(getScoreTrend, NO_TREND);
}

export function useTopicMastery(): TopicMastery[] {
  return useProgressSnapshot(getTopicMastery, NO_MASTERY);
}

export function useLevelCoverage(): LevelCoverage[] {
  return useProgressSnapshot(getLevelCoverage, NO_COVERAGE);
}

export function useWeakAreas(): WeakArea[] {
  return useProgressSnapshot(getWeakAreas, NO_WEAK);
}

export function useAllPathProgress(): PathProgress[] {
  return useProgressSnapshot(getAllPathProgress, NO_PATHS);
}

const readActivityFeed = () => getActivity(24);

export function useActivityFeed(): ActivityEvent[] {
  return useProgressSnapshot(readActivityFeed, NO_EVENTS);
}

const readTwelveWeeks = () => getActivityByDay(84);

export function useActivityDays(): DayActivity[] {
  return useProgressSnapshot(readTwelveWeeks, NO_DAYS);
}

/** Progress for one path. The path object is stable module data. */
export function usePathProgress(path: LearningPathDoc): PathProgress {
  const compute = useCallback(() => getPathProgress(path), [path]);
  // The untouched shape of the path: what the static export renders, and what
  // the hydrating render must agree with before storage is read.
  const serverValue = useMemo(() => getPathProgress(path, {}, {}), [path]);
  return useProgressSnapshot(compute, serverValue);
}

/** Completion state for a single id, for the mark-as-complete control. */
export function useIsComplete(id: string): boolean {
  const compute = useCallback(() => isComplete(id), [id]);
  return useProgressSnapshot(compute, false);
}

/** Bookmark state for a single id. */
export function useIsBookmarked(id: string): boolean {
  const compute = useCallback(() => isBookmarked(id, getBookmarkMap()), [id]);
  return useProgressSnapshot(compute, false);
}
