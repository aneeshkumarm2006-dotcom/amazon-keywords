"use client";

import {
  ArrowUpRight,
  ChevronDown,
  CircleCheckBig,
  ListFilter,
  Search,
  Star,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONTROL_BASE } from "@/components/ui/Field";
import { Progress } from "@/components/ui/Progress";
import { TONE_ICON, TONE_SOFT_BG } from "@/components/ui/tone";
import {
  CATEGORY_META,
  CATEGORY_ORDER,
  LEVEL_META,
  LEVEL_ORDER,
  interviewQuestions,
  questionPlainText,
  type InterviewCategory,
} from "@/content/interviews";
import { useBookmarks, useCategoryProgress, usePractised } from "@/lib/interview-hooks";
import { useIsHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";
import type { Level } from "@/types/content";

import { AnswerBody } from "./AnswerBody";
import { QuestionActions } from "./QuestionActions";
import { QuestionChips } from "./QuestionChips";
import { categoryIcon } from "./meta";

type CategoryFilter = InterviewCategory | "all";
type Flag = "all" | "bookmarked" | "unpractised" | "practised";

const FLAGS: { id: Flag; label: string }[] = [
  { id: "all", label: "All questions" },
  { id: "bookmarked", label: "Bookmarked" },
  { id: "unpractised", label: "Not yet practised" },
  { id: "practised", label: "Practised" },
];

/** Pre-computed search corpus. Built once at module scope, never per render. */
const HAYSTACKS = new Map(
  interviewQuestions.map((entry) => [
    entry.id,
    `${entry.category} ${questionPlainText(entry)} ${entry.tags.join(" ")}`.toLowerCase(),
  ]),
);

/**
 * The interview bank browser.
 *
 * Category tabs, a level filter, a text filter and a state filter over 117
 * questions, with each row expanding in place to reveal the full model answer.
 * Bookmarks and practised state are read straight from localStorage, so the
 * progress bars, the filters and the deep-dive pages all stay in step.
 */
export function BankBrowser() {
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [levels, setLevels] = useState<Level[]>([]);
  const [flag, setFlag] = useState<Flag>("all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<string[]>([]);
  const searchRef = useRef<HTMLInputElement>(null);

  const bookmarks = useBookmarks();
  const practised = usePractised();
  const progress = useCategoryProgress();
  const hydrated = useIsHydrated();

  // "/" focuses the filter, matching the glossary and search surfaces.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const results = useMemo(() => {
    const needles = query.toLowerCase().split(/\s+/).filter(Boolean);

    return interviewQuestions.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false;
      if (levels.length > 0 && !levels.includes(entry.level)) return false;

      if (flag === "bookmarked" && !bookmarks.has(entry.id)) return false;
      if (flag === "practised" && !practised.has(entry.id)) return false;
      if (flag === "unpractised" && practised.has(entry.id)) return false;

      if (needles.length === 0) return true;
      const haystack = HAYSTACKS.get(entry.id) ?? "";
      return needles.every((needle) => haystack.includes(needle));
    });
  }, [category, levels, flag, query, bookmarks, practised]);

  const counts = useMemo(() => {
    const map = new Map<InterviewCategory, number>();
    for (const entry of interviewQuestions) {
      map.set(entry.category, (map.get(entry.category) ?? 0) + 1);
    }
    return map;
  }, []);

  const filtered =
    category !== "all" || levels.length > 0 || flag !== "all" || query.trim() !== "";

  const reset = () => {
    setCategory("all");
    setLevels([]);
    setFlag("all");
    setQuery("");
  };

  const toggleLevel = (level: Level) => {
    setLevels((previous) =>
      previous.includes(level)
        ? previous.filter((entry) => entry !== level)
        : [...previous, level],
    );
  };

  const toggleOpen = (id: string) => {
    setOpen((previous) =>
      previous.includes(id) ? previous.filter((entry) => entry !== id) : [...previous, id],
    );
  };

  const totalPractised = hydrated ? practised.count : 0;
  const totalBookmarked = hydrated ? bookmarks.count : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* ------------------------------------------------------- progress */}
      <section
        aria-labelledby="interview-progress-heading"
        className="rounded-2xl border border-hairline bg-surface"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-hairline px-5 py-4">
          <div>
            <h2
              id="interview-progress-heading"
              className="font-display text-base font-semibold text-ink"
            >
              Your progress by category
            </h2>
            <p className="mt-1 text-[0.8125rem] text-muted">
              Mark a question practised once you can answer it out loud in under two minutes
              without reading.
            </p>
          </div>
          <p className="text-[0.8125rem] text-muted">
            <span className="tabular font-semibold text-ink">{totalPractised}</span> practised ·{" "}
            <span className="tabular font-semibold text-ink">{totalBookmarked}</span> bookmarked
          </p>
        </div>

        <ul className="grid gap-x-6 gap-y-4 p-5 sm:grid-cols-2 xl:grid-cols-3">
          {progress.map((row) => {
            const meta = CATEGORY_META[row.category];
            const Icon = categoryIcon(row.category);
            const selected = category === row.category;
            return (
              <li
                key={row.category}
                className={cn(
                  "rounded-lg border p-3 transition-colors",
                  selected ? "border-brand bg-brand-soft" : "border-transparent",
                )}
              >
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setCategory(selected ? "all" : row.category)}
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    selected ? "text-ink" : "text-ink hover:text-brand",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-7 shrink-0 items-center justify-center rounded-md",
                      TONE_SOFT_BG[meta.tone],
                    )}
                  >
                    <Icon className={cn("size-3.5", TONE_ICON[meta.tone])} aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[0.875rem] font-medium">
                    {meta.short}
                  </span>
                  <span className="tabular text-xs text-faint">
                    {hydrated ? row.practised : 0}/{row.total}
                  </span>
                </button>
                <Progress
                  className="mt-2"
                  value={hydrated ? row.practised : 0}
                  max={row.total}
                  tone={meta.tone === "neutral" ? "brand" : meta.tone}
                  size="sm"
                  hideLabel
                  srLabel={`${meta.category}: ${hydrated ? row.practised : 0} of ${row.total} practised`}
                />
              </li>
            );
          })}
        </ul>
      </section>

      {/* --------------------------------------------------------- filters */}
      <div className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-3 size-4 text-faint"
            aria-hidden="true"
          />
          <label htmlFor="interview-filter" className="sr-only">
            Filter interview questions
          </label>
          <input
            id="interview-filter"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${interviewQuestions.length} questions — try "tacos", "negative", "client"…`}
            autoComplete="off"
            className={cn(
              CONTROL_BASE,
              "h-12 border-hairline pl-9 text-[0.9375rem] hover:border-hairline-strong",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear the filter text"
              className="absolute right-2 inline-flex size-8 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 hidden rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6875rem] text-faint sm:block">
              /
            </kbd>
          )}
        </div>

        <nav aria-label="Filter by category" className="scroll-well -mx-1 overflow-x-auto px-1">
          <ul className="flex min-w-max items-center gap-1.5 pb-px">
            <li>
              <FilterChip
                on={category === "all"}
                onClick={() => setCategory("all")}
                count={interviewQuestions.length}
              >
                All categories
              </FilterChip>
            </li>
            {CATEGORY_ORDER.map((name) => (
              <li key={name}>
                <FilterChip
                  on={category === name}
                  onClick={() => setCategory(category === name ? "all" : name)}
                  count={counts.get(name) ?? 0}
                  icon={categoryIcon(name)}
                >
                  {CATEGORY_META[name].short}
                </FilterChip>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="mr-0.5 inline-flex items-center gap-1.5 text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
              <ListFilter className="size-3.5" aria-hidden="true" />
              Level
            </span>
            {LEVEL_ORDER.map((level) => (
              <FilterChip
                key={level}
                on={levels.includes(level)}
                onClick={() => toggleLevel(level)}
              >
                {LEVEL_META[level].label}
              </FilterChip>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {FLAGS.map((entry) => (
              <FilterChip
                key={entry.id}
                on={flag === entry.id}
                onClick={() => setFlag(entry.id)}
                icon={
                  entry.id === "bookmarked"
                    ? Star
                    : entry.id === "practised"
                      ? CircleCheckBig
                      : undefined
                }
              >
                {entry.label}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <p className="text-[0.8125rem] text-muted" aria-live="polite">
            <span className="tabular font-semibold text-ink">{results.length}</span> question
            {results.length === 1 ? "" : "s"}
            {filtered ? (
              <>
                {" "}
                of <span className="tabular">{interviewQuestions.length}</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-1">
            {open.length > 0 ? (
              <Button variant="ghost" size="sm" onClick={() => setOpen([])}>
                Collapse all
              </Button>
            ) : null}
            {filtered ? (
              <Button variant="ghost" size="sm" icon={X} onClick={reset}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* --------------------------------------------------------- results */}
      {results.length === 0 ? (
        <EmptyState
          title="No questions match those filters"
          description="Try clearing the level or state filter, or searching for a broader term such as bid, client or report."
          action={
            <Button variant="secondary" size="sm" icon={X} onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2.5">
          {results.map((entry) => {
            const expanded = open.includes(entry.id);
            const done = hydrated && practised.has(entry.id);

            return (
              <li
                key={entry.id}
                className={cn(
                  "rounded-xl border bg-surface transition-colors",
                  expanded ? "border-hairline-strong" : "border-hairline hover:border-hairline-strong",
                )}
              >
                <div className="flex items-start gap-2 p-3 sm:p-4">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    aria-controls={`answer-${entry.id}`}
                    onClick={() => toggleOpen(entry.id)}
                    className="min-w-0 flex-1 rounded-lg px-1 py-0.5 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    <span className="flex items-start gap-2.5">
                      <ChevronDown
                        className={cn(
                          "mt-1 size-4 shrink-0 text-faint transition-transform duration-200",
                          expanded && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 flex-1">
                        <span
                          className={cn(
                            "block text-[0.9375rem] leading-snug font-medium text-balance",
                            done ? "text-muted" : "text-ink",
                          )}
                        >
                          {entry.question}
                        </span>
                        <QuestionChips entry={entry} className="mt-2" />
                      </span>
                    </span>
                  </button>

                  <QuestionActions id={entry.id} variant="icons" className="shrink-0" />
                </div>

                <div id={`answer-${entry.id}`} hidden={!expanded}>
                  {expanded ? (
                    <div className="border-t border-hairline p-4 sm:p-5">
                      <AnswerBody entry={entry} />
                      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
                        <Link
                          href={`/interviews/${entry.id}`}
                          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                        >
                          Open the deep dive
                          <ArrowUpRight className="size-4" aria-hidden="true" />
                        </Link>
                        <QuestionActions id={entry.id} className="ml-auto" />
                      </div>
                    </div>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Chip
 * ------------------------------------------------------------------ */

function FilterChip({
  on,
  onClick,
  count,
  icon: Icon,
  children,
}: {
  on: boolean;
  onClick: () => void;
  count?: number;
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        on
          ? "border-brand bg-brand text-on-brand"
          : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
      )}
    >
      {Icon ? <Icon className="size-3.5" aria-hidden={true} /> : null}
      {children}
      {typeof count === "number" ? (
        <span className={cn("tabular text-[0.6875rem]", on ? "opacity-80" : "text-faint")}>
          {count}
        </span>
      ) : null}
    </button>
  );
}
