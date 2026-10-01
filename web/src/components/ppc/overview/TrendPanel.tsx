"use client";

import { CalendarRange, FileUp, Table2 } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo } from "react";

import { useMounted } from "@/components/progress/ChartPanel";
import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";

import { acos as acosOf, addDays } from "@/lib/ppc";

import { count, dateSpan, money, pct, plural } from "../format";
import { trendRows, type PeriodResult, type TrendMetric } from "./compute";
import { Panel, shortDay } from "./shared";
import type { TrendSeries } from "./TrendChart";

const TrendChart = dynamic(() => import("./TrendChart").then((m) => m.TrendChart), {
  ssr: false,
  loading: () => <div className="size-full rounded-lg bg-surface-2" />,
});

const METRIC_OPTIONS: { value: TrendMetric; label: string }[] = [
  { value: "spend", label: "Spend" },
  { value: "sales", label: "Sales" },
  { value: "acos", label: "ACoS" },
  { value: "orders", label: "Orders" },
];

const CHART_HEIGHT = 280;

export interface TrendPanelProps {
  period: PeriodResult;
  /** All-stores scope: per-store series and the metric switch. */
  allScope: boolean;
  metric: TrendMetric;
  onMetricChange: (metric: TrendMetric) => void;
  className?: string;
}

/**
 * Daily trend. All stores: spend (or sales / orders) stacked by store with the
 * all-store total as a line, or per-store ACoS lines against the weighted
 * target. One store: spend bars, sales line and ACoS on a second axis with the
 * target as a reference line. The trailing attribution-lag days are shaded.
 */
export function TrendPanel({ period, allScope, metric, onMetricChange, className }: TrendPanelProps) {
  const mounted = useMounted();
  const mode = allScope ? "all" : "store";
  const activeMetric: TrendMetric = allScope ? metric : "spend";
  const currency = period.currency;

  const series: TrendSeries[] = useMemo(
    () =>
      period.stores
        .map((sp, i) => ({
          key: `s${i}` as const,
          name: sp.store.name,
          colorIndex: sp.store.colorIndex,
          included: Number.isFinite(sp.rate),
        }))
        .filter((s) => s.included)
        .map(({ key, name, colorIndex }) => ({ key, name, colorIndex })),
    [period.stores],
  );
  const rows = useMemo(() => trendRows(period, activeMetric), [period, activeMetric]);

  const title = allScope ? "Daily trend by store" : "Daily spend, sales and ACoS";
  const win = period.window;
  const aside = allScope ? (
    <SegmentedControl label="Chart metric" size="sm" options={METRIC_OPTIONS} value={metric} onChange={onMetricChange} />
  ) : null;

  if (!win || period.daily.length === 0) {
    return (
      <Panel title={title} aside={aside} className={className}>
        <EmptyState
          bare
          icon={CalendarRange}
          title="Daily trend needs a daily report"
          description={
            win
              ? "The rows in this period come from summary reports (one row per search term for the whole date range), so there is nothing to plot per day. The totals above still count them. Download the Search Term Report with the daily time unit and import it to see the trend."
              : "No rows in this period."
          }
          action={
            <ButtonLink href="/dashboard/import" size="sm" variant="secondary" icon={FileUp}>
              Import a daily report
            </ButtonLink>
          }
          className="py-10"
        />
      </Panel>
    );
  }

  const lagDays = Math.min(period.lagDays, period.days - 1);
  const lag = lagDays > 0 ? { from: addDays(win.to, -(lagDays - 1)), to: win.to } : undefined;

  // Spoken summary: what the shape means, in one or two sentences.
  const totalSpend = period.total.cur.spend;
  const totalSales = period.total.cur.sales;
  const peak = period.daily.reduce((best, d) => (d.total.spend > best.total.spend ? d : best), period.daily[0]);
  const span = dateSpan(win.from, win.to);
  const summary =
    activeMetric === "acos"
      ? `Rolling 7-day ACoS per store, ${span}. Overall ACoS for the period ${pct(acosOf(period.total.cur))} against a ${pct(period.target.acos)} target.`
      : `${allScope ? `Daily ${activeMetric} stacked by store` : "Daily spend, sales and ACoS"}, ${span}. Spend totalled ${money(totalSpend, currency)} and sales ${money(totalSales, currency)}. The highest-spend day was ${shortDay(peak.date)} at ${money(peak.total.spend, currency)}.`;

  const metricLabel =
    activeMetric === "acos" ? "ACoS 7-day" : (METRIC_OPTIONS.find((m) => m.value === activeMetric)?.label.toLowerCase() ?? "");
  const perStoreHead = allScope ? series.map((s) => `${s.name} ${metricLabel}`) : [];
  const cell = (v: number | null) =>
    v === null ? "—" : activeMetric === "acos" ? pct(v) : activeMetric === "orders" ? count(v) : money(v, currency);

  return (
    <Panel
      title={title}
      description={
        <p>
          {span}
          {allScope && period.convert ? ` · ${currency}` : ""}
          {!allScope || activeMetric === "acos" ? " · ACoS is a 7-day rolling figure" : ""}
          {lag ? ` · last ${plural(lagDays, "day")} shaded: sales still attributing` : ""}
        </p>
      }
      aside={aside}
      className={className}
    >
      <div className="px-1 pt-3 pb-1 sm:px-2">
        <p className="sr-only">{summary}</p>
        {/* overflow-hidden: recharts writes a pixel width onto its svg, which would prop the card open on a phone. */}
        <div style={{ height: CHART_HEIGHT }} aria-hidden="true" className="min-w-0 overflow-hidden">
          {mounted ? (
            <TrendChart
              rows={rows}
              mode={mode}
              metric={activeMetric}
              series={series}
              currency={currency}
              target={period.target.acos}
              lag={lag}
            />
          ) : (
            <div className="size-full rounded-lg bg-surface-2" />
          )}
        </div>
      </div>

      {period.summaryRowsInWindow > 0 || period.excluded.length > 0 ? (
        <div className="space-y-1 px-4 pb-3 text-xs leading-relaxed text-muted sm:px-5">
          {period.summaryRowsInWindow > 0 ? (
            <p>
              {plural(period.summaryRowsInWindow, "summary-report row")} (whole date ranges, not days) count in the totals but are left out
              of this chart.
            </p>
          ) : null}
          {period.excluded.length > 0 ? <p>Stores without an exchange rate are left out of the chart.</p> : null}
        </div>
      ) : null}

      <details className="group/table border-t border-hairline">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-3 text-[0.8125rem] font-medium text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5">
          <Table2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
          <span className="group-open/table:hidden">Show the numbers as a table</span>
          <span className="hidden group-open/table:inline">Hide the table</span>
        </summary>
        <div className="px-4 pb-4 sm:px-5">
          <Table
            caption={`Daily totals, ${span}${allScope ? `, in ${currency}` : ""}`}
            wrapperClassName="relative max-h-96 overflow-y-auto bg-canvas"
            stickyFirstColumn
          >
            <THead>
              <TR>
                <TH>Date</TH>
                <TH numeric>Spend</TH>
                <TH numeric>Sales</TH>
                <TH numeric>ACoS</TH>
                <TH numeric>ACoS 7-day</TH>
                <TH numeric>Orders</TH>
                {perStoreHead.map((h) => (
                  <TH key={h} numeric>
                    {h}
                  </TH>
                ))}
              </TR>
            </THead>
            <TBody>
              {rows.map((r) => (
                <TR key={r.date}>
                  <THRow className="whitespace-nowrap">{shortDay(r.date)}</THRow>
                  <TD numeric mono className="whitespace-nowrap">
                    {money(r.spend, currency)}
                  </TD>
                  <TD numeric mono className="whitespace-nowrap">
                    {money(r.sales, currency)}
                  </TD>
                  <TD numeric mono>
                    {r.acosDay === null ? "—" : pct(r.acosDay)}
                  </TD>
                  <TD numeric mono>
                    {r.acos === null ? "—" : pct(r.acos)}
                  </TD>
                  <TD numeric mono>
                    {count(r.orders)}
                  </TD>
                  {series.map((s) => (
                    <TD key={s.key} numeric mono className="whitespace-nowrap">
                      {cell(r[s.key] ?? null)}
                    </TD>
                  ))}
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </details>
    </Panel>
  );
}
