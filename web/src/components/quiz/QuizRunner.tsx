"use client";

import {
  ArrowLeft,
  ArrowRight,
  CheckCheck,
  Eye,
  Grid3x3,
  Keyboard,
  ListChecks,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  Timer,
  Trophy,
} from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  LEVEL_META,
  PASS_MARK,
  filterQuestions,
  findQuiz,
  questionsByIds,
} from "@/content/quizzes";
import { useAttempts } from "@/lib/quiz-hooks";
import {
  bestScoreFor,
  dueReviewIds,
  loadCustomConfig,
  recordAttempt,
  reviewEntries,
} from "@/lib/quiz-progress";
import { newSeed, seededShuffle } from "@/lib/quiz-shuffle";
import {
  FLASHCARD_RATINGS,
  MODE_META,
  QUIZ_MODES,
  RATING_LABEL,
  addQuestionTime,
  answerQuestion,
  answeredCount,
  commitElapsed,
  createSession,
  displayChoices,
  formatDuration,
  goToIndex,
  isAnswered,
  isUsableSession,
  markSkipped,
  rateQuestion,
  ratingIsCorrect,
  remainingSeconds,
  scoreSession,
  sessionStorageKey,
  setPaused,
  toggleFlag,
  unansweredIds,
  type FlashcardRating,
  type QuizAttempt,
  type QuizMode,
  type QuizSession,
} from "@/lib/quiz-session";
import { storageGet, storageRemove, useIsHydrated, useLocalStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { QuestionCard } from "./QuestionCard";

/**
 * The results screen pulls in recharts for its four charts. Nobody sees it
 * until the last question is answered, so it is fetched then rather than
 * shipped with the runner — roughly 120KB of JavaScript that a learner who
 * abandons the quiz never downloads at all.
 */
const QuizResults = dynamic(() => import("./QuizResults").then((mod) => mod.QuizResults), {
  loading: () => (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <span className="sr-only">Scoring your attempt</span>
    </div>
  ),
});

export type QuizSource =
  | { kind: "quiz"; quizId: string }
  | { kind: "custom" }
  | { kind: "review" };

interface Pool {
  sourceId: string;
  title: string;
  description: string;
  ids: string[];
  suggestedSeconds: number;
  defaultMode: QuizMode;
  /** Rendered instead of the start panel when there is nothing to run. */
  empty?: { title: string; description: string; href: string; label: string };
}

const COUNT_STEPS = [5, 10, 15, 20, 25, 30, 40, 50];

function suggestedSecondsFor(ids: readonly string[]): number {
  return questionsByIds(ids).reduce(
    (total, question) => total + LEVEL_META[question.level].secondsPerQuestion,
    0,
  );
}

function resolvePool(source: QuizSource): Pool {
  if (source.kind === "quiz") {
    const quiz = findQuiz(source.quizId);
    if (!quiz) {
      return {
        sourceId: source.quizId,
        title: "Quiz not found",
        description: "",
        ids: [],
        suggestedSeconds: 0,
        defaultMode: "practice",
        empty: {
          title: "That quiz does not exist",
          description: "Pick one of the five levels or the mock exam from the quiz hub.",
          href: "/quizzes",
          label: "Back to quizzes",
        },
      };
    }
    const ids = quiz.questions.map((question) => question.id);
    return {
      sourceId: quiz.id,
      title: quiz.title,
      description: quiz.summary,
      ids,
      suggestedSeconds: suggestedSecondsFor(ids),
      defaultMode: "practice",
    };
  }

  if (source.kind === "custom") {
    const config = loadCustomConfig();
    if (!config) {
      return {
        sourceId: "custom",
        title: "Custom quiz",
        description: "",
        ids: [],
        suggestedSeconds: 0,
        defaultMode: "practice",
        empty: {
          title: "No custom quiz has been built yet",
          description:
            "Use the builder on the quiz hub to pick the levels, topics and question count you want.",
          href: "/quizzes#custom",
          label: "Open the builder",
        },
      };
    }

    const explicit = config.questionIds ?? [];
    const pool =
      explicit.length > 0
        ? questionsByIds(explicit).map((question) => question.id)
        : seededShuffle(
            filterQuestions(config.levels, config.topics).map((question) => question.id),
            newSeed(),
          ).slice(0, Math.max(1, config.count));

    return {
      sourceId: "custom",
      title: config.label ?? "Custom quiz",
      description:
        explicit.length > 0
          ? "A focused drill built from the questions you missed."
          : `${config.levels.length > 0 ? config.levels.map((level) => LEVEL_META[level].label).join(", ") : "All levels"}${config.topics.length > 0 ? ` · ${config.topics.join(", ")}` : ""}`,
      ids: pool,
      suggestedSeconds: suggestedSecondsFor(pool),
      defaultMode: config.mode,
      empty:
        pool.length === 0
          ? {
              title: "Nothing matched that combination",
              description: "Widen the levels or topics in the builder and try again.",
              href: "/quizzes#custom",
              label: "Open the builder",
            }
          : undefined,
    };
  }

  const due = dueReviewIds();
  const queued = reviewEntries().map((entry) => entry.id);
  const ids = due.length > 0 ? due : queued;

  return {
    sourceId: "review",
    title: "Review queue",
    description:
      due.length > 0
        ? `${due.length} question${due.length === 1 ? "" : "s"} are due. Answer each one correctly twice and it retires from the queue.`
        : "Nothing is due yet, but you can drill the whole queue early.",
    ids,
    suggestedSeconds: suggestedSecondsFor(ids),
    defaultMode: "practice",
    empty:
      ids.length === 0
        ? {
            title: "Your review queue is empty",
            description:
              "Questions you answer incorrectly land here automatically and resurface on a spaced schedule.",
            href: "/quizzes",
            label: "Take a quiz",
          }
        : undefined,
  };
}

export interface QuizRunnerProps {
  source: QuizSource;
  /** Shown above the title on the start panel. */
  eyebrow?: string;
}

export function QuizRunner({ source, eyebrow }: QuizRunnerProps) {
  const hydrated = useIsHydrated();
  const router = useRouter();
  const sourceId =
    source.kind === "quiz" ? source.quizId : source.kind === "custom" ? "custom" : "review";
  const storageKey = sessionStorageKey(sourceId);

  const [stored, setStored] = useLocalStorage<QuizSession | null>(storageKey, null);
  const session = hydrated && isUsableSession(stored) ? stored : null;

  const [finished, setFinished] = useState<QuizAttempt | null>(null);
  const [revealed, setRevealed] = useState<string[]>([]);
  const [showNavigator, setShowNavigator] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  // Live clock -------------------------------------------------------
  //
  // `segmentStart` marks the beginning of the open (uncommitted) stretch of
  // running time. It lives in state rather than a ref so the elapsed readout
  // can be derived during render without reaching into a ref.
  const [segmentStart, setSegmentStart] = useState<number>(() => Date.now());
  const [now, setNow] = useState<number>(() => Date.now());

  const running = Boolean(session) && !finished;
  const paused = session?.paused ?? false;
  const committedMs = session?.elapsedMs ?? 0;
  const timerSeconds = session?.timerSeconds ?? null;

  const liveElapsed =
    committedMs + (running && !paused ? Math.max(0, now - segmentStart) : 0);

  /** Fold the open timing segment into the session, then apply `fn`. */
  const update = useCallback(
    (fn: (session: QuizSession) => QuizSession) => {
      const timestamp = Date.now();
      const segment = paused ? 0 : Math.max(0, timestamp - segmentStart);
      setSegmentStart(timestamp);
      setNow(timestamp);
      setStored((previous) => {
        if (!previous) return previous;
        const applied = previous.paused ? 0 : segment;
        const currentId = previous.questionIds[previous.index];
        const withTime = addQuestionTime(commitElapsed(previous, applied), currentId, applied);
        return fn(withTime);
      });
    },
    [paused, segmentStart, setStored],
  );

  const pool = useMemo(
    () => (hydrated ? resolvePool(source) : null),
    // `resolvePool` reads localStorage for custom and review sources, so it
    // must not run until after hydration.
    [hydrated, source],
  );

  const attempts = useAttempts();
  const best = useMemo(() => bestScoreFor(sourceId, attempts), [sourceId, attempts]);

  const questions = useMemo(
    () => (session ? questionsByIds(session.questionIds) : []),
    [session],
  );
  const current = session ? questions[session.index] : undefined;

  /* ---------------------------------------------------------------- *
   * Actions
   * ---------------------------------------------------------------- */

  const start = useCallback(
    (spec: { mode: QuizMode; ids: string[]; timerSeconds: number | null; shuffle: boolean }) => {
      if (!pool) return;
      const timestamp = Date.now();
      setRevealed([]);
      setFinished(null);
      setSegmentStart(timestamp);
      setNow(timestamp);
      setStored(
        createSession({
          sourceId: pool.sourceId,
          title: pool.title,
          mode: spec.mode,
          questionIds: spec.ids,
          timerSeconds: spec.timerSeconds,
          shuffle: spec.shuffle,
        }),
      );
    },
    [pool, setStored],
  );

  const submit = useCallback(() => {
    update((current) => current);
    const latest = storageGet<QuizSession | null>(storageKey, null);
    if (!latest) return;
    const attempt = scoreSession(latest);
    recordAttempt(attempt);
    storageRemove(storageKey);
    setConfirmSubmit(false);
    setFinished(attempt);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, [storageKey, update]);

  const requestSubmit = useCallback(() => {
    const latest = storageGet<QuizSession | null>(storageKey, null);
    if (latest && unansweredIds(latest).length > 0) {
      setConfirmSubmit(true);
      return;
    }
    submit();
  }, [storageKey, submit]);

  const goNext = useCallback(() => {
    if (!session) return;
    if (session.index >= session.questionIds.length - 1) {
      requestSubmit();
      return;
    }
    update((state) => goToIndex(state, state.index + 1));
  }, [requestSubmit, session, update]);

  const goBack = useCallback(() => {
    update((state) => goToIndex(state, state.index - 1));
  }, [update]);

  const skip = useCallback(() => {
    if (!session || !current) return;
    update((state) => markSkipped(state, current.id));
    goNext();
  }, [current, goNext, session, update]);

  const select = useCallback(
    (originalIndex: number) => {
      if (!current) return;
      update((state) => answerQuestion(state, current.id, originalIndex));
    },
    [current, update],
  );

  const rate = useCallback(
    (rating: FlashcardRating) => {
      if (!current) return;
      update((state) => rateQuestion(state, current.id, rating));
      goNext();
    },
    [current, goNext, update],
  );

  const reveal = useCallback(() => {
    if (!current) return;
    setRevealed((ids) => (ids.includes(current.id) ? ids : [...ids, current.id]));
  }, [current]);

  const flag = useCallback(() => {
    if (!current) return;
    update((state) => toggleFlag(state, current.id));
  }, [current, update]);

  const togglePause = useCallback(() => {
    update((state) => setPaused(state, !state.paused));
  }, [update]);

  const restart = useCallback(() => {
    storageRemove(storageKey);
    setRevealed([]);
    setFinished(null);
    setConfirmRestart(false);
  }, [storageKey]);

  const saveAndExit = useCallback(() => {
    update((state) => state);
    router.push("/quizzes");
  }, [router, update]);

  /* ---------------------------------------------------------------- *
   * The clock: one interval that advances the readout and enforces the
   * exam time limit. Both happen in the timer callback rather than in the
   * effect body, so no state is set synchronously during an effect.
   * ---------------------------------------------------------------- */

  const secondsLeft = session ? remainingSeconds(session, liveElapsed) : null;

  useEffect(() => {
    if (!running || paused) return;

    const id = window.setInterval(() => {
      const timestamp = Date.now();
      setNow(timestamp);
      if (
        timerSeconds !== null &&
        committedMs + Math.max(0, timestamp - segmentStart) >= timerSeconds * 1000
      ) {
        submit();
      }
    }, 1000);

    return () => window.clearInterval(id);
  }, [committedMs, paused, running, segmentStart, submit, timerSeconds]);

  // Fold the open segment into the session if the tab is closed mid-quiz.
  useEffect(() => {
    if (!running) return;
    const flush = () => update((state) => state);
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [running, update]);

  /* ---------------------------------------------------------------- *
   * Keyboard shortcuts
   * ---------------------------------------------------------------- */

  const isRevealed = Boolean(
    current &&
      session &&
      (session.mode === "practice"
        ? isAnswered(session, current.id)
        : session.mode === "flashcard"
          ? revealed.includes(current.id) || current.id in session.ratings
          : false),
  );

  const choices = useMemo(
    () => (current && session ? displayChoices(current, session.seed) : []),
    [current, session],
  );

  useEffect(() => {
    if (!session || !current || finished) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target?.isContentEditable) {
        return;
      }
      if (paused && event.key !== "p" && event.key !== "P") return;

      const digit = Number.parseInt(event.key, 10);

      if (Number.isInteger(digit) && digit >= 1 && digit <= 4) {
        if (session.mode === "flashcard") {
          if (!isRevealed) return;
          event.preventDefault();
          rate(FLASHCARD_RATINGS[digit - 1]);
          return;
        }
        const choice = choices[digit - 1];
        if (!choice) return;
        if (session.mode === "practice" && isAnswered(session, current.id)) return;
        event.preventDefault();
        select(choice.originalIndex);
        return;
      }

      switch (event.key) {
        case "Enter":
          if (tag === "BUTTON" || tag === "A") return;
          event.preventDefault();
          if (session.mode === "flashcard" && !isRevealed) reveal();
          else goNext();
          break;
        case " ":
          if (tag === "BUTTON" || tag === "A") return;
          if (session.mode !== "flashcard") return;
          event.preventDefault();
          if (!isRevealed) reveal();
          break;
        case "f":
        case "F":
          event.preventDefault();
          flag();
          break;
        case "s":
        case "S":
          event.preventDefault();
          skip();
          break;
        case "p":
        case "P":
          if (session.timerSeconds === null) return;
          event.preventDefault();
          togglePause();
          break;
        case "b":
        case "B":
        case "ArrowLeft":
          if (session.index === 0) return;
          if (tag === "BUTTON" && event.key === "ArrowLeft") return;
          event.preventDefault();
          goBack();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [
    choices,
    current,
    finished,
    flag,
    goBack,
    goNext,
    isRevealed,
    paused,
    rate,
    reveal,
    select,
    session,
    skip,
    togglePause,
  ]);

  /* ---------------------------------------------------------------- *
   * Render
   * ---------------------------------------------------------------- */

  if (!hydrated || !pool) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-9 w-2/3" />
        <Skeleton className="h-64 rounded-2xl" />
        <span className="sr-only">Loading quiz</span>
      </div>
    );
  }

  if (finished) {
    return (
      <QuizResults
        attempt={finished}
        retakeHref={
          source.kind === "review"
            ? "/quizzes/review"
            : `/quizzes/${source.kind === "custom" ? "custom" : source.quizId}`
        }
        eyebrow="Results"
      />
    );
  }

  if (!session) {
    if (pool.empty) {
      return (
        <EmptyState
          title={pool.empty.title}
          description={pool.empty.description}
          icon={ListChecks}
          action={<ButtonLink href={pool.empty.href}>{pool.empty.label}</ButtonLink>}
        />
      );
    }

    return (
      <StartPanel
        pool={pool}
        eyebrow={eyebrow}
        best={best}
        onStart={start}
        resumable={Boolean(stored) && !isUsableSession(stored)}
      />
    );
  }

  if (!current) {
    return (
      <EmptyState
        title="This session is out of sync"
        description="The question bank changed since the session was saved. Start it again to continue."
        action={<Button onClick={restart}>Start over</Button>}
      />
    );
  }

  const total = session.questionIds.length;
  const done = answeredCount(session);
  const flagged = session.flagged.includes(current.id);
  const locked = session.mode === "practice" && isAnswered(session, current.id);
  const selected = session.answers[current.id] ?? null;
  const rating = session.ratings[current.id];
  const lastQuestion = session.index === total - 1;

  return (
    <div className="flex flex-col gap-5">
      {/* Runner chrome ---------------------------------------------- */}
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Badge tone="brand" size="sm">
            {MODE_META[session.mode].label}
          </Badge>
          <p className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{session.title}</p>

          {session.timerSeconds !== null ? (
            <TimerChip
              secondsLeft={secondsLeft ?? 0}
              totalSeconds={session.timerSeconds}
              paused={paused}
              onToggle={togglePause}
            />
          ) : (
            <span className="tabular inline-flex items-center gap-1.5 text-xs text-faint">
              <Timer className="size-3.5" aria-hidden="true" />
              {formatDuration(liveElapsed)}
            </span>
          )}

          <button
            type="button"
            onClick={() => setShowNavigator((value) => !value)}
            aria-expanded={showNavigator}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-muted transition-colors hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <Grid3x3 className="size-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">Questions</span>
            <span className="tabular">
              {done}/{total}
            </span>
          </button>
        </div>

        <Progress
          value={session.index + 1}
          max={total}
          hideLabel
          srLabel={`Question ${session.index + 1} of ${total}`}
          readout={`${session.index + 1} of ${total}`}
          size="sm"
          tone="brand"
        />

        {showNavigator ? (
          <div className="border-t border-hairline pt-3">
            <ul className="flex flex-wrap gap-1.5">
              {session.questionIds.map((id, index) => {
                const answered = isAnswered(session, id);
                const isFlagged = session.flagged.includes(id);
                const isCurrent = index === session.index;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => update((state) => goToIndex(state, index))}
                      aria-current={isCurrent ? "true" : undefined}
                      aria-label={`Question ${index + 1}${answered ? ", answered" : ""}${isFlagged ? ", flagged" : ""}`}
                      className={cn(
                        "tabular flex size-8 items-center justify-center rounded-md border text-xs font-semibold transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        isCurrent && "ring-2 ring-brand ring-offset-1 ring-offset-surface",
                        isFlagged
                          ? "border-warn/40 bg-warn-soft text-warn"
                          : answered
                            ? "border-transparent bg-brand text-on-brand"
                            : "border-hairline bg-surface-2 text-faint hover:text-ink",
                      )}
                    >
                      {index + 1}
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2.5 text-xs text-faint">
              Filled squares are answered, amber squares are flagged for review.
            </p>
          </div>
        ) : null}
      </div>

      {/* Question ---------------------------------------------------- */}
      <Card as="panel" className="p-5 sm:p-6">
        {paused ? (
          <div className="flex flex-col items-center gap-4 py-14 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-surface-2">
              <Pause className="size-5 text-faint" aria-hidden="true" />
            </span>
            <div>
              <p className="font-display text-lg font-semibold text-ink">Paused</p>
              <p className="mt-1 text-sm text-muted">
                The clock is stopped and the question is hidden. Press P or the button to resume.
              </p>
            </div>
            <Button icon={Play} onClick={togglePause}>
              Resume
            </Button>
          </div>
        ) : (
          <QuestionCard
            question={current}
            choices={choices}
            selected={selected}
            revealed={isRevealed}
            locked={locked}
            hideChoices={session.mode === "flashcard" && !isRevealed}
            onSelect={select}
            flagged={flagged}
            onToggleFlag={flag}
            position={{ current: session.index + 1, total }}
          />
        )}
      </Card>

      {/* Controls ---------------------------------------------------- */}
      {!paused ? (
        <div className="flex flex-col gap-3">
          {session.mode === "flashcard" && isRevealed ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {FLASHCARD_RATINGS.map((value, index) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => rate(value)}
                  className={cn(
                    "flex min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    rating === value
                      ? "border-brand bg-brand-soft text-brand"
                      : ratingIsCorrect(value)
                        ? "border-hairline bg-surface text-ink hover:border-good/50 hover:bg-good-soft"
                        : "border-hairline bg-surface text-ink hover:border-warn/50 hover:bg-warn-soft",
                  )}
                >
                  <span>{RATING_LABEL[value]}</span>
                  <span className="font-mono text-[0.625rem] text-faint">{index + 1}</span>
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="secondary"
              icon={ArrowLeft}
              onClick={goBack}
              disabled={session.index === 0}
            >
              Back
            </Button>

            {session.mode === "flashcard" && !isRevealed ? (
              <Button icon={Eye} onClick={reveal}>
                Show answer
              </Button>
            ) : null}

            <Button variant="ghost" icon={SkipForward} onClick={skip}>
              Skip
            </Button>

            <div className="ml-auto flex items-center gap-2">
              {lastQuestion ? (
                <Button icon={CheckCheck} onClick={requestSubmit}>
                  Finish and score
                </Button>
              ) : (
                <Button iconAfter={ArrowRight} onClick={goNext}>
                  Next
                </Button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-surface-2 px-3 py-2">
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-faint">
              <span className="inline-flex items-center gap-1.5">
                <Keyboard className="size-3.5" aria-hidden="true" />
                Shortcuts
              </span>
              <Shortcut keys="1-4" label={session.mode === "flashcard" ? "rate" : "answer"} />
              <Shortcut keys="Enter" label={session.mode === "flashcard" ? "reveal / next" : "next"} />
              <Shortcut keys="F" label="flag" />
              <Shortcut keys="S" label="skip" />
              <Shortcut keys="B" label="back" />
              {session.timerSeconds !== null ? <Shortcut keys="P" label="pause" /> : null}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setConfirmRestart(true)}
                className="inline-flex min-h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Restart
              </button>
              <Button variant="ghost" size="sm" onClick={saveAndExit}>
                Save and exit
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <Dialog
        open={confirmSubmit}
        onClose={() => setConfirmSubmit(false)}
        title="Finish with unanswered questions?"
        description={`${unansweredIds(session).length} of ${total} questions have no answer. They will be scored as incorrect.`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>
              Keep going
            </Button>
            <Button onClick={submit}>Finish anyway</Button>
          </>
        }
      >
        <p className="text-muted">
          Unanswered questions also go into your review queue, so they will come back around.
        </p>
      </Dialog>

      <Dialog
        open={confirmRestart}
        onClose={() => setConfirmRestart(false)}
        title="Restart this session?"
        description="Your answers, flags and timing for this session are discarded. Past attempts are kept."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setConfirmRestart(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={restart}>
              Discard and restart
            </Button>
          </>
        }
      >
        <p className="text-muted">
          Nothing is scored and nothing is recorded — this attempt simply disappears.
        </p>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Start panel
 * ------------------------------------------------------------------ */

interface StartPanelProps {
  pool: Pool;
  eyebrow?: string;
  best: number | null;
  resumable: boolean;
  onStart: (spec: {
    mode: QuizMode;
    ids: string[];
    timerSeconds: number | null;
    shuffle: boolean;
  }) => void;
}

function StartPanel({ pool, eyebrow, best, resumable, onStart }: StartPanelProps) {
  const [mode, setMode] = useState<QuizMode>(pool.defaultMode);
  const [shuffle, setShuffle] = useState(true);
  const [count, setCount] = useState<number>(pool.ids.length);
  const [timerMinutes, setTimerMinutes] = useState<number>(
    Math.max(1, Math.round(pool.suggestedSeconds / 60)),
  );
  const [timerOn, setTimerOn] = useState(false);

  const countOptions = useMemo(() => {
    const steps = COUNT_STEPS.filter((step) => step < pool.ids.length);
    return [
      ...steps.map((step) => ({ value: String(step), label: `${step} questions` })),
      { value: String(pool.ids.length), label: `All ${pool.ids.length} questions` },
    ];
  }, [pool.ids.length]);

  const timerOptions = useMemo(() => {
    const suggested = Math.max(1, Math.round(pool.suggestedSeconds / 60));
    const values = Array.from(new Set([suggested, 5, 10, 15, 20, 30, 45, 60])).sort(
      (a, b) => a - b,
    );
    return values.map((value) => ({
      value: String(value),
      label: value === suggested ? `${value} min (suggested)` : `${value} min`,
    }));
  }, [pool.suggestedSeconds]);

  const ids = useMemo(
    () => (count >= pool.ids.length ? pool.ids : pool.ids.slice(0, count)),
    [count, pool.ids],
  );

  return (
    <div className="flex flex-col gap-6">
      {resumable ? (
        <div className="rounded-xl border border-warn/35 bg-warn-soft p-4 text-sm text-ink">
          A saved session for this quiz could not be restored because the question bank changed.
          Starting fresh below.
        </div>
      ) : null}

      <Card as="panel" className="overflow-hidden">
        <div className="border-b border-hairline p-5 sm:p-6">
          {eyebrow ? (
            <p className="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
              {eyebrow}
            </p>
          ) : null}
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-2xl">
              <h2 className="font-display text-2xl leading-tight font-bold text-ink">
                {pool.title}
              </h2>
              <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
                {pool.description}
              </p>
            </div>
            {best !== null ? (
              <div className="rounded-xl border border-hairline bg-surface-2 px-4 py-3 text-right">
                <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
                  Best score
                </p>
                <p
                  className={cn(
                    "tabular text-2xl leading-none font-bold",
                    best >= PASS_MARK ? "text-good" : "text-ink",
                  )}
                >
                  {best}%
                </p>
              </div>
            ) : null}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge tone="neutral" size="sm">
              {pool.ids.length} questions
            </Badge>
            <Badge tone="neutral" size="sm">
              about {Math.max(1, Math.round(pool.suggestedSeconds / 60))} min
            </Badge>
            <Badge tone="neutral" size="sm">
              pass at {PASS_MARK}%
            </Badge>
          </div>
        </div>

        <div className="flex flex-col gap-5 p-5 sm:p-6">
          <div>
            <p className="mb-2 text-[0.8125rem] font-medium text-ink">Mode</p>
            <SegmentedControl
              label="Quiz mode"
              options={QUIZ_MODES.map((value) => ({
                value,
                label: MODE_META[value].label,
              }))}
              value={mode}
              onChange={setMode}
              fullWidth
            />
            <p className="mt-2 text-sm text-muted">{MODE_META[mode].blurb}</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {pool.ids.length > 5 ? (
              <Select
                id="quiz-count"
                label="Questions"
                options={countOptions}
                value={String(count)}
                onChange={(event) => setCount(Number(event.target.value))}
              />
            ) : null}

            {mode === "exam" ? (
              <Select
                id="quiz-timer"
                label="Time limit"
                hint={timerOn ? "Auto-submits when the clock runs out." : "Untimed."}
                options={[{ value: "0", label: "No timer" }, ...timerOptions]}
                value={timerOn ? String(timerMinutes) : "0"}
                onChange={(event) => {
                  const value = Number(event.target.value);
                  setTimerOn(value > 0);
                  if (value > 0) setTimerMinutes(value);
                }}
              />
            ) : null}
          </div>

          <Checkbox
            id="quiz-shuffle"
            label="Shuffle the question order"
            hint="Choices are always shuffled, with a seed so a resumed session looks the same."
            checked={shuffle}
            onChange={(event) => setShuffle(event.target.checked)}
          />

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
            <Button
              size="lg"
              icon={Trophy}
              onClick={() =>
                onStart({
                  mode,
                  ids,
                  timerSeconds: mode === "exam" && timerOn ? timerMinutes * 60 : null,
                  shuffle,
                })
              }
            >
              Start {ids.length} question{ids.length === 1 ? "" : "s"}
            </Button>
            <ButtonLink href="/quizzes" variant="ghost" size="lg">
              Back to quizzes
            </ButtonLink>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Small pieces
 * ------------------------------------------------------------------ */

function Shortcut({ keys, label }: { keys: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <kbd className="rounded border border-hairline bg-surface px-1 py-0.5 font-mono text-[0.625rem] text-muted">
        {keys}
      </kbd>
      {label}
    </span>
  );
}

function TimerChip({
  secondsLeft,
  totalSeconds,
  paused,
  onToggle,
}: {
  secondsLeft: number;
  totalSeconds: number;
  paused: boolean;
  onToggle: () => void;
}) {
  const critical = secondsLeft <= 60;
  const low = secondsLeft <= Math.max(60, totalSeconds * 0.15);

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={paused ? "Resume the timer" : "Pause the timer"}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-semibold transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        critical
          ? "border-bad/40 bg-bad-soft text-bad"
          : low
            ? "border-warn/40 bg-warn-soft text-warn"
            : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
      )}
    >
      {paused ? (
        <Play className="size-3.5" aria-hidden="true" />
      ) : (
        <Pause className="size-3.5" aria-hidden="true" />
      )}
      <span className="tabular" aria-live={critical ? "polite" : "off"}>
        {formatDuration(secondsLeft * 1000)}
      </span>
    </button>
  );
}
