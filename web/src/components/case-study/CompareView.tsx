"use client";

import { ArrowRight, Check, Scale, X } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { TBody, TD, TH, THRow, THead, TR, Table } from "@/components/ui/Table";
import { TONE_TEXT } from "@/components/ui/tone";
import { useLocalStorage } from "@/lib/storage";
import { cn, formatCurrency, formatNumber } from "@/lib/utils";

import {
  AXIS_TICK,
  AXIS_TICK_SMALL,
  CHART_A11Y,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  ChartFrame,
  LEGEND_STYLE,
} from "./ChartFrame";
import { COMPARE_STORAGE_KEY, MAX_COMPARE } from "./CaseStudyGallery";
import { RESULT_TYPE_TONE, type CompareItem } from "./data";
import { useMounted } from "./useMounted";

const EMPTY: string[] = [];

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
}

function signedPercent(value: number): string {
  const rounded = Math.abs(value) < 10 ? value.toFixed(1) : Math.round(value).toString();
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${rounded.replace("-", "")}%`;
}

function signedPoints(value: number): string {
  return `${value > 0 ? "+" : value < 0 ? "−" : ""}${Math.abs(value).toFixed(1)} pts`;
}

export interface CompareViewProps {
  items: CompareItem[];
}

export function CompareView({ items }: CompareViewProps) {
  const params = useSearchParams();
  const idsParam = params.get("ids");

  const byId = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const urlIds = useMemo(() => {
    if (!idsParam) return null;
    const parsed = idsParam
      .split(",")
      .map((value) => value.trim())
      .filter((value) => byId.has(value));
    return parsed.length > 0 ? parsed.slice(0, MAX_COMPARE) : null;
  }, [idsParam, byId]);

  const [stored, setStored] = useLocalStorage<string[]>(COMPARE_STORAGE_KEY, EMPTY);
  const mounted = useMounted();
  const [chosen, setChosen] = useState<string[] | null>(null);

  /**
   * Precedence: an explicit choice made on this page, then the `?ids=` link
   * someone shared, then whatever the gallery tray last held. Under static
   * export the first two are only available after hydration, which is why
   * this is a derivation rather than an effect.
   */
  const selectedIds = useMemo(() => {
    const source = chosen ?? urlIds ?? (mounted ? stored : EMPTY);
    return source.filter((id) => byId.has(id)).slice(0, MAX_COMPARE);
  }, [chosen, urlIds, stored, mounted, byId]);

  const selected = useMemo(
    () => selectedIds.map((id) => byId.get(id)).filter((item): item is CompareItem => Boolean(item)),
    [selectedIds, byId],
  );

  const toggle = useCallback(
    (id: string) => {
      const next = selectedIds.includes(id)
        ? selectedIds.filter((entry) => entry !== id)
        : selectedIds.length >= MAX_COMPARE
          ? selectedIds
          : [...selectedIds, id];
      setChosen(next);
      setStored(next);
    },
    [selectedIds, setStored],
  );

  const clear = useCallback(() => {
    setChosen([]);
    setStored([]);
  }, [setStored]);

  const acosData = selected.map((item) => ({
    name: truncate(item.shortTitle, 16),
    full: item.shortTitle,
    start: item.summary.firstAcos,
    end: item.summary.lastAcos,
  }));

  const revenueData = selected.map((item) => ({
    name: truncate(item.shortTitle, 16),
    full: item.shortTitle,
    start: item.summary.firstRevenue,
    end: item.summary.lastRevenue,
  }));

  /** Union of every metric label across the chosen studies, in first-seen order. */
  const metricLabels = useMemo(() => {
    const labels: string[] = [];
    for (const item of selected) {
      for (const metric of item.metrics) {
        if (!labels.includes(metric.label)) labels.push(metric.label);
      }
    }
    return labels;
  }, [selected]);

  return (
    <div className="flex flex-col gap-8">
      {/* ---------------------------------------------------------- picker */}
      <section
        aria-labelledby="compare-picker-heading"
        className="rounded-2xl border border-hairline bg-surface p-4 sm:p-5"
      >
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2
              id="compare-picker-heading"
              className="font-display text-base font-semibold text-ink"
            >
              Pick two or three accounts
            </h2>
            <p className="mt-1 text-[0.8125rem] text-muted">
              {selected.length === 0
                ? `Nothing selected yet. Choose up to ${MAX_COMPARE} studies to line their numbers up.`
                : `${selected.length} of ${MAX_COMPARE} selected.`}
            </p>
          </div>
          {selected.length > 0 ? (
            <Button variant="ghost" size="sm" icon={X} onClick={clear}>
              Clear selection
            </Button>
          ) : null}
        </div>

        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const on = selectedIds.includes(item.id);
            const blocked = !on && selectedIds.length >= MAX_COMPARE;
            return (
              <li key={item.id} className="min-w-0">
                <button
                  type="button"
                  onClick={() => toggle(item.id)}
                  aria-pressed={on}
                  disabled={blocked}
                  className={cn(
                    "flex min-h-14 w-full min-w-0 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-colors",
                    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    "disabled:cursor-not-allowed disabled:opacity-45",
                    on
                      ? "border-brand bg-brand-soft"
                      : "border-hairline bg-surface hover:border-hairline-strong hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border",
                      on ? "border-brand bg-brand text-on-brand" : "border-hairline-strong",
                    )}
                    aria-hidden="true"
                  >
                    {on ? <Check className="size-3" strokeWidth={3} /> : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[0.8125rem] leading-snug font-medium text-ink">
                      {item.shortTitle}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-faint">
                      {item.category} · {item.resultLabel} ·{" "}
                      <span className="tabular">
                        {item.summary.firstAcos}% → {item.summary.lastAcos}%
                      </span>
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>

      {selected.length < 2 ? (
        <EmptyState
          icon={Scale}
          title="Select at least two accounts"
          description="The comparison lines up ACoS, revenue growth, engagement totals and every reported metric side by side. Pick two or three studies above to build it."
          action={
            <ButtonLink href="/case-studies" variant="secondary" size="sm" iconAfter={ArrowRight}>
              Browse the library
            </ButtonLink>
          }
        />
      ) : (
        <>
          {/* ------------------------------------------------------- charts */}
          <section aria-labelledby="compare-charts-heading" className="flex flex-col gap-4">
            <h2 id="compare-charts-heading" className="sr-only">
              Charts comparing the selected accounts
            </h2>
            <div className="grid gap-4 xl:grid-cols-2">
              <ChartFrame
                title="ACoS: first period against final period"
                description="Where each account started and where it finished, in its own reporting periods."
                summary={`ACoS comparison. ${selected
                  .map(
                    (item) =>
                      `${item.shortTitle} went from ${item.summary.firstAcos}% to ${item.summary.lastAcos}%`,
                  )
                  .join("; ")}.`}
                height={Math.max(200, selected.length * 78)}
                table={{
                  caption: "First-period and final-period ACoS for each selected account.",
                  head: ["Case study", "First period", "Final period", "Change"],
                  rows: selected.map((item) => ({
                    label: item.shortTitle,
                    cells: [
                      `${item.summary.firstAcos}%`,
                      `${item.summary.lastAcos}%`,
                      signedPoints(item.summary.acosChangePoints),
                    ],
                  })),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    {...CHART_A11Y}
                    data={acosData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    barCategoryGap="26%"
                  >
                    <CartesianGrid horizontal={false} stroke="var(--hairline)" />
                    <XAxis
                      type="number"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: "var(--hairline)" }}
                      tickFormatter={(value: number) => `${Math.round(value)}%`}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      tick={AXIS_TICK_SMALL}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_LABEL_STYLE}
                      formatter={(value: unknown, name: unknown) => [
                        `${Number(value).toFixed(1)}%`,
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
                    <Bar
                      dataKey="start"
                      name="First period"
                      fill="var(--hairline-strong)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="end"
                      name="Final period"
                      fill="var(--brand)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>

              <ChartFrame
                title="Ad revenue: first period against final period"
                description="Reporting periods differ in length between accounts, so read the growth, not the absolute height."
                summary={`Ad revenue comparison. ${selected
                  .map(
                    (item) =>
                      `${item.shortTitle} went from ${formatCurrency(
                        item.summary.firstRevenue,
                        0,
                      )} to ${formatCurrency(item.summary.lastRevenue, 0)} per period`,
                  )
                  .join("; ")}.`}
                height={Math.max(200, selected.length * 78)}
                table={{
                  caption: "First-period and final-period ad revenue for each selected account.",
                  head: ["Case study", "First period", "Final period", "Growth"],
                  rows: selected.map((item) => ({
                    label: item.shortTitle,
                    cells: [
                      formatCurrency(item.summary.firstRevenue, 0),
                      formatCurrency(item.summary.lastRevenue, 0),
                      signedPercent(item.summary.revenueChangePct),
                    ],
                  })),
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    {...CHART_A11Y}
                    data={revenueData}
                    layout="vertical"
                    margin={{ top: 4, right: 16, bottom: 0, left: 0 }}
                    barCategoryGap="26%"
                  >
                    <CartesianGrid horizontal={false} stroke="var(--hairline)" />
                    <XAxis
                      type="number"
                      tick={AXIS_TICK}
                      tickLine={false}
                      axisLine={{ stroke: "var(--hairline)" }}
                      tickFormatter={(value: number) =>
                        value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`
                      }
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={104}
                      tick={AXIS_TICK_SMALL}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      cursor={{ fill: "var(--surface-2)" }}
                      contentStyle={CHART_TOOLTIP_STYLE}
                      labelStyle={CHART_LABEL_STYLE}
                      formatter={(value: unknown, name: unknown) => [
                        formatCurrency(Number(value), 0),
                        String(name),
                      ]}
                    />
                    <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
                    <Bar
                      dataKey="start"
                      name="First period"
                      fill="var(--hairline-strong)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                    <Bar
                      dataKey="end"
                      name="Final period"
                      fill="var(--ember)"
                      radius={[0, 4, 4, 0]}
                      maxBarSize={18}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </ChartFrame>
            </div>
          </section>

          {/* ------------------------------------------------- engagement table */}
          <section aria-labelledby="compare-engagement-heading">
            <h2
              id="compare-engagement-heading"
              className="mb-3 font-display text-lg font-semibold text-ink"
            >
              The engagement, side by side
            </h2>
            <p className="mb-4 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
              These rows are derived from each study&apos;s own reporting timeline, so they are
              genuinely comparable even where the accounts reported weekly, fortnightly or monthly.
              Totals cover the whole engagement.
            </p>
            <Table
              caption="Engagement totals derived from each selected study's reporting timeline."
              stickyFirstColumn
            >
              <THead>
                <TR>
                  <TH>Measure</TH>
                  {selected.map((item) => (
                    <TH key={item.id} numeric>
                      {truncate(item.shortTitle, 22)}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                <TR>
                  <THRow>Category</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric>
                      {item.category}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Result type</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric>
                      <Badge tone={RESULT_TYPE_TONE[item.resultType]} size="sm">
                        {item.resultLabel}
                      </Badge>
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Timeframe</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric>
                      {item.timeframe}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Reporting periods</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {item.summary.points}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>ACoS, first period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {item.summary.firstAcos}%
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>ACoS, final period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      <span
                        className={cn(
                          "font-semibold",
                          item.summary.lastAcos < item.summary.firstAcos
                            ? "text-good"
                            : "text-bad",
                        )}
                      >
                        {item.summary.lastAcos}%
                      </span>
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>ACoS change</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      <span
                        className={cn(
                          item.summary.acosChangePoints < 0 ? "text-good" : "text-bad",
                        )}
                      >
                        {signedPoints(item.summary.acosChangePoints)}
                      </span>
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Ad revenue growth, first to final period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      <span
                        className={cn(
                          item.summary.revenueChangePct >= 0 ? "text-good" : "text-bad",
                        )}
                      >
                        {signedPercent(item.summary.revenueChangePct)}
                      </span>
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Ad spend change, first to final period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {signedPercent(item.summary.spendChangePct)}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Total ad spend across the engagement</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {formatCurrency(item.summary.totalSpend, 0)}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Total ad revenue across the engagement</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {formatCurrency(item.summary.totalRevenue, 0)}
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Blended ACoS across the engagement</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {item.summary.blendedAcos}%
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Blended ROAS across the engagement</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {formatNumber(item.summary.blendedRoas, 2)}x
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Worst period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {item.summary.peakAcos}%
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Best period</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric mono>
                      {item.summary.troughAcos}%
                    </TD>
                  ))}
                </TR>
                <TR>
                  <THRow>Read it</THRow>
                  {selected.map((item) => (
                    <TD key={item.id} numeric>
                      <Link
                        href={`/case-studies/${item.id}`}
                        className="inline-flex items-center gap-1 font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                      >
                        Open
                        <ArrowRight className="size-3.5" aria-hidden="true" />
                      </Link>
                    </TD>
                  ))}
                </TR>
              </TBody>
            </Table>
          </section>

          {/* -------------------------------------------- reported metrics table */}
          <section aria-labelledby="compare-metrics-heading">
            <h2
              id="compare-metrics-heading"
              className="mb-3 font-display text-lg font-semibold text-ink"
            >
              Every reported metric
            </h2>
            <p className="mb-4 max-w-3xl text-[0.9375rem] leading-relaxed text-muted">
              Each study reports the metrics that mattered to that client, so most rows are only
              filled for one account. A dash means the study did not report that number — not that
              it was zero.
            </p>
            <Table
              caption="Before and after values for every metric reported by the selected studies."
              stickyFirstColumn
            >
              <THead>
                <TR>
                  <TH>Metric</TH>
                  {selected.map((item) => (
                    <TH key={item.id} numeric>
                      {truncate(item.shortTitle, 22)}
                    </TH>
                  ))}
                </TR>
              </THead>
              <TBody>
                {metricLabels.map((label) => (
                  <TR key={label}>
                    <THRow>{label}</THRow>
                    {selected.map((item) => {
                      const view = item.metrics.find((metric) => metric.label === label);
                      if (!view) {
                        return (
                          <TD key={item.id} numeric mono>
                            <span className="text-faint">—</span>
                          </TD>
                        );
                      }
                      return (
                        <TD key={item.id} numeric mono>
                          <span className="text-faint">{view.beforeText}</span>
                          <span className="px-1 text-faint" aria-hidden="true">
                            →
                          </span>
                          <span className={cn("font-semibold", TONE_TEXT[view.tone])}>
                            {view.afterText}
                          </span>
                        </TD>
                      );
                    })}
                  </TR>
                ))}
              </TBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}
