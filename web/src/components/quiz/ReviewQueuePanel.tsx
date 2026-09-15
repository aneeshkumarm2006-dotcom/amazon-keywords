"use client";

import { CalendarClock, CircleCheck, Layers, Repeat2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { StatTile } from "@/components/ui/StatTile";
import { LEVEL_META, findQuestion } from "@/content/quizzes";
import { useMastery, useReviewQueue } from "@/lib/quiz-hooks";
import {
  REVIEW_INTERVALS_DAYS,
  dayKey,
  dueReviewEntries,
  retireFromReview,
  reviewEntries,
} from "@/lib/quiz-progress";
import { isUsableSession, sessionStorageKey, type QuizSession } from "@/lib/quiz-session";
import { useIsHydrated, useLocalStorage } from "@/lib/storage";
import { cn, formatDate } from "@/lib/utils";

import { QuizRunner } from "./QuizRunner";

const BOX_LABELS = ["Due now", "Tomorrow", "In 3 days", "In a week", "In 3 weeks"];

function dueLabel(dueAt: number, now: number): string {
  if (dueAt <= now) return "due now";
  const days = Math.ceil((dueAt - now) / (24 * 60 * 60 * 1000));
  if (days === 1) return "due tomorrow";
  if (days < 7) return `due in ${days} days`;
  return `due ${formatDate(dayKey(dueAt))}`;
}

export function ReviewQueuePanel() {
  const hydrated = useIsHydrated();
  const queue = useReviewQueue();
  const mastery = useMastery();
  const [session] = useLocalStorage<QuizSession | null>(sessionStorageKey("review"), null);

  // One reading of the clock per mount keeps render pure and the list stable.
  const [now] = useState(() => Date.now());
  const entries = useMemo(() => reviewEntries(queue), [queue]);
  const due = useMemo(() => dueReviewEntries(now, queue), [now, queue]);

  const boxes = useMemo(() => {
    const counts = REVIEW_INTERVALS_DAYS.map(() => 0);
    for (const entry of entries) {
      const index = Math.min(entry.box, counts.length - 1);
      counts[index] += 1;
    }
    return counts;
  }, [entries]);

  const totalMisses = entries.reduce((sum, entry) => sum + entry.wrong, 0);
  const retire = useCallback((id: string) => retireFromReview(id), []);
  const sessionActive = hydrated && isUsableSession(session);

  return (
    <div className="flex flex-col gap-8">
      {hydrated && !sessionActive ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label="Due now"
              value={due.length}
              icon={Repeat2}
              tone={due.length > 0 ? "warn" : "good"}
              hint={due.length > 0 ? "Clear these to stay on schedule" : "Nothing overdue"}
            />
            <StatTile
              label="In the queue"
              value={entries.length}
              icon={Layers}
              tone="info"
              hint="Retires after two correct answers in a row"
            />
            <StatTile
              label="Total misses"
              value={totalMisses}
              icon={CalendarClock}
              tone="neutral"
              hint="Across every question still queued"
            />
            <StatTile
              label="Mastered"
              value={Object.values(mastery).filter((entry) => entry.streak >= 2).length}
              icon={CircleCheck}
              tone="good"
              hint="Correct twice in a row, no longer queued"
            />
          </div>

          {entries.length > 0 ? (
            <Card>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline px-5 py-4">
                <div>
                  <h2 className="font-display text-base font-semibold text-ink">
                    The schedule
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    Each correct answer moves a question to the next box and pushes it further
                    out. A miss sends it straight back to the front.
                  </p>
                </div>
                <ul className="flex flex-wrap gap-1.5">
                  {boxes.map((count, index) => (
                    <li key={BOX_LABELS[index]}>
                      <Badge tone={index === 0 && count > 0 ? "warn" : "neutral"} size="sm">
                        {BOX_LABELS[index]}: {count}
                      </Badge>
                    </li>
                  ))}
                </ul>
              </div>

              <ul className="divide-y divide-hairline">
                {entries.slice(0, 12).map((entry) => {
                  const question = findQuestion(entry.id);
                  if (!question) return null;
                  const overdue = entry.dueAt <= now;
                  return (
                    <li
                      key={entry.id}
                      className="flex flex-wrap items-start gap-x-4 gap-y-2 px-5 py-3.5"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-[0.9375rem] leading-snug text-ink">
                          {question.question}
                        </p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-faint">
                          <span>{LEVEL_META[question.level].ordinal}</span>
                          <span aria-hidden="true">·</span>
                          <span>{question.topic}</span>
                          <span aria-hidden="true">·</span>
                          <span className={cn(overdue && "font-medium text-warn")}>
                            {dueLabel(entry.dueAt, now)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="tabular">
                            missed {entry.wrong} time{entry.wrong === 1 ? "" : "s"}
                          </span>
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => retire(entry.id)}
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-muted transition-colors hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        <X className="size-3.5" aria-hidden="true" />
                        Retire
                      </button>
                    </li>
                  );
                })}
              </ul>

              {entries.length > 12 ? (
                <p className="border-t border-hairline px-5 py-3 text-xs text-faint">
                  {entries.length - 12} more queued. Run a session to work through them.
                </p>
              ) : null}
            </Card>
          ) : null}
        </>
      ) : null}

      <QuizRunner source={{ kind: "review" }} eyebrow="Spaced repetition" />
    </div>
  );
}
