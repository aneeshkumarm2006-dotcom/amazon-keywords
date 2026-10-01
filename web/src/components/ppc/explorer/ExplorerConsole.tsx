"use client";

import { ArrowLeft, ChevronLeft, ChevronRight, Coins, FileDown, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useDeferredValue, useEffect, useId, useMemo, useRef, useState } from "react";

import { downloadCsv } from "@/components/calc/csv";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { norm, type Recommendation, type Store } from "@/lib/ppc";
import { slugify } from "@/lib/utils";

import { ConsoleEmpty } from "../ConsoleEmpty";
import { count, dateSpan, localStamp, money, pct, plural } from "../format";
import {
  ALL_STORES,
  useActiveScope,
  useAllRecommendations,
  useDecisions,
  useRecommendations,
  useScopedRows,
  useSettings,
} from "../hooks";
import { useLocationSearch } from "../useLocationSearch";
import { StoreDot } from "../StoreDot";
import { Jargon } from "../keywords/common";
import { PERIOD_OPTIONS, type PeriodDays, type SortDir } from "../overview/compute";
import { TEXT_LINK, nextSort } from "../overview/shared";
import { usePeriodPreference, useToday } from "../overview/usePreferences";
import { decisionMap, statusOf } from "../work/decisions";
import { measure } from "../work/measure";
import {
  DEFAULT_EXPLORER_FILTER,
  EXPLORER_TEXT_COLUMNS,
  MODE_META,
  aggregateExplorer,
  applyPreset,
  buildExplorerIndex,
  explorerAdGroups,
  explorerCampaigns,
  explorerCsv,
  explorerTotals,
  filterChips,
  filterExplorer,
  removeChip,
  sortExplorer,
  type ExplorerFilter,
  type ExplorerMode,
  type ExplorerSortKey,
  type PresetId,
} from "../work/explorer";
import { ExplorerFilters, parseNumeric, textsFromFilter, type FilterTexts, type NumericKey } from "./ExplorerFilters";
import { ExplorerTable } from "./ExplorerTable";

const PERIOD_SEGMENTS = PERIOD_OPTIONS.map((d) => ({ value: String(d) as `${PeriodDays}`, label: String(d) }));
const MODE_SEGMENTS = (["term", "store-term", "target"] as ExplorerMode[]).map((m) => ({ value: m, label: MODE_META[m].label }));
const NO_RECS: Recommendation[] = [];

/**
 * `/dashboard/search-terms` — every search term (or target) in scope with
 * filters, presets, sortable columns, a daily sparkline per row and CSV export.
 * `?campaign=<name>` (from the overview) pre-filters one campaign.
 *
 * Currency: one store → its own currency. All stores → converted to the base
 * currency with the manual FX rates; a store without a rate keeps its own
 * currency (marked) and is left out of money totals.
 */
export function ExplorerConsole() {
  const params = useLocationSearch();
  const campaignParam = params.get("campaign");
  const { scope, ready, setScope, stores, activeStore } = useActiveScope();
  const { settings } = useSettings();
  const allScope = scope === ALL_STORES;
  const scopeKey = ready ? scope : null;
  const rowsQ = useScopedRows(scopeKey);
  const storeRecs = useRecommendations(ready && !allScope ? scope : null);
  const allRecs = useAllRecommendations(ready && allScope);
  const { decisions } = useDecisions(scopeKey);
  const today = useToday();
  const [days, setDays] = usePeriodPreference();
  const [mode, setMode] = useState<ExplorerMode>("term");
  const [filter, setFilter] = useState<ExplorerFilter>(() => ({ ...DEFAULT_EXPLORER_FILTER, campaign: norm(campaignParam) }));
  const [texts, setTexts] = useState<FilterTexts>(() => textsFromFilter(DEFAULT_EXPLORER_FILTER));
  const [sort, setSort] = useState<{ key: ExplorerSortKey; dir: SortDir }>({ key: "spend", dir: "desc" });
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [expanded, setExpanded] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const pageStatusRef = useRef<HTMLSpanElement>(null);
  const uid = useId();
  // The "All stores" button disappears with the store header: keep keyboard
  // focus on the page instead of dropping it to <body>.
  const switchScope = useCallback(
    (next: string) => {
      setScope(next);
      requestAnimationFrame(() => titleRef.current?.focus());
    },
    [setScope],
  );
  /** Previous / Next disable themselves on the first / last page: focus the page status then. */
  const goToPage = (next: number, edge: boolean) => {
    setPage(next);
    if (edge) requestAnimationFrame(() => pageStatusRef.current?.focus());
  };

  // A later ?campaign= deep link (same page, new query) replaces the campaign filter.
  const [seenParam, setSeenParam] = useState(campaignParam);
  if (campaignParam !== seenParam) {
    setSeenParam(campaignParam);
    setFilter((f) => ({ ...f, campaign: norm(campaignParam), adGroup: "" }));
    setPage(0);
  }

  const scopeStores: Store[] = useMemo(() => (activeStore ? [activeStore] : stores), [activeStore, stores]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s] as const)), [stores]);
  const baseCurrency = settings.baseCurrency;
  const fxKey = JSON.stringify(settings.fxRates);
  const fx = useMemo(() => ({ baseCurrency, fxRates: JSON.parse(fxKey) as Record<string, number> }), [baseCurrency, fxKey]);

  const index = useMemo(() => measure("explorer-index", () => buildExplorerIndex(rowsQ.rows)), [rowsQ.rows]);
  const recs = allScope ? allRecs.recommendations : storeRecs.recommendations;
  const openRecs = useMemo(() => {
    if (!recs.length) return NO_RECS;
    const dm = decisionMap(decisions, recs);
    const day = today || "9999-12-31";
    return recs.filter((r) => statusOf(dm.get(r.id), day) === "open");
  }, [recs, decisions, today]);

  const deferredFilter = useDeferredValue(filter);
  const rowFilters = useMemo(
    () => ({ campaign: deferredFilter.campaign, adGroup: deferredFilter.adGroup, matchType: deferredFilter.matchType }),
    [deferredFilter.campaign, deferredFilter.adGroup, deferredFilter.matchType],
  );
  const result = useMemo(
    () => measure("explorer-aggregate", () => aggregateExplorer(index, { mode, days, stores: scopeStores, fx, convert: allScope, ...rowFilters, recs: openRecs })),
    [index, mode, days, scopeStores, fx, allScope, rowFilters, openRecs],
  );
  const filtered = useMemo(() => measure("explorer-filter", () => filterExplorer(result.rows, deferredFilter)), [result.rows, deferredFilter]);
  const storeName = useCallback((id: string) => storesById.get(id)?.name ?? id, [storesById]);
  const sorted = useMemo(() => measure("explorer-sort", () => sortExplorer(filtered, sort.key, sort.dir, storeName)), [filtered, sort, storeName]);
  const totals = useMemo(() => explorerTotals(filtered), [filtered]);
  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const pageRows = useMemo(() => sorted.slice(safePage * pageSize, safePage * pageSize + pageSize), [sorted, safePage, pageSize]);

  const campaignOpts = useMemo(() => explorerCampaigns(index, scopeStores.map((s) => s.id)), [index, scopeStores]);
  const adGroupOpts = useMemo(() => (filter.campaign ? explorerAdGroups(index, filter.campaign) : []), [index, filter.campaign]);
  const currency = result.currency;
  const chips = useMemo(
    () =>
      filterChips(filter, {
        money: (n) => money(n, currency, { decimals: 0 }),
        campaignLabel: (k) => campaignOpts.find((c) => c.value === k)?.label ?? k,
        adGroupLabel: (k) => adGroupOpts.find((c) => c.value === k)?.label ?? k.split("|").pop() ?? k,
      }),
    [filter, currency, campaignOpts, adGroupOpts],
  );

  // Keep ?campaign= in step with the campaign filter so the view can be bookmarked / shared.
  // Wait for `ready`: during hydration the query reads as empty, and writing then
  // would strip an incoming ?campaign= deep link before it is applied.
  useEffect(() => {
    if (!ready) return;
    const p = new URLSearchParams(window.location.search);
    const label = filter.campaign ? (campaignOpts.find((c) => c.value === filter.campaign)?.label ?? filter.campaign) : "";
    if ((p.get("campaign") ?? "") === label || norm(p.get("campaign")) === filter.campaign) return;
    if (label) p.set("campaign", label);
    else p.delete("campaign");
    const q = p.toString();
    window.history.replaceState(null, "", q ? `?${q}` : window.location.pathname);
  }, [ready, filter.campaign, campaignOpts]);

  const update = (patch: Partial<ExplorerFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setPage(0);
  };
  const replaceAll = (next: ExplorerFilter) => {
    setFilter(next);
    setTexts(textsFromFilter(next));
    setPage(0);
  };
  const onText = (key: NumericKey, text: string) => {
    setTexts((t) => ({ ...t, [key]: text }));
    update({ [key]: parseNumeric(key, text) } as Partial<ExplorerFilter>);
  };
  const onPreset = (id: PresetId | null) => {
    replaceAll(
      id
        ? applyPreset(filter, id, activeStore?.rules)
        : { ...DEFAULT_EXPLORER_FILTER, text: filter.text, campaign: filter.campaign, adGroup: filter.adGroup, matchType: filter.matchType },
    );
  };
  const onSort = (column: ExplorerSortKey) => {
    setSort((cur) => nextSort(cur, column, EXPLORER_TEXT_COLUMNS));
    setPage(0);
  };
  const onToggle = useCallback((key: string) => setExpanded((cur) => (cur === key ? null : key)), []);
  const onOpenRec = useCallback((storeId: string) => {
    if (allScope) setScope(storeId);
  }, [allScope, setScope]);

  const exportCsv = () => {
    const name = allScope ? "all-stores" : slugify(activeStore?.name ?? "store") || "store";
    downloadCsv(`search-terms-${mode}-${name}-${localStamp()}.csv`, explorerCsv(sorted, { mode, showStore: allScope, storeName }));
  };

  const header = (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        <h1 ref={titleRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink focus:outline-none sm:text-[1.75rem]">
          Search terms
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-muted">
          {activeStore ? (
            <>
              <span className="inline-flex items-center gap-2 font-medium text-ink">
                <StoreDot colorIndex={activeStore.colorIndex} size="md" />
                {activeStore.name}
              </span>
              <span className="text-faint">·</span>
              <span>{activeStore.currency}</span>
              {stores.length > 1 ? (
                <>
                  <span className="text-faint">·</span>
                  <button type="button" onClick={() => switchScope(ALL_STORES)} className={`${TEXT_LINK} inline-flex min-h-8 items-center gap-1 [@media(pointer:coarse)]:min-h-11`}>
                    <ArrowLeft className="size-3.5" aria-hidden="true" />
                    All stores
                  </button>
                </>
              ) : null}
            </>
          ) : (
            <span>Every store, money in {baseCurrency.toUpperCase()}.</span>
          )}
        </p>
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          What shoppers actually typed, what it cost and what it sold. Filter down to winners or bleeders, open a row for its daily trend, and
          export what you see.
        </p>
      </div>
    </div>
  );

  if (!ready || (rowsQ.loading && !rowsQ.error)) {
    return (
      <>
        {header}
        <ExplorerSkeleton />
      </>
    );
  }
  if (rowsQ.error) {
    return (
      <>
        {header}
        <Callout variant="danger" title="Could not load search term data">
          <p>{rowsQ.error}</p>
        </Callout>
      </>
    );
  }
  if (!stores.length) {
    return (
      <>
        {header}
        <ConsoleEmpty reason="no-stores" />
      </>
    );
  }
  if (!rowsQ.rows.length) {
    return (
      <>
        {header}
        <ConsoleEmpty reason="no-rows" />
      </>
    );
  }

  const noun = MODE_META[mode];
  const unconvertedNames = result.unconverted.map(storeName);
  const recsLoading = allScope ? allRecs.loading : storeRecs.loading;
  const totalAcos = totals.sales > 0 ? totals.spend / totals.sales : NaN;

  return (
    <>
      {header}
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="text-[0.8125rem] font-medium text-muted" aria-hidden="true">
            Last
          </span>
          <SegmentedControl label="Period, in days" size="sm" options={PERIOD_SEGMENTS} value={String(days) as `${PeriodDays}`} onChange={(v) => { setDays(Number(v) as PeriodDays); setPage(0); }} />
          <span className="text-[0.8125rem] font-medium text-muted" aria-hidden="true">
            days
          </span>
          {result.period ? <span className="text-xs font-medium text-ink">{dateSpan(result.period.from, result.period.to)}</span> : null}
        </div>
        <div className="scroll-well max-w-full overflow-x-auto">
          <SegmentedControl
            label="Group rows by"
            size="sm"
            options={MODE_SEGMENTS}
            value={mode}
            onChange={(m) => {
              setMode(m);
              setPage(0);
              setExpanded(null);
              if (m === "target" && filter.termKind !== "all") replaceAll({ ...filter, termKind: "all" });
            }}
          />
        </div>
      </div>
      <p className="-mt-2 mb-4 text-xs text-muted">{noun.description}</p>

      {allScope ? (
        <p className="mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
          <Coins className="mt-0.5 size-3.5 shrink-0 text-faint" aria-hidden="true" />
          <span>
            Money is converted to {baseCurrency.toUpperCase()} with your manual rates.{" "}
            <Link href="/dashboard/stores#currency" className={TEXT_LINK}>
              Edit rates
            </Link>
          </span>
        </p>
      ) : null}
      {unconvertedNames.length ? (
        <p className="mb-3 flex items-start gap-1.5 text-xs leading-relaxed text-warn">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          No exchange rate for {unconvertedNames.join(", ")}: those rows show their own currency and are left out of the money totals.
        </p>
      ) : null}
      {result.summaryRows ? (
        <p className="mb-3 text-xs text-muted">
          Includes {plural(result.summaryRows, "summary-report row")}: each covers a date range and counts in full when it overlaps the period.
        </p>
      ) : null}

      <section aria-labelledby={`${uid}-h`} className="rounded-xl border border-hairline bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3 sm:px-5">
          <h2 id={`${uid}-h`} className="font-display text-[0.9375rem] font-semibold text-ink" aria-live="polite">
            {count(filtered.length)} of {count(result.rows.length)} {noun.nouns}
          </h2>
          <Button size="sm" variant="secondary" icon={FileDown} onClick={exportCsv} disabled={!sorted.length}>
            Export {count(sorted.length)} to CSV
          </Button>
        </header>

        <ExplorerFilters
          filter={filter}
          texts={texts}
          onText={onText}
          onChange={update}
          onPreset={onPreset}
          campaigns={campaignOpts}
          adGroups={adGroupOpts}
          chips={chips}
          onRemoveChip={(k) => replaceAll(removeChip(filter, k))}
          onClear={() => replaceAll(DEFAULT_EXPLORER_FILTER)}
          currency={currency}
          showTermKind={mode !== "target"}
          rules={activeStore?.rules}
        />

        <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-b border-hairline px-4 py-2.5 text-xs sm:grid-cols-4 sm:px-5 lg:grid-cols-7">
          {(
            [
              ["Clicks", count(totals.clicks)],
              ["Spend", money(totals.spend, currency, { decimals: 0 })],
              ["Orders", count(totals.orders)],
              ["Sales", money(totals.sales, currency, { decimals: 0 })],
              [<Jargon key="a" k="acos" />, pct(totalAcos)],
              [<Jargon key="c" k="cvr" />, pct(totals.clicks > 0 ? totals.orders / totals.clicks : NaN)],
              ["Engine flags", recsLoading ? "…" : count(filtered.filter((r) => r.rec).length)],
            ] as const
          ).map(([label, value], i) => (
            <div key={i} className="flex items-baseline gap-1.5">
              <dt className="text-muted">{label}</dt>
              <dd className="tabular font-medium text-ink">{value}</dd>
            </div>
          ))}
        </dl>

        {pageRows.length && result.period ? (
          <ExplorerTable
            rows={pageRows}
            mode={mode}
            showStore={allScope}
            storesById={storesById}
            sort={sort}
            onSort={onSort}
            expanded={expanded}
            onToggle={onToggle}
            index={index}
            period={result.period}
            rowFilters={rowFilters}
            onOpenRec={onOpenRec}
            caption={`${noun.label} rows, page ${safePage + 1} of ${pages}`}
          />
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="font-display text-[0.9375rem] font-semibold text-ink">No {noun.nouns} match</p>
            <p className="mt-1 text-[0.8125rem] text-muted">Loosen a filter, pick a longer period, or clear all filters.</p>
            <Button size="sm" variant="secondary" className="mt-3" onClick={() => replaceAll(DEFAULT_EXPLORER_FILTER)}>
              Clear all filters
            </Button>
          </div>
        )}

        {sorted.length > 0 ? (
          <nav aria-label="Pages" className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline px-4 py-3 sm:px-5">
            <p className="text-xs text-muted">
              {count(safePage * pageSize + 1)}–{count(Math.min(sorted.length, (safePage + 1) * pageSize))} of {count(sorted.length)}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Select
                id={`${uid}-size`}
                label="Rows per page"
                hideLabel
                value={String(pageSize)}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                options={[
                  { value: "50", label: "50 per page" },
                  { value: "100", label: "100 per page" },
                  { value: "250", label: "250 per page" },
                ]}
                fieldClassName="w-36"
              />
              <Button size="sm" variant="secondary" icon={ChevronLeft} disabled={safePage === 0} onClick={() => goToPage(safePage - 1, safePage - 1 === 0)}>
                Previous
              </Button>
              <span ref={pageStatusRef} tabIndex={-1} className="rounded text-xs text-muted tabular focus:outline-none focus-visible:outline-2 focus-visible:outline-brand" aria-live="polite">
                Page {safePage + 1} of {pages}
              </span>
              <Button
                size="sm"
                variant="secondary"
                iconAfter={ChevronRight}
                disabled={safePage >= pages - 1}
                onClick={() => goToPage(safePage + 1, safePage + 1 >= pages - 1)}
              >
                Next
              </Button>
            </div>
          </nav>
        ) : null}
      </section>
    </>
  );
}

export function ExplorerSkeleton() {
  return (
    <div aria-hidden="true" className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-9 w-72" />
      </div>
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <Skeleton className="h-10 w-full" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-9 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
