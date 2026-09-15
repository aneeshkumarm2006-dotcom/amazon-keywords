"use client";

import { Clock, LayoutGrid, List, Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { CONTROL_BASE } from "@/components/ui/Field";
import { TONE_SOLID_BG } from "@/components/ui/tone";
import { useLocalStorage } from "@/lib/storage";
import { cn, formatMinutes, humanize } from "@/lib/utils";
import type { Level, Tone } from "@/types/content";

import type { DocIndexItem } from "./data";

type View = "cards" | "list";

const LEVEL_ORDER: Level[] = [
  "beginner",
  "intermediate",
  "advanced",
  "expert",
  "scenario",
];

/** Stable identity for "no tags selected", so the memo below can rely on it. */
const EMPTY_TAGS: string[] = [];

const LEVEL_TONE: Record<Level, Tone> = {
  beginner: "good",
  intermediate: "info",
  advanced: "warn",
  expert: "bad",
  scenario: "ember",
};

export interface DocIndexProps {
  items: DocIndexItem[];
  /** Route the cards link into, e.g. "/sops". */
  basePath: string;
  /** Singular and plural nouns for the result count. */
  noun: [singular: string, plural: string];
  /** Accent used for the card rails and active chips. */
  accent: Tone;
  /**
   * How many `meta` entries to surface on a card, taken in the order the
   * domain authored them. Reading positionally rather than by key name is
   * what keeps every card in a grid the same height, whatever each document
   * happens to call its facts.
   */
  cardMetaCount?: number;
  /** Persist the card/list choice under this localStorage key. */
  storageKey: string;
}

/**
 * The shared index surface for every document domain: type-to-filter, tag
 * chips, level filter, a card/list switch and a live result count.
 *
 * Filtering happens on a pre-built lowercase haystack (title, summary, tags,
 * meta and section headings) so it stays instant without shipping any
 * document bodies to the browser.
 */
export function DocIndex({
  items,
  basePath,
  noun,
  accent,
  cardMetaCount = 2,
  storageKey,
}: DocIndexProps) {
  const params = useSearchParams();
  const initialTag = params.get("tag");

  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level | "all">("all");
  const [view, setView] = useLocalStorage<View>(storageKey, "cards");

  /**
   * A tag can arrive from a document's tag chip: `/sops?tag=daily`. It seeds
   * the selection rather than setting it, so nothing has to be synchronised
   * in an effect — under static export `useSearchParams` is empty during the
   * prerender and fills in on the client, and this derivation picks that up
   * on the next render for free. The moment the reader touches a chip,
   * `chosen` takes over and the URL stops mattering.
   */
  const [chosen, setChosen] = useState<string[] | null>(null);
  const tags = useMemo(
    () => chosen ?? (initialTag ? [initialTag] : EMPTY_TAGS),
    [chosen, initialTag],
  );

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  const levels = useMemo(() => {
    const present = new Set(items.map((item) => item.level).filter(Boolean) as Level[]);
    return LEVEL_ORDER.filter((candidate) => present.has(candidate));
  }, [items]);

  const terms = useMemo(
    () => query.toLowerCase().split(/\s+/).filter(Boolean),
    [query],
  );

  const results = useMemo(
    () =>
      items.filter((item) => {
        if (level !== "all" && item.level !== level) return false;
        if (tags.length > 0 && !tags.every((tag) => item.tags.includes(tag))) return false;
        return terms.every((term) => item.haystack.includes(term));
      }),
    [items, level, tags, terms],
  );

  const filtered = query !== "" || tags.length > 0 || level !== "all";

  const reset = () => {
    setQuery("");
    setChosen([]);
    setLevel("all");
  };

  const toggleTag = (tag: string) =>
    setChosen(tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag]);

  return (
    <div>
      {/* ---------------------------------------------------------- controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3 size-4 text-faint"
              aria-hidden="true"
            />
            <label htmlFor="doc-index-search" className="sr-only">
              Filter {noun[1]}
            </label>
            <input
              id="doc-index-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${items.length} ${noun[1]} by name, tag or section…`}
              autoComplete="off"
              className={cn(
                CONTROL_BASE,
                "h-11 border-hairline pl-9 hover:border-hairline-strong",
                "[&::-webkit-search-cancel-button]:appearance-none",
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear the filter text"
                className="absolute right-2 inline-flex size-7 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {levels.length > 1 ? (
              <>
                <label htmlFor="doc-index-level" className="sr-only">
                  Filter by level
                </label>
                <select
                  id="doc-index-level"
                  value={level}
                  onChange={(event) => setLevel(event.target.value as Level | "all")}
                  className={cn(
                    CONTROL_BASE,
                    "h-11 w-auto cursor-pointer border-hairline pr-8 hover:border-hairline-strong",
                  )}
                >
                  <option value="all">All levels</option>
                  {levels.map((candidate) => (
                    <option key={candidate} value={candidate}>
                      {humanize(candidate)}
                    </option>
                  ))}
                </select>
              </>
            ) : null}

            <SegmentedControl<View>
              label="Result layout"
              value={view}
              onChange={setView}
              iconOnly
              options={[
                { value: "cards", label: "Cards", icon: LayoutGrid, srLabel: "Card view" },
                { value: "list", label: "List", icon: List, srLabel: "List view" },
              ]}
            />
          </div>
        </div>

        {allTags.length > 1 ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <SlidersHorizontal
              className="mr-0.5 size-3.5 shrink-0 text-faint"
              aria-hidden="true"
            />
            {allTags.map(({ tag, count }) => {
              const on = tags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    on
                      ? "border-brand bg-brand text-on-brand"
                      : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                  )}
                >
                  {tag}
                  <span
                    className={cn(
                      "tabular text-[0.6875rem]",
                      on ? "opacity-80" : "text-faint",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <p className="text-[0.8125rem] text-muted" aria-live="polite">
            <span className="tabular font-semibold text-ink">{results.length}</span>{" "}
            {results.length === 1 ? noun[0] : noun[1]}
            {filtered ? (
              <>
                {" "}
                of <span className="tabular">{items.length}</span>
              </>
            ) : null}
          </p>
          {filtered ? (
            <Button variant="ghost" size="sm" icon={X} onClick={reset}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* ----------------------------------------------------------- results */}
      {results.length === 0 ? (
        <EmptyState
          className="mt-8"
          title={`No ${noun[1]} match those filters`}
          description="Try a shorter phrase, or clear the tag and level filters to see the whole library again."
          action={
            <Button variant="secondary" size="sm" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : view === "cards" ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((item) => (
            <li key={item.id} className="flex">
              <Link
                href={`${basePath}/${item.id}`}
                className="group relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border border-hairline bg-surface p-5 pt-6 transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <span
                  className={cn(
                    "absolute inset-x-0 top-0 h-[3px]",
                    TONE_SOLID_BG[accent],
                    "opacity-70 transition-opacity group-hover:opacity-100",
                  )}
                  aria-hidden="true"
                />

                <div className="flex flex-col gap-1.5">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                    {item.title}
                  </h3>
                  <p className="text-[0.8125rem] leading-relaxed text-muted">
                    {item.summary}
                  </p>
                </div>

                {cardMetaCount > 0 && item.meta ? (
                  <dl className="mt-auto grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
                    {Object.entries(item.meta)
                      .slice(0, cardMetaCount)
                      .map(([key, value]) => (
                        <div key={key} className="min-w-0">
                          <dt className="truncate text-[0.625rem] font-medium tracking-[0.1em] text-faint uppercase">
                            {key}
                          </dt>
                          <dd className="text-[0.8125rem] leading-snug font-medium text-ink">
                            {value}
                          </dd>
                        </div>
                      ))}
                  </dl>
                ) : null}

                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                  <Badge size="sm" tone="neutral" icon={Clock}>
                    {formatMinutes(item.minutes)}
                  </Badge>
                  {item.level ? (
                    <Badge size="sm" tone={LEVEL_TONE[item.level]} variant="outline">
                      {humanize(item.level)}
                    </Badge>
                  ) : null}
                  {item.tags.slice(0, 2).map((tag) => (
                    <Badge key={tag} size="sm" tone="neutral">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="mt-6 divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface">
          {results.map((item) => (
            <li key={item.id}>
              <Link
                href={`${basePath}/${item.id}`}
                className="group flex flex-col gap-2 p-4 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:flex-row sm:items-start sm:gap-5"
              >
                <div className="min-w-0 flex-1">
                  <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink group-hover:text-brand">
                    {item.title}
                  </h3>
                  <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
                    {item.summary}
                  </p>
                  {item.sections.length > 0 ? (
                    <p className="mt-1.5 truncate text-xs text-faint">
                      {item.sections.slice(0, 5).join(" · ")}
                    </p>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5 sm:w-44 sm:justify-end">
                  {item.level ? (
                    <Badge size="sm" tone={LEVEL_TONE[item.level]} variant="outline">
                      {humanize(item.level)}
                    </Badge>
                  ) : null}
                  <Badge size="sm" tone="neutral" icon={Clock}>
                    {formatMinutes(item.minutes)}
                  </Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
