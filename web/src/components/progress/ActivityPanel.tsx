"use client";

import { CalendarDays, Sprout } from "lucide-react";
import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

import { ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import type { DayActivity } from "@/lib/progress";

import {
  AXIS_TICK_SMALL,
  CHART_A11Y,
  CHART_LABEL_STYLE,
  CHART_TOOLTIP_STYLE,
  ChartPanel,
  LEGEND_STYLE,
} from "./ChartPanel";

const WEEKDAY_ROWS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** Monday-first weekday index for a timestamp. */
function weekdayRow(timestamp: number): number {
  return (new Date(timestamp).getDay() + 6) % 7;
}

function shortDay(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" }).format(
    new Date(timestamp),
  );
}

function longDay(timestamp: number): string {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

interface WeekBucket {
  key: string;
  label: string;
  rangeLabel: string;
  resources: number;
  quizzes: number;
  interviews: number;
  total: number;
  days: DayActivity[];
}

function toWeeks(days: DayActivity[]): WeekBucket[] {
  const weeks: WeekBucket[] = [];
  for (let start = 0; start < days.length; start += 7) {
    const slice = days.slice(start, start + 7);
    if (slice.length === 0) continue;
    weeks.push({
      key: slice[0].day,
      label: shortDay(slice[0].timestamp),
      rangeLabel: `${shortDay(slice[0].timestamp)} to ${shortDay(slice[slice.length - 1].timestamp)}`,
      resources: slice.reduce((sum, day) => sum + day.resources, 0),
      quizzes: slice.reduce((sum, day) => sum + day.quizzes, 0),
      interviews: slice.reduce((sum, day) => sum + day.interviews, 0),
      total: slice.reduce((sum, day) => sum + day.total, 0),
      days: slice,
    });
  }
  return weeks;
}

/** Four intensity steps plus empty, so one busy day does not flatten the rest. */
function intensityClass(count: number): string {
  if (count <= 0) return "bg-surface-2";
  if (count === 1) return "bg-brand/30";
  if (count === 2) return "bg-brand/55";
  if (count <= 4) return "bg-brand/80";
  return "bg-brand";
}

export interface ActivityPanelProps {
  days: DayActivity[];
  className?: string;
}

/**
 * Twelve weeks of activity, twice: as a stacked bar chart of what kind of
 * work each week held, and as a day-level grid underneath it so a broken
 * streak is visible at a glance rather than inferred from a short bar.
 */
export function ActivityPanel({ days, className }: ActivityPanelProps) {
  const weeks = useMemo(() => toWeeks(days), [days]);
  const total = weeks.reduce((sum, week) => sum + week.total, 0);
  const busiest = weeks.reduce((best, week) => Math.max(best, week.total), 0);
  const activeWeeks = weeks.filter((week) => week.total > 0).length;

  if (total === 0) {
    return (
      <section
        className={cn("rounded-xl border border-hairline bg-surface", className)}
        aria-labelledby="activity-empty-heading"
      >
        <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
          <h3
            id="activity-empty-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Last 12 weeks
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            One bar per week, split by what kind of work it was.
          </p>
        </header>
        <EmptyState
          bare
          icon={Sprout}
          title="Nothing logged yet"
          description="Three things write to this chart: finishing a quiz, sitting a mock interview, and ticking a resource as complete. Do any one of them today and the first bar appears immediately."
          action={
            <>
              <ButtonLink href="/quizzes/beginner" size="sm">
                Take the Level 1 quiz
              </ButtonLink>
              <ButtonLink href="/sops/daily-health-check" variant="secondary" size="sm">
                Read the daily health check
              </ButtonLink>
            </>
          }
        />
      </section>
    );
  }

  return (
    <ChartPanel
      className={className}
      title="Last 12 weeks"
      description="One bar per week, split by what kind of work it was. The grid below is the same data, one square per day."
      summary={`${total} logged activities across the last 12 weeks, in ${activeWeeks} active weeks. The busiest week held ${busiest}.`}
      height={220}
      aside={
        <span className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-2 py-1 text-[0.6875rem] font-medium text-muted">
          <CalendarDays className="size-3.5 text-faint" aria-hidden="true" />
          <span className="tabular">{total} activities</span>
        </span>
      }
      table={{
        caption: "Activity per week over the last 12 weeks",
        head: ["Week of", "Resources", "Quizzes", "Mocks", "Total"],
        rows: weeks.map((week) => ({
          label: week.label,
          cells: [
            String(week.resources),
            String(week.quizzes),
            String(week.interviews),
            String(week.total),
          ],
        })),
      }}
      footer={
        <div className="mt-2">
          <div className="scroll-well overflow-x-auto pb-1">
            <div className="flex min-w-max gap-[3px]" aria-hidden="true">
              <div className="mr-1 flex flex-col justify-between py-[1px]">
                {WEEKDAY_ROWS.map((label, index) => (
                  <span
                    key={label}
                    className="h-[13px] text-[0.5625rem] leading-[13px] text-faint"
                  >
                    {index % 2 === 1 ? label : ""}
                  </span>
                ))}
              </div>
              {weeks.map((week) => {
                const byRow = new Map<number, DayActivity>();
                for (const day of week.days) byRow.set(weekdayRow(day.timestamp), day);
                return (
                  <div key={week.key} className="flex flex-col gap-[3px]">
                    {WEEKDAY_ROWS.map((label, row) => {
                      const day = byRow.get(row);
                      return (
                        <span
                          key={`${week.key}-${label}`}
                          title={
                            day
                              ? `${longDay(day.timestamp)}: ${day.total} ${day.total === 1 ? "activity" : "activities"}`
                              : undefined
                          }
                          className={cn(
                            "block size-[13px] rounded-[3px]",
                            day ? intensityClass(day.total) : "bg-transparent",
                          )}
                        />
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between gap-3">
            <p className="text-[0.6875rem] text-faint">
              Each square is one day, Monday at the top.
            </p>
            <div className="flex items-center gap-1.5">
              <span className="text-[0.6875rem] text-faint">Less</span>
              {[0, 1, 2, 3, 5].map((count) => (
                <span
                  key={count}
                  className={cn("block size-[11px] rounded-[3px]", intensityClass(count))}
                />
              ))}
              <span className="text-[0.6875rem] text-faint">More</span>
            </div>
          </div>
        </div>
      }
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart {...CHART_A11Y} data={weeks} margin={{ top: 4, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--hairline)" />
          <XAxis
            dataKey="label"
            tick={AXIS_TICK_SMALL}
            tickLine={false}
            axisLine={{ stroke: "var(--hairline)" }}
            interval="preserveStartEnd"
            minTickGap={6}
          />
          <YAxis
            tick={AXIS_TICK_SMALL}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={34}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-2)" }}
            contentStyle={CHART_TOOLTIP_STYLE}
            labelStyle={CHART_LABEL_STYLE}
            labelFormatter={(_label: unknown, payload: readonly { payload?: WeekBucket }[]) =>
              payload?.[0]?.payload?.rangeLabel ?? ""
            }
          />
          <Legend wrapperStyle={LEGEND_STYLE} iconType="circle" iconSize={8} />
          <Bar
            dataKey="resources"
            stackId="activity"
            name="Resources"
            fill="var(--brand)"
            maxBarSize={26}
          />
          <Bar
            dataKey="quizzes"
            stackId="activity"
            name="Quizzes"
            fill="var(--info)"
            maxBarSize={26}
          />
          <Bar
            dataKey="interviews"
            stackId="activity"
            name="Mock interviews"
            fill="var(--ember)"
            radius={[4, 4, 0, 0]}
            maxBarSize={26}
          />
        </BarChart>
      </ResponsiveContainer>
    </ChartPanel>
  );
}
