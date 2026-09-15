"use client";

import { LineChart as LineChartIcon, TrendingUp } from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { QUIZ_PASS_MARK, type ScorePoint } from "@/lib/progress";
import { cn, formatDate } from "@/lib/utils";

import {
  AXIS_TICK_SMALL,
  CHART_A11Y,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  ChartPanel,
} from "./ChartPanel";

export interface ScoreTrendPanelProps {
  points: ScorePoint[];
  className?: string;
}

/**
 * Quiz scores in the order they were taken, with a running average.
 *
 * A single score is noise; the line between them is the signal. The running
 * average is drawn dashed so it never gets mistaken for a real attempt, and
 * the 70% pass mark sits behind both as a reference.
 */
export function ScoreTrendPanel({ points, className }: ScoreTrendPanelProps) {
  if (points.length === 0) {
    return (
      <section
        className={cn("rounded-xl border border-hairline bg-surface", className)}
        aria-labelledby="trend-empty-heading"
      >
        <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
          <h3
            id="trend-empty-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Quiz score trend
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Every finished attempt, in the order you took it.
          </p>
        </header>
        <EmptyState
          bare
          icon={LineChartIcon}
          title="No attempts to plot yet"
          description={`One attempt gives you a dot. Three give you a direction. The line you want is flat above the ${QUIZ_PASS_MARK}% pass mark, not a spike followed by a drop.`}
          action={
            <ButtonLink href="/quizzes" size="sm">
              Browse the quizzes
            </ButtonLink>
          }
        />
      </section>
    );
  }

  const latest = points[points.length - 1];
  const first = points[0];
  const movement = Math.round((latest.score - first.score) * 10) / 10;
  const direction = movement > 0 ? "up" : movement < 0 ? "down" : "flat";

  return (
    <ChartPanel
      className={className}
      title="Quiz score trend"
      description={`Every finished attempt in order, with a running average. The dashed line is the ${QUIZ_PASS_MARK}% pass mark.`}
      summary={`${points.length} attempt${points.length === 1 ? "" : "s"} plotted. Latest ${latest.score}%, running average ${latest.average}%, ${
        direction === "flat"
          ? "unchanged since the first attempt"
          : `${Math.abs(movement)} points ${direction} on the first attempt`
      }.`}
      height={230}
      aside={
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[0.6875rem] font-medium text-muted">
          <TrendingUp className="size-3.5 text-faint" aria-hidden="true" />
          <span className="tabular">avg {latest.average}%</span>
        </span>
      }
      table={{
        caption: "Quiz attempts in chronological order",
        head: ["Attempt", "Date", "Score", "Running average"],
        rows: points.map((point) => ({
          label: `${point.index}. ${point.title}`,
          cells: [formatDate(point.day), `${point.score}%`, `${point.average}%`],
        })),
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart {...CHART_A11Y} data={points} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="index"
            tick={AXIS_TICK_SMALL}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            allowDecimals={false}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tick={AXIS_TICK_SMALL}
            tickLine={false}
            axisLine={false}
            width={34}
            tickFormatter={(value: number) => `${value}`}
          />
          <Tooltip
            cursor={{ stroke: "var(--hairline-strong)", strokeWidth: 1 }}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_LABEL_STYLE}
            labelFormatter={(_label: unknown, payload: readonly { payload?: ScorePoint }[]) => {
              const point = payload?.[0]?.payload;
              return point ? `${point.title} · ${formatDate(point.day)}` : "";
            }}
            formatter={(value: unknown, name: unknown) => [`${String(value)}%`, String(name)]}
          />
          <ReferenceLine
            y={QUIZ_PASS_MARK}
            stroke="var(--hairline-strong)"
            strokeDasharray="4 4"
          />
          <Line
            type="monotone"
            dataKey="average"
            name="Running average"
            stroke="var(--faint)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Line
            type="monotone"
            dataKey="score"
            name="Score"
            stroke="var(--brand)"
            strokeWidth={2.25}
            dot={{ r: 3, fill: "var(--brand)", strokeWidth: 0 }}
            activeDot={{ r: 5 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
