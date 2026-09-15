import type { Level } from "@/types/content";

import {
  CATEGORY_ORDER,
  PASS_MARK,
  categoryCounts,
  findInterviewQuestion,
  type InterviewCategory,
} from "@/content/interviews";

import { storageGet, storageRemove, storageSet } from "./storage";

/**
 * Interview prep persistence, and the progress API other phases read.
 *
 * Four records live in localStorage under the `ppc-academy:` namespace:
 *
 *   interview:bookmarks — starred questions, newest first
 *   interview:practised — questions marked as practised, with a timestamp
 *   interview:mocks     — finished mock interview attempts, newest first
 *   interview:mock-live — the attempt currently in flight, so a refresh or a
 *                         closed tab never loses a typed answer
 *
 * Everything here is a plain function that no-ops during SSR, so a server
 * component may import the types and helpers safely. The React hooks that
 * re-render on change live in `interview-hooks.ts`, behind the client
 * boundary.
 */

export const BOOKMARKS_KEY = "interview:bookmarks";
export const PRACTISED_KEY = "interview:practised";
export const MOCK_HISTORY_KEY = "interview:mocks";
export const MOCK_SESSION_KEY = "interview:mock-live";

/** History cap. Twenty attempts of detail rows stays well inside quota. */
const MAX_ATTEMPTS = 20;

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

/** Self-assessment score for one answer, matching the source coaching rubric. */
export type SelfScore = 0 | 1 | 2;

export type MockDifficulty = "any" | "foundations" | "senior" | "scenarios";

export interface MockDifficultyMeta {
  id: MockDifficulty;
  label: string;
  blurb: string;
  levels: Level[];
}

export const MOCK_DIFFICULTIES: MockDifficultyMeta[] = [
  {
    id: "any",
    label: "Mixed",
    blurb: "Everything in the bank, the way a real interview mixes it.",
    levels: ["beginner", "intermediate", "advanced", "expert", "scenario"],
  },
  {
    id: "foundations",
    label: "Foundations",
    blurb: "Screening and working level — the first two rounds.",
    levels: ["beginner", "intermediate"],
  },
  {
    id: "senior",
    label: "Senior",
    blurb: "Strategy and client judgement, where the money decisions live.",
    levels: ["advanced", "expert"],
  },
  {
    id: "scenarios",
    label: "Scenarios",
    blurb: "Live cases and role-play only. The hardest format to fake.",
    levels: ["scenario", "expert"],
  },
];

export function difficultyMeta(id: MockDifficulty): MockDifficultyMeta {
  return MOCK_DIFFICULTIES.find((entry) => entry.id === id) ?? MOCK_DIFFICULTIES[0];
}

/** What was recorded for one question inside a mock attempt. */
export interface MockRow {
  questionId: string;
  category: InterviewCategory;
  level: Level;
  /** Everything the candidate typed. Kept so the report can show it back. */
  answer: string;
  score: SelfScore;
  /** Indexes of the key points the candidate ticked as covered. */
  covered: number[];
  keyPointCount: number;
  /** Seconds spent on the answer step. */
  seconds: number;
  /** True when the per-question timer ran out before the answer was submitted. */
  timedOut: boolean;
}

export interface MockAttempt {
  version: 1;
  id: string;
  startedAt: number;
  finishedAt: number;
  categories: InterviewCategory[];
  difficulty: MockDifficulty;
  /** Seconds allowed per question, or null when untimed. */
  timerSeconds: number | null;
  rows: MockRow[];
  /** Self-assessed score as a percentage of the maximum. */
  score: number;
  /** Total seconds spent answering. */
  totalSeconds: number;
}

/** The attempt in flight, persisted on every keystroke pause. */
export interface MockSession {
  version: 1;
  id: string;
  startedAt: number;
  updatedAt: number;
  categories: InterviewCategory[];
  difficulty: MockDifficulty;
  timerSeconds: number | null;
  questionIds: string[];
  index: number;
  /** "answer" while typing, "assess" while self-scoring. */
  stage: "answer" | "assess";
  answers: Record<string, string>;
  scores: Record<string, SelfScore>;
  covered: Record<string, number[]>;
  seconds: Record<string, number>;
  timedOut: string[];
}

export interface PractisedEntry {
  id: string;
  at: number;
}

const EMPTY_IDS: string[] = [];
const EMPTY_PRACTISED: PractisedEntry[] = [];
const EMPTY_ATTEMPTS: MockAttempt[] = [];

/* ------------------------------------------------------------------ *
 * Bookmarks
 * ------------------------------------------------------------------ */

/** Starred question ids, newest first, with anything stale filtered out. */
export function getBookmarks(): string[] {
  const stored = storageGet<string[]>(BOOKMARKS_KEY, EMPTY_IDS);
  if (!Array.isArray(stored)) return EMPTY_IDS;
  return stored.filter((id) => typeof id === "string" && Boolean(findInterviewQuestion(id)));
}

export function isBookmarked(id: string, bookmarks = getBookmarks()): boolean {
  return bookmarks.includes(id);
}

/** Add or remove a bookmark. Returns the state the id ended up in. */
export function toggleBookmark(id: string): boolean {
  const current = getBookmarks();
  const next = current.includes(id) ? current.filter((entry) => entry !== id) : [id, ...current];
  storageSet(BOOKMARKS_KEY, next);
  return next.includes(id);
}

export function clearBookmarks(): void {
  storageRemove(BOOKMARKS_KEY);
}

/* ------------------------------------------------------------------ *
 * Practised
 * ------------------------------------------------------------------ */

/** Questions marked as practised, newest first. */
export function getPractised(): PractisedEntry[] {
  const stored = storageGet<PractisedEntry[]>(PRACTISED_KEY, EMPTY_PRACTISED);
  if (!Array.isArray(stored)) return EMPTY_PRACTISED;
  return stored.filter(
    (entry) =>
      entry && typeof entry.id === "string" && Boolean(findInterviewQuestion(entry.id)),
  );
}

export function practisedIds(entries = getPractised()): string[] {
  return entries.map((entry) => entry.id);
}

export function isPractised(id: string, entries = getPractised()): boolean {
  return entries.some((entry) => entry.id === id);
}

/** Toggle the practised flag. Returns the state the id ended up in. */
export function togglePractised(id: string): boolean {
  const current = getPractised();
  const exists = current.some((entry) => entry.id === id);
  const next = exists
    ? current.filter((entry) => entry.id !== id)
    : [{ id, at: Date.now() }, ...current];
  storageSet(PRACTISED_KEY, next);
  return !exists;
}

/** Mark practised without un-marking, used by the mock runner and flashcards. */
export function markPractised(ids: readonly string[]): void {
  if (ids.length === 0) return;
  const current = getPractised();
  const seen = new Set(current.map((entry) => entry.id));
  const additions = ids
    .filter((id) => !seen.has(id) && Boolean(findInterviewQuestion(id)))
    .map((id) => ({ id, at: Date.now() }));
  if (additions.length === 0) return;
  storageSet(PRACTISED_KEY, [...additions, ...current]);
}

export function clearPractised(): void {
  storageRemove(PRACTISED_KEY);
}

/* ------------------------------------------------------------------ *
 * Mock attempts
 * ------------------------------------------------------------------ */

export function getMockHistory(): MockAttempt[] {
  const stored = storageGet<MockAttempt[]>(MOCK_HISTORY_KEY, EMPTY_ATTEMPTS);
  if (!Array.isArray(stored)) return EMPTY_ATTEMPTS;
  return stored.filter((attempt) => attempt && Array.isArray(attempt.rows));
}

export function findMockAttempt(id: string): MockAttempt | undefined {
  return getMockHistory().find((attempt) => attempt.id === id);
}

/**
 * Persist a finished attempt and mark every question in it as practised.
 * Single write path for anything a report or a dashboard reads back.
 */
export function recordMockAttempt(attempt: MockAttempt): void {
  const existing = getMockHistory().filter((entry) => entry.id !== attempt.id);
  storageSet(MOCK_HISTORY_KEY, [attempt, ...existing].slice(0, MAX_ATTEMPTS));
  markPractised(attempt.rows.map((row) => row.questionId));
}

export function clearMockHistory(): void {
  storageRemove(MOCK_HISTORY_KEY);
}

/** Self-assessed percentage for a set of rows. Two points per question. */
export function scoreRows(rows: readonly MockRow[]): number {
  if (rows.length === 0) return 0;
  const earned = rows.reduce((sum, row) => sum + row.score, 0);
  return Math.round((earned / (rows.length * 2)) * 100);
}

export interface CategoryScore {
  category: InterviewCategory;
  answered: number;
  earned: number;
  possible: number;
  percent: number;
  seconds: number;
}

/** Per-category roll-up of one attempt, ordered by weakest first. */
export function scoreByCategory(rows: readonly MockRow[]): CategoryScore[] {
  const buckets = new Map<InterviewCategory, CategoryScore>();

  for (const row of rows) {
    const bucket = buckets.get(row.category) ?? {
      category: row.category,
      answered: 0,
      earned: 0,
      possible: 0,
      percent: 0,
      seconds: 0,
    };
    bucket.answered += 1;
    bucket.earned += row.score;
    bucket.possible += 2;
    bucket.seconds += row.seconds;
    buckets.set(row.category, bucket);
  }

  return Array.from(buckets.values())
    .map((bucket) => ({
      ...bucket,
      percent: bucket.possible > 0 ? Math.round((bucket.earned / bucket.possible) * 100) : 0,
    }))
    .sort((a, b) => a.percent - b.percent || a.category.localeCompare(b.category));
}

/** Categories scored below the pass mark in an attempt — the revision list. */
export function weakCategories(rows: readonly MockRow[]): CategoryScore[] {
  return scoreByCategory(rows).filter((bucket) => bucket.percent < PASS_MARK);
}

/** Question ids scored 0 or 1, weakest first — what to re-drill. */
export function weakQuestionIds(rows: readonly MockRow[]): string[] {
  return rows
    .filter((row) => row.score < 2)
    .sort((a, b) => a.score - b.score)
    .map((row) => row.questionId);
}

/* ------------------------------------------------------------------ *
 * In-flight mock session
 * ------------------------------------------------------------------ */

export function getMockSession(): MockSession | null {
  const stored = storageGet<MockSession | null>(MOCK_SESSION_KEY, null);
  if (!stored || typeof stored !== "object" || !Array.isArray(stored.questionIds)) return null;
  if (stored.questionIds.length === 0) return null;
  return stored;
}

export function saveMockSession(session: MockSession): void {
  storageSet(MOCK_SESSION_KEY, { ...session, updatedAt: Date.now() });
}

export function clearMockSession(): void {
  storageRemove(MOCK_SESSION_KEY);
}

/** Turn a finished session into the attempt record the history stores. */
export function sessionToAttempt(session: MockSession, finishedAt = Date.now()): MockAttempt {
  const rows: MockRow[] = session.questionIds.flatMap((questionId) => {
    const question = findInterviewQuestion(questionId);
    if (!question) return [];
    return [
      {
        questionId,
        category: question.category,
        level: question.level,
        answer: session.answers[questionId] ?? "",
        score: session.scores[questionId] ?? 0,
        covered: session.covered[questionId] ?? [],
        keyPointCount: question.keyPoints.length,
        seconds: Math.round(session.seconds[questionId] ?? 0),
        timedOut: session.timedOut.includes(questionId),
      },
    ];
  });

  return {
    version: 1,
    id: session.id,
    startedAt: session.startedAt,
    finishedAt,
    categories: session.categories,
    difficulty: session.difficulty,
    timerSeconds: session.timerSeconds,
    rows,
    score: scoreRows(rows),
    totalSeconds: rows.reduce((sum, row) => sum + row.seconds, 0),
  };
}

/* ------------------------------------------------------------------ *
 * Progress roll-ups
 * ------------------------------------------------------------------ */

export interface CategoryProgress {
  category: InterviewCategory;
  total: number;
  practised: number;
  bookmarked: number;
  percent: number;
}

/** Practised and bookmarked counts per category, in display order. */
export function categoryProgress(
  practised: readonly string[] = practisedIds(),
  bookmarks: readonly string[] = getBookmarks(),
): CategoryProgress[] {
  const totals = categoryCounts();
  const practisedSet = new Set(practised);
  const bookmarkSet = new Set(bookmarks);

  const rows = new Map<InterviewCategory, CategoryProgress>(
    CATEGORY_ORDER.map((category) => [
      category,
      {
        category,
        total: totals[category],
        practised: 0,
        bookmarked: 0,
        percent: 0,
      },
    ]),
  );

  for (const id of practisedSet) {
    const question = findInterviewQuestion(id);
    const row = question ? rows.get(question.category) : undefined;
    if (row) row.practised += 1;
  }

  for (const id of bookmarkSet) {
    const question = findInterviewQuestion(id);
    const row = question ? rows.get(question.category) : undefined;
    if (row) row.bookmarked += 1;
  }

  return CATEGORY_ORDER.map((category) => {
    const row = rows.get(category) as CategoryProgress;
    return {
      ...row,
      percent: row.total > 0 ? Math.round((row.practised / row.total) * 100) : 0,
    };
  });
}

export interface InterviewProgressSnapshot {
  /** Questions marked as practised. */
  practised: number;
  /** Total questions in the bank. */
  total: number;
  /** Practised as a percentage of the bank. */
  coverage: number;
  bookmarked: number;
  attempts: number;
  lastAttempt: MockAttempt | null;
  bestScore: number | null;
  /** Category names scored below the pass mark in the most recent attempt. */
  weakAreas: string[];
}

/**
 * One compact read of interview progress for surfaces that only need
 * headlines — the phase 9 dashboard, the hub, a nav badge.
 */
export function interviewProgressSnapshot(): InterviewProgressSnapshot {
  const totals = categoryCounts();
  const total = CATEGORY_ORDER.reduce((sum, category) => sum + totals[category], 0);
  const practised = getPractised();
  const attempts = getMockHistory();
  const last = attempts[0] ?? null;

  return {
    practised: practised.length,
    total,
    coverage: total > 0 ? Math.round((practised.length / total) * 100) : 0,
    bookmarked: getBookmarks().length,
    attempts: attempts.length,
    lastAttempt: last,
    bestScore: attempts.length > 0 ? Math.max(...attempts.map((entry) => entry.score)) : null,
    weakAreas: last ? weakCategories(last.rows).map((bucket) => bucket.category) : [],
  };
}

/** Wipe every interview record. Used by a settings-level reset. */
export function clearInterviewProgress(): void {
  for (const key of [BOOKMARKS_KEY, PRACTISED_KEY, MOCK_HISTORY_KEY, MOCK_SESSION_KEY]) {
    storageRemove(key);
  }
}
