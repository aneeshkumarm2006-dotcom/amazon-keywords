"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import { useMemo, useState } from "react";

import { MetricChip } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TBody, TD, TH, THead, THRow, TR, Table } from "@/components/ui/Table";
import { acos as acosOf, cpc as cpcOf, cvr as cvrOf, roas as roasOf } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, pct } from "../format";
import { seriesVar } from "../markets";
import { StoreDot } from "../StoreDot";
import {
  acosTone,
  campaignHref,
  compareValues,
  pointsDelta,
  relativeDelta,
  type CampaignPeriod,
  type MetricDelta,
  type PeriodResult,
  type SortDir,
} from "./compute";
import { Sparkline } from "./Sparkline";
import { DeltaText, FLUSH_TABLE, Panel, ScopeLink, SortHeader, TEXT_LINK, nextSort, ratioX, tableMoney, useOverview } from "./shared";

type Col = "name" | "store" | "spend" | "sales" | "acos" | "roas" | "orders" | "cvr" | "cpc" | "share" | "dSpend" | "dAcos";

interface Row {
  c: CampaignPeriod;
  storeName: string;
  colorIndex: number;
  currency: string;
  spend: number;
  sales: number;
  acos: number;
  roas: number;
  orders: number;
  cvr: number;
  cpc: number;
  share: number;
  dSpend: MetricDelta | null;
  dAcos: MetricDelta | null;
  target: number;
  breakEven: number;
}

export interface CampaignTableProps {
  period: PeriodResult;
  /**
   * "top": the ten biggest spenders across the scope, with a store column
   * (All scope). "full": every campaign of one store, sortable, with a
   * "show all" toggle past `initialRows`.
   */
  variant: "top" | "full";
  className?: string;
  initialRows?: number;
}

const TEXT_COLS: Col[] = ["name", "store"];

/** What the chip colour means, for screen readers (the target is printed under it). */
const ACOS_VERDICT: Record<ReturnType<typeof acosTone>, string> = {
  good: "at or under target",
  warn: "over target, under break-even",
  bad: "over break-even",
  neutral: "",
};

export function CampaignTable({ period, variant, className, initialRows = 12 }: CampaignTableProps) {
  const { storesById } = useOverview();
  const [sort, setSort] = useState<{ key: Col; dir: SortDir }>({ key: "spend", dir: "desc" });
  const [expanded, setExpanded] = useState(false);
  const full = variant === "full";
  const showStore = !full && period.stores.length > 1;

  const rows: Row[] = useMemo(() => {
    const coveredByStore = new Map(period.stores.map((s) => [s.store.id, s.prevCovered]));
    const storeSpend = new Map(period.stores.map((s) => [s.store.id, s.cur.spend]));
    const list =
      variant === "top" ? period.campaigns.filter((c) => Number.isFinite(c.rate) && c.cur.spend > 0).slice(0, 10) : period.campaigns;
    return list.map((c) => {
      const store = storesById.get(c.storeId);
      const r = Number.isFinite(c.rate) ? c.rate : 1;
      const ss = storeSpend.get(c.storeId) ?? 0;
      return {
        c,
        storeName: store?.name ?? c.storeId,
        colorIndex: store?.colorIndex ?? 0,
        currency: Number.isFinite(c.rate) ? period.currency : (store?.currency ?? period.currency),
        spend: c.cur.spend * r,
        sales: c.cur.sales * r,
        acos: acosOf(c.cur),
        roas: roasOf(c.cur),
        orders: c.cur.orders,
        cvr: cvrOf(c.cur),
        cpc: cpcOf(c.cur) * r,
        share: ss > 0 ? c.cur.spend / ss : NaN,
        dSpend: coveredByStore.get(c.storeId) ? relativeDelta(c.cur.spend, c.prev.spend, "neutral") : null,
        dAcos: pointsDelta(acosOf(c.cur), acosOf(c.prev), "down"),
        target: store?.economics.targetAcos ?? NaN,
        breakEven: store?.economics.breakEvenAcos ?? NaN,
      };
    });
  }, [period, variant, storesById]);

  const sorted = useMemo(() => {
    const value = (r: Row): number | string | undefined => {
      switch (sort.key) {
        case "name":
          return r.c.name.toLowerCase();
        case "store":
          return r.storeName.toLowerCase();
        case "dSpend":
          return r.dSpend?.value;
        case "dAcos":
          return r.dAcos?.value;
        default:
          return r[sort.key];
      }
    };
    return [...rows].sort((a, b) => compareValues(value(a), value(b), sort.dir) || b.spend - a.spend || a.c.name.localeCompare(b.c.name));
  }, [rows, sort]);

  const visible = full && !expanded ? sorted.slice(0, initialRows) : sorted;
  const onSort = (column: Col) => setSort((cur) => nextSort(cur, column, TEXT_COLS));
  const head = (label: string, column: Col, numeric = true, srExtra?: string) => (
    <SortHeader label={label} column={column} sortKey={sort.key} dir={sort.dir} onSort={onSort} numeric={numeric} srExtra={srExtra} />
  );
  const currency = period.currency;

  const title = full ? "Campaigns" : "Top campaigns by spend";
  const description = full ? (
    <p>
      Every campaign with activity in the last {period.days} days or the {period.days} before, in {currency}. Select a campaign to see its
      search terms.
    </p>
  ) : (
    <p>
      The ten biggest spenders across all stores in the last {period.days} days, in {currency}.
    </p>
  );

  if (!rows.length) {
    return (
      <Panel title={title} description={description} className={className}>
        <p className="px-4 py-8 text-center text-sm text-muted sm:px-5">No campaign spent anything in this period.</p>
      </Panel>
    );
  }

  return (
    <Panel
      title={title}
      description={description}
      className={className}
      footer={
        full && sorted.length > initialRows ? (
          <Button
            variant="ghost"
            size="sm"
            icon={expanded ? ChevronUp : ChevronDown}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
          >
            {expanded ? `Show the top ${initialRows}` : `Show all ${sorted.length} campaigns`}
          </Button>
        ) : undefined
      }
    >
      <Table caption={`${title}, last ${period.days} days, in ${currency}`} wrapperClassName={FLUSH_TABLE} stickyFirstColumn>
        <THead>
          <tr>
            {head("Campaign", "name", false)}
            {showStore ? head("Store", "store", false) : null}
            {head("Spend", "spend", true, currency)}
            {full ? head("Sales", "sales", true, currency) : null}
            {head("ACoS", "acos")}
            {full ? head("ROAS", "roas") : null}
            {head("Orders", "orders")}
            {head("CVR", "cvr")}
            {full ? head("CPC", "cpc", true, currency) : null}
            {full ? head("Share", "share") : null}
            {head("Δ Spend", "dSpend")}
            {head("Δ ACoS", "dAcos")}
            <TH className="px-2.5">Daily spend</TH>
          </tr>
        </THead>
        <TBody>
          {visible.map((r) => {
            const tone = acosTone(r.acos, r.target, r.breakEven, r.c.cur.spend);
            return (
              <TR key={r.c.index}>
                <THRow className="max-w-[16rem] px-2.5 py-2">
                  <ScopeLink
                    href={campaignHref(r.c.name)}
                    storeId={r.c.storeId}
                    className={cn(TEXT_LINK, "block truncate font-medium text-ink hover:text-brand")}
                    title={r.c.name}
                  >
                    {r.c.name}
                  </ScopeLink>
                </THRow>
                {showStore ? (
                  <TD className="max-w-[11rem] px-2.5 py-2">
                    <span className="flex min-w-0 items-center gap-1.5 text-muted">
                      <StoreDot colorIndex={r.colorIndex} />
                      <span className="truncate" title={r.storeName}>
                        {r.storeName}
                      </span>
                    </span>
                  </TD>
                ) : null}
                <TD numeric mono className="px-2.5 whitespace-nowrap">
                  {tableMoney(r.spend, r.currency)}
                </TD>
                {full ? (
                  <TD numeric mono className="px-2.5 whitespace-nowrap">
                    {tableMoney(r.sales, r.currency)}
                  </TD>
                ) : null}
                <TD numeric className="px-2.5 whitespace-nowrap">
                  {/* Colour alone is not enough: the target is printed and the verdict is spoken. */}
                  <span className="inline-flex flex-col items-end gap-0.5">
                    <MetricChip value={!Number.isFinite(r.acos) && r.c.cur.spend > 0 ? "no sales" : pct(r.acos)} tone={tone} />
                    {ACOS_VERDICT[tone] ? <span className="sr-only">({ACOS_VERDICT[tone]})</span> : null}
                    {Number.isFinite(r.target) ? <span className="tabular text-[0.6875rem] text-faint">target {pct(r.target, 0)}</span> : null}
                  </span>
                </TD>
                {full ? (
                  <TD numeric mono className="px-2.5">
                    {ratioX(r.roas)}
                  </TD>
                ) : null}
                <TD numeric mono className="px-2.5">
                  {count(r.orders)}
                </TD>
                <TD numeric mono className="px-2.5">
                  {pct(r.cvr)}
                </TD>
                {full ? (
                  <TD numeric mono className="px-2.5 whitespace-nowrap">
                    {tableMoney(r.cpc, r.currency)}
                  </TD>
                ) : null}
                {full ? (
                  <TD numeric mono className="px-2.5">
                    {pct(r.share, 0)}
                  </TD>
                ) : null}
                <TD numeric className="px-2.5">
                  <DeltaText delta={r.dSpend} empty={period.prevHasData ? "partial" : "—"} />
                </TD>
                <TD numeric className="px-2.5">
                  <DeltaText delta={r.dAcos} />
                </TD>
                <TD className="px-2.5 py-2">
                  {period.daily.length ? (
                    <Sparkline values={r.c.spark} color={seriesVar(r.colorIndex)} />
                  ) : (
                    <span className="text-xs text-faint">no daily rows</span>
                  )}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </Panel>
  );
}
