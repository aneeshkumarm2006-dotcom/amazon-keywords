"use client";

import { History, Target } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { MODE_META } from "@/lib/quiz-session";
import { useAttempts } from "@/lib/quiz-hooks";
import { dayKey } from "@/lib/quiz-progress";
import { useIsHydrated } from "@/lib/storage";
import { cn, formatDate } from "@/lib/utils";

/**
 * The attempt lives in localStorage, so this route is prerendered with no
 * data at all. Loading the chart library lazily means a visitor who lands
 * here with nothing stored — a crawler, or a shared link opened on a second
 * device — pays for the empty state and nothing else.
 */
const QuizResults = dynamic(() => import("./QuizResults").then((mod) => mod.QuizResults), {
  loading: () => (
    <div className="flex flex-col gap-4" aria-busy="true">
      <Skeleton className="h-40 rounded-2xl" />
      <Skeleton className="h-64 rounded-2xl" />
      <span className="sr-only">Loading your results</span>
    </div>
  ),
});

export interface QuizResultsViewProps {
  /** Source id of the session: a quiz id, "custom" or "review". */
  quizId: string;
  /** Where the "take it again" action goes. */
  retakeHref: string;
  emptyTitle: string;
  emptyDescription: string;
}

/**
 * Deep-linkable results. The attempt itself lives in localStorage, so this is
 * a client island that renders the most recent attempt for the quiz and lets
 * the learner page back through earlier ones.
 */
export function QuizResultsView({
  quizId,
  retakeHref,
  emptyTitle,
  emptyDescription,
}: QuizResultsViewProps) {
  const hydrated = useIsHydrated();
  const attempts = useAttempts();
  const [selected, setSelected] = useState<string | null>(null);

  const mine = useMemo(
    () => attempts.filter((attempt) => attempt.quizId === quizId),
    [attempts, quizId],
  );

  const attempt = useMemo(
    () => mine.find((entry) => entry.id === selected) ?? mine[0],
    [mine, selected],
  );

  if (!hydrated) {
    return (
      <div className="flex flex-col gap-4" aria-busy="true">
        <Skeleton className="h-40 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
        <span className="sr-only">Loading your results</span>
      </div>
    );
  }

  if (!attempt) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
        icon={Target}
        action={<ButtonLink href={retakeHref}>Take it now</ButtonLink>}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {mine.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-hairline bg-surface-2 p-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted">
            <History className="size-3.5" aria-hidden="true" />
            {mine.length} attempts
          </span>
          <ul className="flex flex-wrap gap-1.5">
            {mine.slice(0, 8).map((entry, index) => {
              const active = entry.id === attempt.id;
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(entry.id)}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      active
                        ? "border-brand bg-brand-soft text-brand"
                        : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                    )}
                  >
                    <span className="tabular">{Math.round(entry.score)}%</span>
                    <span className="text-faint">
                      {index === 0
                        ? "latest"
                        : formatDate(dayKey(entry.finishedAt))}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      <QuizResults
        attempt={attempt}
        retakeHref={retakeHref}
        eyebrow={`${MODE_META[attempt.mode].label} attempt`}
      />
    </div>
  );
}
