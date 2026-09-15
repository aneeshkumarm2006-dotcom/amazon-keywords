import type { Level } from "@/types/content";

import { LEVEL_ORDER, PASS_MARK, findQuestion } from "@/content/quizzes";

import {
  REVIEW_GRADUATION_BOX,
  REVIEW_INTERVALS_DAYS,
  dayKey,
  type AttemptRow,
  type QuizAttempt,
  type QuizMode,
} from "./quiz-session";
import { storageGet, storageRemove, storageSet } from "./storage";

/**
 * Quiz persistence and the progress API other phases read.
 *
 * Everything lives in localStorage under the `ppc-academy:` namespace. Four
 * records are kept:
 *
 *   quiz:attempts  — the attempt history, newest first, capped
 *   quiz:mastery   — per-question seen/correct counters
 *   quiz:review    — a Leitner-box queue of questions missed or left unanswered
 *   quiz:streak    — consecutive days with at least one finished attempt
 *
 * Every function here is plain and side-effect-safe to call from anywhere:
 * they no-op during SSR, so a server component may import them. The matching
 * React hooks live in `quiz-hooks.ts`, which is a client module.
 */

export const ATTEMPTS_KEY = "quiz:attempts";
export const MASTERY_KEY = "quiz:mastery";
export const REVIEW_KEY = "quiz:review";
export const STREAK_KEY = "quiz:streak";
export const CUSTOM_CONFIG_KEY = "quiz:custom-config";

/** History cap. Roughly 40 attempts of detail rows stays well inside quota. */
const MAX_ATTEMPTS = 40;

/* ------------------------------------------------------------------ *
 * Types
 * ------------------------------------------------------------------ */

export interface MasteryEntry {
  /** Times the question has been presented and answered. */
  seen: number;
  /** Times it was answered correctly. */
  correct: number;
  lastSeenAt: number;
  lastCorrect: boolean;
  /** Consecutive correct answers, reset by a miss. */
  streak: number;
}

export type MasteryMap = Record<string, MasteryEntry>;

/** One question waiting in the spaced-repetition queue. */
export interface ReviewEntry {
  id: string;
  /** Leitner box: 0 is "due now", 4 is "nearly retired". */
  box: number;
  dueAt: number;
  /** How many times this question has been missed in total. */
  wrong: number;
  addedAt: number;
}

export type ReviewQueue = Record<string, ReviewEntry>;

export interface StreakState {
  current: number;
  longest: number;
  /** Local YYYY-MM-DD of the most recent finished attempt. */
  lastDay: string | null;
  /** Distinct active days, newest last, capped at 120. */
  days: string[];
  totalAttempts: number;
}

/** Saved configuration for the custom quiz builder and "retry missed". */
export interface CustomQuizConfig {
  levels: Level[];
  topics: string[];
  count: number;
  mode: QuizMode;
  /** Minutes on the clock, or null for untimed. */
  timerMinutes: number | null;
  /** Explicit question ids — set by "retry missed only". */
  questionIds?: string[];
  label?: string;
}

const EMPTY_ATTEMPTS: QuizAttempt[] = [];
const EMPTY_MASTERY: MasteryMap = {};
const EMPTY_REVIEW: ReviewQueue = {};

export const EMPTY_STREAK: StreakState = {
  current: 0,
  longest: 0,
  lastDay: null,
  days: [],
  totalAttempts: 0,
};

export const DEFAULT_CUSTOM_CONFIG: CustomQuizConfig = {
  levels: ["beginner", "intermediate"],
  topics: [],
  count: 15,
  mode: "practice",
  timerMinutes: null,
};

/* ------------------------------------------------------------------ *
 * Attempts
 * ------------------------------------------------------------------ */

/** Full attempt history, newest first. */
export function getAttempts(): QuizAttempt[] {
  const stored = storageGet<QuizAttempt[]>(ATTEMPTS_KEY, EMPTY_ATTEMPTS);
  return Array.isArray(stored) ? stored : EMPTY_ATTEMPTS;
}

export function getAttemptsFor(quizId: string): QuizAttempt[] {
  return getAttempts().filter((attempt) => attempt.quizId === quizId);
}

export function latestAttemptFor(quizId: string): QuizAttempt | undefined {
  return getAttempts().find((attempt) => attempt.quizId === quizId);
}

export function findAttempt(attemptId: string): QuizAttempt | undefined {
  return getAttempts().find((attempt) => attempt.id === attemptId);
}

/** Best score recorded for a quiz, or null if it has never been finished. */
export function bestScoreFor(quizId: string, attempts = getAttempts()): number | null {
  const scores = attempts
    .filter((attempt) => attempt.quizId === quizId)
    .map((attempt) => attempt.score);
  return scores.length > 0 ? Math.max(...scores) : null;
}

/**
 * Persist a finished attempt and fold it into mastery, the review queue and
 * the streak. This is the single write path for everything a results screen
 * or a dashboard reads back.
 */
export function recordAttempt(attempt: QuizAttempt): void {
  const existing = getAttempts().filter((entry) => entry.id !== attempt.id);
  storageSet(ATTEMPTS_KEY, [attempt, ...existing].slice(0, MAX_ATTEMPTS));
  applyMastery(attempt.rows);
  applyReview(attempt.rows);
  bumpStreak(attempt.finishedAt);
}

/* ------------------------------------------------------------------ *
 * Mastery
 * ------------------------------------------------------------------ */

export function getMastery(): MasteryMap {
  const stored = storageGet<MasteryMap>(MASTERY_KEY, EMPTY_MASTERY);
  return stored && typeof stored === "object" ? stored : EMPTY_MASTERY;
}

export function getMasteryFor(questionId: string): MasteryEntry | undefined {
  return getMastery()[questionId];
}

function applyMastery(rows: readonly AttemptRow[]): void {
  const mastery = { ...getMastery() };
  for (const row of rows) {
    // Questions the learner never answered are not "seen": counting them would
    // sink lifetime accuracy and reset streaks nobody actually broke.
    if (!row.answered) continue;
    const previous = mastery[row.questionId];
    mastery[row.questionId] = {
      seen: (previous?.seen ?? 0) + 1,
      correct: (previous?.correct ?? 0) + (row.correct ? 1 : 0),
      lastSeenAt: Date.now(),
      lastCorrect: row.correct,
      streak: row.correct ? (previous?.streak ?? 0) + 1 : 0,
    };
  }
  storageSet(MASTERY_KEY, mastery);
}

export interface MasterySummary {
  /** Questions answered at least once. */
  seen: number;
  /** Questions whose last answer was correct. */
  known: number;
  /** Questions answered correctly twice in a row or better. */
  mastered: number;
  /** Questions answered at least once whose last answer was wrong. */
  shaky: number;
  /** Percentage of every question in the bank that has been seen. */
  coverage: number;
  /** Lifetime correct answers over lifetime answers, as a percentage. */
  accuracy: number;
}

export function masterySummary(totalQuestions: number, mastery = getMastery()): MasterySummary {
  const entries = Object.values(mastery);
  const seen = entries.length;
  const known = entries.filter((entry) => entry.lastCorrect).length;
  const mastered = entries.filter((entry) => entry.streak >= 2).length;
  const answered = entries.reduce((sum, entry) => sum + entry.seen, 0);
  const correct = entries.reduce((sum, entry) => sum + entry.correct, 0);

  return {
    seen,
    known,
    mastered,
    shaky: seen - known,
    coverage: totalQuestions > 0 ? Math.round((seen / totalQuestions) * 100) : 0,
    accuracy: answered > 0 ? Math.round((correct / answered) * 100) : 0,
  };
}

export interface LevelMastery {
  level: Level;
  total: number;
  seen: number;
  mastered: number;
  accuracy: number;
}

/** Mastery rolled up per level. Feeds the hub overview and the dashboard. */
export function masteryByLevel(
  questionLevels: Readonly<Record<string, Level>>,
  mastery = getMastery(),
): LevelMastery[] {
  const totals = new Map<Level, LevelMastery>(
    LEVEL_ORDER.map((level) => [
      level,
      { level, total: 0, seen: 0, mastered: 0, accuracy: 0 },
    ]),
  );
  const answers = new Map<Level, { correct: number; seen: number }>(
    LEVEL_ORDER.map((level) => [level, { correct: 0, seen: 0 }]),
  );

  for (const [questionId, level] of Object.entries(questionLevels)) {
    const bucket = totals.get(level);
    if (!bucket) continue;
    bucket.total += 1;

    const entry = mastery[questionId];
    if (!entry) continue;
    bucket.seen += 1;
    if (entry.streak >= 2) bucket.mastered += 1;

    const tally = answers.get(level);
    if (tally) {
      tally.correct += entry.correct;
      tally.seen += entry.seen;
    }
  }

  return LEVEL_ORDER.map((level) => {
    const bucket = totals.get(level) as LevelMastery;
    const tally = answers.get(level) ?? { correct: 0, seen: 0 };
    return {
      ...bucket,
      accuracy: tally.seen > 0 ? Math.round((tally.correct / tally.seen) * 100) : 0,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Review queue (Leitner boxes)
 * ------------------------------------------------------------------ */

const DAY_MS = 24 * 60 * 60 * 1000;

export { REVIEW_GRADUATION_BOX, REVIEW_INTERVALS_DAYS, dayKey };

export function getReviewQueue(): ReviewQueue {
  const stored = storageGet<ReviewQueue>(REVIEW_KEY, EMPTY_REVIEW);
  return stored && typeof stored === "object" ? stored : EMPTY_REVIEW;
}

function applyReview(rows: readonly AttemptRow[]): void {
  const queue = { ...getReviewQueue() };
  const now = Date.now();

  for (const row of rows) {
    const existing = queue[row.questionId];

    // Unanswered rows queue up too, deliberately: the submit dialog promises
    // that questions left blank come back around.
    if (!row.correct) {
      queue[row.questionId] = {
        id: row.questionId,
        box: 0,
        dueAt: now,
        wrong: (existing?.wrong ?? 0) + 1,
        addedAt: existing?.addedAt ?? now,
      };
      continue;
    }

    if (!existing) continue;

    const nextBox = existing.box + 1;
    if (nextBox >= REVIEW_GRADUATION_BOX) {
      delete queue[row.questionId];
      continue;
    }

    queue[row.questionId] = {
      ...existing,
      box: nextBox,
      dueAt: now + REVIEW_INTERVALS_DAYS[nextBox] * DAY_MS,
    };
  }

  storageSet(REVIEW_KEY, queue);
}

/** Every queued question that still exists in the bank, soonest due first. */
export function reviewEntries(queue = getReviewQueue()): ReviewEntry[] {
  return Object.values(queue)
    .filter((entry) => Boolean(findQuestion(entry.id)))
    .sort((a, b) => a.dueAt - b.dueAt || b.wrong - a.wrong);
}

/** Queued questions that are due now. */
export function dueReviewEntries(now = Date.now(), queue = getReviewQueue()): ReviewEntry[] {
  return reviewEntries(queue).filter((entry) => entry.dueAt <= now);
}

export function dueReviewIds(now = Date.now(), queue = getReviewQueue()): string[] {
  return dueReviewEntries(now, queue).map((entry) => entry.id);
}

/** Drop a question from the queue by hand, e.g. "I know this one". */
export function retireFromReview(questionId: string): void {
  const queue = { ...getReviewQueue() };
  if (!(questionId in queue)) return;
  delete queue[questionId];
  storageSet(REVIEW_KEY, queue);
}

/* ------------------------------------------------------------------ *
 * Streak
 * ------------------------------------------------------------------ */

function daysBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / DAY_MS);
}

export function getStreak(): StreakState {
  const stored = storageGet<StreakState>(STREAK_KEY, EMPTY_STREAK);
  if (!stored || typeof stored !== "object") return EMPTY_STREAK;
  return { ...EMPTY_STREAK, ...stored };
}

/**
 * The streak as it reads *today* — a stored streak that has already lapsed
 * shows as 0 rather than as yesterday's number.
 */
export function currentStreak(now = Date.now(), state = getStreak()): number {
  if (!state.lastDay) return 0;
  const gap = daysBetween(state.lastDay, dayKey(now));
  return gap <= 1 ? state.current : 0;
}

function bumpStreak(finishedAt: number): void {
  const state = getStreak();
  const today = dayKey(finishedAt);

  let current = state.current;
  if (!state.lastDay) {
    current = 1;
  } else {
    const gap = daysBetween(state.lastDay, today);
    if (gap === 0) current = Math.max(1, state.current);
    else if (gap === 1) current = state.current + 1;
    else current = 1;
  }

  const days = state.days.includes(today) ? state.days : [...state.days, today].slice(-120);

  storageSet(STREAK_KEY, {
    current,
    longest: Math.max(state.longest, current),
    lastDay: today,
    days,
    totalAttempts: state.totalAttempts + 1,
  } satisfies StreakState);
}

/* ------------------------------------------------------------------ *
 * Custom quiz configuration
 * ------------------------------------------------------------------ */

export function loadCustomConfig(): CustomQuizConfig | null {
  const stored = storageGet<CustomQuizConfig | null>(CUSTOM_CONFIG_KEY, null);
  if (!stored || typeof stored !== "object" || !Array.isArray(stored.levels)) return null;
  return { ...DEFAULT_CUSTOM_CONFIG, ...stored };
}

export function saveCustomConfig(config: CustomQuizConfig): void {
  storageSet(CUSTOM_CONFIG_KEY, config);
}

/* ------------------------------------------------------------------ *
 * Reset
 * ------------------------------------------------------------------ */

/** Wipe every quiz record. Sessions in flight are cleared by the caller. */
export function clearQuizProgress(): void {
  for (const key of [ATTEMPTS_KEY, MASTERY_KEY, REVIEW_KEY, STREAK_KEY, CUSTOM_CONFIG_KEY]) {
    storageRemove(key);
  }
}

/* ------------------------------------------------------------------ *
 * Shared derived helpers
 * ------------------------------------------------------------------ */

export interface QuizProgressSnapshot {
  attempts: number;
  lastAttempt: QuizAttempt | null;
  bestScore: number | null;
  passedQuizzes: number;
  dueForReview: number;
  streak: number;
}

/**
 * One compact read of quiz progress, for surfaces that only need headlines
 * (the phase 9 dashboard, the home page, a nav badge).
 */
export function quizProgressSnapshot(now = Date.now()): QuizProgressSnapshot {
  const attempts = getAttempts();
  const passed = new Set(
    attempts.filter((attempt) => attempt.score >= PASS_MARK).map((attempt) => attempt.quizId),
  );

  return {
    attempts: attempts.length,
    lastAttempt: attempts[0] ?? null,
    bestScore: attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null,
    passedQuizzes: passed.size,
    dueForReview: dueReviewIds(now).length,
    streak: currentStreak(now),
  };
}
