"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";

import {
  AXIS_TICK,
  AXIS_TICK_SMALL,
  CHART_A11Y,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  ChartFrame,
  LEGEND_STYLE,
} from "./ChartFrame";

export interface TimelinePoint {
  period: string;
  spend: number;
  revenue: number;
  acos: number;
}

export interface TimelineChartsProps {
  points: TimelinePoint[];
  /** Used in the spoken summaries so each chart says what it is about. */
  subject: string;
}

/** ≤30% is where most Amazon sellers are still making money after COGS. */
const PROFITABLE_BAND = 30;

function money(value: number): string {
  return formatCurrency(value, 0);
}

function percent(value: number): string {
  return `${value.toFixed(1)}%`;
}

export function TimelineCharts({ points, subject }: TimelineChartsProps) {
  const first = points[0];
  const last = points[points.length - 1];
  const peak = points.reduce((worst, row) => (row.acos > worst.acos ? row : worst), first);
  const bestAcos = points.reduce((best, row) => (row.acos < best.acos ? row : best), first);
  const maxAcos = Math.max(...points.map((row) => row.acos));
  const bandVisible = maxAcos > PROFITABLE_BAND * 0.6;

  const acosRows = points.map((row, index) => ({
    label: row.period,
    cells: [
      percent(row.acos),
      index === 0
        ? "—"
        : `${row.acos - points[index - 1].acos > 0 ? "+" : "−"}${Math.abs(
            row.acos - points[index - 1].acos,
          ).toFixed(1)} pts`,
    ],
  }));

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <ChartFrame
        title="Ad spend against ad revenue"
        description="Both series are in dollars on one axis, so the gap between the bar and the line is the money the account actually kept."
        summary={`Spend and revenue for ${subject} across ${points.length} reporting periods. Ad spend moved from ${money(
          first.spend,
        )} in ${first.period} to ${money(last.spend)} in ${last.period}, while ad revenue moved from ${money(
          first.revenue,
        )} to ${money(last.revenue)}.`}
        height={280}
        table={{
          caption: `Ad spend, ad revenue and ACoS by period for ${subject}.`,
          head: ["Period", "Ad spend", "Ad revenue", "ACoS"],
          rows: points.map((row) => ({
            label: row.period,
            cells: [money(row.spend), money(row.revenue), percent(row.acos)],
          })),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart {...CHART_A11Y} data={points} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            <XAxis
              dataKey="period"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              interval="preserveStartEnd"
              minTickGap={6}
              height={26}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={52}
              tickFormatter={(value: number) =>
                value >= 1000 ? `$${Math.round(value / 1000)}k` : `$${value}`
              }
            />
            <Tooltip
              cursor={{ fill: "var(--surface-2)" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              formatter={(value: unknown, name: unknown) => [money(Number(value)), String(name)]}
            />
            <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
            <Bar
              dataKey="spend"
              name="Ad spend"
              fill="var(--brand)"
              fillOpacity={0.85}
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
            />
            <Line
              dataKey="revenue"
              name="Ad revenue"
              type="monotone"
              stroke="var(--ember)"
              strokeWidth={2}
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--ember)" }}
              activeDot={{ r: 5 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartFrame>

      <ChartFrame
        title="ACoS over the engagement"
        description="Every point is spend divided by revenue for that period. The shaded band is where most sellers are still profitable after cost of goods."
        summary={`ACoS for ${subject} across ${points.length} reporting periods. It started at ${percent(
          first.acos,
        )} in ${first.period}, peaked at ${percent(peak.acos)} in ${peak.period}, reached its lowest at ${percent(
          bestAcos.acos,
        )} in ${bestAcos.period}, and finished at ${percent(last.acos)} in ${last.period}.`}
        height={280}
        aside={
          <Badge tone={last.acos <= PROFITABLE_BAND ? "good" : "warn"} size="sm" variant="outline">
            Ends at {percent(last.acos)}
          </Badge>
        }
        table={{
          caption: `ACoS by period, with the change from the previous period, for ${subject}.`,
          head: ["Period", "ACoS", "Change"],
          rows: acosRows,
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart {...CHART_A11Y} data={points} margin={{ top: 4, right: 10, bottom: 0, left: 0 }}>
            <CartesianGrid vertical={false} stroke="var(--hairline)" />
            {bandVisible ? (
              <ReferenceArea
                y1={0}
                y2={PROFITABLE_BAND}
                fill="var(--good)"
                fillOpacity={0.09}
                stroke="none"
              />
            ) : null}
            <XAxis
              dataKey="period"
              tick={AXIS_TICK_SMALL}
              tickLine={false}
              axisLine={{ stroke: "var(--hairline)" }}
              interval="preserveStartEnd"
              minTickGap={6}
              height={26}
            />
            <YAxis
              tick={AXIS_TICK}
              tickLine={false}
              axisLine={false}
              width={46}
              domain={[0, "auto"]}
              tickFormatter={(value: number) => `${Math.round(value)}%`}
            />
            <Tooltip
              cursor={{ stroke: "var(--hairline-strong)", strokeDasharray: "3 3" }}
              contentStyle={CHART_TOOLTIP_STYLE}
              labelStyle={CHART_LABEL_STYLE}
              formatter={(value: unknown) => [percent(Number(value)), "ACoS"]}
            />
            <ReferenceLine
              y={last.acos}
              stroke="var(--hairline-strong)"
              strokeDasharray="4 4"
              ifOverflow="extendDomain"
            />
            <Line
              dataKey="acos"
              name="ACoS"
              type="monotone"
              stroke="var(--info)"
              strokeWidth={2.25}
              dot={{ r: 2.5, strokeWidth: 0, fill: "var(--info)" }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  );
}
