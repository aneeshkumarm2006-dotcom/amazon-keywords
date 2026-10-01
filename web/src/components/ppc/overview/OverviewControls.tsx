"use client";

import { CalendarClock, CalendarRange, Coins, History, TriangleAlert } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { SegmentedControl } from "@/components/ui/SegmentedControl";
import type { ConsoleSettings, Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { dateSpan, day, plural, spanDays } from "../format";
import { PERIOD_OPTIONS, freshness, type PeriodDays, type PeriodResult } from "./compute";
import { TEXT_LINK } from "./shared";

const PERIOD_SEGMENTS = PERIOD_OPTIONS.map((d) => ({ value: String(d) as `${PeriodDays}`, label: String(d) }));

export interface OverviewControlsProps {
  period: PeriodResult;
  days: PeriodDays;
  onDaysChange: (days: PeriodDays) => void;
  today: string;
  allScope: boolean;
  settings: Pick<ConsoleSettings, "baseCurrency" | "fxRates">;
  missingFx: string[];
  stores: Store[];
  refreshing?: boolean;
}

function Note({ icon: Icon, tone = "muted", children }: { icon: typeof Coins; tone?: "muted" | "warn"; children: ReactNode }) {
  return (
    <p className={cn("flex items-start gap-1.5 text-xs leading-relaxed", tone === "warn" ? "text-warn" : "text-muted")}>
      <Icon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
      <span className="min-w-0">{children}</span>
    </p>
  );
}

/**
 * Period switch (7–90 days ending on the latest data date), the comparison
 * window, data freshness, and the currency / coverage caveats that change
 * how the numbers below should be read.
 */
export function OverviewControls({
  period,
  days,
  onDaysChange,
  today,
  allScope,
  settings,
  missingFx,
  stores,
  refreshing,
}: OverviewControlsProps) {
  const win = period.window;
  const prev = period.previous;
  const fresh = freshness(period.latest, today || period.latest || "", 3);
  const base = settings.baseCurrency.toUpperCase();
  const storeById = new Map(stores.map((s) => [s.id, s]));

  const usedRates = allScope
    ? [...new Set(stores.map((s) => s.currency.toUpperCase()))]
        .filter((c) => c !== base && Number.isFinite(settings.fxRates[c]) && settings.fxRates[c] > 0)
        .sort()
        .map((c) => `1 ${c} = ${settings.fxRates[c]} ${base}`)
    : [];
  const excludedNames = period.excluded.map((id) => storeById.get(id)?.name ?? id);
  const dataDays = win && period.earliest && period.earliest > win.from ? spanDays(period.earliest, win.to) : null;

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center md:justify-between">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-2">
          <span className="text-[0.8125rem] font-medium text-muted" aria-hidden="true">
            Last
          </span>
          <SegmentedControl
            label="Period, in days"
            size="sm"
            options={PERIOD_SEGMENTS}
            value={String(days) as `${PeriodDays}`}
            onChange={(v) => onDaysChange(Number(v) as PeriodDays)}
          />
          <span className="text-[0.8125rem] font-medium text-muted" aria-hidden="true">
            days
          </span>
          {win ? (
            <span className="text-xs text-muted sm:ml-1">
              <span className="font-medium text-ink">{dateSpan(win.from, win.to)}</span>
              {prev ? <span> vs {dateSpan(prev.from, prev.to)}</span> : null}
            </span>
          ) : null}
        </div>
        <p className="flex items-center gap-1.5 text-xs text-muted" aria-live="polite">
          <CalendarClock className={cn("size-3.5 shrink-0", fresh.stale ? "text-warn" : "text-faint")} aria-hidden="true" />
          <span>
            Data through <strong className="font-semibold text-ink">{day(period.latest)}</strong>
            {refreshing ? <span className="text-faint"> · updating…</span> : null}
          </span>
        </p>
      </div>

      <div className="space-y-1">
        {fresh.stale ? (
          <Note icon={TriangleAlert} tone="warn">
            The newest data is {plural(fresh.daysOld, "day")} old, so these reports may be stale.{" "}
            <Link href="/dashboard/import" className={cn(TEXT_LINK, "text-warn underline")}>
              Import the latest report
            </Link>
          </Note>
        ) : null}
        {allScope && missingFx.length ? (
          <Note icon={TriangleAlert} tone="warn">
            No exchange rate for {missingFx.join(", ")}
            {excludedNames.length
              ? `: ${excludedNames.join(", ")} ${excludedNames.length === 1 ? "is" : "are"} left out of all-store totals`
              : ""}
            .{" "}
            <Link href="/dashboard/stores#currency" className={cn(TEXT_LINK, "text-warn underline")}>
              Add a rate in Stores
            </Link>
          </Note>
        ) : null}
        {allScope ? (
          <Note icon={Coins}>
            All-store money is converted to {base}
            {usedRates.length ? ` with your manual rates (${usedRates.join(", ")})` : ""}.{" "}
            <Link href="/dashboard/stores#currency" className={TEXT_LINK}>
              Edit rates
            </Link>
          </Note>
        ) : null}
        {dataDays !== null ? (
          <Note icon={History}>
            Only {plural(dataDays, "day")} of data in this period (from {day(period.earliest)}).
          </Note>
        ) : null}
        {period.summaryRowsInWindow > 0 ? (
          <Note icon={CalendarRange}>
            Includes {plural(period.summaryRowsInWindow, "summary-report row")}: each covers a whole date range and counts in full when it
            overlaps the period, so these totals can reach past the last {period.days} days. Import daily reports for exact periods.
          </Note>
        ) : null}
        {win && !period.prevHasData ? (
          <Note icon={History}>No data before {day(win.from)}, so there is nothing to compare with yet.</Note>
        ) : win && !period.prevCovered ? (
          <Note icon={History}>
            Spend, sales and order changes are hidden:{" "}
            {period.prevGaps.map((g) => `${storeById.get(g.storeId)?.name ?? g.storeId} data starts ${day(g.earliest)}`).join("; ")}, inside
            the comparison period. Rate changes (ACoS, CPC, CTR, CVR) are still shown.
          </Note>
        ) : null}
      </div>
    </div>
  );
}
