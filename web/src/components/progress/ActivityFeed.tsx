"use client";

import {
  Bookmark,
  CircleCheck,
  History,
  MessageSquareQuote,
  Route,
  Target,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { EmptyState } from "@/components/ui/EmptyState";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import type { ActivityEvent, ActivityKind } from "@/lib/progress";
import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

const KIND_ICON: Record<ActivityKind, LucideIcon> = {
  resource: CircleCheck,
  quiz: Target,
  interview: MessageSquareQuote,
  path: Route,
  bookmark: Bookmark,
};

const KIND_TONE: Record<ActivityKind, Tone> = {
  resource: "brand",
  quiz: "info",
  interview: "ember",
  path: "good",
  bookmark: "neutral",
};

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "just now" / "14 min ago" / "3 hr ago" / "yesterday" / "6 days ago" / a date. */
function relativeTime(timestamp: number, now: number): string {
  const delta = now - timestamp;
  if (delta < 0) return "just now";
  if (delta < MINUTE) return "just now";
  if (delta < HOUR) return `${Math.floor(delta / MINUTE)} min ago`;
  if (delta < DAY) {
    const hours = Math.floor(delta / HOUR);
    return `${hours} hr ago`;
  }
  const days = Math.floor(delta / DAY);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days} days ago`;
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(timestamp),
  );
}

export interface ActivityFeedProps {
  events: ActivityEvent[];
  /** Fixed clock, passed in so the list does not re-render on every tick. */
  now: number;
  className?: string;
}

/** The most recent things you did, across every part of the site. */
export function ActivityFeed({ events, now, className }: ActivityFeedProps) {
  return (
    <section
      aria-labelledby="activity-feed-heading"
      className={cn("flex min-w-0 flex-col rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
        <h3
          id="activity-feed-heading"
          className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
        >
          Recent activity
        </h3>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Quiz attempts, mock interviews, completions and saves, newest first.
        </p>
      </header>

      {events.length === 0 ? (
        <EmptyState
          bare
          icon={History}
          title="Your history starts empty"
          description="Nothing here is uploaded or shared — this is a log of what you did in this browser, kept so you can see the shape of your own effort and export it when you change machines."
        />
      ) : (
        <ol className="divide-y divide-hairline">
          {events.map((event) => {
            const Icon = KIND_ICON[event.kind];
            const tone = KIND_TONE[event.kind];
            const body = (
              <>
                <span
                  className={cn(
                    "mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg",
                    TONE_SOFT_BG[tone],
                  )}
                  aria-hidden="true"
                >
                  <Icon className={cn("size-3.5", TONE_ICON[tone])} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.875rem] font-medium text-ink">
                    {event.label}
                  </span>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[0.75rem] text-faint">
                    <span className="tabular">{relativeTime(event.at, now)}</span>
                    {event.detail ? <span>· {event.detail}</span> : null}
                    {event.xp > 0 ? (
                      <span className="tabular text-brand">+{event.xp} XP</span>
                    ) : null}
                  </span>
                </span>
              </>
            );

            return (
              <li key={`${event.kind}-${event.id}-${event.at}`}>
                {event.href ? (
                  <Link
                    href={event.href}
                    className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
                  >
                    {body}
                  </Link>
                ) : (
                  <div className="flex items-start gap-3 px-4 py-3 sm:px-5">{body}</div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
