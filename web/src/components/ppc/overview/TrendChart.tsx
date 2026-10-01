"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AXIS_TICK_SMALL, CHART_A11Y, CHART_LABEL_STYLE, CHART_TOOLTIP_STYLE, LEGEND_STYLE } from "@/components/progress/ChartPanel";

import { count, money, pct } from "../format";
import { seriesVar } from "../markets";
import type { TrendMetric, TrendRow } from "./compute";
import { axisMoney, longDay, shortDay } from "./shared";

export interface TrendSeries {
  key: `s${number}`;
  name: string;
  colorIndex: number;
}

export interface TrendChartProps {
  rows: TrendRow[];
  /** "all": stacked per-store bars (or per-store ACoS lines). "store": spend bars + sales line + ACoS on a second axis. */
  mode: "all" | "store";
  metric: TrendMetric;
  series: TrendSeries[];
  currency: string;
  /** Target ACoS (weighted in All scope). */
  target: number;
  /** Trailing days whose sales are still attributing (shaded). */
  lag?: { from: string; to: string };
}

const TICK_FORMAT_PCT = (v: number) => `${Math.round(v * 100)}%`;

/**
 * The ACoS line must not share a hue with the store's spend bars: ember for
 * green / blue / violet stores, info blue for ember / rose / gold ones.
 */
function acosColour(colorIndex: number): string {
  const slot = ((Math.trunc(colorIndex) % 6) + 6) % 6;
  return slot === 1 || slot === 3 || slot === 4 ? "var(--info)" : "var(--ember)";
}

/**
 * Recharts drawing for the overview trend. Loaded lazily (next/dynamic) and
 * rendered only after mount, inside an `aria-hidden` box: the spoken summary
 * and the data table in TrendPanel carry the same numbers.
 */
export function TrendChart({ rows, mode, metric, series, currency, target, lag }: TrendChartProps) {
  const acosStroke = acosColour(series[0]?.colorIndex ?? 0);
  const isAcos = mode === "all" && metric === "acos";
  const acosValues = rows.map((r) => (mode === "store" ? r.acos : isAcos ? r.total : null)).filter((v): v is number => v !== null);
  const acosCap = Math.max(Number.isFinite(target) ? target * 2.5 : 0.6, 0.6);
  const acosMax = Math.min(acosValues.length ? Math.max(...acosValues) * 1.1 : acosCap, acosCap);
  // Round the top up to a whole 10% (5% under 30%) so the four ticks land on round numbers.
  const rawTop = Math.max(acosMax, Number.isFinite(target) ? target * 1.25 : 0.1);
  const step = rawTop <= 0.3 ? 0.05 : 0.1;
  const acosDomain: [number, number] = [0, Math.ceil(rawTop / step - 1e-9) * step];
  let tickStep = step;
  while (acosDomain[1] / tickStep > 5 + 1e-9) tickStep *= 2;
  const acosTicks: number[] = [];
  for (let v = 0; v <= acosDomain[1] + 1e-9; v += tickStep) acosTicks.push(Math.round(v * 1e4) / 1e4);

  const format = (value: unknown, key: unknown): string => {
    const v = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(v)) return "—";
    const k = String(key ?? "");
    if (k === "acos" || isAcos) return pct(v);
    if (k === "orders" || (metric === "orders" && mode === "all" && k !== "spend" && k !== "sales")) return count(v);
    return money(v, currency);
  };

  const leftTick = (v: number) =>
    isAcos ? TICK_FORMAT_PCT(v) : metric === "orders" && mode === "all" ? String(v) : axisMoney(v, currency);
  const lineKey = mode === "all" ? (metric === "spend" ? "sales" : metric === "sales" ? "spend" : null) : null;

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        {...CHART_A11Y}
        data={rows}
        margin={{ top: 8, right: mode === "store" ? 4 : 8, bottom: 0, left: 0 }}
        barCategoryGap="18%"
      >
        <CartesianGrid vertical={false} stroke="var(--hairline)" />
        <XAxis
          dataKey="date"
          tickFormatter={shortDay}
          tick={AXIS_TICK_SMALL}
          tickLine={false}
          axisLine={{ stroke: "var(--hairline)" }}
          interval="preserveStartEnd"
          minTickGap={18}
          height={24}
        />
        <YAxis
          yAxisId="left"
          tick={AXIS_TICK_SMALL}
          tickLine={false}
          axisLine={false}
          width={48}
          tickFormatter={leftTick}
          allowDecimals={!(metric === "orders" && mode === "all")}
          {...(isAcos ? { domain: acosDomain, allowDataOverflow: true, ticks: acosTicks } : {})}
        />
        {mode === "store" ? (
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={AXIS_TICK_SMALL}
            tickLine={false}
            axisLine={false}
            width={40}
            tickFormatter={TICK_FORMAT_PCT}
            domain={acosDomain}
            ticks={acosTicks}
            allowDataOverflow
          />
        ) : null}
        {lag ? (
          <ReferenceArea
            yAxisId="left"
            x1={lag.from}
            x2={lag.to}
            fill="var(--hairline-strong)"
            fillOpacity={0.35}
            stroke="none"
            ifOverflow="extendDomain"
            label={{ value: "attributing", position: "insideTop", fill: "var(--faint)", fontSize: 10 }}
          />
        ) : null}
        <Tooltip
          cursor={{ fill: "var(--surface-2)", fillOpacity: 0.6 }}
          contentStyle={CHART_TOOLTIP_STYLE}
          labelStyle={CHART_LABEL_STYLE}
          labelFormatter={(label) => longDay(String(label))}
          formatter={(value, name, item) => [format(value, item?.dataKey), String(name)]}
        />
        <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />

        {mode === "store" ? (
          <>
            <Bar
              yAxisId="left"
              dataKey="spend"
              name="Spend"
              fill={seriesVar(series[0]?.colorIndex ?? 0)}
              fillOpacity={0.85}
              maxBarSize={22}
              isAnimationActive={false}
            />
            <Line
              yAxisId="left"
              dataKey="sales"
              name="Sales"
              type="monotone"
              stroke="var(--ink)"
              strokeWidth={1.75}
              dot={false}
              activeDot={{ r: 4 }}
              isAnimationActive={false}
            />
            <Line
              yAxisId="right"
              dataKey="acos"
              name="ACoS (7-day)"
              type="monotone"
              stroke={acosStroke}
              strokeWidth={1.75}
              strokeDasharray="5 3"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {Number.isFinite(target) ? (
              <ReferenceLine
                yAxisId="right"
                y={target}
                stroke={acosStroke}
                strokeOpacity={0.7}
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
                label={{ value: `Target ${pct(target, 0)}`, position: "insideTopLeft", fill: "var(--muted)", fontSize: 10 }}
              />
            ) : null}
          </>
        ) : isAcos ? (
          <>
            {series.map((s) => (
              <Line
                key={s.key}
                yAxisId="left"
                dataKey={s.key}
                name={s.name}
                type="monotone"
                stroke={seriesVar(s.colorIndex)}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 3.5 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
            <Line
              yAxisId="left"
              dataKey="total"
              name="All stores (7-day)"
              type="monotone"
              stroke="var(--ink)"
              strokeWidth={2.25}
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
            {Number.isFinite(target) ? (
              <ReferenceLine
                yAxisId="left"
                y={target}
                stroke="var(--ember)"
                strokeDasharray="2 3"
                ifOverflow="extendDomain"
                label={{ value: `Target ${pct(target, 0)}`, position: "insideTopLeft", fill: "var(--muted)", fontSize: 10 }}
              />
            ) : null}
          </>
        ) : (
          <>
            {series.map((s) => (
              <Bar
                key={s.key}
                yAxisId="left"
                dataKey={s.key}
                name={s.name}
                stackId="stores"
                fill={seriesVar(s.colorIndex)}
                maxBarSize={24}
                isAnimationActive={false}
              />
            ))}
            {lineKey ? (
              <Line
                yAxisId="left"
                dataKey={lineKey}
                name={lineKey === "sales" ? "Sales (all stores)" : "Spend (all stores)"}
                type="monotone"
                stroke="var(--ink)"
                strokeWidth={1.75}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
            ) : null}
          </>
        )}
      </ComposedChart>
    </ResponsiveContainer>
  );
}
