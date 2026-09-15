"use client";

import { Download, Flag, NotebookPen, Star, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { clearAllFeedback, exportFeedback, useFeedbackList } from "@/lib/feedback";
import { cn } from "@/lib/utils";

import { relativeTime } from "./drafts";

/**
 * Everything the reader has rated, in one place.
 *
 * The per-page widget writes here; this panel reads it back. It exists so the
 * ratings are not a black hole: you can see what you marked, jump back to it,
 * export the lot as JSON to paste into an issue, or delete it all.
 */

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0 rounded-xl border border-hairline bg-surface p-4">
      <p className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">
        {label}
      </p>
      <p className="tabular mt-1.5 font-mono text-2xl font-semibold text-ink">{value}</p>
      {hint ? <p className="mt-1 text-xs text-faint">{hint}</p> : null}
    </div>
  );
}

export function FeedbackLedger({ className }: { className?: string }) {
  const { records, summary, ready } = useFeedbackList();
  const [confirming, setConfirming] = useState(false);

  const download = useCallback(() => {
    exportFeedback();
  }, []);

  const wipe = useCallback(() => {
    clearAllFeedback();
    setConfirming(false);
  }, []);

  if (!ready) {
    return (
      <div className={cn("grid gap-4 sm:grid-cols-3", className)}>
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
        <Skeleton className="h-24" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <EmptyState
        className={className}
        title="You have not rated anything yet"
        description="Every SOP, workflow, template, case study and calculator has a 'Was this helpful?' block at the bottom. Whatever you mark there shows up here, ready to export."
        icon={Star}
        action={
          <Link
            href="/sops"
            className="inline-flex min-h-9 items-center text-sm font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Start with the SOPs
          </Link>
        }
      />
    );
  }

  return (
    <div className={cn("min-w-0", className)}>
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat
          label="Pages marked"
          value={String(summary.total)}
          hint={`${summary.noted} with a written note`}
        />
        <Stat
          label="Average rating"
          value={summary.rated > 0 ? `${summary.average.toFixed(1)}/5` : "—"}
          hint={`${summary.rated} rated out of ${summary.total}`}
        />
        <Stat
          label="Helpful"
          value={`${summary.helpfulYes} / ${summary.helpfulYes + summary.helpfulNo}`}
          hint={summary.helpfulNo > 0 ? `${summary.helpfulNo} marked not helpful` : "None marked unhelpful"}
        />
      </div>

      <ul className="mt-5 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface">
        {records.map((record) => (
          <li key={record.resourceId} className="p-4 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <div className="min-w-0 flex-1">
                {record.route ? (
                  <Link
                    href={record.route}
                    className="font-display text-[0.9375rem] leading-snug font-semibold text-ink transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {record.title ?? record.resourceId}
                  </Link>
                ) : (
                  <span className="font-display text-[0.9375rem] font-semibold text-ink">
                    {record.title ?? record.resourceId}
                  </span>
                )}
                <p className="mt-0.5 font-mono text-[0.6875rem] text-faint">
                  {record.route ?? record.resourceId} · {relativeTime(record.updatedAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2.5">
                {record.helpful ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      record.helpful === "yes" ? "text-good" : "text-bad",
                    )}
                  >
                    {record.helpful === "yes" ? (
                      <ThumbsUp className="size-3.5" aria-hidden="true" />
                    ) : (
                      <ThumbsDown className="size-3.5" aria-hidden="true" />
                    )}
                    {record.helpful === "yes" ? "Helpful" : "Not helpful"}
                  </span>
                ) : null}

                {record.stars > 0 ? (
                  <span
                    className="inline-flex items-center gap-0.5"
                    aria-label={`${record.stars} out of 5 stars`}
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <Star
                        key={value}
                        className={cn(
                          "size-3.5",
                          value <= record.stars ? "text-ember" : "text-faint",
                        )}
                        fill={value <= record.stars ? "currentColor" : "none"}
                        strokeWidth={value <= record.stars ? 1.5 : 2}
                        aria-hidden="true"
                      />
                    ))}
                  </span>
                ) : null}
              </div>
            </div>

            {record.note.trim() ? (
              <p className="mt-2.5 flex gap-2 rounded-lg bg-surface-2 p-3 text-[0.8125rem] leading-relaxed text-ink">
                <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
                <span className="min-w-0">{record.note}</span>
              </p>
            ) : null}
          </li>
        ))}
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        <Button variant="secondary" icon={Download} onClick={download}>
          Export as JSON
        </Button>
        <Link
          href="/contribute#feedback"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <Flag className="size-4 shrink-0" aria-hidden="true" />
          Turn a note into an issue
        </Link>
        <span className="flex-1" />
        {confirming ? (
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-[0.8125rem] text-muted">Delete all {records.length}?</span>
            <Button variant="danger" size="sm" onClick={wipe}>
              Yes, delete
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </span>
        ) : (
          <Button variant="ghost" icon={Trash2} onClick={() => setConfirming(true)}>
            Clear all
          </Button>
        )}
      </div>

      <p className="mt-3 text-xs leading-relaxed text-faint">
        The export is a plain JSON file containing exactly what is listed above. It downloads to
        your device — nothing is transmitted.
      </p>
    </div>
  );
}
