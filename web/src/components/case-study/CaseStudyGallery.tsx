"use client";

import {
  ArrowRight,
  Check,
  Clock,
  Columns3,
  LayoutGrid,
  Rows3,
  Scale,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONTROL_BASE } from "@/components/ui/Field";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import { RESULT_TYPE_LABEL, RESULT_TYPE_ORDER } from "@/content/case-studies";
import type { CaseStudyResultType } from "@/content/case-studies";
import { useLocalStorage } from "@/lib/storage";
import { cn, formatCurrency, formatMinutes } from "@/lib/utils";

import { RESULT_TYPE_TONE, acosTone, type GalleryItem } from "./data";
import { MetricInline } from "./MetricGrid";
import { Sparkline } from "./Sparkline";
import { useMounted } from "./useMounted";

export const COMPARE_STORAGE_KEY = "case-studies:compare";
export const MAX_COMPARE = 3;

type View = "cards" | "table";
type Sort = "featured" | "acos" | "growth" | "spend" | "title";

const SORTS: { value: Sort; label: string }[] = [
  { value: "featured", label: "Featured order" },
  { value: "acos", label: "Biggest ACoS drop" },
  { value: "growth", label: "Fastest revenue growth" },
  { value: "spend", label: "Largest ad spend" },
  { value: "title", label: "Title A-Z" },
];

const EMPTY_TAGS: string[] = [];

/** Tag chips shown before the "+N more" toggle. */
const TAG_CHIP_LIMIT = 12;

export interface CaseStudyGalleryProps {
  items: GalleryItem[];
}

export function CaseStudyGallery({ items }: CaseStudyGalleryProps) {
  const params = useSearchParams();
  const initialTag = params.get("tag");
  const initialType = params.get("type");
  const initialCategory = params.get("category");

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<Sort>("featured");
  const [view, setView] = useLocalStorage<View>("view:case-studies", "cards");
  const [compare, setCompare] = useLocalStorage<string[]>(COMPARE_STORAGE_KEY, EMPTY_TAGS);
  const mounted = useMounted();

  /**
   * Filters can arrive in the URL from a detail page's tag chip or from the
   * home page. They seed the state rather than setting it: under static
   * export `useSearchParams` is empty during the prerender and fills in on
   * the client, and a derivation picks that up without an effect. The moment
   * the reader touches a control, their choice takes over for good.
   */
  const [chosenTags, setChosenTags] = useState<string[] | null>(null);
  const [chosenTypes, setChosenTypes] = useState<CaseStudyResultType[] | null>(null);
  const [chosenCategory, setChosenCategory] = useState<string | null>(null);
  const [allTagsShown, setAllTagsShown] = useState(false);

  const tags = useMemo(
    () => chosenTags ?? (initialTag ? [initialTag] : EMPTY_TAGS),
    [chosenTags, initialTag],
  );
  const types = useMemo<CaseStudyResultType[]>(() => {
    if (chosenTypes) return chosenTypes;
    const candidate = RESULT_TYPE_ORDER.find((entry) => entry === initialType);
    return candidate ? [candidate] : [];
  }, [chosenTypes, initialType]);
  const category = chosenCategory ?? initialCategory ?? "all";

  const categories = useMemo(
    () => Array.from(new Set(items.map((item) => item.category))).sort((a, b) => a.localeCompare(b)),
    [items],
  );

  const typeCounts = useMemo(() => {
    const counts = new Map<CaseStudyResultType, number>();
    for (const item of items) counts.set(item.resultType, (counts.get(item.resultType) ?? 0) + 1);
    return counts;
  }, [items]);

  const allTags = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of items) {
      for (const tag of item.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([tag, count]) => ({ tag, count }));
  }, [items]);

  /**
   * Twelve studies carry well over forty tags between them and most appear
   * once, so the chip row shows the shared ones first and hides the tail
   * behind a toggle. A tag that is currently selected is always visible,
   * whichever side of the cut it falls on.
   */
  const visibleTags = useMemo(() => {
    if (allTagsShown) return allTags;
    const head = allTags.slice(0, TAG_CHIP_LIMIT);
    const pinned = allTags.filter(
      (entry) => tags.includes(entry.tag) && !head.includes(entry),
    );
    return [...head, ...pinned];
  }, [allTags, allTagsShown, tags]);

  const terms = useMemo(() => query.toLowerCase().split(/\s+/).filter(Boolean), [query]);

  const results = useMemo(() => {
    const filtered = items.filter((item) => {
      if (category !== "all" && item.category !== category) return false;
      if (types.length > 0 && !types.includes(item.resultType)) return false;
      if (tags.length > 0 && !tags.every((tag) => item.tags.includes(tag))) return false;
      return terms.every((term) => item.haystack.includes(term));
    });

    const ordered = [...filtered];
    switch (sort) {
      case "acos":
        ordered.sort((a, b) => b.acosDropPoints - a.acosDropPoints);
        break;
      case "growth":
        ordered.sort((a, b) => b.summary_.revenueChangePct - a.summary_.revenueChangePct);
        break;
      case "spend":
        ordered.sort((a, b) => b.summary_.totalSpend - a.summary_.totalSpend);
        break;
      case "title":
        ordered.sort((a, b) => a.title.localeCompare(b.title));
        break;
      default:
        break;
    }
    return ordered;
  }, [items, category, types, tags, terms, sort]);

  const isFiltered = query !== "" || tags.length > 0 || types.length > 0 || category !== "all";

  const reset = () => {
    setQuery("");
    setChosenTags([]);
    setChosenTypes([]);
    setChosenCategory("all");
  };

  const toggleTag = (tag: string) =>
    setChosenTags(tags.includes(tag) ? tags.filter((entry) => entry !== tag) : [...tags, tag]);

  const toggleType = (type: CaseStudyResultType) =>
    setChosenTypes(
      types.includes(type) ? types.filter((entry) => entry !== type) : [...types, type],
    );

  const toggleCompare = useCallback(
    (id: string) => {
      setCompare((current) => {
        if (current.includes(id)) return current.filter((entry) => entry !== id);
        if (current.length >= MAX_COMPARE) return current;
        return [...current, id];
      });
    },
    [setCompare],
  );

  const selected = mounted ? compare : EMPTY_TAGS;
  const compareHref = `/case-studies/compare?ids=${selected.join(",")}`;

  return (
    <div>
      {/* ------------------------------------------------------------ controls */}
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex min-w-0 flex-1 items-center">
            <Search
              className="pointer-events-none absolute left-3 size-4 text-faint"
              aria-hidden="true"
            />
            <label htmlFor="case-study-search" className="sr-only">
              Filter case studies
            </label>
            <input
              id="case-study-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={`Filter ${items.length} case studies by brand, category, metric or tactic…`}
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

          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="case-study-category" className="sr-only">
              Filter by category
            </label>
            <select
              id="case-study-category"
              value={category}
              onChange={(event) => setChosenCategory(event.target.value)}
              className={cn(
                CONTROL_BASE,
                "h-11 w-auto cursor-pointer border-hairline pr-8 hover:border-hairline-strong",
              )}
            >
              <option value="all">All categories</option>
              {categories.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>

            <label htmlFor="case-study-sort" className="sr-only">
              Sort case studies
            </label>
            <select
              id="case-study-sort"
              value={sort}
              onChange={(event) => setSort(event.target.value as Sort)}
              className={cn(
                CONTROL_BASE,
                "h-11 w-auto cursor-pointer border-hairline pr-8 hover:border-hairline-strong",
              )}
            >
              {SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <SegmentedControl<View>
              label="Result layout"
              value={view}
              onChange={setView}
              iconOnly
              options={[
                { value: "cards", label: "Cards", icon: LayoutGrid, srLabel: "Card view" },
                { value: "table", label: "Table", icon: Rows3, srLabel: "Table view" },
              ]}
            />
          </div>
        </div>

        {/* result type chips */}
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Filter by result type</legend>
          <Columns3 className="mr-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
          {RESULT_TYPE_ORDER.map((type) => {
            const count = typeCounts.get(type) ?? 0;
            if (count === 0) return null;
            const on = types.includes(type);
            return (
              <button
                key={type}
                type="button"
                onClick={() => toggleType(type)}
                aria-pressed={on}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  on
                    ? "border-transparent bg-ink text-canvas"
                    : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    on ? "bg-canvas" : TONE_SOLID_BG[RESULT_TYPE_TONE[type]],
                  )}
                  aria-hidden="true"
                />
                {RESULT_TYPE_LABEL[type]}
                <span className={cn("tabular text-[0.6875rem]", on ? "opacity-75" : "text-faint")}>
                  {count}
                </span>
              </button>
            );
          })}
        </fieldset>

        {/* tag chips */}
        <fieldset className="flex flex-wrap items-center gap-1.5">
          <legend className="sr-only">Filter by tag</legend>
          <SlidersHorizontal className="mr-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
          {visibleTags.map(({ tag, count }) => {
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
                <span className={cn("tabular text-[0.6875rem]", on ? "opacity-80" : "text-faint")}>
                  {count}
                </span>
              </button>
            );
          })}
          {allTags.length > TAG_CHIP_LIMIT ? (
            <button
              type="button"
              onClick={() => setAllTagsShown((current) => !current)}
              aria-expanded={allTagsShown}
              className="inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-xs font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {allTagsShown
                ? "Show fewer tags"
                : `+${allTags.length - TAG_CHIP_LIMIT} more tags`}
            </button>
          ) : null}
        </fieldset>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <p className="text-[0.8125rem] text-muted" aria-live="polite">
            <span className="tabular font-semibold text-ink">{results.length}</span>{" "}
            {results.length === 1 ? "case study" : "case studies"}
            {isFiltered ? (
              <>
                {" "}
                of <span className="tabular">{items.length}</span>
              </>
            ) : null}
          </p>
          <div className="flex items-center gap-2">
            {selected.length > 0 ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCompare([])}
                aria-label="Clear the comparison selection"
              >
                Clear selection
              </Button>
            ) : null}
            {isFiltered ? (
              <Button variant="ghost" size="sm" icon={X} onClick={reset}>
                Clear filters
              </Button>
            ) : null}
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------- results */}
      {results.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No case studies match those filters"
          description="Try a shorter phrase, or clear the category, result-type and tag filters to see all twelve accounts again."
          action={
            <Button variant="secondary" size="sm" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : view === "cards" ? (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((item) => (
            <GalleryCard
              key={item.id}
              item={item}
              selected={selected.includes(item.id)}
              disabled={selected.length >= MAX_COMPARE && !selected.includes(item.id)}
              onToggle={() => toggleCompare(item.id)}
            />
          ))}
        </ul>
      ) : (
        <div className="mt-6">
          <Table caption="Every matching case study with its headline metric and engagement totals.">
            <THead>
              <TR>
                <TH>Case study</TH>
                <TH>Result</TH>
                <TH numeric>ACoS</TH>
                <TH numeric>Ad revenue growth</TH>
                <TH numeric>Spend in period</TH>
                <TH numeric>Periods</TH>
                <TH>
                  <span className="sr-only">Compare</span>
                </TH>
              </TR>
            </THead>
            <TBody>
              {results.map((item) => (
                <TR key={item.id}>
                  <THRow>
                    <Link
                      href={`/case-studies/${item.id}`}
                      className="font-medium text-ink hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      {item.shortTitle}
                    </Link>
                    <span className="mt-0.5 block text-xs text-faint">
                      {item.category} · {item.timeframe}
                    </span>
                  </THRow>
                  <TD>
                    <Badge tone={RESULT_TYPE_TONE[item.resultType]} size="sm" variant="soft">
                      {item.resultLabel}
                    </Badge>
                  </TD>
                  <TD numeric mono>
                    <span className="text-faint">{item.headline.beforeText}</span>
                    <span className="px-1 text-faint" aria-hidden="true">
                      →
                    </span>
                    <span className={cn("font-semibold", TONE_TEXT[item.headline.tone])}>
                      {item.headline.afterText}
                    </span>
                  </TD>
                  <TD numeric mono>
                    {item.summary_.revenueChangePct > 0 ? "+" : ""}
                    {Math.round(item.summary_.revenueChangePct)}%
                  </TD>
                  <TD numeric mono>{formatCurrency(item.summary_.totalSpend, 0)}</TD>
                  <TD numeric mono>{item.summary_.points}</TD>
                  <TD>
                    <CompareToggle
                      id={item.id}
                      title={item.shortTitle}
                      selected={selected.includes(item.id)}
                      disabled={selected.length >= MAX_COMPARE && !selected.includes(item.id)}
                      onToggle={() => toggleCompare(item.id)}
                      compact
                    />
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      )}

      {/* ------------------------------------------------------- compare tray */}
      {selected.length > 0 ? (
        <div className="pointer-events-none sticky bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 mt-6 flex justify-center md:bottom-4">
          <div className="pointer-events-auto flex max-w-full flex-wrap items-center gap-3 rounded-2xl border border-hairline bg-surface px-4 py-3 shadow-card">
            <span className="inline-flex items-center gap-2 text-[0.8125rem] text-muted">
              <Scale className="size-4 text-brand" aria-hidden="true" />
              <span className="tabular font-semibold text-ink">{selected.length}</span>
              selected
              <span className="text-faint">/ {MAX_COMPARE} max</span>
            </span>
            <ButtonLink
              href={compareHref}
              size="sm"
              iconAfter={ArrowRight}
              aria-label={`Compare ${selected.length} selected case studies`}
            >
              Compare
            </ButtonLink>
            <Button variant="ghost" size="sm" onClick={() => setCompare([])}>
              Clear
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Card
 * ------------------------------------------------------------------ */

function CompareToggle({
  id,
  title,
  selected,
  disabled,
  onToggle,
  compact,
}: {
  id: string;
  title: string;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      id={`compare-${id}`}
      onClick={onToggle}
      aria-pressed={selected}
      disabled={disabled}
      title={
        disabled ? `Deselect one of the ${MAX_COMPARE} chosen studies first` : undefined
      }
      className={cn(
        "relative z-10 inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        "disabled:cursor-not-allowed disabled:opacity-45",
        selected
          ? "border-brand bg-brand-soft text-brand"
          : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
        compact && "min-h-9 px-2",
      )}
    >
      {selected ? (
        <Check className="size-3.5" aria-hidden="true" />
      ) : (
        <Scale className="size-3.5" aria-hidden="true" />
      )}
      <span className={cn(compact && "sr-only")}>{selected ? "Selected" : "Compare"}</span>
      <span className="sr-only">: {title}</span>
    </button>
  );
}

function GalleryCard({
  item,
  selected,
  disabled,
  onToggle,
}: {
  item: GalleryItem;
  selected: boolean;
  disabled: boolean;
  onToggle: () => void;
}) {
  const tone = RESULT_TYPE_TONE[item.resultType];
  const trendTone = acosTone(item.summary_.lastAcos);

  return (
    <li
      className={cn(
        "group relative flex flex-col gap-3 overflow-hidden rounded-xl border bg-surface p-5 pt-6",
        "transition-[border-color,box-shadow] duration-150 hover:shadow-card",
        selected ? "border-brand" : "border-hairline hover:border-hairline-strong",
      )}
    >
      <span
        className={cn("absolute inset-x-0 top-0 h-[3px]", TONE_SOLID_BG[tone])}
        aria-hidden="true"
      />

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone={tone} size="sm" variant="soft">
          {item.resultLabel}
        </Badge>
        <span className="text-[0.6875rem] tracking-[0.06em] text-faint uppercase">
          {item.category}
        </span>
      </div>

      <div className="flex flex-col gap-1.5">
        <h3 className="font-display text-[0.9375rem] leading-snug font-semibold text-ink">
          <Link
            href={`/case-studies/${item.id}`}
            className="rounded after:absolute after:inset-0 after:content-[''] group-hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            {item.title}
          </Link>
        </h3>
        <p className="text-[0.8125rem] leading-relaxed text-muted">{item.summary}</p>
      </div>

      {/* headline metric + ACoS trend */}
      <div className="mt-auto flex items-end justify-between gap-3 rounded-lg border border-hairline bg-surface-2/70 px-3 py-2.5">
        <span className="flex min-w-0 flex-col gap-1">
          <MetricInline view={item.headline} />
          {item.headline.deltaText ? (
            <span className={cn("tabular text-[0.6875rem] font-semibold", TONE_TEXT[item.headline.tone])}>
              {item.headline.deltaText}
            </span>
          ) : null}
        </span>
        <span className="flex shrink-0 flex-col items-end gap-0.5">
          <Sparkline values={item.acosSeries} className={TONE_TEXT[trendTone]} />
          <span className="text-[0.625rem] tracking-[0.06em] text-faint uppercase">
            ACoS by period
          </span>
        </span>
      </div>

      {/* two supporting metrics */}
      {item.support.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-hairline pt-3">
          {item.support.map((view) => (
            <div key={view.label} className="min-w-0">
              <dt className="truncate text-[0.625rem] font-medium tracking-[0.08em] text-faint uppercase">
                {view.label}
              </dt>
              <dd className="tabular truncate text-[0.8125rem] leading-snug font-medium text-ink">
                {view.beforeText} → {view.afterText}
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5 border-t border-hairline pt-3">
        <Badge size="sm" tone="neutral" icon={Clock}>
          {formatMinutes(item.minutes)}
        </Badge>
        {item.tags.slice(0, 2).map((tag) => (
          <Badge key={tag} size="sm" tone="neutral">
            {tag}
          </Badge>
        ))}
        <span className="ml-auto">
          <CompareToggle
            id={item.id}
            title={item.shortTitle}
            selected={selected}
            disabled={disabled}
            onToggle={onToggle}
          />
        </span>
      </div>
    </li>
  );
}
