"use client";

import { ArrowLeft, FileUp } from "lucide-react";
import { useCallback, useMemo, useRef, useState, type ReactNode, type Ref } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { fxRate, missingRates, type Recommendation, type Store } from "@/lib/ppc";

import { ConsoleEmpty } from "../ConsoleEmpty";
import { plural } from "../format";
import {
  ALL_STORES,
  useActiveScope,
  useAllRecommendations,
  useDecisions,
  useLiveBulk,
  useRecommendations,
  useScopedRows,
  useSettings,
} from "../hooks";
import { StoreDot } from "../StoreDot";
import { AlertsPanel } from "./AlertsPanel";
import { CampaignTable } from "./CampaignTable";
import {
  buildOverviewIndex,
  computeAlerts,
  computePeriod,
  harvestSummary,
  openRecommendations,
  recCountsByStore,
  topActions,
  type TrendMetric,
} from "./compute";
import { KpiTiles } from "./KpiTiles";
import { HarvestPanel, WastedPanel, engineWindowLabel } from "./MoneyPanels";
import { OverviewControls } from "./OverviewControls";
import { OverviewSkeleton } from "./OverviewSkeleton";
import { OverviewProvider, TEXT_LINK, type OverviewContextValue } from "./shared";
import { StoreTable } from "./StoreTable";
import { TopActions } from "./TopActions";
import { TrendPanel } from "./TrendPanel";
import { usePeriodPreference, useToday } from "./usePreferences";

const NO_RECS: Recommendation[] = [];

/**
 * Time a derived computation. Shows up as `ppc-overview:<name>` in the
 * browser's Performance panel (and `performance.getEntriesByType("measure")`);
 * only the latest measure per name is kept.
 */
function measure<T>(name: string, fn: () => T): T {
  if (typeof performance === "undefined" || typeof performance.mark !== "function") return fn();
  const label = `ppc-overview:${name}`;
  performance.mark(`${label}:start`);
  const out = fn();
  try {
    performance.clearMeasures(label);
    performance.measure(label, `${label}:start`);
    performance.clearMarks(`${label}:start`);
  } catch {
    /* measuring is best-effort */
  }
  return out;
}

/**
 * `/dashboard` — the morning view across every store: KPIs for the period
 * against the one before, the daily trend, stores (or campaigns) side by
 * side, alerts, wasted spend, harvest opportunity and the top actions.
 *
 * Data flow: rows come from `useScopedRows`; `buildOverviewIndex` interns them
 * once per row set, and `computePeriod` is a single typed-array pass per
 * period / scope / FX change. Everything else is derived from its result.
 */
export function Overview() {
  const { scope, ready, setScope, stores, activeStore } = useActiveScope();
  const { settings } = useSettings();
  const scopeKey = ready ? scope : null;
  const allScope = scope === ALL_STORES;
  const rowsQ = useScopedRows(scopeKey);
  const liveBulkQ = useLiveBulk(ready);
  const { decisions } = useDecisions(scopeKey);
  const allRecs = useAllRecommendations(ready && allScope);
  const storeRecs = useRecommendations(ready && !allScope ? scope : null);
  const [days, setDays] = usePeriodPreference();
  const [metric, setMetric] = useState<TrendMetric>("spend");
  const today = useToday();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const scopeStores: Store[] = useMemo(() => (activeStore ? [activeStore] : stores), [activeStore, stores]);
  const storesById = useMemo(() => new Map(stores.map((s) => [s.id, s])), [stores]);
  const baseCurrency = settings.baseCurrency;
  // Settings are re-saved on every scope click; key FX on its content, not its identity.
  const fxKey = JSON.stringify(settings.fxRates);
  const fx = useMemo(() => ({ baseCurrency, fxRates: JSON.parse(fxKey) as Record<string, number> }), [baseCurrency, fxKey]);

  const index = useMemo(() => measure("index", () => buildOverviewIndex(rowsQ.rows)), [rowsQ.rows]);
  const period = useMemo(
    () => measure("period", () => computePeriod(index, { days, stores: scopeStores, fx, convert: allScope })),
    [index, days, scopeStores, fx, allScope],
  );
  const missingFx = useMemo(() => (allScope ? missingRates(scopeStores, fx) : []), [allScope, scopeStores, fx]);

  const recsLoading = allScope ? allRecs.loading : storeRecs.loading;
  const recs = allScope ? allRecs.recommendations : storeRecs.recommendations;
  const open = useMemo(() => (recsLoading ? NO_RECS : openRecommendations(recs, decisions, today)), [recs, decisions, today, recsLoading]);
  const recCounts = useMemo(() => recCountsByStore(open), [open]);
  const actions = useMemo(() => topActions(open, 10), [open]);
  const openCount = useMemo(() => [...recCounts.values()].reduce((n, c) => n + c.total, 0), [recCounts]);
  const harvest = useMemo(() => {
    const rateOf = (storeId: string) => {
      if (!allScope) return 1;
      const s = storesById.get(storeId);
      return s ? fxRate(s.currency, fx) : NaN;
    };
    return harvestSummary(open, rateOf);
  }, [open, allScope, storesById, fx]);
  const engineWindow = allScope ? engineWindowLabel(allRecs.perStore.map((s) => s.window)) : engineWindowLabel([storeRecs.window]);

  const bulkStores = useMemo(() => {
    // Stores whose bulk snapshot exists — not merely a bulk import in the history: deleting the
    // current bulk file leaves older, replaced batches behind that hold nothing.
    // Until that loads (or if it fails), assume every store has one (no false alerts).
    if (liveBulkQ.loading || liveBulkQ.error) return new Set(scopeStores.map((s) => s.id));
    return new Set(liveBulkQ.live.map((l) => l.storeId));
  }, [liveBulkQ.loading, liveBulkQ.error, liveBulkQ.live, scopeStores]);
  const alerts = useMemo(
    () => measure("alerts", () => computeAlerts({ period, today: today || period.latest || "", allScope, missingFx, bulkStores })),
    [period, today, allScope, missingFx, bulkStores],
  );

  const switchScope = useCallback(
    (next: string) => {
      setScope(next);
      // The control the user pressed disappears with the old scope; land on the page title.
      requestAnimationFrame(() => titleRef.current?.focus());
    },
    [setScope],
  );
  const ctx: OverviewContextValue = useMemo(() => ({ switchScope, setScope, storesById }), [switchScope, setScope, storesById]);

  const header = (
    <OverviewHeader
      ref={titleRef}
      ready={ready}
      allScope={allScope}
      store={activeStore}
      storeCount={stores.length}
      onAllStores={() => switchScope(ALL_STORES)}
    />
  );

  if (!ready || (rowsQ.loading && !rowsQ.error)) {
    return (
      <OverviewProvider value={ctx}>
        {header}
        <OverviewSkeleton />
      </OverviewProvider>
    );
  }
  if (rowsQ.error) {
    return (
      <OverviewProvider value={ctx}>
        {header}
        <Callout variant="danger" title="Could not load search term data">
          <p>{rowsQ.error}</p>
        </Callout>
      </OverviewProvider>
    );
  }
  if (!stores.length) {
    return (
      <OverviewProvider value={ctx}>
        {header}
        <ConsoleEmpty reason="no-stores" />
      </OverviewProvider>
    );
  }
  if (!rowsQ.rows.length || !period.window) {
    return (
      <OverviewProvider value={ctx}>
        {header}
        <ConsoleEmpty
          reason="no-rows"
          description={
            allScope
              ? "None of your stores has search term data yet. Import a Search Term Report (daily, last 60 days works best), or load the demo stores to explore."
              : `${activeStore?.name ?? "This store"} has no search term data yet. Import a Search Term Report for it (daily, last 60 days works best), or switch back to All stores.`
          }
        />
      </OverviewProvider>
    );
  }

  const multi = scopeStores.length > 1;

  return (
    <OverviewProvider value={ctx}>
      {header}
      <OverviewControls
        period={period}
        days={days}
        onDaysChange={setDays}
        today={today}
        allScope={allScope}
        settings={fx}
        missingFx={missingFx}
        stores={scopeStores}
        refreshing={rowsQ.refreshing}
      />

      <KpiTiles period={period} />

      <div className="mt-5 grid gap-5 xl:grid-cols-3">
        <TrendPanel period={period} allScope={allScope} metric={metric} onMetricChange={setMetric} className="xl:col-span-2" />
        <AlertsPanel alerts={alerts} days={period.days} />
      </div>

      <div className="mt-5">
        {allScope ? (
          <StoreTable period={period} recCounts={recCounts} recsLoading={recsLoading} />
        ) : (
          <CampaignTable period={period} variant="full" />
        )}
      </div>

      {allScope ? (
        <div className="mt-5">
          <CampaignTable period={period} variant="top" />
        </div>
      ) : null}

      <div className="mt-5 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
        <TopActions recs={actions} totalOpen={openCount} loading={recsLoading} multi={multi} className="lg:col-span-2 xl:col-span-1" />
        <WastedPanel period={period} />
        <HarvestPanel summary={harvest} loading={recsLoading} currency={period.currency} multi={multi} windowLabel={engineWindow} />
      </div>
    </OverviewProvider>
  );
}

interface OverviewHeaderProps {
  ref?: Ref<HTMLHeadingElement>;
  ready: boolean;
  allScope: boolean;
  store?: Store;
  storeCount: number;
  onAllStores: () => void;
}

/** The page <h1> row. Focusable (tabIndex −1) so a scope switch can land focus on it. */
function OverviewHeader({ ref, ready, allScope, store, storeCount, onAllStores }: OverviewHeaderProps) {
  let description: ReactNode = <p>Every store&apos;s search term data on one page.</p>;
  if (ready && !allScope && store) {
    description = (
      <p className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="inline-flex items-center gap-2 font-medium text-ink">
          <StoreDot colorIndex={store.colorIndex} size="md" />
          {store.name}
        </span>
        <span className="text-faint">·</span>
        <span>
          {store.marketplace} · {store.currency}
        </span>
        {storeCount > 1 ? (
          <>
            <span className="text-faint">·</span>
            <button type="button" onClick={onAllStores} className={`${TEXT_LINK} inline-flex min-h-8 items-center gap-1 [@media(pointer:coarse)]:min-h-11`}>
              <ArrowLeft className="size-3.5" aria-hidden="true" />
              All stores
            </button>
          </>
        ) : null}
      </p>
    );
  } else if (ready && allScope && storeCount > 1) {
    description = <p>{plural(storeCount, "store")} side by side: what changed, where the money went, and what to do next.</p>;
  }
  return (
    <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 max-w-3xl">
        <h1 ref={ref} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink focus:outline-none sm:text-[1.75rem]">
          Overview
        </h1>
        <div className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{description}</div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <ButtonLink href="/dashboard/import" variant="secondary" icon={FileUp}>
          Import
        </ButtonLink>
      </div>
    </div>
  );
}
