"use client";

import { ArrowLeft } from "lucide-react";
import { useCallback, useMemo, useRef, type ReactNode } from "react";

import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import { todayIso, type Store } from "@/lib/ppc";

import { ConsoleEmpty } from "../ConsoleEmpty";
import { dateSpan } from "../format";
import { ALL_STORES, useActiveScope, useBulk, useDecisions, useRecommendations, useScopedRows, useSettings } from "../hooks";
import { StorePicker } from "../keywords/StorePicker";
import { StoreDot } from "../StoreDot";
import { TEXT_LINK } from "../overview/shared";
import { storeCalcInputs } from "../work/calculator";
import { decisionMap, statusOf } from "../work/decisions";
import { measure } from "../work/measure";
import { buildPriorIndex } from "../work/model";
import { buildTargetRows } from "../work/targets";
import { BidCalculatorPanel } from "./BidCalculatorPanel";
import { EconomicsCard } from "./EconomicsCard";
import { TargetTable } from "./TargetTable";

/**
 * `/dashboard/bids` — store economics, the Bid-Calculator workbook, and the
 * bid maths for every target in the store (not only the flagged ones).
 * All-stores scope shows the calculator with the workbook example and a
 * store picker.
 */
export function BidsConsole() {
  const { scope, ready, setScope, stores, activeStore } = useActiveScope();
  const { settings } = useSettings();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const switchScope = useCallback(
    (next: string) => {
      setScope(next);
      requestAnimationFrame(() => titleRef.current?.focus());
    },
    [setScope],
  );

  const title = (
    <h1 ref={titleRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink focus:outline-none sm:text-[1.75rem]">
      Bids
    </h1>
  );

  if (!ready) return <BidsFallback />;
  if (!stores.length) {
    return (
      <>
        <div className="mb-6">{title}</div>
        <ConsoleEmpty reason="no-stores" />
      </>
    );
  }
  if (scope === ALL_STORES || !activeStore) {
    return (
      <>
        <div className="mb-6 max-w-3xl">
          {title}
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Work out what a click is worth. The calculator below runs on the workbook example; pick a store to fill it with that store&apos;s own
            numbers and see the bid maths for every keyword and product target.
          </p>
        </div>
        <div className="space-y-5">
          <BidCalculatorPanel currency={settings.baseCurrency} />
          <StorePicker
            stores={stores}
            onPick={switchScope}
            variant="economics"
            title="Choose a store"
            description="Economics, the calculator with the store's own numbers, and every target's bid."
          />
        </div>
      </>
    );
  }
  return <StoreBids key={activeStore.id} store={activeStore} storeCount={stores.length} onAllStores={() => switchScope(ALL_STORES)} title={title} />;
}

function StoreBids({ store, storeCount, onAllStores, title }: { store: Store; storeCount: number; onAllStores: () => void; title: ReactNode }) {
  const recsQ = useRecommendations(store.id);
  const rowsQ = useScopedRows(store.id);
  const bulkQ = useBulk(store.id);
  const decisionsQ = useDecisions(store.id);
  const win = recsQ.window;
  const priors = useMemo(() => (win.from && rowsQ.rows.length ? measure("priors", () => buildPriorIndex(rowsQ.rows, win, store.id)) : null), [rowsQ.rows, win, store.id]);
  const targetRows = useMemo(
    () => (priors ? measure("target-rows", () => buildTargetRows({ store, rows: rowsQ.rows, bulk: bulkQ.bulk, window: win, recs: recsQ.recommendations, priors })) : []),
    [priors, store, rowsQ.rows, bulkQ.bulk, win, recsQ.recommendations],
  );
  const mine = useMemo(() => {
    if (!win.from) return undefined;
    const m = storeCalcInputs(rowsQ.rows, win, store.id);
    return { targetAcos: store.economics.targetAcos, aov: m.aov, cvr: m.cvr, currentCpc: m.cpc, clicks: m.clicks, orders: m.orders, windowLabel: dateSpan(win.from, win.to) };
  }, [rowsQ.rows, win, store]);
  const decidedRecIds = useMemo(() => {
    const dm = decisionMap(decisionsQ.decisions, recsQ.recommendations);
    const day = todayIso();
    return new Set(recsQ.recommendations.filter((r) => statusOf(dm.get(r.id), day) !== "open").map((r) => r.id));
  }, [decisionsQ.decisions, recsQ.recommendations]);
  const loading = recsQ.loading || rowsQ.loading || bulkQ.loading;

  return (
    <>
      <div className="mb-6 max-w-3xl">
        {title}
        <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-muted">
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
        <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
          Set what a sale may cost, work out what a click is worth, then check every keyword&apos;s bid against it.
        </p>
      </div>

      <div className="space-y-5">
        <EconomicsCard store={store} />
        {loading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : (
          <BidCalculatorPanel currency={store.currency} multipliers={store.rules.matchMultipliers} mine={mine} />
        )}
        {loading ? (
          <Skeleton className="h-96 w-full rounded-xl" />
        ) : recsQ.error || rowsQ.error ? (
          <Callout variant="danger" title="Could not load this store's data">
            <p>{recsQ.error ?? rowsQ.error}</p>
          </Callout>
        ) : !win.from ? (
          <ConsoleEmpty reason="no-rows" description={`${store.name} has no search term data yet, so there are no targets to show. Import a Search Term Report for it.`} />
        ) : (
          <TargetTable store={store} rows={targetRows} window={win} decidedRecIds={decidedRecIds} />
        )}
      </div>
    </>
  );
}

export function BidsFallback() {
  return (
    <div aria-hidden="true" className="space-y-5">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-96 w-full rounded-xl" />
    </div>
  );
}
