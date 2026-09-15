"use client";

import { useCallback, useMemo } from "react";

import {
  BOOKMARKS_KEY,
  MOCK_HISTORY_KEY,
  MOCK_SESSION_KEY,
  PRACTISED_KEY,
  categoryProgress,
  toggleBookmark,
  togglePractised,
  type CategoryProgress,
  type MockAttempt,
  type MockSession,
  type PractisedEntry,
} from "./interview-progress";
import { useLocalStorage } from "./storage";

/**
 * Reactive views over the interview records.
 *
 * `interview-progress.ts` stays a plain module so server components can import
 * its types and helpers; everything that must re-render when storage changes
 * lives here, behind the client boundary. Every hook shares the same storage
 * keys, so a bookmark toggled in the bank browser updates the flashcard drill
 * and the deep-dive page in the same tick.
 */

const EMPTY_IDS: string[] = [];
const EMPTY_PRACTISED: PractisedEntry[] = [];
const EMPTY_ATTEMPTS: MockAttempt[] = [];

export interface BookmarksApi {
  bookmarks: string[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
}

export function useBookmarks(): BookmarksApi {
  const [stored] = useLocalStorage<string[]>(BOOKMARKS_KEY, EMPTY_IDS);
  const bookmarks = useMemo(() => (Array.isArray(stored) ? stored : EMPTY_IDS), [stored]);
  const set = useMemo(() => new Set(bookmarks), [bookmarks]);

  const has = useCallback((id: string) => set.has(id), [set]);
  const toggle = useCallback((id: string) => {
    toggleBookmark(id);
  }, []);

  return { bookmarks, has, toggle, count: bookmarks.length };
}

export interface PractisedApi {
  practised: string[];
  entries: PractisedEntry[];
  has: (id: string) => boolean;
  toggle: (id: string) => void;
  count: number;
}

export function usePractised(): PractisedApi {
  const [stored] = useLocalStorage<PractisedEntry[]>(PRACTISED_KEY, EMPTY_PRACTISED);
  const entries = useMemo(() => (Array.isArray(stored) ? stored : EMPTY_PRACTISED), [stored]);
  const practised = useMemo(() => entries.map((entry) => entry.id), [entries]);
  const set = useMemo(() => new Set(practised), [practised]);

  const has = useCallback((id: string) => set.has(id), [set]);
  const toggle = useCallback((id: string) => {
    togglePractised(id);
  }, []);

  return { practised, entries, has, toggle, count: practised.length };
}

/** Practised and bookmarked counts per category, recalculated on change. */
export function useCategoryProgress(): CategoryProgress[] {
  const { practised } = usePractised();
  const { bookmarks } = useBookmarks();
  return useMemo(() => categoryProgress(practised, bookmarks), [practised, bookmarks]);
}

export function useMockHistory(): MockAttempt[] {
  const [stored] = useLocalStorage<MockAttempt[]>(MOCK_HISTORY_KEY, EMPTY_ATTEMPTS);
  return useMemo(
    () => (Array.isArray(stored) ? stored.filter((entry) => Array.isArray(entry?.rows)) : EMPTY_ATTEMPTS),
    [stored],
  );
}

/**
 * The mock attempt in flight. `ready` is false until hydration finishes, so a
 * resume prompt never flashes on the server-rendered markup.
 */
export function useMockSession(): { session: MockSession | null; ready: boolean } {
  const [stored, , meta] = useLocalStorage<MockSession | null>(MOCK_SESSION_KEY, null);
  const session = useMemo(() => {
    if (!stored || typeof stored !== "object" || !Array.isArray(stored.questionIds)) return null;
    return stored.questionIds.length > 0 ? stored : null;
  }, [stored]);

  return { session, ready: meta.ready };
}
