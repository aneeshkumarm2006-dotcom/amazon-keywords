"use client";

import {
  Check,
  Flag,
  MessageSquarePlus,
  Star,
  ThumbsDown,
  ThumbsUp,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";

import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { MAX_NOTE_LENGTH, rate, useResourceFeedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";

import { issueUrl, pageIssueDraft } from "./github";

/**
 * The footer widget on every reading page.
 *
 * Three things, in the order people actually use them: a yes/no on whether
 * the page helped, a star rating for how much, and a note for the detail.
 * All of it is private to the reader's own browser — the site has no backend
 * and collects nothing — so the widget says so plainly and offers the one
 * route that does reach the maintainers: a prefilled GitHub issue carrying
 * the current route and whatever note has been typed.
 */

const STAR_LABELS = [
  "Not useful",
  "Thin",
  "Useful",
  "Very useful",
  "Exactly what I needed",
];

const STAR_VALUES = [1, 2, 3, 4, 5];

export interface ResourceFeedbackProps {
  /** Stable id the rating is keyed by, e.g. "sop-daily-health-check". */
  resourceId: string;
  /** Page title, used in the issue and in the export. */
  title: string;
  /** Route the widget sits on, e.g. "/sops/daily-health-check". */
  route: string;
  /** Kind label for grouping an export, e.g. "SOP". */
  kind?: string;
  className?: string;
}

export function ResourceFeedback({
  resourceId,
  title,
  route,
  kind,
  className,
}: ResourceFeedbackProps) {
  const groupId = useId();
  const { stars, helpful, note, ready, setStars, setHelpful, saveNote, clear } =
    useResourceFeedback(resourceId, { title, route, kind });

  /**
   * The editor mirrors the stored note until the reader types, at which point
   * `edited` holds the unsaved text. Deriving it this way — rather than
   * copying storage into state inside an effect — keeps the widget correct
   * when the store changes underneath it (another tab, a reset) without any
   * cascading renders.
   */
  const [edited, setEdited] = useState<string | null>(null);
  const [openOverride, setOpenOverride] = useState<boolean | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const starRefs = useRef<Record<number, HTMLButtonElement | null>>({});

  const draftNote = edited ?? note;
  const noteOpen = openOverride ?? note.trim().length > 0;
  const noteDirty = edited !== null && edited !== note;

  useEffect(
    () => () => {
      if (savedTimer.current) clearTimeout(savedTimer.current);
    },
    [],
  );

  const flashSaved = useCallback(() => {
    setJustSaved(true);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    savedTimer.current = setTimeout(() => setJustSaved(false), 2200);
  }, []);

  const commitNote = useCallback(() => {
    if (edited === null || edited === note) return;
    saveNote(edited);
    setEdited(null);
    flashSaved();
  }, [edited, note, saveNote, flashSaved]);

  const reset = useCallback(() => {
    clear();
    setEdited(null);
    setOpenOverride(null);
    setHoverStar(0);
  }, [clear]);

  /**
   * Arrow keys move through the rating and select as they go, which is the
   * radiogroup pattern a screen-reader user expects; Home and End jump to the
   * ends. The roving tabindex on the buttons keeps the whole group to a
   * single stop in the tab order.
   */
  const onStarKeyDown = useCallback(
    (event: KeyboardEvent<HTMLButtonElement>) => {
      const current = stars || 1;
      let next: number | null = null;

      switch (event.key) {
        case "ArrowRight":
        case "ArrowDown":
          next = current === 5 ? 1 : current + 1;
          break;
        case "ArrowLeft":
        case "ArrowUp":
          next = current === 1 ? 5 : current - 1;
          break;
        case "Home":
          next = 1;
          break;
        case "End":
          next = 5;
          break;
        default:
          return;
      }

      event.preventDefault();
      // `setStars` toggles when the value matches, so write it straight.
      rate(resourceId, next, { title, route, kind });
      starRefs.current[next]?.focus();
    },
    [stars, resourceId, title, route, kind],
  );

  const reportHref = issueUrl(
    pageIssueDraft({ route, title, note: ready ? note : undefined, stars: ready ? stars : 0 }),
  );

  const shown = hoverStar || stars;
  const hasAnything = ready && (stars > 0 || helpful !== null || note.trim().length > 0);

  return (
    <section
      aria-labelledby={`${groupId}-heading`}
      className={cn(
        "rounded-2xl border border-hairline bg-surface p-5 sm:p-6 print:hidden",
        className,
      )}
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-8">
        <div className="min-w-0 lg:max-w-sm">
          <h2
            id={`${groupId}-heading`}
            className="font-display text-[1.0625rem] font-semibold text-ink"
          >
            Was this helpful?
          </h2>
          <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">
            Your answer stays in this browser — there is no server to send it to. It shows up in
            your own feedback list so you can find the pages you marked and export them.
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* ------------------------------------------------- yes / no */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setHelpful("yes")}
              aria-pressed={helpful === "yes"}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                helpful === "yes"
                  ? "border-good/40 bg-good-soft text-good"
                  : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
              )}
            >
              <ThumbsUp className="size-4 shrink-0" aria-hidden="true" />
              Yes
            </button>
            <button
              type="button"
              onClick={() => setHelpful("no")}
              aria-pressed={helpful === "no"}
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-4 text-sm font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                helpful === "no"
                  ? "border-bad/40 bg-bad-soft text-bad"
                  : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
              )}
            >
              <ThumbsDown className="size-4 shrink-0" aria-hidden="true" />
              No
            </button>

            <span className="mx-1 hidden h-6 w-px bg-hairline sm:block" aria-hidden="true" />

            {/* --------------------------------------------- star rating */}
            <div
              role="radiogroup"
              aria-label="Rate this page from 1 to 5 stars"
              className="flex items-center gap-0.5"
              onMouseLeave={() => setHoverStar(0)}
            >
              {STAR_VALUES.map((value) => {
                const filled = value <= shown;
                return (
                  <button
                    key={value}
                    ref={(node) => {
                      starRefs.current[value] = node;
                    }}
                    type="button"
                    role="radio"
                    aria-checked={stars === value}
                    // Roving tabindex: one stop for the whole group, on the
                    // current rating (or the first star when unrated).
                    tabIndex={value === (stars || 1) ? 0 : -1}
                    aria-label={`${value} ${value === 1 ? "star" : "stars"} — ${STAR_LABELS[value - 1]}`}
                    onClick={() => setStars(value)}
                    onKeyDown={onStarKeyDown}
                    onMouseEnter={() => setHoverStar(value)}
                    onFocus={() => setHoverStar(value)}
                    onBlur={() => setHoverStar(0)}
                    className={cn(
                      "inline-flex size-11 items-center justify-center rounded-lg transition-colors",
                      "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                      filled ? "text-ember" : "text-faint hover:text-ember",
                    )}
                  >
                    <Star
                      className="size-5"
                      fill={filled ? "currentColor" : "none"}
                      strokeWidth={filled ? 1.5 : 2}
                      aria-hidden="true"
                    />
                  </button>
                );
              })}
              <span
                className="ml-1.5 min-w-0 text-xs text-faint"
                aria-live="polite"
              >
                {shown > 0 ? STAR_LABELS[shown - 1] : "Not rated"}
              </span>
            </div>
          </div>

          {/* ---------------------------------------------------- note */}
          {noteOpen ? (
            <div>
              <Textarea
                id={`${groupId}-note`}
                label="What would make this page better?"
                hint="Private to this browser. Copy it into an issue if you want it fixed."
                rows={3}
                maxLength={MAX_NOTE_LENGTH}
                showCount
                value={draftNote}
                placeholder="The break-even ACoS example uses a 15% referral fee, but supplements are 8%…"
                onChange={(event) => setEdited(event.target.value)}
                onBlur={commitNote}
              />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={justSaved ? Check : undefined}
                  onClick={commitNote}
                  disabled={!noteDirty}
                >
                  {justSaved ? "Saved" : "Save note"}
                </Button>
                {hasAnything ? (
                  <Button size="sm" variant="ghost" icon={Trash2} onClick={reset}>
                    Clear my feedback
                  </Button>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="secondary"
                icon={MessageSquarePlus}
                onClick={() => setOpenOverride(true)}
              >
                Add a note
              </Button>
              {hasAnything ? (
                <Button size="sm" variant="ghost" icon={Trash2} onClick={reset}>
                  Clear my feedback
                </Button>
              ) : null}
            </div>
          )}

          {/* -------------------------------------------------- escalate */}
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-4 text-[0.8125rem]">
            <a
              href={reportHref}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex min-h-9 items-center gap-1.5 font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <Flag className="size-3.5 shrink-0" aria-hidden="true" />
              Report an issue with this page
            </a>
            <Link
              href="/contribute"
              className="inline-flex min-h-9 items-center text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Or contribute something
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
