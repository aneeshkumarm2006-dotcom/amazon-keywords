"use client";

import { useMemo, useState } from "react";

import { MetricChip } from "@/components/ui/Badge";
import { TBody, TD, THead, THRow, TR, Table } from "@/components/ui/Table";
import { acos as acosOf, cpc as cpcOf, cvr as cvrOf, roas as roasOf, type Counters, type Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, pct } from "../format";
import { seriesBg } from "../markets";
import { StoreDot } from "../StoreDot";
import { acosTone, compareValues, pointsDelta, relativeDelta, type MetricDelta, type PeriodResult, type SortDir } from "./compute";
import { DeltaText, FLUSH_TABLE, Panel, ScopeLink, SortHeader, TEXT_LINK, nextSort, ratioX, tableMoney, useOverview } from "./shared";

type Col = "name" | "spend" | "sales" | "acos" | "roas" | "orders" | "cvr" | "cpc" | "share" | "dSpend" | "dAcos" | "recs";

interface Row {
  store: Store;
  /** Display currency, or the store's own when it has no FX rate (`converted` false). */
  converted: boolean;
  cur: Counters;
  spend: number;
  sales: number;
  nativeSpend: number;
  acos: number;
  roas: number;
  orders: number;
  cvr: number;
  cpc: number;
  share: number;
  dSpend: MetricDelta | null;
  dAcos: MetricDelta | null;
  recs?: { total: number; high: number };
}

export interface StoreTableProps {
  period: PeriodResult;
  recCounts: Map<string, { total: number; high: number }>;
  recsLoading: boolean;
}

const TEXT_COLS: Col[] = ["name"];

/**
 * All-stores comparison: one row per store for the period, in the base
 * currency so columns compare. Store names switch the overview to that
 * store; the recommendation count opens Keywords on that store.
 */
export function StoreTable({ period, recCounts, recsLoading }: StoreTableProps) {
  const { switchScope } = useOverview();
  const [sort, setSort] = useState<{ key: Col; dir: SortDir }>({ key: "spend", dir: "desc" });
  const currency = period.currency;

  const rows: Row[] = useMemo(() => {
    const totalSpend = period.total.cur.spend;
    return period.stores.map((sp) => {
      const converted = Number.isFinite(sp.rate);
      const r = converted ? sp.rate : 1;
      const cur = sp.cur;
      return {
        store: sp.store,
        converted,
        cur,
        spend: cur.spend * r,
        sales: cur.sales * r,
        nativeSpend: cur.spend,
        acos: acosOf(cur),
        roas: roasOf(cur),
        orders: cur.orders,
        cvr: cvrOf(cur),
        cpc: cpcOf(cur) * r,
        share: converted && totalSpend > 0 ? (cur.spend * r) / totalSpend : NaN,
        dSpend: sp.prevCovered ? relativeDelta(cur.spend, sp.prev.spend, "neutral") : null,
        dAcos: pointsDelta(acosOf(cur), acosOf(sp.prev), "down"),
        recs: recCounts.get(sp.store.id),
      };
    });
  }, [period, recCounts]);

  const sorted = useMemo(() => {
    const value = (r: Row): number | string | undefined => {
      switch (sort.key) {
        case "name":
          return r.store.name.toLowerCase();
        case "dSpend":
          return r.dSpend?.value;
        case "dAcos":
          return r.dAcos?.value;
        case "recs":
          return recsLoading ? undefined : (r.recs?.total ?? 0);
        case "spend":
        case "sales":
        case "cpc":
          return r.converted ? r[sort.key] : undefined;
        default:
          return r[sort.key];
      }
    };
    return [...rows].sort((a, b) => compareValues(value(a), value(b), sort.dir) || a.store.name.localeCompare(b.store.name));
  }, [rows, sort, recsLoading]);

  const onSort = (column: Col) => setSort((cur) => nextSort(cur, column, TEXT_COLS));
  const head = (label: string, column: Col, numeric = true, srExtra?: string) => (
    <SortHeader label={label} column={column} sortKey={sort.key} dir={sort.dir} onSort={onSort} numeric={numeric} srExtra={srExtra} />
  );

  const total = period.total.cur;
  const totalRecs = [...recCounts.values()].reduce((a, c) => ({ total: a.total + c.total, high: a.high + c.high }), { total: 0, high: 0 });

  return (
    <Panel
      title="Stores side by side"
      description={
        <p>
          Last {period.days} days, money in {currency}. Change columns compare with the previous {period.days} days. Select a store name to
          open it.
        </p>
      }
    >
      <Table caption={`Store comparison, last ${period.days} days, in ${currency}`} wrapperClassName={FLUSH_TABLE} stickyFirstColumn>
        <THead>
          <tr>
            {head("Store", "name", false)}
            {head("Spend", "spend", true, currency)}
            {head("Sales", "sales", true, currency)}
            {head("ACoS", "acos")}
            {head("ROAS", "roas")}
            {head("Orders", "orders")}
            {head("CVR", "cvr")}
            {head("CPC", "cpc", true, currency)}
            {head("Share", "share")}
            {head("Δ Spend", "dSpend")}
            {head("Δ ACoS", "dAcos")}
            {head("Open recs", "recs")}
          </tr>
        </THead>
        <TBody>
          {sorted.map((r) => {
            const { store } = r;
            const tone = acosTone(r.acos, store.economics.targetAcos, store.economics.breakEvenAcos, r.cur.spend);
            const money = (v: number) => (r.converted ? tableMoney(v, currency) : tableMoney(v, store.currency));
            return (
              <TR key={store.id}>
                <THRow className="max-w-[15rem] min-w-[10rem] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => switchScope(store.id)}
                    className="-mx-1 flex min-h-9 w-full min-w-0 items-center gap-2 rounded-md px-1 text-left font-medium text-ink transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
                  >
                    <StoreDot colorIndex={store.colorIndex} />
                    <span className="min-w-0">
                      <span className="line-clamp-2 [overflow-wrap:anywhere]" title={store.name}>
                        {store.name}
                      </span>
                      <span className="block text-[0.6875rem] font-normal text-muted">
                        {store.marketplace} · {store.currency}
                      </span>
                    </span>
                    <span className="sr-only">: show this store only</span>
                  </button>
                </THRow>
                <TD numeric mono className="px-2.5 whitespace-nowrap">
                  {money(r.spend)}
                  {!r.converted ? <span className="block text-[0.6875rem] text-warn">no FX rate</span> : null}
                  {r.converted && store.currency.toUpperCase() !== currency.toUpperCase() ? (
                    <span className="block text-[0.6875rem] text-faint">{tableMoney(r.nativeSpend, store.currency)}</span>
                  ) : null}
                </TD>
                <TD numeric mono className="px-2.5 whitespace-nowrap">
                  {money(r.sales)}
                </TD>
                <TD numeric className="px-2.5 whitespace-nowrap">
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <MetricChip value={pct(r.acos)} tone={tone} />
                    <span className="tabular text-[0.6875rem] text-faint">target {pct(store.economics.targetAcos, 0)}</span>
                  </span>
                </TD>
                <TD numeric mono className="px-2.5">
                  {ratioX(r.roas)}
                </TD>
                <TD numeric mono className="px-2.5">
                  {count(r.orders)}
                </TD>
                <TD numeric mono className="px-2.5">
                  {pct(r.cvr)}
                </TD>
                <TD numeric mono className="px-2.5 whitespace-nowrap">
                  {money(r.cpc)}
                </TD>
                <TD numeric className="px-2.5">
                  <ShareBar share={r.share} colorIndex={store.colorIndex} />
                </TD>
                <TD numeric className="px-2.5">
                  <DeltaText delta={r.dSpend} empty={period.prevHasData ? "partial" : "—"} />
                </TD>
                <TD numeric className="px-2.5">
                  <DeltaText delta={r.dAcos} />
                </TD>
                <TD numeric className="px-2.5 whitespace-nowrap">
                  <RecCell loading={recsLoading} counts={r.recs} storeId={store.id} storeName={store.name} />
                </TD>
              </TR>
            );
          })}
        </TBody>
        {period.stores.length > 1 ? (
          <tfoot className="border-t border-hairline">
            <TR className="bg-surface-2/50 font-semibold">
              <THRow className="px-2.5">
                Total <span className="text-[0.6875rem] font-normal text-muted">{currency}</span>
              </THRow>
              <TD numeric mono className="px-2.5 whitespace-nowrap font-semibold">
                {tableMoney(total.spend, currency)}
              </TD>
              <TD numeric mono className="px-2.5 whitespace-nowrap font-semibold">
                {tableMoney(total.sales, currency)}
              </TD>
              <TD numeric className="px-2.5 whitespace-nowrap">
                <span className="inline-flex flex-col items-end gap-0.5">
                  <MetricChip
                    value={pct(acosOf(total))}
                    tone={acosTone(acosOf(total), period.target.acos, period.target.breakEven, total.spend)}
                  />
                  <span className="tabular text-[0.6875rem] font-normal text-faint">target {pct(period.target.acos, 0)}</span>
                </span>
              </TD>
              <TD numeric mono className="px-2.5 font-semibold">
                {ratioX(roasOf(total))}
              </TD>
              <TD numeric mono className="px-2.5 font-semibold">
                {count(total.orders)}
              </TD>
              <TD numeric mono className="px-2.5 font-semibold">
                {pct(cvrOf(total))}
              </TD>
              <TD numeric mono className="px-2.5 whitespace-nowrap font-semibold">
                {tableMoney(cpcOf(total), currency)}
              </TD>
              <TD numeric mono className="px-2.5 text-muted">
                100%
              </TD>
              <TD numeric className="px-2.5">
                <DeltaText
                  delta={period.prevCovered ? relativeDelta(total.spend, period.total.prev.spend, "neutral") : null}
                  empty={period.prevHasData ? "partial" : "—"}
                />
              </TD>
              <TD numeric className="px-2.5">
                <DeltaText delta={pointsDelta(acosOf(total), acosOf(period.total.prev), "down")} />
              </TD>
              <TD numeric className="px-2.5 whitespace-nowrap">
                {recsLoading ? <span className="text-faint">…</span> : <span className="tabular">{count(totalRecs.total)}</span>}
              </TD>
            </TR>
          </tfoot>
        ) : null}
      </Table>
      {period.stores.some((s) => s.cur.spend === 0 && s.prev.spend === 0) ? (
        <p className="border-t border-hairline px-4 py-2.5 text-xs text-muted sm:px-5">
          Stores with no rows in either period show zeros; import their reports to fill them in.
        </p>
      ) : null}
    </Panel>
  );
}

function ShareBar({ share, colorIndex }: { share: number; colorIndex: number }) {
  if (!Number.isFinite(share)) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center justify-end gap-2">
      <span aria-hidden="true" className="relative h-1.5 w-12 overflow-hidden rounded-full bg-surface-2">
        <span
          className={cn("absolute inset-y-0 left-0 rounded-full", seriesBg(colorIndex))}
          style={{ width: `${Math.max(2, Math.min(100, share * 100))}%` }}
        />
      </span>
      <span className="tabular w-9 text-right text-[0.8125rem] text-ink">{pct(share, 0)}</span>
    </span>
  );
}

function RecCell({
  loading,
  counts,
  storeId,
  storeName,
}: {
  loading: boolean;
  counts?: { total: number; high: number };
  storeId: string;
  storeName: string;
}) {
  if (loading) return <span className="text-faint">…</span>;
  if (!counts?.total) return <span className="text-faint">0</span>;
  return (
    <ScopeLink
      href="/dashboard/keywords"
      storeId={storeId}
      className={cn(TEXT_LINK, "inline-flex min-h-8 flex-col items-end justify-center leading-tight tabular [@media(pointer:coarse)]:min-h-11")}
      aria-label={`${counts.total} open recommendations for ${storeName}${counts.high ? `, ${counts.high} high priority` : ""}: review in Keywords`}
    >
      <span>{count(counts.total)}</span>
      {counts.high ? <span className="text-[0.6875rem] font-normal text-muted">{count(counts.high)} high</span> : null}
    </ScopeLink>
  );
}
