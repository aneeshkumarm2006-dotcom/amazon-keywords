"use client";

import {
  ArrowRight,
  CornerDownLeft,
  History,
  Search as SearchIcon,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { CONTROL_BASE } from "@/components/ui/Field";
import { TONE_ICON } from "@/components/ui/tone";
import { KIND_META, KIND_ORDER, allResources, allTags } from "@/content/registry";
import {
  EMPTY_SELECTION,
  LEVEL_ORDER,
  SEARCH_SORTS,
  applyFacets,
  computeFacets,
  normaliseQuery,
  search,
  selectionCount,
  selectionIsEmpty,
  suggestResources,
  suggestTerms,
  toggleFacet,
  useRecentSearches,
  usePopularSearches,
  type FacetDimension,
  type FacetSelection,
  type SearchHit,
  type SearchSortKey,
} from "@/lib/search";
import { cn } from "@/lib/utils";
import type { Level, ResourceKind } from "@/types/content";

import { FacetPanel } from "./FacetPanel";
import { SearchHitCard } from "./SearchHitCard";

/* ------------------------------------------------------------------ *
 * Constants derived once from the registry
 * ------------------------------------------------------------------ */

const KIND_VALUES = new Set<string>(KIND_ORDER);
const LEVEL_VALUES = new Set<string>(LEVEL_ORDER);
const TAG_VALUES = new Set<string>(allTags());

const KIND_COUNTS: { kind: ResourceKind; count: number }[] = KIND_ORDER.map((kind) => ({
  kind,
  count: allResources.filter((resource) => resource.kind === kind).length,
})).filter((entry) => entry.count > 0);

const TOTAL = allResources.length;

/** How many cards to paint before the "show more" button takes over. */
const PAGE_SIZE = 40;
const DEBOUNCE_MS = 140;
/** A query the reader stops typing on is a query they meant. */
const REMEMBER_AFTER_MS = 1500;

/* ------------------------------------------------------------------ *
 * URL <-> state
 * ------------------------------------------------------------------ */

function parseList(raw: string | null, allowed: Set<string>): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((entry) => entry.trim())
        .filter((entry) => allowed.has(entry)),
    ),
  );
}

function parseSort(raw: string | null): SearchSortKey {
  return SEARCH_SORTS.some((option) => option.value === raw)
    ? (raw as SearchSortKey)
    : "relevance";
}

function toQueryString(
  query: string,
  selection: FacetSelection,
  sort: SearchSortKey,
): string {
  const params = new URLSearchParams();
  const trimmed = query.trim();
  if (trimmed) params.set("q", trimmed);
  if (selection.kinds.length > 0) params.set("kind", selection.kinds.join(","));
  if (selection.levels.length > 0) params.set("level", selection.levels.join(","));
  if (selection.tags.length > 0) params.set("tag", selection.tags.join(","));
  if (sort !== "relevance") params.set("sort", sort);
  return params.toString();
}

/* ------------------------------------------------------------------ *
 * Chips
 * ------------------------------------------------------------------ */

function QueryChip({
  label,
  onClick,
  onRemove,
  icon: Icon,
}: {
  label: string;
  onClick: () => void;
  onRemove?: () => void;
  icon?: LucideIcon;
}) {
  return (
    <span className="inline-flex items-center overflow-hidden rounded-full border border-hairline bg-surface transition-colors hover:border-hairline-strong">
      <button
        type="button"
        onClick={onClick}
        className="inline-flex min-h-9 items-center gap-1.5 pr-2.5 pl-2.5 text-[0.8125rem] text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        {Icon ? <Icon className="size-3.5 shrink-0 text-faint" aria-hidden="true" /> : null}
        {label}
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove "${label}" from recent searches`}
          className="inline-flex min-h-9 items-center border-l border-hairline px-2 text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <X className="size-3.5" aria-hidden="true" />
        </button>
      ) : null}
    </span>
  );
}

/* ------------------------------------------------------------------ *
 * The island
 * ------------------------------------------------------------------ */

export function SearchApp() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  /* ---------------------------------------------------------- URL in */

  /**
   * Static export means there is no server-side `searchParams`: the prerender
   * sees an empty `useSearchParams()` and the real values arrive on the
   * client. Each control therefore reads "what the reader chose, or failing
   * that what the URL asked for" — no effect has to copy the URL into state,
   * and the moment a control is touched it stops caring about the URL.
   */
  const params = useSearchParams();

  const urlQuery = params.get("q") ?? "";
  const urlSort = parseSort(params.get("sort"));
  const urlSelection = useMemo<FacetSelection>(
    () => ({
      kinds: parseList(params.get("kind"), KIND_VALUES) as ResourceKind[],
      levels: parseList(params.get("level"), LEVEL_VALUES) as Level[],
      tags: parseList(params.get("tag"), TAG_VALUES),
    }),
    [params],
  );

  const [typed, setTyped] = useState<string | null>(null);
  const [settled, setSettled] = useState<string | null>(null);
  const [picked, setPicked] = useState<FacetSelection | null>(null);
  const [chosenSort, setChosenSort] = useState<SearchSortKey | null>(null);
  const [active, setActive] = useState(-1);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const query = typed ?? urlQuery;
  /** What the results are actually for: the debounced query. */
  const debounced = settled ?? urlQuery;
  const selection = picked ?? urlSelection;
  const sort = chosenSort ?? urlSort;
  const touched = typed !== null || picked !== null || chosenSort !== null;

  const { recent, remember, forget, clear } = useRecentSearches();
  const popular = usePopularSearches(8);

  /* ------------------------------------------------------- autofocus */

  useEffect(() => {
    // Autofocus, but not on touch: throwing up the on-screen keyboard before
    // the reader has seen the page is hostile on a phone.
    if (window.matchMedia("(pointer: fine)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }
  }, []);

  /* -------------------------------------------------------- debounce */

  useEffect(() => {
    if (typed === null) return;
    const id = window.setTimeout(() => setSettled(typed), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [typed]);

  /* --------------------------------------------------------- URL out */

  useEffect(() => {
    // Until a control is touched the URL is the source, not the sink: writing
    // it back before then would strip anything this page does not own.
    if (!touched) return;
    const qs = toQueryString(debounced, selection, sort);
    window.history.replaceState(
      null,
      "",
      `${window.location.pathname}${qs ? `?${qs}` : ""}`,
    );
  }, [touched, debounced, selection, sort]);

  /* ------------------------------------------------------------ data */

  const queryHits = useMemo(() => search(debounced, { sort }), [debounced, sort]);
  const facets = useMemo(() => computeFacets(queryHits, selection), [queryHits, selection]);
  const hits = useMemo(() => applyFacets(queryHits, selection), [queryHits, selection]);

  /* ----------------------------------------------------- remembering */

  useEffect(() => {
    // A query is only worth remembering once the reader has stopped typing it
    // and it actually found something — a dead end should never come back as
    // a suggestion.
    const clean = normaliseQuery(debounced);
    if (clean.length < 3 || queryHits.length === 0) return;
    const id = window.setTimeout(() => remember(clean), REMEMBER_AFTER_MS);
    return () => window.clearTimeout(id);
  }, [debounced, queryHits.length, remember]);

  const trimmed = debounced.trim();
  const hasQuery = trimmed.length > 0;
  const chosen = selectionCount(selection);
  const filtered = hasQuery || chosen > 0;

  // Reset the cursor and the window whenever the result set changes. Adjusting
  // state during render is the documented way to react to a changed input.
  const signature = `${trimmed}|${sort}|${selection.kinds.join()}|${selection.levels.join()}|${selection.tags.join()}`;
  const [lastSignature, setLastSignature] = useState(signature);
  if (lastSignature !== signature) {
    setLastSignature(signature);
    setActive(-1);
    setVisibleCount(PAGE_SIZE);
  }

  const visible = useMemo(() => hits.slice(0, visibleCount), [hits, visibleCount]);

  const suggestions = useMemo(
    () => (hits.length === 0 && hasQuery ? suggestTerms(trimmed, 5) : []),
    [hits.length, hasQuery, trimmed],
  );
  const nearest = useMemo(
    () => (hits.length === 0 && hasQuery && chosen === 0 ? suggestResources(trimmed, 4) : []),
    [hits.length, hasQuery, chosen, trimmed],
  );

  /* -------------------------------------------------------- keyboard */

  useEffect(() => {
    if (active < 0) return;
    document
      .getElementById(`search-result-${active}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const openHit = useCallback(
    (hit: SearchHit) => {
      if (trimmed.length >= 2) remember(trimmed);
      router.push(hit.resource.href);
    },
    [remember, router, trimmed],
  );

  const move = useCallback(
    (delta: number) => {
      if (visible.length === 0) return;
      setActive((current) => {
        const next = current + delta;
        if (next < 0) return -1;
        return Math.min(next, visible.length - 1);
      });
    },
    [visible.length],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      if (query) {
        setTyped("");
        setSettled("");
      } else if (!selectionIsEmpty(selection)) {
        setPicked(EMPTY_SELECTION);
      } else {
        inputRef.current?.blur();
      }
    }
  };

  const onSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const target = active >= 0 ? visible[active] : visible[0];
    if (target) openHit(target);
  };

  /* --------------------------------------------------------- actions */

  const runSearch = useCallback((next: string) => {
    setTyped(next);
    setSettled(next);
    inputRef.current?.focus();
  }, []);

  const onToggleFacet = useCallback(
    (dimension: FacetDimension, value: string) => {
      setPicked((current) => toggleFacet(current ?? urlSelection, dimension, value));
    },
    [urlSelection],
  );

  const clearAll = useCallback(() => {
    setTyped("");
    setSettled("");
    setPicked(EMPTY_SELECTION);
  }, []);

  /* ----------------------------------------------------------- render */

  const showLanding = !filtered;
  const noResults = filtered && hits.length === 0;

  return (
    <div>
      {/* ------------------------------------------------------- search bar */}
      <form
        role="search"
        onSubmit={onSubmit}
        className="sticky top-16 z-20 -mx-4 mb-6 border-b border-hairline bg-canvas px-4 py-3 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8"
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex min-w-0 flex-1 items-center">
            <SearchIcon
              className="pointer-events-none absolute left-3.5 size-[1.125rem] text-faint"
              aria-hidden="true"
            />
            <label htmlFor="site-search" className="sr-only">
              Search every resource
            </label>
            <input
              id="site-search"
              ref={inputRef}
              type="search"
              value={query}
              onChange={(event) => setTyped(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder={`Search ${TOTAL} resources — ACoS, negative keywords, bid rules…`}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              aria-describedby="search-keyboard-help"
              className={cn(
                CONTROL_BASE,
                "h-12 border-hairline pl-11 text-base hover:border-hairline-strong sm:text-sm",
                "[&::-webkit-search-cancel-button]:appearance-none",
                query && "pr-11",
              )}
            />
            {query ? (
              <button
                type="button"
                onClick={() => {
                  setTyped("");
                  setSettled("");
                  inputRef.current?.focus();
                }}
                aria-label="Clear the search box"
                className="absolute right-2 inline-flex size-9 items-center justify-center rounded-md text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              aria-controls="search-facets"
              className={cn(
                "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-sm font-medium transition-colors lg:hidden",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                chosen > 0
                  ? "border-brand bg-brand-soft text-brand"
                  : "border-hairline bg-surface text-muted hover:text-ink",
              )}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              Filters
              {chosen > 0 ? <span className="tabular text-xs">{chosen}</span> : null}
            </button>

            <label htmlFor="search-sort" className="sr-only">
              Sort results
            </label>
            <select
              id="search-sort"
              value={sort}
              onChange={(event) => setChosenSort(event.target.value as SearchSortKey)}
              className={cn(
                CONTROL_BASE,
                "h-11 w-auto cursor-pointer border-hairline pr-8 text-[0.8125rem] hover:border-hairline-strong",
              )}
            >
              {SEARCH_SORTS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <p id="search-keyboard-help" className="sr-only">
          Use the up and down arrow keys to move through the results, Enter to open the
          highlighted result, and Escape to clear the search box.
        </p>
      </form>

      <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-8">
        {/* --------------------------------------------------------- facets */}
        <aside
          id="search-facets"
          className={cn(
            "mb-6 rounded-xl border border-hairline bg-surface p-3 lg:mb-0 lg:sticky lg:top-36 lg:block lg:h-fit lg:max-h-[calc(100vh-11rem)] lg:overflow-y-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:p-0",
            "scroll-well",
            filtersOpen ? "block" : "hidden",
          )}
        >
          <FacetPanel
            facets={facets}
            selection={selection}
            onToggle={onToggleFacet}
            onClear={() => setPicked(EMPTY_SELECTION)}
          />
        </aside>

        {/* -------------------------------------------------------- results */}
        <div className="min-w-0">
          {showLanding ? (
            <Landing
              popular={popular}
              recent={recent}
              onRun={runSearch}
              onForget={forget}
              onClearRecent={clear}
              onPickKind={(kind) => onToggleFacet("kinds", kind)}
            />
          ) : (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
                <p className="text-[0.8125rem] text-muted" aria-live="polite">
                  <span className="tabular font-semibold text-ink">{hits.length}</span>{" "}
                  {hits.length === 1 ? "result" : "results"}
                  {hasQuery ? (
                    <>
                      {" "}
                      for <span className="font-medium text-ink">&ldquo;{trimmed}&rdquo;</span>
                    </>
                  ) : null}
                  {chosen > 0 ? ` in ${chosen} ${chosen === 1 ? "filter" : "filters"}` : null}
                </p>
                <Button variant="ghost" size="sm" icon={X} onClick={clearAll}>
                  Reset search
                </Button>
              </div>

              {noResults ? (
                <NoResults
                  query={trimmed}
                  hasFilters={chosen > 0}
                  filtersHid={queryHits.length > 0}
                  suggestions={suggestions}
                  nearest={nearest}
                  popular={popular}
                  onRun={runSearch}
                  onClearFilters={() => setPicked(EMPTY_SELECTION)}
                  onClearAll={clearAll}
                />
              ) : (
                <>
                  <ul className="flex flex-col gap-3">
                    {visible.map((hit, index) => (
                      <SearchHitCard
                        key={hit.resource.id}
                        hit={hit}
                        index={index}
                        active={index === active}
                        showScore={hasQuery}
                        onActivate={setActive}
                        onOpen={openHit}
                      />
                    ))}
                  </ul>

                  {hits.length > visible.length ? (
                    <div className="mt-6 flex justify-center">
                      <Button
                        variant="secondary"
                        onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
                      >
                        Show {Math.min(PAGE_SIZE, hits.length - visible.length)} more of{" "}
                        {hits.length}
                      </Button>
                    </div>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Landing — nothing typed, nothing filtered
 * ------------------------------------------------------------------ */

function Landing({
  popular,
  recent,
  onRun,
  onForget,
  onClearRecent,
  onPickKind,
}: {
  popular: string[];
  recent: string[];
  onRun: (query: string) => void;
  onForget: (query: string) => void;
  onClearRecent: () => void;
  onPickKind: (kind: ResourceKind) => void;
}) {
  return (
    <div className="flex flex-col gap-8">
      {recent.length > 0 ? (
        <section aria-labelledby="search-recent">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h2
              id="search-recent"
              className="flex items-center gap-2 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase"
            >
              <History className="size-3.5" aria-hidden="true" />
              Recent searches
            </h2>
            <button
              type="button"
              onClick={onClearRecent}
              className="inline-flex min-h-8 items-center rounded-md px-1.5 text-xs font-medium text-brand transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              Clear history
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recent.map((entry) => (
              <QueryChip
                key={entry}
                label={entry}
                icon={History}
                onClick={() => onRun(entry)}
                onRemove={() => onForget(entry)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <section aria-labelledby="search-popular">
        <h2
          id="search-popular"
          className="mb-3 flex items-center gap-2 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase"
        >
          <TrendingUp className="size-3.5" aria-hidden="true" />
          Popular searches
        </h2>
        <div className="flex flex-wrap gap-2">
          {popular.map((entry) => (
            <QueryChip key={entry} label={entry} icon={Sparkles} onClick={() => onRun(entry)} />
          ))}
        </div>
      </section>

      <section aria-labelledby="search-browse">
        <h2
          id="search-browse"
          className="mb-3 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase"
        >
          Browse by type
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {KIND_COUNTS.map(({ kind, count }) => {
            const meta = KIND_META[kind];
            const Icon = meta.icon;
            return (
              <li key={kind} className="flex">
                <div className="group flex w-full flex-col gap-2 rounded-xl border border-hairline bg-surface p-4 transition-[border-color,box-shadow] hover:border-hairline-strong hover:shadow-card">
                  <div className="flex items-start gap-3">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-surface-2">
                      <Icon
                        className={cn("size-4", TONE_ICON[meta.accent])}
                        aria-hidden="true"
                      />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-[0.875rem] leading-snug font-semibold text-ink">
                        {meta.plural}
                      </p>
                      <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted">
                        {meta.description}
                      </p>
                    </div>
                    <span className="tabular shrink-0 text-xs text-faint">{count}</span>
                  </div>

                  <div className="mt-auto flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onPickKind(kind)}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 text-xs font-medium text-ink transition-colors hover:border-hairline-strong hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      Filter to {meta.plural}
                    </button>
                    <Link
                      href={meta.href}
                      className="inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-xs font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                    >
                      Open index
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Link>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Zero results
 * ------------------------------------------------------------------ */

function NoResults({
  query,
  hasFilters,
  filtersHid,
  suggestions,
  nearest,
  popular,
  onRun,
  onClearFilters,
  onClearAll,
}: {
  query: string;
  hasFilters: boolean;
  /** True when the query did find things and the facets are what emptied it. */
  filtersHid: boolean;
  suggestions: string[];
  nearest: ReturnType<typeof suggestResources>;
  popular: string[];
  onRun: (query: string) => void;
  onClearFilters: () => void;
  onClearAll: () => void;
}) {
  const blamesFilters = hasFilters && filtersHid;
  /** Not even a near miss — fall back to searches that are known to land. */
  const nothingClose = !blamesFilters && suggestions.length === 0 && nearest.length === 0;

  return (
    <div className="rounded-xl border border-dashed border-hairline-strong bg-surface p-6 sm:p-8">
      <h2 className="font-display text-lg font-semibold text-ink">
        {blamesFilters
          ? "Those filters rule out every match"
          : query
            ? `Nothing matches “${query}”`
            : "Nothing matches those filters"}
      </h2>
      <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
        {blamesFilters
          ? "The search found results, but none of them survive the type, level and tag filters you have on. Drop a filter to see them."
          : nothingClose
            ? "Spelling is matched loosely, so nothing in the library is even close to that. These searches all return something:"
            : "Every word is matched fuzzily, so this is usually a spelling the library does not use. Try one of the terms below — each one is taken from a real resource title or tag."}
      </p>

      {nothingClose ? (
        <div className="mt-5 flex flex-wrap gap-2">
          {popular.map((entry) => (
            <QueryChip key={entry} label={entry} icon={Sparkles} onClick={() => onRun(entry)} />
          ))}
        </div>
      ) : null}

      {blamesFilters ? (
        <div className="mt-5 flex flex-wrap gap-2">
          <Button variant="primary" size="sm" onClick={onClearFilters}>
            Clear the filters
          </Button>
          <Button variant="secondary" size="sm" onClick={onClearAll}>
            Reset everything
          </Button>
        </div>
      ) : null}

      {!blamesFilters && suggestions.length > 0 ? (
        <div className="mt-5">
          <p className="mb-2 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase">
            Did you mean
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((term) => (
              <QueryChip key={term} label={term} icon={SearchIcon} onClick={() => onRun(term)} />
            ))}
          </div>
        </div>
      ) : null}

      {!blamesFilters && nearest.length > 0 ? (
        <div className="mt-6 border-t border-hairline pt-5">
          <p className="mb-2 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase">
            Closest resources
          </p>
          <ul className="divide-y divide-hairline overflow-hidden rounded-lg border border-hairline">
            {nearest.map((resource) => {
              const meta = KIND_META[resource.kind];
              const Icon = meta.icon;
              return (
                <li key={resource.id}>
                  <Link
                    href={resource.href}
                    className="flex items-start gap-3 bg-surface p-3 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                  >
                    <Icon
                      className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[meta.accent])}
                      aria-hidden="true"
                    />
                    <span className="min-w-0">
                      <span className="block text-[0.8125rem] font-medium text-ink">
                        {resource.title}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-xs text-muted">
                        {resource.summary}
                      </span>
                    </span>
                    <CornerDownLeft
                      className="ml-auto size-3.5 shrink-0 text-faint"
                      aria-hidden="true"
                    />
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ) : null}

      {!blamesFilters ? (
        <div className="mt-6 flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={onClearAll}>
            Clear the search
          </Button>
        </div>
      ) : null}
    </div>
  );
}
