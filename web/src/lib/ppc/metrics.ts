/**
 * Counters, derived metrics, aggregation, date windows and FX.
 *
 * Derived metrics return NaN when undefined (zero denominator) — never Infinity.
 * In particular ACoS with spend but no sales is NaN: callers that care about
 * "spend with zero orders" test `orders === 0 && spend > 0` explicitly.
 *
 * Window semantics
 * - A window is anchored on the latest date present in the data (not today):
 *   `to = latest − lagDays`, `from = to − lookbackDays + 1` (inclusive).
 * - Daily rows count when `from ≤ date ≤ to`.
 * - Summary rows (with `endDate`) count in full when their period overlaps the
 *   window at all (`date ≤ to && endDate ≥ from`). They are not pro-rated:
 *   Amazon summary reports cannot be split by day, and dropping them would
 *   discard the data entirely. The latest date of a summary row is its endDate.
 * - Overlapping imports of the same search term are never added together:
 *   `resolveOverlaps` (run on every read in db.ts and inside `recommend`)
 *   keeps one series per term — daily rows win for the days they cover and the
 *   latest of overlapping summary periods wins.
 */

import { addDays, daysBetween } from "./dates";
import { adGroupKey, norm, targetKey, termKey } from "./keys";
import type { ConsoleSettings, Counters, SearchTermRow, Store } from "./types";

/* ---------------------------------------------------------------- counters */

export function emptyCounters(): Counters {
  return { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 };
}

/** a + b as a new object. */
export function addCounters(a: Counters, b: Counters): Counters {
  return {
    impressions: a.impressions + b.impressions,
    clicks: a.clicks + b.clicks,
    spend: a.spend + b.spend,
    sales: a.sales + b.sales,
    orders: a.orders + b.orders,
    units: a.units + b.units,
  };
}

/** target += src (mutates and returns target). */
export function addInto(target: Counters, src: Counters): Counters {
  target.impressions += src.impressions;
  target.clicks += src.clicks;
  target.spend += src.spend;
  target.sales += src.sales;
  target.orders += src.orders;
  target.units += src.units;
  return target;
}

/** Copy only the counter fields of a row. */
export function countersOf(c: Counters): Counters {
  return {
    impressions: c.impressions,
    clicks: c.clicks,
    spend: c.spend,
    sales: c.sales,
    orders: c.orders,
    units: c.units,
  };
}

/** Round money fields to cents and leave counts alone (for display / records). */
export function roundCounters(c: Counters): Counters {
  return { ...c, spend: round2(c.spend), sales: round2(c.sales) };
}

function ratio(num: number, den: number): number {
  return den > 0 && Number.isFinite(num) ? num / den : NaN;
}

/** spend ÷ sales */
export const acos = (c: Counters): number => ratio(c.spend, c.sales);
/** sales ÷ spend */
export const roas = (c: Counters): number => ratio(c.sales, c.spend);
/** clicks ÷ impressions */
export const ctr = (c: Counters): number => ratio(c.clicks, c.impressions);
/** orders ÷ clicks */
export const cvr = (c: Counters): number => ratio(c.orders, c.clicks);
/** spend ÷ clicks */
export const cpc = (c: Counters): number => ratio(c.spend, c.clicks);
/** sales ÷ clicks (revenue per click) */
export const rpc = (c: Counters): number => ratio(c.sales, c.clicks);
/** sales ÷ orders (average order value) */
export const aov = (c: Counters): number => ratio(c.sales, c.orders);

export interface DerivedMetrics {
  acos: number;
  roas: number;
  ctr: number;
  cvr: number;
  cpc: number;
  rpc: number;
  aov: number;
}

export function derive(c: Counters): DerivedMetrics {
  return { acos: acos(c), roas: roas(c), ctr: ctr(c), cvr: cvr(c), cpc: cpc(c), rpc: rpc(c), aov: aov(c) };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ------------------------------------------------------------- aggregation */

export interface Aggregate<T extends Counters = SearchTermRow> {
  key: string;
  counters: Counters;
  /** First row seen for this key (carries the original-case labels). */
  sample: T;
  /** Number of source rows folded in. */
  rowCount: number;
  firstDate?: string;
  lastDate?: string;
}

/** Group rows by `keyFn` and sum their counters. Insertion order is preserved. */
export function aggregate<T extends Counters & { date?: string; endDate?: string }>(
  rows: Iterable<T>,
  keyFn: (row: T) => string,
): Map<string, Aggregate<T>> {
  const out = new Map<string, Aggregate<T>>();
  for (const row of rows) {
    const key = keyFn(row);
    let agg = out.get(key);
    if (!agg) {
      agg = { key, counters: emptyCounters(), sample: row, rowCount: 0 };
      out.set(key, agg);
    }
    addInto(agg.counters, row);
    agg.rowCount++;
    if (row.date) {
      const end = row.endDate ?? row.date;
      if (!agg.firstDate || row.date < agg.firstDate) agg.firstDate = row.date;
      if (!agg.lastDate || end > agg.lastDate) agg.lastDate = end;
    }
  }
  return out;
}

/** campaign + ad group + search term */
export const bySearchTerm = (rows: Iterable<SearchTermRow>) =>
  aggregate(rows, (r) => termKey(r.campaign, r.adGroup, r.searchTerm));

/** campaign + ad group + targeting + match type */
export const byTarget = (rows: Iterable<SearchTermRow>) =>
  aggregate(rows, (r) => targetKey(r.campaign, r.adGroup, r.targeting, r.matchType));

/** campaign + ad group */
export const byAdGroup = (rows: Iterable<SearchTermRow>) => aggregate(rows, (r) => adGroupKey(r.campaign, r.adGroup));

export const byCampaign = (rows: Iterable<SearchTermRow>) => aggregate(rows, (r) => norm(r.campaign));

export const byStore = (rows: Iterable<SearchTermRow>) => aggregate(rows, (r) => r.storeId);

/** Search term across the whole store (all campaigns / ad groups). */
export const byTermInStore = (rows: Iterable<SearchTermRow>) => aggregate(rows, (r) => `${r.storeId}|${norm(r.searchTerm)}`);

/**
 * By day. Summary rows are attributed to their start date (they cannot be
 * split); daily charts should prefer daily reports.
 */
export const byDay = (rows: Iterable<SearchTermRow>) => aggregate(rows, (r) => r.date);

/** Totals of all rows. */
export function totals(rows: Iterable<Counters>): Counters {
  const t = emptyCounters();
  for (const r of rows) addInto(t, r);
  return t;
}

/* ----------------------------------------------------------------- windows */

export interface DateWindow {
  from: string;
  to: string;
}

/** Latest date in the data (summary rows contribute their endDate). */
export function latestDate(rows: Iterable<{ date: string; endDate?: string }>): string | undefined {
  let max: string | undefined;
  for (const r of rows) {
    const d = r.endDate ?? r.date;
    if (!max || d > max) max = d;
  }
  return max;
}

/** Earliest date in the data. */
export function earliestDate(rows: Iterable<{ date: string }>): string | undefined {
  let min: string | undefined;
  for (const r of rows) if (!min || r.date < min) min = r.date;
  return min;
}

/**
 * Lookback window ending `lagDays` before the latest data date (or before the
 * given ISO date). Returns undefined when there is no data.
 */
export function dateWindow(
  rowsOrMaxDate: Iterable<{ date: string; endDate?: string }> | string,
  lookbackDays: number,
  lagDays: number,
): DateWindow | undefined {
  const max = typeof rowsOrMaxDate === "string" ? rowsOrMaxDate : latestDate(rowsOrMaxDate);
  if (!max) return undefined;
  const to = addDays(max, -Math.max(0, Math.floor(lagDays)));
  const from = addDays(to, -(Math.max(1, Math.floor(lookbackDays)) - 1));
  return { from, to };
}

/** The window of equal length immediately before `w`. */
export function previousWindow(w: DateWindow): DateWindow {
  const len = windowLength(w);
  return { from: addDays(w.from, -len), to: addDays(w.from, -1) };
}

/** Number of days in a window (inclusive). */
export function windowLength(w: DateWindow): number {
  return daysBetween(w.from, w.to) + 1;
}

export function inWindow(row: { date: string; endDate?: string }, w: DateWindow): boolean {
  if (row.endDate) return row.date <= w.to && row.endDate >= w.from;
  return row.date >= w.from && row.date <= w.to;
}

export function filterByWindow<T extends { date: string; endDate?: string }>(rows: Iterable<T>, w: DateWindow): T[] {
  const out: T[] = [];
  for (const r of rows) if (inWindow(r, w)) out.push(r);
  return out;
}

/* ---------------------------------------------------------------- overlaps */

/**
 * One series per search term. The natural key holds the period, so a Summary
 * report and a Daily report of the same days — or two "last 30 days" Summary
 * downloads a week apart — are stored side by side; added up, every counter
 * would be doubled. Rows are grouped by store + campaign + ad group +
 * targeting + match type + search term, and within a group:
 *
 * 1. Summary vs daily: daily rows count as they are. A summary row with daily
 *    rows of the same term inside its period keeps only what those daily rows
 *    do not hold — its counters minus theirs, each floored at 0 (so a counter
 *    totals max(summary, daily)) — moved onto the longest run of days in its
 *    period that have no daily data in the store. No such day, or nothing
 *    left over → the summary row is dropped.
 * 2. Summary vs summary: overlapping periods cannot both count. The one ending
 *    latest wins (then the longer one, then key order); an older one that
 *    overlaps it is dropped. Periods that do not overlap all count.
 *
 * Stored rows are untouched: this runs on read. Pure, idempotent, keeps the
 * input order, and returns the input array itself when nothing overlaps.
 */
export function resolveOverlaps<T extends SearchTermRow>(rows: T[]): T[] {
  const summaryStores = new Set<string>();
  for (const r of rows) if (r.endDate) summaryStores.add(r.storeId);
  if (!summaryStores.size) return rows;

  const seriesKey = (r: SearchTermRow) =>
    `${r.storeId}\u0000${norm(r.campaign)}\u0000${norm(r.adGroup)}\u0000${norm(r.targeting)}\u0000${r.matchType}\u0000${norm(r.searchTerm)}`;
  const groups = new Map<string, { summaries: number[]; daily: number[] }>();
  rows.forEach((r, i) => {
    if (!r.endDate) return;
    const k = seriesKey(r);
    const g = groups.get(k);
    if (g) g.summaries.push(i);
    else groups.set(k, { summaries: [i], daily: [] });
  });
  /** Days with any daily row, per store (a daily report covers the whole store). */
  const dailyDays = new Map<string, Set<string>>();
  rows.forEach((r, i) => {
    if (r.endDate || !summaryStores.has(r.storeId)) return;
    let days = dailyDays.get(r.storeId);
    if (!days) dailyDays.set(r.storeId, (days = new Set()));
    days.add(r.date);
    groups.get(seriesKey(r))?.daily.push(i);
  });
  const sortedDays = new Map<string, string[]>();
  const coveredDays = (storeId: string): string[] => {
    let list = sortedDays.get(storeId);
    if (!list) sortedDays.set(storeId, (list = [...(dailyDays.get(storeId) ?? [])].sort()));
    return list;
  };

  /** Row index → replacement (null = dropped). */
  const replace = new Map<number, T | null>();
  for (const g of groups.values()) {
    const live: { i: number; row: T }[] = [];
    for (const i of g.summaries) {
      const s = rows[i];
      const end = s.endDate as string;
      let inside: Counters | null = null;
      for (const j of g.daily) {
        const d = rows[j];
        if (d.date >= s.date && d.date <= end) addInto(inside ?? (inside = emptyCounters()), d);
      }
      if (!inside) {
        live.push({ i, row: s });
        continue;
      }
      const run = longestUncoveredRun(s.date, end, coveredDays(s.storeId));
      const rest = netCounters(s, inside);
      if (!run || isEmptyCounters(rest)) {
        replace.set(i, null);
        continue;
      }
      const row: T = { ...s, ...rest, date: run[0], endDate: run[1] };
      replace.set(i, row);
      live.push({ i, row });
    }
    if (live.length < 2) continue;
    live.sort(
      (a, b) =>
        cmp(b.row.endDate as string, a.row.endDate as string) || cmp(a.row.date, b.row.date) || cmp(a.row.key, b.row.key),
    );
    const kept: T[] = [];
    for (const { i, row } of live) {
      if (kept.some((k) => row.date <= (k.endDate as string) && (row.endDate as string) >= k.date)) replace.set(i, null);
      else kept.push(row);
    }
  }
  if (!replace.size) return rows;
  const out: T[] = [];
  rows.forEach((r, i) => {
    const x = replace.has(i) ? replace.get(i) : r;
    if (x) out.push(x);
  });
  return out;
}

function cmp(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** summary − daily per counter, floored at 0 (money to the cent). */
function netCounters(s: Counters, d: Counters): Counters {
  const count = (a: number, b: number) => Math.max(0, a - b);
  const money = (a: number, b: number) => Math.max(0, round2(a - b));
  return {
    impressions: count(s.impressions, d.impressions),
    clicks: count(s.clicks, d.clicks),
    spend: money(s.spend, d.spend),
    sales: money(s.sales, d.sales),
    orders: count(s.orders, d.orders),
    units: count(s.units, d.units),
  };
}

function isEmptyCounters(c: Counters): boolean {
  return !c.impressions && !c.clicks && !c.spend && !c.sales && !c.orders && !c.units;
}

/**
 * Longest run of days in [from, to] not in `covered` (sorted ISO days); the
 * earliest run wins a tie. Null when every day is covered.
 */
function longestUncoveredRun(from: string, to: string, covered: string[]): [string, string] | null {
  let lo = 0;
  let hi = covered.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (covered[mid] < from) lo = mid + 1;
    else hi = mid;
  }
  let best: [string, string] | null = null;
  let bestLen = 0;
  let cursor = from;
  const consider = (a: string, b: string) => {
    const len = daysBetween(a, b) + 1;
    if (len > bestLen) {
      best = [a, b];
      bestLen = len;
    }
  };
  for (let k = lo; k < covered.length && covered[k] <= to; k++) {
    if (covered[k] > cursor) consider(cursor, addDays(covered[k], -1));
    cursor = addDays(covered[k], 1);
  }
  if (cursor <= to) consider(cursor, to);
  return best;
}

/* --------------------------------------------------------------------- FX */

/**
 * Convert an amount in `currency` to the base currency. Rate is 1 for the base
 * currency; an unknown or invalid rate returns NaN (see `missingRates`).
 */
export function toBase(amount: number, currency: string, settings: Pick<ConsoleSettings, "baseCurrency" | "fxRates">): number {
  const cur = (currency || "").toUpperCase();
  if (!cur || cur === settings.baseCurrency.toUpperCase()) return amount;
  const rate = settings.fxRates[cur];
  if (typeof rate !== "number" || !Number.isFinite(rate) || rate <= 0) return NaN;
  return amount * rate;
}

/** Rate for a currency (1 for base, NaN when unknown). */
export function fxRate(currency: string, settings: Pick<ConsoleSettings, "baseCurrency" | "fxRates">): number {
  return toBase(1, currency, settings);
}

/** Convert counters' money fields to base currency. */
export function countersToBase(
  c: Counters,
  currency: string,
  settings: Pick<ConsoleSettings, "baseCurrency" | "fxRates">,
): Counters {
  const r = fxRate(currency, settings);
  return { ...c, spend: c.spend * r, sales: c.sales * r };
}

/** Store currencies that have no usable FX rate to the base currency. */
export function missingRates(stores: Pick<Store, "currency">[], settings: Pick<ConsoleSettings, "baseCurrency" | "fxRates">): string[] {
  const out = new Set<string>();
  for (const s of stores) if (Number.isNaN(fxRate(s.currency, settings))) out.add(s.currency.toUpperCase());
  return [...out].sort();
}

/* ------------------------------------------------------------------ stats */

export function median(values: number[]): number {
  const v = values.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!v.length) return NaN;
  const mid = Math.floor(v.length / 2);
  return v.length % 2 ? v[mid] : (v[mid - 1] + v[mid]) / 2;
}
