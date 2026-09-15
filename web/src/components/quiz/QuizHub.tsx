"use client";

import {
  ArrowRight,
  BrainCircuit,
  Flame,
  History,
  Layers,
  PlayCircle,
  RefreshCw,
  Repeat2,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Progress } from "@/components/ui/Progress";
import { StatTile } from "@/components/ui/StatTile";
import {
  LEVEL_META,
  PASS_MARK,
  TOTAL_QUESTIONS,
  allQuizQuestions,
  quizzes,
} from "@/content/quizzes";
import { useAttempts, useMastery, useReviewQueue, useStreak } from "@/lib/quiz-hooks";
import {
  dayKey,
  dueReviewEntries,
  masteryByLevel,
  masterySummary,
  reviewEntries,
} from "@/lib/quiz-progress";
import {
  MODE_META,
  formatDuration,
  isUsableSession,
  sessionStorageKey,
  type QuizSession,
} from "@/lib/quiz-session";
import { storageGet, useIsHydrated } from "@/lib/storage";
import { cn, formatDate } from "@/lib/utils";
import type { Level } from "@/types/content";

import { CustomQuizBuilder } from "./CustomQuizBuilder";

const QUESTION_LEVELS: Record<string, Level> = Object.fromEntries(
  allQuizQuestions.map((question) => [question.id, question.level]),
);

const SESSION_SOURCES = [...quizzes.map((quiz) => quiz.id), "custom", "review"];

interface ResumableSession {
  sourceId: string;
  title: string;
  answered: number;
  total: number;
  mode: QuizSession["mode"];
  updatedAt: number;
}

function findResumable(): ResumableSession[] {
  const out: ResumableSession[] = [];
  for (const sourceId of SESSION_SOURCES) {
    const session = storageGet<QuizSession | null>(sessionStorageKey(sourceId), null);
    if (!isUsableSession(session)) continue;
    const answered = session.questionIds.filter((id) =>
      session.mode === "flashcard" ? id in session.ratings : id in session.answers,
    ).length;
    out.push({
      sourceId,
      title: session.title,
      answered,
      total: session.questionIds.length,
      mode: session.mode,
      updatedAt: session.updatedAt,
    });
  }
  return out.sort((a, b) => b.updatedAt - a.updatedAt);
}

function runHref(sourceId: string): string {
  return sourceId === "review" ? "/quizzes/review" : `/quizzes/${sourceId}`;
}

function resultsHref(sourceId: string): string {
  return sourceId === "review" ? "/quizzes/review/results" : `/quizzes/${sourceId}/results`;
}

export function QuizHub() {
  const hydrated = useIsHydrated();
  const attempts = useAttempts();
  const mastery = useMastery();
  const streak = useStreak();
  const queue = useReviewQueue();

  // Read the clock once, on mount: the hub is a snapshot, not a live ticker.
  const [now] = useState(() => Date.now());
  const resumable = useMemo(() => (hydrated ? findResumable() : []), [hydrated]);
  const due = useMemo(() => dueReviewEntries(now, queue), [now, queue]);
  const queued = useMemo(() => reviewEntries(queue), [queue]);
  const summary = useMemo(() => masterySummary(TOTAL_QUESTIONS, mastery), [mastery]);
  const byLevel = useMemo(() => masteryByLevel(QUESTION_LEVELS, mastery), [mastery]);

  const bestByQuiz = useMemo(() => {
    const map = new Map<string, { best: number; last: number; count: number }>();
    for (const attempt of attempts) {
      const existing = map.get(attempt.quizId);
      map.set(attempt.quizId, {
        best: Math.max(existing?.best ?? 0, attempt.score),
        last: existing?.last ?? attempt.score,
        count: (existing?.count ?? 0) + 1,
      });
    }
    return map;
  }, [attempts]);

  const passedCount = useMemo(
    () => quizzes.filter((quiz) => (bestByQuiz.get(quiz.id)?.best ?? 0) >= PASS_MARK).length,
    [bestByQuiz],
  );

  return (
    <div className="flex flex-col gap-10">
      {/* Resume ------------------------------------------------------ */}
      {resumable.length > 0 ? (
        <section aria-label="Sessions in progress" className="flex flex-col gap-3">
          {resumable.map((session) => (
            <div
              key={session.sourceId}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-brand/30 bg-brand-soft p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand text-on-brand">
                <PlayCircle className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-display text-[0.9375rem] font-semibold text-ink">
                  Session in progress — {session.title}
                </p>
                <p className="tabular mt-0.5 text-sm text-muted">
                  {session.answered} of {session.total} answered ·{" "}
                  {MODE_META[session.mode].label} mode
                </p>
              </div>
              <ButtonLink href={runHref(session.sourceId)} size="sm">
                Resume
              </ButtonLink>
            </div>
          ))}
        </section>
      ) : null}

      {/* Headline stats ---------------------------------------------- */}
      <section aria-label="Your quiz progress">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Question bank"
            value={TOTAL_QUESTIONS}
            icon={Layers}
            tone="brand"
            hint={`${quizzes.length} graded sets across five levels`}
          />
          <StatTile
            label="Seen at least once"
            value={`${summary.coverage}%`}
            icon={BrainCircuit}
            tone="info"
            hint={`${summary.seen} of ${TOTAL_QUESTIONS} questions · ${summary.mastered} mastered`}
          />
          <StatTile
            label="Due for review"
            value={due.length}
            icon={Repeat2}
            tone={due.length > 0 ? "warn" : "neutral"}
            hint={
              queued.length > 0
                ? `${queued.length} in the queue in total`
                : "Missed questions land here automatically"
            }
            href="/quizzes/review"
          />
          <StatTile
            label="Day streak"
            value={streak.today}
            icon={Flame}
            tone={streak.today > 0 ? "ember" : "neutral"}
            hint={
              streak.longest > 0
                ? `Longest ${streak.longest} · ${streak.totalAttempts} attempts logged`
                : "Finish a quiz today to start one"
            }
          />
        </div>
      </section>

      {/* Level cards -------------------------------------------------- */}
      <section aria-labelledby="levels-heading" className="flex flex-col gap-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="levels-heading" className="font-display text-xl font-bold text-ink">
              Graded question sets
            </h2>
            <p className="mt-1 text-sm text-muted">
              Work up the levels in order. {passedCount} of {quizzes.length} passed at the{" "}
              {PASS_MARK}% mark.
            </p>
          </div>
          <Badge tone="neutral">
            {passedCount}/{quizzes.length} passed
          </Badge>
        </div>

        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {quizzes.map((quiz) => {
            const meta = LEVEL_META[quiz.level];
            const record = bestByQuiz.get(quiz.id);
            const best = record?.best ?? null;
            const passed = best !== null && best >= PASS_MARK;
            const isMock = quiz.id === "mock-exam";

            return (
              <li key={quiz.id}>
                <Card
                  className={cn(
                    "flex h-full flex-col",
                    isMock && "border-ember/35 bg-ember-soft/40",
                  )}
                >
                  <div className="flex flex-1 flex-col gap-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <Badge tone={isMock ? "ember" : meta.tone} size="sm">
                        {isMock ? "Mixed levels" : `${meta.ordinal} · ${meta.label}`}
                      </Badge>
                      {best !== null ? (
                        <span
                          className={cn(
                            "tabular text-sm font-semibold",
                            passed ? "text-good" : "text-warn",
                          )}
                        >
                          {best}%
                        </span>
                      ) : null}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-display text-base leading-snug font-semibold text-ink">
                        {quiz.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-muted">{quiz.summary}</p>
                    </div>

                    <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
                      <Badge tone="neutral" size="sm">
                        {quiz.questions.length} questions
                      </Badge>
                      <Badge tone="neutral" size="sm">
                        ~{quiz.minutes} min
                      </Badge>
                      {record ? (
                        <Badge tone="neutral" size="sm">
                          {record.count} attempt{record.count === 1 ? "" : "s"}
                        </Badge>
                      ) : null}
                    </div>

                    {best !== null ? (
                      <Progress
                        value={best}
                        label="Best score"
                        tone={passed ? "good" : "warn"}
                        size="sm"
                        readout={`${best}%`}
                      />
                    ) : null}
                  </div>

                  <div className="flex items-center gap-2 border-t border-hairline px-5 py-3.5">
                    <ButtonLink href={`/quizzes/${quiz.id}`} size="sm">
                      {best === null ? "Start" : "Retake"}
                    </ButtonLink>
                    {best !== null ? (
                      <Link
                        href={resultsHref(quiz.id)}
                        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        Last results
                        <ArrowRight className="size-4" aria-hidden="true" />
                      </Link>
                    ) : (
                      <span className="text-xs text-faint">Pass mark {PASS_MARK}%</span>
                    )}
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Mastery + review -------------------------------------------- */}
      <section className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Mastery by level</h2>
            <p className="mt-1 text-sm text-muted">
              A question counts as mastered once you have answered it correctly twice in a row.
            </p>
          </div>
          <ul className="flex flex-col divide-y divide-hairline">
            {byLevel.map((entry) => {
              const meta = LEVEL_META[entry.level];
              const pct = entry.total > 0 ? Math.round((entry.mastered / entry.total) * 100) : 0;
              return (
                <li key={entry.level} className="flex flex-col gap-2 px-5 py-3.5">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="text-sm font-medium text-ink">
                      {meta.ordinal} — {meta.label}
                    </span>
                    <span className="tabular text-xs text-muted">
                      {entry.mastered}/{entry.total} mastered
                      {entry.seen > 0 ? ` · ${entry.accuracy}% lifetime accuracy` : ""}
                    </span>
                  </div>
                  <Progress
                    value={pct}
                    hideLabel
                    srLabel={`${meta.label} mastery`}
                    tone={pct >= 70 ? "good" : pct > 0 ? "brand" : "neutral"}
                    size="sm"
                  />
                </li>
              );
            })}
          </ul>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 border-t border-hairline px-5 py-3.5 text-xs text-faint">
            <span className="tabular">Seen: {summary.seen}</span>
            <span className="tabular">Shaky: {summary.shaky}</span>
            <span className="tabular">Lifetime accuracy: {summary.accuracy}%</span>
          </div>
        </Card>

        <Card className="flex flex-col lg:col-span-2">
          <div className="border-b border-hairline px-5 py-4">
            <h2 className="font-display text-base font-semibold text-ink">Review queue</h2>
            <p className="mt-1 text-sm text-muted">
              Every question you get wrong comes back on a spaced schedule until you have it twice.
            </p>
          </div>
          <div className="flex flex-1 flex-col gap-4 p-5">
            <div className="flex items-baseline gap-4">
              <div>
                <p className="tabular text-3xl leading-none font-bold text-ink">{due.length}</p>
                <p className="mt-1 text-xs text-muted">due now</p>
              </div>
              <div>
                <p className="tabular text-3xl leading-none font-bold text-faint">
                  {queued.length}
                </p>
                <p className="mt-1 text-xs text-muted">in the queue</p>
              </div>
            </div>

            <p className="text-sm leading-relaxed text-muted">
              {queued.length === 0
                ? "Nothing queued yet. Missed questions are added automatically as soon as you finish an attempt."
                : due.length === 0
                  ? "Nothing is due right now. You can still drill the whole queue early."
                  : "Clear the due list to keep the schedule honest — it takes a few minutes."}
            </p>

            <div className="mt-auto">
              <ButtonLink
                href="/quizzes/review"
                icon={RefreshCw}
                variant={due.length > 0 ? "primary" : "secondary"}
                fullWidth
              >
                {due.length > 0 ? `Review ${due.length} now` : "Open review queue"}
              </ButtonLink>
            </div>
          </div>
        </Card>
      </section>

      {/* Custom builder ---------------------------------------------- */}
      <CustomQuizBuilder />

      {/* Recent attempts --------------------------------------------- */}
      <section aria-labelledby="attempts-heading" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="attempts-heading" className="font-display text-xl font-bold text-ink">
              Recent attempts
            </h2>
            <p className="mt-1 text-sm text-muted">
              Stored in this browser only — nothing is uploaded anywhere.
            </p>
          </div>
          {attempts.length > 0 ? (
            <Badge tone="neutral" icon={History}>
              {attempts.length} recorded
            </Badge>
          ) : null}
        </div>

        {attempts.length === 0 ? (
          <EmptyState
            title="No attempts yet"
            description="Finish any quiz and it will appear here with a full breakdown by level and topic."
            icon={Target}
            action={
              <ButtonLink href="/quizzes/beginner">Start with Level 1 fundamentals</ButtonLink>
            }
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {attempts.slice(0, 8).map((attempt) => (
              <li key={attempt.id}>
                <Link
                  href={resultsHref(attempt.quizId)}
                  className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border border-hairline bg-surface px-4 py-3 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  <span
                    className={cn(
                      "tabular flex size-11 shrink-0 items-center justify-center rounded-xl text-sm font-bold",
                      attempt.passed ? "bg-good-soft text-good" : "bg-bad-soft text-bad",
                    )}
                  >
                    {Math.round(attempt.score)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.9375rem] font-medium text-ink">
                      {attempt.title}
                    </span>
                    <span className="tabular mt-0.5 block text-xs text-muted">
                      {attempt.correct}/{attempt.total} correct · {MODE_META[attempt.mode].label} ·{" "}
                      {formatDuration(attempt.durationMs)} ·{" "}
                      {formatDate(dayKey(attempt.finishedAt))}
                    </span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-faint" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
