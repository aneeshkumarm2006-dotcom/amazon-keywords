"use client";

import {
  ArrowRight,
  ChartColumn,
  CircleCheckBig,
  Clock,
  Eye,
  Gauge,
  History,
  ListChecks,
  Play,
  RotateCcw,
  Timer,
  TriangleAlert,
  Trophy,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Progress } from "@/components/ui/Progress";
import { StatTile } from "@/components/ui/StatTile";
import { Textarea } from "@/components/ui/Textarea";
import { TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  PASS_MARK,
  SCORE_BANDS,
  findInterviewQuestion,
  interviewQuestions,
  type InterviewCategory,
} from "@/content/interviews";
import { useMockHistory, useMockSession } from "@/lib/interview-hooks";
import {
  MOCK_DIFFICULTIES,
  clearMockSession,
  difficultyMeta,
  recordMockAttempt,
  saveMockSession,
  scoreByCategory,
  sessionToAttempt,
  weakQuestionIds,
  type MockAttempt,
  type MockDifficulty,
  type MockSession,
  type SelfScore,
} from "@/lib/interview-progress";
import { newSeed, seededShuffle } from "@/lib/quiz-shuffle";
import { cn, formatDate } from "@/lib/utils";

import { AnswerBody } from "./AnswerBody";
import { KeyPointsChecklist } from "./KeyPointsChecklist";
import { QuestionChips } from "./QuestionChips";
import { categoryIcon, formatClock, formatDuration } from "./meta";

type Phase = "setup" | "run" | "report";

const COUNTS = [5, 8, 10, 15, 20];

const TIMERS: { value: number | null; label: string }[] = [
  { value: null, label: "No timer" },
  { value: 60, label: "60 sec" },
  { value: 90, label: "90 sec" },
  { value: 120, label: "2 min" },
  { value: 180, label: "3 min" },
];

interface Config {
  categories: InterviewCategory[];
  count: number;
  difficulty: MockDifficulty;
  timerSeconds: number | null;
}

const DEFAULT_CONFIG: Config = {
  categories: [],
  count: 8,
  difficulty: "any",
  timerSeconds: 120,
};

function poolFor(config: Config): string[] {
  const levels = difficultyMeta(config.difficulty).levels;
  return interviewQuestions
    .filter((entry) => {
      if (config.categories.length > 0 && !config.categories.includes(entry.category)) {
        return false;
      }
      return levels.includes(entry.level);
    })
    .map((entry) => entry.id);
}

function buildSession(config: Config, explicitIds?: string[]): MockSession {
  const seed = newSeed();
  const pool = explicitIds ?? poolFor(config);
  const questionIds = seededShuffle(pool, seed).slice(0, Math.min(config.count, pool.length));
  const now = Date.now();

  return {
    version: 1,
    id: `mock-${now.toString(36)}-${seed.toString(36)}`,
    startedAt: now,
    updatedAt: now,
    categories: config.categories,
    difficulty: config.difficulty,
    timerSeconds: config.timerSeconds,
    questionIds,
    index: 0,
    stage: "answer",
    answers: {},
    scores: {},
    covered: {},
    seconds: {},
    timedOut: [],
  };
}

/**
 * The mock interview simulator.
 *
 * Setup, then one question at a time against an optional per-question clock,
 * then a self-assessment step that reveals the model answer and turns the key
 * points into a checklist you score yourself against, then a report with
 * per-category scores, time spent and the weak areas to revisit.
 *
 * The attempt in flight is written to localStorage on a short debounce, so a
 * refresh, a closed tab or a dead battery never costs a typed answer.
 */
export function MockInterview() {
  const [phase, setPhase] = useState<Phase>("setup");
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [session, setSession] = useState<MockSession | null>(null);
  const [attempt, setAttempt] = useState<MockAttempt | null>(null);
  // Both of these are state rather than refs, so the countdown is derived
  // from pure render input and nothing reads a moving clock during render.
  const [answerStartedAt, setAnswerStartedAt] = useState<number | null>(null);
  const [clock, setClock] = useState(0);

  const history = useMockHistory();

  // Persist the live attempt on a short debounce rather than on every keystroke.
  useEffect(() => {
    if (!session || phase !== "run") return;
    const handle = window.setTimeout(() => saveMockSession(session), 400);
    return () => window.clearTimeout(handle);
  }, [session, phase]);

  const currentId = session?.questionIds[session.index];
  const current = currentId ? findInterviewQuestion(currentId) : undefined;

  const elapsedOnCurrent = useMemo(() => {
    if (!session || !currentId) return 0;
    const banked = session.seconds[currentId] ?? 0;
    if (session.stage !== "answer" || answerStartedAt === null) return banked;
    return banked + Math.max(0, (clock - answerStartedAt) / 1000);
  }, [session, currentId, answerStartedAt, clock]);

  const remaining =
    session?.timerSeconds != null ? Math.max(0, session.timerSeconds - elapsedOnCurrent) : null;

  /**
   * Running out of time moves straight to self-assessment. That transition is
   * derived here rather than written from an effect: the stored stage stays
   * "answer" until the question is committed, and the UI simply renders the
   * assessment step once the clock is spent.
   */
  const expired = Boolean(
    session && session.stage === "answer" && remaining !== null && remaining <= 0,
  );
  const stage: "answer" | "assess" = expired ? "assess" : (session?.stage ?? "answer");

  // One-second heartbeat while an answer is being typed, for the countdown.
  useEffect(() => {
    if (phase !== "run" || !session || session.stage !== "answer" || expired) return;
    const handle = window.setInterval(() => setClock(Date.now()), 1000);
    return () => window.clearInterval(handle);
  }, [phase, session, expired]);

  /**
   * Bank the time spent on the open question. Called when the candidate
   * reveals the answer, and again on the way out of a question whose clock
   * expired, which is the only case where the two can differ.
   */
  const commit = useCallback(
    (open: MockSession): MockSession => {
      if (answerStartedAt === null) return { ...open, stage: "assess" };
      const id = open.questionIds[open.index];
      const raw =
        (open.seconds[id] ?? 0) + Math.max(0, (Date.now() - answerStartedAt) / 1000);
      const ranOut = open.timerSeconds != null && raw >= open.timerSeconds;
      const spent = open.timerSeconds != null ? Math.min(raw, open.timerSeconds) : raw;

      return {
        ...open,
        stage: "assess",
        seconds: { ...open.seconds, [id]: spent },
        timedOut:
          ranOut && !open.timedOut.includes(id) ? [...open.timedOut, id] : open.timedOut,
      };
    },
    [answerStartedAt],
  );

  const toAssess = useCallback(() => {
    if (!session) return;
    const committed = commit(session);
    setAnswerStartedAt(null);
    setSession(committed);
  }, [commit, session]);

  /** Stamp the clock as an answer window opens. Only ever called from a handler. */
  const beginAnswer = useCallback(() => {
    const now = Date.now();
    setAnswerStartedAt(now);
    setClock(now);
  }, []);

  const start = useCallback(
    (next: MockSession) => {
      beginAnswer();
      saveMockSession(next);
      setSession(next);
      setAttempt(null);
      setPhase("run");
    },
    [beginAnswer],
  );

  const finish = useCallback(
    (finished: MockSession) => {
      const record = sessionToAttempt(finished);
      recordMockAttempt(record);
      clearMockSession();
      setAttempt(record);
      setSession(null);
      setPhase("report");
    },
    [],
  );

  const next = useCallback(() => {
    if (!session) return;
    const committed = answerStartedAt === null ? session : commit(session);
    setAnswerStartedAt(null);

    if (committed.index >= committed.questionIds.length - 1) {
      finish(committed);
      return;
    }
    beginAnswer();
    setSession({ ...committed, index: committed.index + 1, stage: "answer" });
  }, [answerStartedAt, beginAnswer, commit, finish, session]);

  const setAnswer = useCallback((value: string) => {
    setSession((previous) => {
      if (!previous) return previous;
      const id = previous.questionIds[previous.index];
      return { ...previous, answers: { ...previous.answers, [id]: value } };
    });
  }, []);

  const setScore = useCallback((score: SelfScore) => {
    setSession((previous) => {
      if (!previous) return previous;
      const id = previous.questionIds[previous.index];
      return { ...previous, scores: { ...previous.scores, [id]: score } };
    });
  }, []);

  const toggleCovered = useCallback((pointIndex: number) => {
    setSession((previous) => {
      if (!previous) return previous;
      const id = previous.questionIds[previous.index];
      const list = previous.covered[id] ?? [];
      const nextList = list.includes(pointIndex)
        ? list.filter((entry) => entry !== pointIndex)
        : [...list, pointIndex];
      return { ...previous, covered: { ...previous.covered, [id]: nextList } };
    });
  }, []);

  const abandon = useCallback(() => {
    clearMockSession();
    setSession(null);
    setAnswerStartedAt(null);
    setPhase("setup");
  }, []);

  /* ------------------------------------------------------------------ *
   * Setup
   * ------------------------------------------------------------------ */

  if (phase === "setup") {
    return (
      <SetupPanel
        config={config}
        onChange={setConfig}
        history={history}
        onStart={() => start(buildSession(config))}
        onResume={(saved) => {
          beginAnswer();
          setSession(saved);
          setAttempt(null);
          setPhase("run");
        }}
      />
    );
  }

  /* ------------------------------------------------------------------ *
   * Report
   * ------------------------------------------------------------------ */

  if (phase === "report" && attempt) {
    return (
      <ReportPanel
        attempt={attempt}
        onRestart={() => {
          setAttempt(null);
          setPhase("setup");
        }}
        onRetryWeak={() => {
          const ids = weakQuestionIds(attempt.rows);
          if (ids.length === 0) return;
          const retryConfig: Config = { ...config, count: ids.length };
          setConfig(retryConfig);
          start(buildSession(retryConfig, ids));
        }}
      />
    );
  }

  /* ------------------------------------------------------------------ *
   * Run
   * ------------------------------------------------------------------ */

  if (!session || !current || !currentId) return null;

  const position = session.index + 1;
  const total = session.questionIds.length;
  const answer = session.answers[currentId] ?? "";
  const covered = session.covered[currentId] ?? [];
  const score = session.scores[currentId];
  const timedOut = expired || session.timedOut.includes(currentId);
  const suggested: SelfScore =
    covered.length >= Math.ceil(current.keyPoints.length * 0.75)
      ? 2
      : covered.length > 0
        ? 1
        : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* ---------------------------------------------------------- header */}
      <div className="flex flex-col gap-3 rounded-xl border border-hairline bg-surface p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
            Question {position} of {total}
          </p>
          <div className="flex items-center gap-2">
            {session.timerSeconds != null && stage === "answer" ? (
              <span
                className={cn(
                  "tabular inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm font-semibold",
                  remaining !== null && remaining <= session.timerSeconds * 0.2
                    ? "bg-bad-soft text-bad"
                    : "bg-surface-2 text-ink",
                )}
                role="timer"
                aria-live="off"
              >
                <Timer className="size-3.5" aria-hidden="true" />
                {formatClock(remaining ?? 0)}
              </span>
            ) : null}
            <Button variant="ghost" size="sm" icon={X} onClick={abandon}>
              End
            </Button>
          </div>
        </div>

        <Progress
          value={stage === "assess" ? position : position - 1}
          max={total}
          hideLabel
          srLabel={`Question ${position} of ${total}`}
          size="sm"
        />

        {session.timerSeconds != null && stage === "answer" ? (
          <Progress
            value={remaining ?? 0}
            max={session.timerSeconds}
            hideLabel
            srLabel="Time remaining on this question"
            tone={remaining !== null && remaining <= session.timerSeconds * 0.2 ? "bad" : "ember"}
            size="sm"
          />
        ) : null}
      </div>

      {/* -------------------------------------------------------- question */}
      <div className="rounded-2xl border border-hairline bg-surface">
        <div className="border-b border-hairline p-5 sm:p-7">
          <QuestionChips entry={current} />
          <h2 className="mt-4 font-display text-xl leading-snug font-semibold text-balance text-ink sm:text-2xl">
            {current.question}
          </h2>
        </div>

        {stage === "answer" ? (
          <div className="flex flex-col gap-4 p-5 sm:p-7">
            <Textarea
              id="mock-answer"
              label="Your answer"
              hint="Type it as you would say it. Nothing is uploaded — this stays in your browser."
              rows={9}
              value={answer}
              onChange={(event) => setAnswer(event.target.value)}
              placeholder="Say the number, then the reasoning. Start with the direct answer, then the evidence, then what you would do next…"
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button icon={Eye} onClick={toAssess}>
                Reveal the ideal answer
              </Button>
              <p className="text-xs text-faint">
                A strong spoken answer here runs about {formatDuration(current.answerSeconds)}.
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6 p-5 sm:p-7">
            {timedOut ? (
              <Callout variant="warn" title="The clock ran out">
                <p>
                  You were cut off at {formatClock(session.timerSeconds ?? 0)}. That happens in real
                  screens too — score what you actually said, not what you were about to say.
                </p>
              </Callout>
            ) : null}

            <section>
              <h3 className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
                What you said
              </h3>
              <div className="mt-3 rounded-lg border border-hairline bg-surface-2 p-4">
                {answer.trim() ? (
                  <p className="text-[0.875rem] leading-relaxed whitespace-pre-wrap text-ink">
                    {answer}
                  </p>
                ) : (
                  <p className="text-[0.875rem] text-faint italic">
                    You left this one blank. Score it honestly — a blank is a zero in the room too.
                  </p>
                )}
              </div>
            </section>

            <AnswerBody
              entry={current}
              keyPointsSlot={
                <KeyPointsChecklist
                  points={current.keyPoints}
                  checked={covered}
                  onToggle={toggleCovered}
                  title="Score yourself against the key points"
                  hint="Tick only what you actually said out loud, not what you were thinking."
                />
              }
            />

            <section className="border-t border-hairline pt-5">
              <h3 className="font-display text-[0.9375rem] font-semibold text-ink">
                Rate this answer
              </h3>
              <p className="mt-1 text-[0.8125rem] text-muted">
                You covered {covered.length} of {current.keyPoints.length} key points, which
                usually scores a {suggested}.
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {SCORE_BANDS.map((band) => {
                  const on = score === band.score;
                  return (
                    <button
                      key={band.score}
                      type="button"
                      aria-pressed={on}
                      onClick={() => setScore(band.score)}
                      className={cn(
                        "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                        on
                          ? "border-brand bg-brand-soft"
                          : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-2",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span
                          className={cn(
                            "tabular flex size-6 items-center justify-center rounded-md text-xs font-bold",
                            TONE_SOFT_BG[band.tone],
                            TONE_TEXT[band.tone],
                          )}
                        >
                          {band.score}
                        </span>
                        <span className="text-[0.875rem] font-semibold text-ink">
                          {band.label}
                        </span>
                      </span>
                      <span className="text-xs leading-relaxed text-muted">
                        {band.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap items-center gap-2">
                <Button
                  icon={position === total ? Trophy : ArrowRight}
                  onClick={next}
                  disabled={score === undefined}
                >
                  {position === total ? "Finish and see the report" : "Next question"}
                </Button>
                {score === undefined ? (
                  <p className="text-xs text-faint">Pick a score to continue.</p>
                ) : null}
                <Link
                  href={`/interviews/${current.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-auto inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  Open the deep dive
                </Link>
              </div>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Setup
 * ------------------------------------------------------------------ */

interface SetupPanelProps {
  config: Config;
  onChange: (config: Config) => void;
  history: MockAttempt[];
  onStart: () => void;
  onResume: (session: MockSession) => void;
}

function SetupPanel({ config, onChange, history, onStart, onResume }: SetupPanelProps) {
  // Read straight from storage rather than mirroring it into state: the hook
  // is subscription based, so nothing is written during an effect and the
  // resume prompt only appears once hydration has produced a real answer.
  const { session: resumable, ready } = useMockSession();
  const pool = useMemo(() => poolFor(config), [config]);
  const askable = Math.min(config.count, pool.length);
  const minutes = Math.max(
    1,
    Math.round(
      (askable * ((config.timerSeconds ?? 120) + 75)) / 60,
    ),
  );

  const toggleCategory = (category: InterviewCategory) => {
    onChange({
      ...config,
      categories: config.categories.includes(category)
        ? config.categories.filter((entry) => entry !== category)
        : [...config.categories, category],
    });
  };

  return (
    <div className="flex flex-col gap-6">
      {ready && resumable ? (
        <Callout variant="info" title="You have an unfinished mock interview">
          <p>
            Started {formatDate(new Date(resumable.startedAt).toISOString())}, question{" "}
            {resumable.index + 1} of {resumable.questionIds.length}. Your typed answers are still
            here.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" icon={Play} onClick={() => onResume(resumable)}>
              Resume it
            </Button>
            <Button size="sm" variant="secondary" icon={X} onClick={clearMockSession}>
              Discard and start fresh
            </Button>
          </div>
        </Callout>
      ) : null}

      <div className="rounded-2xl border border-hairline bg-surface">
        <div className="border-b border-hairline px-5 py-4">
          <h2 className="font-display text-base font-semibold text-ink">Build the interview</h2>
          <p className="mt-1 text-[0.8125rem] text-muted">
            Leave the categories empty for a mixed interview, the way a real first round is
            usually run.
          </p>
        </div>

        <div className="flex flex-col gap-6 p-5">
          <Fieldset legend="Categories" hint={`${pool.length} questions in the current pool`}>
            <div className="flex flex-wrap gap-1.5">
              <SetupChip
                on={config.categories.length === 0}
                onClick={() => onChange({ ...config, categories: [] })}
              >
                Mixed
              </SetupChip>
              {CATEGORY_ORDER.map((category) => {
                const Icon = categoryIcon(category);
                return (
                  <SetupChip
                    key={category}
                    on={config.categories.includes(category)}
                    onClick={() => toggleCategory(category)}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {CATEGORY_META[category].short}
                  </SetupChip>
                );
              })}
            </div>
          </Fieldset>

          <Fieldset legend="Difficulty">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {MOCK_DIFFICULTIES.map((entry) => {
                const on = config.difficulty === entry.id;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => onChange({ ...config, difficulty: entry.id })}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      on
                        ? "border-brand bg-brand-soft"
                        : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-2",
                    )}
                  >
                    <span className="text-[0.875rem] font-semibold text-ink">{entry.label}</span>
                    <span className="text-xs leading-relaxed text-muted">{entry.blurb}</span>
                  </button>
                );
              })}
            </div>
          </Fieldset>

          <div className="grid gap-6 sm:grid-cols-2">
            <Fieldset legend="Questions">
              <div className="flex flex-wrap gap-1.5">
                {COUNTS.map((count) => (
                  <SetupChip
                    key={count}
                    on={config.count === count}
                    onClick={() => onChange({ ...config, count })}
                  >
                    {count}
                  </SetupChip>
                ))}
              </div>
            </Fieldset>

            <Fieldset legend="Timer per question">
              <div className="flex flex-wrap gap-1.5">
                {TIMERS.map((entry) => (
                  <SetupChip
                    key={entry.label}
                    on={config.timerSeconds === entry.value}
                    onClick={() => onChange({ ...config, timerSeconds: entry.value })}
                  >
                    {entry.label}
                  </SetupChip>
                ))}
              </div>
            </Fieldset>
          </div>

          <div className="flex flex-wrap items-center gap-3 border-t border-hairline pt-5">
            <Button icon={Play} onClick={onStart} disabled={askable === 0}>
              Start the mock interview
            </Button>
            <p className="text-[0.8125rem] text-muted">
              {askable} question{askable === 1 ? "" : "s"} · about {minutes} minutes including
              self-assessment
            </p>
          </div>
        </div>
      </div>

      {history.length > 0 ? (
        <section className="rounded-2xl border border-hairline bg-surface">
          <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
            <History className="size-4 text-faint" aria-hidden="true" />
            <h2 className="font-display text-base font-semibold text-ink">Previous attempts</h2>
          </div>
          <ul className="divide-y divide-hairline">
            {history.slice(0, 6).map((entry) => {
              const passed = entry.score >= PASS_MARK;
              return (
                <li
                  key={entry.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-[0.875rem] font-medium text-ink">
                      {entry.rows.length} questions ·{" "}
                      {difficultyMeta(entry.difficulty).label.toLowerCase()} ·{" "}
                      {entry.categories.length === 0
                        ? "mixed"
                        : `${entry.categories.length} categor${entry.categories.length === 1 ? "y" : "ies"}`}
                    </p>
                    <p className="mt-0.5 text-xs text-faint">
                      {formatDate(new Date(entry.finishedAt).toISOString())} ·{" "}
                      {formatDuration(entry.totalSeconds)} answering
                    </p>
                  </div>
                  <span
                    className={cn(
                      "tabular rounded-md px-2 py-1 text-sm font-semibold",
                      passed ? "bg-good-soft text-good" : "bg-warn-soft text-warn",
                    )}
                  >
                    {entry.score}%
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Report
 * ------------------------------------------------------------------ */

function ReportPanel({
  attempt,
  onRestart,
  onRetryWeak,
}: {
  attempt: MockAttempt;
  onRestart: () => void;
  onRetryWeak: () => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const categories = useMemo(() => scoreByCategory(attempt.rows), [attempt.rows]);
  const weak = categories.filter((row) => row.percent < PASS_MARK);
  const passed = attempt.score >= PASS_MARK;
  const complete = attempt.rows.filter((row) => row.score === 2).length;
  const missed = attempt.rows.filter((row) => row.score === 0).length;
  const average = attempt.rows.length > 0 ? attempt.totalSeconds / attempt.rows.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <div
        className={cn(
          "rounded-2xl border p-6 text-center sm:p-8",
          passed ? "border-good/30 bg-good-soft" : "border-warn/35 bg-warn-soft",
        )}
      >
        <span className="mx-auto flex size-12 items-center justify-center rounded-xl bg-surface">
          {passed ? (
            <Trophy className="size-6 text-good" aria-hidden="true" />
          ) : (
            <Gauge className="size-6 text-warn" aria-hidden="true" />
          )}
        </span>
        <p className="tabular mt-4 font-display text-4xl font-bold text-ink">{attempt.score}%</p>
        <p className="mt-1 text-[0.9375rem] font-medium text-ink">
          {passed
            ? "That is a pass by the coaching rubric."
            : `Below the ${PASS_MARK}% pass mark — worth another run.`}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-[0.875rem] leading-relaxed text-muted">
          Scored by the source bank rubric: two points for a complete answer with an example, one
          for partial, zero for missed. You scored {complete} complete and {missed} missed across{" "}
          {attempt.rows.length} questions.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Time answering"
          value={formatDuration(attempt.totalSeconds)}
          icon={Clock}
          hint={`${formatDuration(average)} average per question`}
        />
        <StatTile
          label="Complete answers"
          value={`${complete} / ${attempt.rows.length}`}
          icon={CircleCheckBig}
          tone="good"
          hint="Scored 2 out of 2"
        />
        <StatTile
          label="Weak categories"
          value={weak.length}
          icon={TriangleAlert}
          tone={weak.length > 0 ? "warn" : "good"}
          hint={weak.length > 0 ? "Below the pass mark" : "Everything at or above the pass mark"}
        />
      </div>

      <section className="rounded-2xl border border-hairline bg-surface">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
          <ChartColumn className="size-4 text-faint" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-ink">Score by category</h2>
        </div>
        <ul className="flex flex-col gap-4 p-5">
          {categories.map((row) => (
            <li key={row.category}>
              <Progress
                value={row.earned}
                max={row.possible}
                label={`${CATEGORY_META[row.category].short} · ${row.answered} question${row.answered === 1 ? "" : "s"}`}
                readout={`${row.percent}%`}
                tone={row.percent >= PASS_MARK ? "good" : row.percent >= 50 ? "warn" : "bad"}
              />
            </li>
          ))}
        </ul>
      </section>

      {weak.length > 0 ? (
        <Callout variant="warn" title="What to revisit before the real thing">
          <p>
            {weak.map((row) => row.category).join(", ")} came in under the pass mark. Re-read those
            categories in the bank, then run a mock restricted to them.
          </p>
        </Callout>
      ) : null}

      <section className="rounded-2xl border border-hairline bg-surface">
        <div className="flex items-center gap-2 border-b border-hairline px-5 py-4">
          <ListChecks className="size-4 text-faint" aria-hidden="true" />
          <h2 className="font-display text-base font-semibold text-ink">Question by question</h2>
        </div>
        <ul className="divide-y divide-hairline">
          {attempt.rows.map((row) => {
            const entry = findInterviewQuestion(row.questionId);
            if (!entry) return null;
            const band = SCORE_BANDS[row.score];
            const expanded = open === row.questionId;

            return (
              <li key={row.questionId}>
                <div className="flex items-start gap-3 p-4">
                  <span
                    className={cn(
                      "tabular mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold",
                      TONE_SOFT_BG[band.tone],
                      TONE_TEXT[band.tone],
                    )}
                    aria-label={`Scored ${row.score} out of 2: ${band.label}`}
                  >
                    {row.score}
                  </span>
                  <div className="min-w-0 flex-1">
                    <button
                      type="button"
                      aria-expanded={expanded}
                      aria-controls={`report-${row.questionId}`}
                      onClick={() => setOpen(expanded ? null : row.questionId)}
                      className="block w-full text-left text-[0.875rem] leading-snug font-medium text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {entry.question}
                    </button>
                    <p className="mt-1 text-xs text-faint">
                      {CATEGORY_META[entry.category].short} · {LEVEL_META[entry.level].label} ·{" "}
                      {formatDuration(row.seconds)}
                      {row.timedOut ? " · timed out" : ""} · {row.covered.length}/
                      {row.keyPointCount} key points
                    </p>

                    <div id={`report-${row.questionId}`} hidden={!expanded}>
                      {expanded ? (
                        <div className="mt-3 flex flex-col gap-3">
                          <div className="rounded-lg border border-hairline bg-surface-2 p-3">
                            <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-faint uppercase">
                              Your answer
                            </p>
                            {row.answer.trim() ? (
                              <p className="mt-2 text-[0.8125rem] leading-relaxed whitespace-pre-wrap text-ink">
                                {row.answer}
                              </p>
                            ) : (
                              <p className="mt-2 text-[0.8125rem] text-faint italic">
                                Left blank.
                              </p>
                            )}
                          </div>
                          {row.covered.length < row.keyPointCount ? (
                            <div className="rounded-lg border border-hairline p-3">
                              <p className="font-mono text-[0.6875rem] tracking-[0.14em] text-faint uppercase">
                                Points you missed
                              </p>
                              <ul className="mt-2 flex flex-col gap-1.5">
                                {entry.keyPoints.map((point, pointIndex) =>
                                  row.covered.includes(pointIndex) ? null : (
                                    <li
                                      key={point}
                                      className="flex items-start gap-2 text-[0.8125rem] leading-relaxed text-muted"
                                    >
                                      <span
                                        aria-hidden="true"
                                        className="mt-[0.4rem] size-1.5 shrink-0 rounded-full bg-warn"
                                      />
                                      {point}
                                    </li>
                                  ),
                                )}
                              </ul>
                            </div>
                          ) : null}
                          <Link
                            href={`/interviews/${row.questionId}`}
                            className="inline-flex min-h-9 w-fit items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                          >
                            Read the full guidance
                            <ArrowRight className="size-4" aria-hidden="true" />
                          </Link>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="flex flex-wrap items-center gap-2">
        <Button icon={RotateCcw} onClick={onRestart}>
          Run another mock
        </Button>
        {weakQuestionIds(attempt.rows).length > 0 ? (
          <Button variant="secondary" icon={TriangleAlert} onClick={onRetryWeak}>
            Redo the {weakQuestionIds(attempt.rows).length} you dropped points on
          </Button>
        ) : null}
        <Link
          href="/interviews"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          Back to the question bank
        </Link>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Small shared pieces
 * ------------------------------------------------------------------ */

function Fieldset({
  legend,
  hint,
  children,
}: {
  legend: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <fieldset>
      <legend className="mb-2 flex flex-wrap items-baseline gap-2">
        <span className="text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
          {legend}
        </span>
        {hint ? <span className="text-xs text-faint">{hint}</span> : null}
      </legend>
      {children}
    </fieldset>
  );
}

function SetupChip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        on
          ? "border-brand bg-brand text-on-brand"
          : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}
