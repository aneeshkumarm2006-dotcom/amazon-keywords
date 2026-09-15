"use client";

import { Clock, TextQuote } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/Badge";
import { TONE_ICON, TONE_SOLID_BG } from "@/components/ui/tone";
import { KIND_META } from "@/content/registry";
import { highlight, type SearchHit } from "@/lib/search";
import { cn, formatMinutes } from "@/lib/utils";

import { LEVEL_LABEL, LEVEL_TONE } from "./tokens";

export interface SearchHitCardProps {
  hit: SearchHit;
  /** Position in the result list — drives the keyboard highlight and the id. */
  index: number;
  active: boolean;
  /** Show the relevance readout. Off when there is no query to be relevant to. */
  showScore: boolean;
  onActivate: (index: number) => void;
  onOpen: (hit: SearchHit) => void;
}

/**
 * One result. Kind, level and time up top; the title and summary with every
 * match marked; a window of the body when that is where the match landed.
 */
export function SearchHitCard({
  hit,
  index,
  active,
  showScore,
  onActivate,
  onOpen,
}: SearchHitCardProps) {
  const { resource } = hit;
  const meta = KIND_META[resource.kind];
  const Icon = meta.icon;

  return (
    <li id={`search-result-${index}`} className="scroll-mt-32">
      <Link
        href={resource.href}
        onClick={() => onOpen(hit)}
        onMouseEnter={() => onActivate(index)}
        onFocus={() => onActivate(index)}
        className={cn(
          "group relative flex flex-col gap-2 overflow-hidden rounded-xl border p-4 pl-5",
          "transition-[border-color,background-color,box-shadow] duration-150",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          active
            ? "border-brand bg-brand-soft/50 shadow-card"
            : "border-hairline bg-surface hover:border-hairline-strong hover:shadow-card",
        )}
      >
        <span
          className={cn(
            "absolute inset-y-3 left-0 w-[3px] rounded-r-full transition-opacity",
            TONE_SOLID_BG[meta.accent],
            active ? "opacity-100" : "opacity-60 group-hover:opacity-100",
          )}
          aria-hidden="true"
        />

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-[0.6875rem] font-semibold tracking-[0.08em] uppercase",
              TONE_ICON[meta.accent],
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
            {meta.label}
          </span>

          {resource.level ? (
            <Badge size="sm" tone={LEVEL_TONE[resource.level]} variant="outline">
              {LEVEL_LABEL[resource.level]}
            </Badge>
          ) : null}

          <span className="ml-auto flex items-center gap-3">
            {resource.minutes ? (
              <span className="inline-flex items-center gap-1 text-[0.6875rem] text-faint">
                <Clock className="size-3" aria-hidden="true" />
                <span className="tabular">{formatMinutes(resource.minutes)}</span>
              </span>
            ) : null}
            {showScore ? (
              <span className="tabular text-[0.6875rem] text-faint" title="Match strength">
                {hit.relevance}% match
              </span>
            ) : null}
          </span>
        </div>

        <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
          {highlight(resource.title, hit.titleRanges)}
        </h3>

        <p className="line-clamp-3 text-[0.8125rem] leading-relaxed text-muted">
          {highlight(resource.summary, hit.summaryRanges)}
        </p>

        {hit.snippet ? (
          <p className="flex items-start gap-2 rounded-lg border border-hairline bg-surface-2/70 px-2.5 py-1.5 text-xs leading-relaxed text-muted">
            <TextQuote className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
            <span className="line-clamp-2 min-w-0">
              {highlight(hit.snippet.text, hit.snippet.ranges)}
            </span>
          </p>
        ) : null}

        <div className="flex flex-wrap items-center gap-1.5">
          {resource.tags.slice(0, 4).map((tag) => {
            const matched = hit.matchedTags.includes(tag);
            return (
              <span
                key={tag}
                className={cn(
                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[0.6875rem]",
                  matched
                    ? "border-ember/35 bg-ember-soft font-medium text-ember-ink"
                    : "border-hairline bg-surface-2 text-faint",
                )}
              >
                {tag}
              </span>
            );
          })}
          <span className="ml-auto hidden truncate font-mono text-[0.625rem] text-faint sm:block">
            {resource.href}
          </span>
        </div>
      </Link>
    </li>
  );
}
