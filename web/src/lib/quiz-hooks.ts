"use client";

import { useMemo, useState } from "react";

import {
  ATTEMPTS_KEY,
  CUSTOM_CONFIG_KEY,
  DEFAULT_CUSTOM_CONFIG,
  EMPTY_STREAK,
  MASTERY_KEY,
  REVIEW_KEY,
  STREAK_KEY,
  currentStreak,
  type CustomQuizConfig,
  type MasteryMap,
  type ReviewQueue,
  type StreakState,
} from "./quiz-progress";
import type { QuizAttempt } from "./quiz-session";
import { useLocalStorage } from "./storage";

/**
 * Reactive views over the quiz records.
 *
 * `quiz-progress.ts` stays a plain module so server components can import its
 * types and helpers; everything that needs to re-render when storage changes
 * lives here, behind the client boundary.
 */

const EMPTY_ATTEMPTS: QuizAttempt[] = [];
const EMPTY_MASTERY: MasteryMap = {};
const EMPTY_REVIEW: ReviewQueue = {};

export function useAttempts(): QuizAttempt[] {
  const [attempts] = useLocalStorage<QuizAttempt[]>(ATTEMPTS_KEY, EMPTY_ATTEMPTS);
  return Array.isArray(attempts) ? attempts : EMPTY_ATTEMPTS;
}

export function useMastery(): MasteryMap {
  const [mastery] = useLocalStorage<MasteryMap>(MASTERY_KEY, EMPTY_MASTERY);
  return mastery ?? EMPTY_MASTERY;
}

export function useReviewQueue(): ReviewQueue {
  const [queue] = useLocalStorage<ReviewQueue>(REVIEW_KEY, EMPTY_REVIEW);
  return queue ?? EMPTY_REVIEW;
}

/** Streak state plus `today` — the streak as it reads at this moment. */
export function useStreak(): StreakState & { today: number } {
  const [state] = useLocalStorage<StreakState>(STREAK_KEY, EMPTY_STREAK);
  // The clock is read once per mount so the hook stays pure across renders.
  const [now] = useState(() => Date.now());
  return useMemo(() => {
    const merged = { ...EMPTY_STREAK, ...state };
    return { ...merged, today: currentStreak(now, merged) };
  }, [now, state]);
}

export function useCustomConfig(): [
  CustomQuizConfig,
  (next: CustomQuizConfig | ((previous: CustomQuizConfig) => CustomQuizConfig)) => void,
] {
  const [config, setConfig] = useLocalStorage<CustomQuizConfig>(
    CUSTOM_CONFIG_KEY,
    DEFAULT_CUSTOM_CONFIG,
  );
  return [{ ...DEFAULT_CUSTOM_CONFIG, ...config }, setConfig];
}
