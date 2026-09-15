import type { Level, QuizQuestion } from "@/types/content";

import { PASS_MARK, findQuestion } from "@/content/quizzes";

import { choiceOrderFor, newSeed, seededShuffle } from "./quiz-shuffle";

/**
 * Pure session model for the quiz runner.
 *
 * Everything in this module is a value transform: no storage, no React, no
 * side effects. The runner holds one `QuizSession` in localStorage and pipes
 * it through these functions, which makes resume-after-refresh free and
 * keeps the component focused on interaction.
 */

export type QuizMode = "practice" | "exam" | "flashcard";

export const QUIZ_MODES: QuizMode[] = ["practice", "exam", "flashcard"];

export interface QuizModeMeta {
  mode: QuizMode;
  label: string;
  blurb: string;
}

export const MODE_META: Record<QuizMode, QuizModeMeta> = {
  practice: {
    mode: "practice",
    label: "Practice",
    blurb: "Answer, see immediately whether you were right, and read the explanation before moving on.",
  },
  exam: {
    mode: "exam",
    label: "Exam",
    blurb: "No feedback until you submit. Optional timer, auto-submitted when it runs out.",
  },
  flashcard: {
    mode: "flashcard",
    label: "Flashcard",
    blurb: "Recall the answer from memory, reveal it, then rate yourself. Ratings feed the review queue.",
  },
};

/** Self-rating in flashcard mode. Again and Hard count as a miss. */
export type FlashcardRating = "again" | "hard" | "good" | "easy";

export const FLASHCARD_RATINGS: FlashcardRating[] = ["again", "hard", "good", "easy"];

export const RATING_LABEL: Record<FlashcardRating, string> = {
  again: "Again",
  hard: "Hard",
  good: "Good",
  easy: "Easy",
};

export function ratingIsCorrect(rating: FlashcardRating): boolean {
  return rating === "good" || rating === "easy";
}

/** What the caller asks for; `createSession` turns it into a live session. */
export interface QuizSessionSpec {
  /** Route/source key: a quiz id, "custom" or "review". */
  sourceId: string;
  title: string;
  mode: QuizMode;
  questionIds: string[];
  /** Total seconds allowed, or null for untimed. */
  timerSeconds: number | null;
  /** Shuffle the question order (choices are always shuffled). */
  shuffle: boolean;
}

export interface QuizSession {
  version: 1;
  id: string;
  sourceId: string;
  title: string;
  mode: QuizMode;
  seed: number;
  questionIds: string[];
  /** questionId -> chosen ORIGINAL choice index (never the displayed slot). */
  answers: Record<string, number>;
  /** questionId -> self-rating, flashcard mode only. */
  ratings: Record<string, FlashcardRating>;
  flagged: string[];
  /** Questions the learner explicitly skipped, so "unanswered" is deliberate. */
  skipped: string[];
  index: number;
  startedAt: number;
  updatedAt: number;
  /** Committed running time; the live segment is added by the runner. */
  elapsedMs: number;
  perQuestionMs: Record<string, number>;
  timerSeconds: number | null;
  paused: boolean;
}

export function sessionStorageKey(sourceId: string): string {
  return `quiz:session:${sourceId}`;
}

export function createSession(spec: QuizSessionSpec): QuizSession {
  const seed = newSeed();
  const ids = spec.shuffle ? seededShuffle(spec.questionIds, seed) : spec.questionIds.slice();
  const now = Date.now();

  return {
    version: 1,
    id: `${spec.sourceId}-${now.toString(36)}-${seed.toString(36)}`,
    sourceId: spec.sourceId,
    title: spec.title,
    mode: spec.mode,
    seed,
    questionIds: ids,
    answers: {},
    ratings: {},
    flagged: [],
    skipped: [],
    index: 0,
    startedAt: now,
    updatedAt: now,
    elapsedMs: 0,
    perQuestionMs: {},
    timerSeconds: spec.timerSeconds,
    paused: false,
  };
}

/** Guard against a stored session from an older shape or a changed bank. */
export function isUsableSession(value: unknown): value is QuizSession {
  if (!value || typeof value !== "object") return false;
  const session = value as Partial<QuizSession>;
  if (session.version !== 1) return false;
  if (!Array.isArray(session.questionIds) || session.questionIds.length === 0) return false;
  return session.questionIds.every((id) => typeof id === "string" && Boolean(findQuestion(id)));
}

/** The questions of a session, resolved and in presentation order. */
export function sessionQuestions(session: QuizSession): QuizQuestion[] {
  const out: QuizQuestion[] = [];
  for (const id of session.questionIds) {
    const question = findQuestion(id);
    if (question) out.push(question);
  }
  return out;
}

/** Displayed choices for a question, plus the map back to original indices. */
export interface DisplayChoice {
  /** Index in the ORIGINAL `question.choices` array. */
  originalIndex: number;
  text: string;
}

export function displayChoices(question: QuizQuestion, seed: number): DisplayChoice[] {
  return choiceOrderFor(question.id, seed, question.choices.length).map((originalIndex) => ({
    originalIndex,
    text: question.choices[originalIndex],
  }));
}

/* ------------------------------------------------------------------ *
 * Transitions — all immutable
 * ------------------------------------------------------------------ */

function touch(session: QuizSession): QuizSession {
  return { ...session, updatedAt: Date.now() };
}

export function answerQuestion(
  session: QuizSession,
  questionId: string,
  originalIndex: number,
): QuizSession {
  return touch({
    ...session,
    answers: { ...session.answers, [questionId]: originalIndex },
    skipped: session.skipped.filter((id) => id !== questionId),
  });
}

export function clearAnswer(session: QuizSession, questionId: string): QuizSession {
  const answers = { ...session.answers };
  delete answers[questionId];
  return touch({ ...session, answers });
}

export function rateQuestion(
  session: QuizSession,
  questionId: string,
  rating: FlashcardRating,
): QuizSession {
  return touch({
    ...session,
    ratings: { ...session.ratings, [questionId]: rating },
    skipped: session.skipped.filter((id) => id !== questionId),
  });
}

export function toggleFlag(session: QuizSession, questionId: string): QuizSession {
  const flagged = session.flagged.includes(questionId)
    ? session.flagged.filter((id) => id !== questionId)
    : [...session.flagged, questionId];
  return touch({ ...session, flagged });
}

export function markSkipped(session: QuizSession, questionId: string): QuizSession {
  if (session.skipped.includes(questionId)) return session;
  return touch({ ...session, skipped: [...session.skipped, questionId] });
}

export function goToIndex(session: QuizSession, index: number): QuizSession {
  const bounded = Math.min(Math.max(index, 0), session.questionIds.length - 1);
  if (bounded === session.index) return session;
  return touch({ ...session, index: bounded });
}

export function addQuestionTime(
  session: QuizSession,
  questionId: string,
  ms: number,
): QuizSession {
  if (ms <= 0) return session;
  return {
    ...session,
    perQuestionMs: {
      ...session.perQuestionMs,
      [questionId]: (session.perQuestionMs[questionId] ?? 0) + ms,
    },
  };
}

export function commitElapsed(session: QuizSession, ms: number): QuizSession {
  if (ms <= 0) return session;
  return { ...session, elapsedMs: session.elapsedMs + ms };
}

export function setPaused(session: QuizSession, paused: boolean): QuizSession {
  return touch({ ...session, paused });
}

/* ------------------------------------------------------------------ *
 * Reading a session
 * ------------------------------------------------------------------ */

export function isAnswered(session: QuizSession, questionId: string): boolean {
  if (session.mode === "flashcard") return questionId in session.ratings;
  return questionId in session.answers;
}

export function answeredCount(session: QuizSession): number {
  return session.questionIds.filter((id) => isAnswered(session, id)).length;
}

export function unansweredIds(session: QuizSession): string[] {
  return session.questionIds.filter((id) => !isAnswered(session, id));
}

export function isCorrect(session: QuizSession, question: QuizQuestion): boolean {
  if (session.mode === "flashcard") {
    const rating = session.ratings[question.id];
    return rating ? ratingIsCorrect(rating) : false;
  }
  return session.answers[question.id] === question.answerIndex;
}

/** Seconds left, or null when the session is untimed. */
export function remainingSeconds(session: QuizSession, elapsedMs: number): number | null {
  if (session.timerSeconds === null) return null;
  return Math.max(0, Math.ceil(session.timerSeconds - elapsedMs / 1000));
}

/** Local calendar day key, e.g. "2026-09-15". Local, not UTC: a day is human. */
export function dayKey(timestamp: number): string {
  const date = new Date(timestamp);
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/* ------------------------------------------------------------------ *
 * Spaced repetition schedule
 *
 * Kept here, in the dependency-free module, so a server component can render
 * the schedule without pulling in the storage layer.
 * ------------------------------------------------------------------ */

/** Days until a question in each Leitner box comes back. Box 0 is due now. */
export const REVIEW_INTERVALS_DAYS = [0, 1, 3, 7, 21];

/** Answering correctly out of the last box retires the question. */
export const REVIEW_GRADUATION_BOX = REVIEW_INTERVALS_DAYS.length;

/* ------------------------------------------------------------------ *
 * Scoring
 * ------------------------------------------------------------------ */

export interface AttemptRow {
  questionId: string;
  level: Level;
  topic: string;
  /** Original choice index the learner picked, or null when unanswered. */
  answerIndex: number | null;
  rating?: FlashcardRating;
  /** Whether the learner answered it at all (rated it, in flashcard mode). */
  answered: boolean;
  correct: boolean;
  ms: number;
  flagged: boolean;
}

export interface Tally {
  correct: number;
  total: number;
}

export interface QuizAttempt {
  id: string;
  /** The source the session ran from: a quiz id, "custom" or "review". */
  quizId: string;
  title: string;
  mode: QuizMode;
  startedAt: number;
  finishedAt: number;
  durationMs: number;
  total: number;
  correct: number;
  unanswered: number;
  /** 0-100, rounded to one decimal place. */
  score: number;
  passed: boolean;
  byLevel: Partial<Record<Level, Tally>>;
  byTopic: Record<string, Tally>;
  rows: AttemptRow[];
}

function bump(tally: Tally | undefined, correct: boolean): Tally {
  return {
    correct: (tally?.correct ?? 0) + (correct ? 1 : 0),
    total: (tally?.total ?? 0) + 1,
  };
}

/** Turn a finished session into the permanent attempt record. */
export function scoreSession(session: QuizSession, extraElapsedMs = 0): QuizAttempt {
  const questions = sessionQuestions(session);
  const rows: AttemptRow[] = [];
  const byLevel: Partial<Record<Level, Tally>> = {};
  const byTopic: Record<string, Tally> = {};

  let correct = 0;
  let unanswered = 0;

  for (const question of questions) {
    const answered = isAnswered(session, question.id);
    const right = answered && isCorrect(session, question);
    if (right) correct += 1;
    if (!answered) unanswered += 1;

    byLevel[question.level] = bump(byLevel[question.level], right);
    byTopic[question.topic] = bump(byTopic[question.topic], right);

    rows.push({
      questionId: question.id,
      level: question.level,
      topic: question.topic,
      answerIndex: session.answers[question.id] ?? null,
      rating: session.ratings[question.id],
      answered,
      correct: right,
      ms: session.perQuestionMs[question.id] ?? 0,
      flagged: session.flagged.includes(question.id),
    });
  }

  const total = questions.length;
  const score = total === 0 ? 0 : Math.round((correct / total) * 1000) / 10;
  const finishedAt = Date.now();

  return {
    id: session.id,
    quizId: session.sourceId,
    title: session.title,
    mode: session.mode,
    startedAt: session.startedAt,
    finishedAt,
    durationMs: session.elapsedMs + Math.max(0, extraElapsedMs),
    total,
    correct,
    unanswered,
    score,
    passed: score >= PASS_MARK,
    byLevel,
    byTopic,
    rows,
  };
}

/** Question ids the learner got wrong (or never answered) in an attempt. */
export function missedIds(attempt: QuizAttempt): string[] {
  return attempt.rows.filter((row) => !row.correct).map((row) => row.questionId);
}

/** "12:04" / "1:02:11" */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (value: number) => value.toString().padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}

/** "8.4s" / "1m 12s" — used for per-question timings. */
export function formatShortDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "—";
  const seconds = ms / 1000;
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds)}s`;
  const minutes = Math.floor(seconds / 60);
  return `${minutes}m ${Math.round(seconds % 60)}s`;
}

/** A plain-text summary the learner can paste into a message or a portfolio. */
export function shareSummary(attempt: QuizAttempt): string {
  const date = dayKey(attempt.finishedAt);
  const levelLines = Object.entries(attempt.byLevel).map(
    ([level, tally]) => `  ${level}: ${tally.correct}/${tally.total}`,
  );
  const topicLines = Object.entries(attempt.byTopic)
    .sort((a, b) => b[1].total - a[1].total)
    .slice(0, 6)
    .map(([topic, tally]) => `  ${topic}: ${tally.correct}/${tally.total}`);

  return [
    `PPC Academy — ${attempt.title}`,
    `${date} · ${MODE_META[attempt.mode].label} mode`,
    "",
    `Score: ${attempt.score}% (${attempt.correct}/${attempt.total}) — ${attempt.passed ? "PASS" : "below the 70% pass mark"}`,
    `Time: ${formatDuration(attempt.durationMs)}`,
    attempt.unanswered > 0 ? `Unanswered: ${attempt.unanswered}` : null,
    "",
    "By level:",
    ...levelLines,
    "",
    "Strongest topics by volume:",
    ...topicLines,
  ]
    .filter((line) => line !== null)
    .join("\n");
}
