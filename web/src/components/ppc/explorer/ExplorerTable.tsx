"use client";

import { ArrowRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Fragment, memo, useMemo, type MouseEvent, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { TBody, TD, THead, TR, Table } from "@/components/ui/Table";
import type { Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, dateSpan, money, pct, plural } from "../format";
import { AcosText, Jargon } from "../keywords/common";
import { SortHeader } from "../overview/shared";
import type { SortDir } from "../overview/compute";
import { Sparkline } from "../overview/Sparkline";
import { StoreDot } from "../StoreDot";
import {
  entityDetail,
  matchLabel,
  type ExplorerIndex,
  type ExplorerMode,
  type ExplorerPeriod,
  type ExplorerRow,
  type ExplorerSortKey,
  type AggregateOptions,
} from "../work/explorer";
import { ACTION_LABEL, ACTION_TONE } from "../work/recs";

export interface ExplorerTableProps {
  rows: ExplorerRow[];
  mode: ExplorerMode;
  showStore: boolean;
  storesById: Map<string, Store>;
  sort: { key: ExplorerSortKey; dir: SortDir };
  onSort: (key: ExplorerSortKey) => void;
  expanded: string | null;
  onToggle: (key: string) => void;
  index: ExplorerIndex;
  period: ExplorerPeriod;
  rowFilters: Pick<AggregateOptions, "campaign" | "adGroup" | "matchType">;
  /** Switch scope before following an "engine says" link (All-stores scope). */
  onOpenRec: (storeId: string) => void;
  caption: string;
}

export function ExplorerTable({
  rows,
  mode,
  showStore,
  storesById,
  sort,
  onSort,
  expanded,
  onToggle,
  index,
  period,
  rowFilters,
  onOpenRec,
  caption,
}: ExplorerTableProps) {
  const cols = showStore ? 14 : 13;
  const head = (label: string, column: ExplorerSortKey, numeric?: boolean, extra?: string) => (
    <SortHeader label={label} column={column} sortKey={sort.key} dir={sort.dir} onSort={onSort} numeric={numeric} srExtra={extra} className="sticky top-0 z-10 bg-surface-2" />
  );
  return (
    <Table
      caption={caption}
      wrapperClassName="relative max-h-[min(72vh,52rem)] overflow-y-auto rounded-none border-0 bg-transparent"
      className="text-sm"
    >
      <THead>
        <tr>
          <th scope="col" className="sticky top-0 z-10 w-10 border-b border-hairline bg-surface-2 px-2">
            <span className="sr-only">Details</span>
          </th>
          {head(mode === "target" ? "Target · engine says" : "Search term · engine says", "label")}
          {showStore ? head("Store", "store") : null}
          {head("Campaign / ad group", "campaign")}
          {head("Match", "match")}
          {head("Impr.", "impressions", true)}
          {head("Clicks", "clicks", true)}
          {head("CTR", "ctr", true)}
          {head("Spend", "spend", true)}
          {head("CPC", "cpc", true)}
          {head("Orders", "orders", true)}
          {head("Sales", "sales", true)}
          {head("ACoS", "acos", true)}
          {head("CVR", "cvr", true)}
        </tr>
      </THead>
      <TBody>
        {rows.map((r) => (
          <Row
            key={r.key}
            row={r}
            mode={mode}
            showStore={showStore}
            store={storesById.get(r.storeId)}
            expanded={expanded === r.key}
            onToggle={onToggle}
            onOpenRec={onOpenRec}
            cols={cols}
            index={index}
            period={period}
            rowFilters={rowFilters}
          />
        ))}
      </TBody>
    </Table>
  );
}

interface RowProps {
  row: ExplorerRow;
  mode: ExplorerMode;
  showStore: boolean;
  store?: Store;
  expanded: boolean;
  onToggle: (key: string) => void;
  onOpenRec: (storeId: string) => void;
  cols: number;
  index: ExplorerIndex;
  period: ExplorerPeriod;
  rowFilters: Pick<AggregateOptions, "campaign" | "adGroup" | "matchType">;
}

const Row = memo(function Row({ row: r, mode, showStore, store, expanded, onToggle, onOpenRec, cols, index, period, rowFilters }: RowProps) {
  const detailId = `x-${r.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  const onRowClick = (e: MouseEvent<HTMLTableRowElement>) => {
    const t = e.target as HTMLElement;
    if (t.closest("a,button,input,select")) return;
    onToggle(r.key);
  };
  const c = r.counters;
  const label = r.asin ? r.label.toUpperCase() : r.label;
  return (
    <Fragment>
      <TR onClick={onRowClick} className={cn("cursor-pointer", expanded && "bg-surface-2/60")}>
        <TD className="px-2 py-2">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => onToggle(r.key)}
            className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand [@media(pointer:coarse)]:size-11"
          >
            <ChevronRight className={cn("size-4 transition-transform motion-reduce:transition-none", expanded && "rotate-90")} aria-hidden="true" />
            <span className="sr-only">Daily detail for {label}</span>
          </button>
        </TD>
        <TD className="max-w-[16rem] px-2.5 py-2">
          <span className="block font-medium break-words text-ink">{label}</span>
          {r.rec ? (
            <Link
              href={`/dashboard/keywords?view=${r.rec.view}&q=${encodeURIComponent(r.rec.subject)}`}
              onClick={() => onOpenRec(r.storeId)}
              className="mt-1 inline-flex max-w-full items-center rounded-full focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
              title="The engine has an open recommendation for this — open it in Keywords"
            >
              <span className="sr-only">Engine says: </span>
              <Badge tone={ACTION_TONE[r.rec.action]} size="sm" variant={r.rec.priority === "high" ? "solid" : "soft"}>
                {ACTION_LABEL[r.rec.action]}
              </Badge>
              <span className="sr-only"> — open in Keywords</span>
            </Link>
          ) : null}
        </TD>
        {showStore ? (
          <TD className="px-2.5 py-2">
            <span className="inline-flex max-w-[9rem] items-center gap-1.5 text-xs text-muted">
              {store ? <StoreDot colorIndex={store.colorIndex} /> : null}
              <span className="truncate">{store?.name ?? r.storeId}</span>
            </span>
          </TD>
        ) : null}
        <TD className="max-w-[14rem] px-2.5 py-2">
          <span className="block truncate text-xs text-ink" title={r.campaign}>
            {r.campaign}
          </span>
          <span className="block truncate text-xs text-muted" title={r.adGroup}>
            {r.adGroup}
          </span>
        </TD>
        <TD className="px-2.5 py-2 text-xs whitespace-nowrap text-muted">{matchLabel(r.matchMask)}</TD>
        <TD numeric mono className="px-2.5 py-2">
          {count(c.impressions)}
        </TD>
        <TD numeric mono className="px-2.5 py-2">
          {count(c.clicks)}
        </TD>
        <TD numeric mono className="px-2.5 py-2">
          {pct(r.ctr, 2)}
        </TD>
        <TD numeric mono className="px-2.5 py-2 whitespace-nowrap">
          {money(r.spend, r.currency)}
        </TD>
        <TD numeric mono className="px-2.5 py-2 whitespace-nowrap">
          {money(r.cpc, r.currency)}
        </TD>
        <TD numeric mono className="px-2.5 py-2">
          {count(c.orders)}
        </TD>
        <TD numeric mono className="px-2.5 py-2 whitespace-nowrap">
          {money(r.sales, r.currency)}
        </TD>
        <TD numeric className="px-2.5 py-2">
          <AcosText acos={r.acos} target={r.targetAcos} breakEven={r.breakEvenAcos} spend={c.spend} />
        </TD>
        <TD numeric mono className="px-2.5 py-2">
          {pct(r.cvr)}
        </TD>
      </TR>
      {expanded ? (
        <tr>
          <td colSpan={cols} className="border-b border-hairline bg-canvas p-0">
            <Detail id={detailId} row={r} mode={mode} index={index} period={period} rowFilters={rowFilters} />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
});

function Detail({
  id,
  row: r,
  mode,
  index,
  period,
  rowFilters,
}: {
  id: string;
  row: ExplorerRow;
  mode: ExplorerMode;
  index: ExplorerIndex;
  period: ExplorerPeriod;
  rowFilters: Pick<AggregateOptions, "campaign" | "adGroup" | "matchType">;
}) {
  const d = useMemo(() => entityDetail(index, r, mode, period, rowFilters), [index, r, mode, period, rowFilters]);
  const rate = Number.isFinite(r.rate) ? r.rate : 1;
  const c = r.counters;
  const fig = (label: ReactNode, value: string) => (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] tracking-wide text-muted uppercase">{label}</dt>
      <dd className="tabular text-[0.8125rem] text-ink">{value}</dd>
    </div>
  );
  return (
    <div id={id} className="grid gap-5 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap gap-6">
          <div>
            <p className="text-xs font-medium text-muted">Spend per day</p>
            <Sparkline values={d.spend.map((v) => v * rate)} width={220} height={40} label="Daily spend" color="var(--series-2)" />
          </div>
          <div>
            <p className="text-xs font-medium text-muted">Orders per day</p>
            <Sparkline values={d.orders} width={220} height={40} label="Daily orders" color="var(--brand)" />
          </div>
        </div>
        <p className="text-xs text-muted">
          {dateSpan(period.from, period.to)} · clicks on {plural(d.activeDays, "day")}
          {d.firstDay ? ` · first click ${dateSpan(d.firstDay, d.firstDay)}, last ${dateSpan(d.lastDay, d.lastDay)}` : ""}
          {d.summaryRows ? ` · ${plural(d.summaryRows, "summary-report row")} not in the daily lines` : ""}
        </p>
        <dl className="grid grid-cols-3 gap-x-4 gap-y-2 sm:grid-cols-5">
          {fig("Impr.", count(c.impressions))}
          {fig("Clicks", count(c.clicks))}
          {fig("CTR", pct(r.ctr, 2))}
          {fig("Spend", money(r.spend, r.currency))}
          {fig("CPC", money(r.cpc, r.currency))}
          {fig("Orders", count(c.orders))}
          {fig("Sales", money(r.sales, r.currency))}
          {fig(<Jargon k="acos" />, pct(r.acos))}
          {fig(<Jargon k="cvr" />, pct(r.cvr))}
          {fig(<Jargon k="aov" />, money(c.orders > 0 ? r.sales / c.orders : NaN, r.currency))}
        </dl>
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-muted">
          {d.breakdownKind === "targets" ? "Came through these targets" : d.breakdownKind === "search terms" ? "Top search terms for this target" : "Where it shows up"}
          {d.breakdownTotal > d.breakdown.length ? ` (top ${d.breakdown.length} of ${count(d.breakdownTotal)})` : ""}
        </p>
        <table className="mt-1 w-full text-xs">
          <thead className="sr-only">
            <tr>
              <th scope="col">Name</th>
              <th scope="col">Clicks</th>
              <th scope="col">Spend</th>
              <th scope="col">Orders</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {d.breakdown.map((b, i) => (
              <tr key={i}>
                <td className="max-w-[16rem] py-1.5 pr-2">
                  <span className="block truncate text-ink" title={b.label}>
                    {b.label}
                  </span>
                  {b.sub ? <span className="block truncate text-muted">{b.sub}</span> : null}
                </td>
                <td className="py-1.5 pr-2 text-right tabular text-muted">{count(b.clicks)} clicks</td>
                <td className="py-1.5 pr-2 text-right tabular text-muted">{money(b.spend * rate, r.currency)}</td>
                <td className="py-1.5 text-right tabular text-muted">{count(b.orders)} orders</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.rec ? (
          <p className="mt-3 flex items-center gap-1 text-xs text-muted">
            The engine suggests <span className="font-medium text-ink">{ACTION_LABEL[r.rec.action].toLowerCase()}</span> for this
            <ArrowRight className="size-3" aria-hidden="true" /> use the badge to open it in Keywords.
          </p>
        ) : null}
      </div>
    </div>
  );
}
