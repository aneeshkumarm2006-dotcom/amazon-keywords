"use client";

import { Bookmark, X } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { EmptyState } from "@/components/ui/EmptyState";
import { toggleBookmark as toggleInterviewBookmark } from "@/lib/interview-progress";
import { toggleBookmark, type BookmarkRow } from "@/lib/progress";
import { cn } from "@/lib/utils";

export interface BookmarksPanelProps {
  rows: BookmarkRow[];
  className?: string;
}

/**
 * Everything starred, from both stores — resource bookmarks written by this
 * layer and interview questions starred in the question bank — in one list,
 * because the learner should not have to remember which surface they saved
 * something on.
 */
export function BookmarksPanel({ rows, className }: BookmarksPanelProps) {
  const remove = useCallback((row: BookmarkRow) => {
    if (row.source === "interview") {
      toggleInterviewBookmark(row.id.replace(/^interview-/, ""));
      return;
    }
    toggleBookmark(row.id, row.title, row.href);
  }, []);

  return (
    <section
      aria-labelledby="bookmarks-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <h3
            id="bookmarks-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Saved for later
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Resources and interview questions you starred, newest first.
          </p>
        </div>
        {rows.length > 0 ? (
          <span className="tabular shrink-0 rounded-md bg-surface-2 px-2 py-1 text-[0.6875rem] font-medium text-muted">
            {rows.length} saved
          </span>
        ) : null}
      </header>

      {rows.length === 0 ? (
        <EmptyState
          bare
          icon={Bookmark}
          title="Nothing saved yet"
          description="Every SOP, workflow, case study, calculator and interview question has a Save control. Star the ones you want to reread the night before an interview and they collect here."
        />
      ) : (
        <ul className="divide-y divide-hairline">
          {rows.slice(0, 12).map((row) => (
            <li key={row.id} className="flex items-center gap-2 pr-2">
              <Link
                href={row.href}
                className="group min-w-0 flex-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
              >
                <span className="block truncate text-[0.875rem] font-medium text-ink group-hover:text-brand">
                  {row.title}
                </span>
                <span className="mt-0.5 block text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
                  {row.kindLabel}
                </span>
              </Link>
              <button
                type="button"
                onClick={() => remove(row)}
                aria-label={`Remove ${row.title} from saved`}
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {rows.length > 12 ? (
        <p className="border-t border-hairline px-4 py-2.5 text-[0.75rem] text-faint sm:px-5">
          Showing the 12 most recent of {rows.length}.
        </p>
      ) : null}
    </section>
  );
}
