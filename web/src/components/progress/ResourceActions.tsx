"use client";

import { Bookmark, BookmarkCheck, Check, Circle, Route, Sparkles } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";

import { Badge } from "@/components/ui/Badge";
import { pathsContaining } from "@/content/paths";
import {
  completedAt,
  completionIdForHref,
  getCompletions,
  toggleBookmark,
  toggleComplete,
} from "@/lib/progress";
import { cn, formatDate } from "@/lib/utils";

import { useHydrated, useIsBookmarked, useIsComplete } from "./useProgress";

export interface ResourceActionsProps {
  /** Route this resource lives at, e.g. "/sops/daily-health-check". */
  href: string;
  /** Title recorded in the activity feed. */
  title: string;
  /** Override the derived completion id. Rarely needed. */
  id?: string;
  /** Hide the "part of these paths" line, e.g. when already on a path page. */
  hidePaths?: boolean;
  className?: string;
}

function toIsoDay(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

/**
 * Mark-as-complete and bookmark, for any page that represents one resource.
 *
 * The completion id is derived from the route, so ticking an SOP here is the
 * same tick as ticking it inside a learning path — progress is one number,
 * not one number per surface.
 *
 * Before hydration both controls render in their default state, which is what
 * the static export contains. Nothing shifts on the page when storage loads:
 * only the labels and the tick change.
 */
export function ResourceActions({
  href,
  title,
  id,
  hidePaths,
  className,
}: ResourceActionsProps) {
  const completionId = id ?? completionIdForHref(href);
  const complete = useIsComplete(completionId);
  const saved = useIsBookmarked(completionId);
  const hydrated = useHydrated();
  const inPaths = hidePaths ? [] : pathsContaining(href);

  const onToggleComplete = useCallback(() => {
    toggleComplete(completionId, title, href);
  }, [completionId, href, title]);

  const onToggleBookmark = useCallback(() => {
    toggleBookmark(completionId, title, href);
  }, [completionId, href, title]);

  const doneAt = hydrated && complete ? completedAt(completionId, getCompletions()) : null;

  return (
    <div
      className={cn(
        "rounded-xl border bg-surface transition-colors",
        complete ? "border-good/40" : "border-hairline",
        className,
      )}
    >
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onToggleComplete}
            aria-pressed={complete}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium",
              "transition-[background-color,border-color,color] duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              complete
                ? "border-transparent bg-good text-on-good hover:opacity-90"
                : "border-hairline bg-surface text-ink hover:border-hairline-strong hover:bg-surface-2",
            )}
          >
            {complete ? (
              <Check className="size-4 shrink-0" strokeWidth={3} aria-hidden="true" />
            ) : (
              <Circle className="size-4 shrink-0 text-faint" aria-hidden="true" />
            )}
            {complete ? "Completed" : "Mark as complete"}
          </button>

          <button
            type="button"
            onClick={onToggleBookmark}
            aria-pressed={saved}
            className={cn(
              "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3.5 text-sm font-medium",
              "transition-[background-color,border-color,color] duration-150",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              saved
                ? "border-ember/40 bg-ember-soft text-ember-ink"
                : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:bg-surface-2 hover:text-ink",
            )}
          >
            {saved ? (
              <BookmarkCheck className="size-4 shrink-0" aria-hidden="true" />
            ) : (
              <Bookmark className="size-4 shrink-0" aria-hidden="true" />
            )}
            {saved ? "Saved" : "Save for later"}
          </button>
        </div>

        <p className="flex items-center gap-1.5 text-xs text-faint">
          {doneAt ? (
            <>
              <Sparkles className="size-3.5 shrink-0 text-good" aria-hidden="true" />
              <span>Completed {formatDate(toIsoDay(doneAt))} · counted on your dashboard</span>
            </>
          ) : (
            <span>Progress is saved in this browser only. Nothing is uploaded.</span>
          )}
        </p>
      </div>

      {inPaths.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3">
          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
            <Route className="size-3.5" aria-hidden="true" />
            Step in
          </span>
          {inPaths.map((path) => {
            const step = path.steps.find((entry) => entry.href === href);
            return (
              <Link
                key={path.id}
                href={path.href}
                className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <Badge tone={path.tone} size="sm" variant="outline">
                  {path.shortTitle}
                  {step ? ` · step ${step.position}` : ""}
                </Badge>
              </Link>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
