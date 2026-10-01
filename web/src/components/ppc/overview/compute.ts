/**
 * Overview computations — pure functions, no React.
 *
 * Relative imports only: `scripts/ppc-test-overview.ts` runs this file under
 * jiti/Node, which does not resolve the `@/` alias.
 *
 * Performance model
 * - `buildOverviewIndex(rows)` runs once per row set (memoise on the array
 *   identity). It interns stores / campaigns / search terms and copies the
 *   counters into typed columns, so the per-period pass never touches a string.
 * - `computePeriod(index, …)` is one pass over those columns. It produces the
 *   current and previous period per store and per campaign, the daily series
 *   per store, sparkline series per campaign, the "last N data days" spend
 *   used by the gone-dark alerts, and the per-term counters behind wasted
 *   spend. Switching the period or the scope re-runs only this pass.
 *
 * Window semantics follow `metrics.ts`: daily rows count when their day is in
 * the window; summary rows (with `endDate`) count in full when their period
 * overlaps it. Summary rows never enter the daily series.
 */

import {
  acos as acosOf,
  cpc as cpcOf,
  ctr as ctrOf,
  cvr as cvrOf,
  emptyCounters,
  fxRate,
  roas as roasOf,
  type DateWindow,
} from "../../../lib/ppc/metrics";
import { norm, termKey } from "../../../lib/ppc/keys";
import { protectedMatch } from "../../../lib/ppc/rules";
import type { ActionType, ConsoleSettings, Counters, Decision, Recommendation, SearchTermRow, Store } from "../../../lib/ppc/types";
import { day, money, pct } from "../format";
import { decisionMap } from "../work/decisions";

/* ------------------------------------------------------------------ dates */

const DAY_MS = 86_400_000;

/** "2026-09-28" → whole days since 1970-01-01 (UTC). */
export function dayNumber(iso: string): number {
  return Math.round(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10)) / DAY_MS);
}

/** Inverse of `dayNumber`. */
export function isoFromDay(n: number): string {
  return new Date(n * DAY_MS).toISOString().slice(0, 10);
}

export const PERIOD_OPTIONS = [7, 14, 30, 60, 90] as const;
export type PeriodDays = (typeof PERIOD_OPTIONS)[number];
export const DEFAULT_PERIOD: PeriodDays = 30;

export function isPeriodDays(n: unknown): n is PeriodDays {
  return typeof n === "number" && (PERIOD_OPTIONS as readonly number[]).includes(n);
}

/** How old the latest data is. `stale` when it is more than `staleDays` before today. */
export function freshness(latest: string | undefined, today: string, staleDays = 3): { daysOld: number; stale: boolean } {
  if (!latest) return { daysOld: NaN, stale: false };
  const daysOld = dayNumber(today) - dayNumber(latest);
  return { daysOld, stale: daysOld > staleDays };
}

/* ------------------------------------------------------------------ index */

export interface CampaignRef {
  storeIdx: number;
  storeId: string;
  /** Original-case name from the first row seen. */
  name: string;
}

export interface TermRef {
  storeIdx: number;
  campaignIdx: number;
  /** Index into `storeTerms`: the same search term anywhere in the store. */
  storeTermIdx: number;
  campaign: string;
  adGroup: string;
  term: string;
}

export interface OverviewIndex {
  size: number;
  storeIds: string[];
  campaigns: CampaignRef[];
  terms: TermRef[];
  /** Normalised search term text per store-wide term. */
  storeTerms: { storeIdx: number; term: string }[];
  /** Per row: first / last day number (equal for daily rows), term index, summary flag. */
  start: Int32Array;
  end: Int32Array;
  term: Int32Array;
  summary: Uint8Array;
  impressions: Float64Array;
  clicks: Float64Array;
  spend: Float64Array;
  sales: Float64Array;
  orders: Float64Array;
  units: Float64Array;
  /** Per term: its store index (hot-loop lookup). */
  termStore: Int32Array;
  termCampaign: Int32Array;
  termStoreTerm: Int32Array;
  /** Per store index: latest / earliest day number in all its rows. */
  latestByStore: number[];
  earliestByStore: number[];
  dailyRows: number;
  summaryRows: number;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Intern every row once. Keys are normalised (`termKey`) so case / spacing
 * differences between two imports of the same campaign land on one entity;
 * a raw-string cache keeps normalisation to once per distinct spelling.
 */
export function buildOverviewIndex(rows: readonly SearchTermRow[]): OverviewIndex {
  const n = rows.length;
  const start = new Int32Array(n);
  const end = new Int32Array(n);
  const termCol = new Int32Array(n);
  const summary = new Uint8Array(n);
  const impressions = new Float64Array(n);
  const clicks = new Float64Array(n);
  const spend = new Float64Array(n);
  const sales = new Float64Array(n);
  const orders = new Float64Array(n);
  const units = new Float64Array(n);

  const storeIds: string[] = [];
  const storeMap = new Map<string, number>();
  const campaigns: CampaignRef[] = [];
  const campaignMap = new Map<string, number>();
  const terms: TermRef[] = [];
  const termRaw = new Map<string, number>();
  const termNorm = new Map<string, number>();
  const storeTerms: { storeIdx: number; term: string }[] = [];
  const storeTermMap = new Map<string, number>();
  const dayCache = new Map<string, number>();
  const latestByStore: number[] = [];
  const earliestByStore: number[] = [];
  let dailyRows = 0;
  let summaryRows = 0;

  const dayOf = (iso: string): number => {
    let d = dayCache.get(iso);
    if (d === undefined) {
      d = dayNumber(iso);
      dayCache.set(iso, d);
    }
    return d;
  };

  for (let i = 0; i < n; i++) {
    const r = rows[i];
    let s = storeMap.get(r.storeId);
    if (s === undefined) {
      s = storeIds.length;
      storeIds.push(r.storeId);
      storeMap.set(r.storeId, s);
    }
    const raw = `${s}\u0000${r.campaign}\u0000${r.adGroup}\u0000${r.searchTerm}`;
    let t = termRaw.get(raw);
    if (t === undefined) {
      const nk = `${s}|${termKey(r.campaign, r.adGroup, r.searchTerm)}`;
      t = termNorm.get(nk);
      if (t === undefined) {
        const ck = `${s}|${norm(r.campaign)}`;
        let c = campaignMap.get(ck);
        if (c === undefined) {
          c = campaigns.length;
          campaigns.push({ storeIdx: s, storeId: r.storeId, name: (r.campaign ?? "").trim() || "(no campaign)" });
          campaignMap.set(ck, c);
        }
        const normTerm = norm(r.searchTerm);
        const sk = `${s}|${normTerm}`;
        let st = storeTermMap.get(sk);
        if (st === undefined) {
          st = storeTerms.length;
          storeTerms.push({ storeIdx: s, term: normTerm });
          storeTermMap.set(sk, st);
        }
        t = terms.length;
        terms.push({
          storeIdx: s,
          campaignIdx: c,
          storeTermIdx: st,
          campaign: (r.campaign ?? "").trim(),
          adGroup: (r.adGroup ?? "").trim(),
          term: (r.searchTerm ?? "").trim(),
        });
        termNorm.set(nk, t);
      }
      termRaw.set(raw, t);
    }
    termCol[i] = t;

    const a = dayOf(r.date);
    const b = r.endDate ? dayOf(r.endDate) : a;
    start[i] = a;
    end[i] = b < a ? a : b;
    if (r.endDate) {
      summary[i] = 1;
      summaryRows++;
    } else {
      dailyRows++;
    }
    impressions[i] = num(r.impressions);
    clicks[i] = num(r.clicks);
    spend[i] = num(r.spend);
    sales[i] = num(r.sales);
    orders[i] = num(r.orders);
    units[i] = num(r.units);

    const last = end[i];
    if (latestByStore[s] === undefined || last > latestByStore[s]) latestByStore[s] = last;
    if (earliestByStore[s] === undefined || a < earliestByStore[s]) earliestByStore[s] = a;
  }

  const termStore = new Int32Array(terms.length);
  const termCampaign = new Int32Array(terms.length);
  const termStoreTerm = new Int32Array(terms.length);
  terms.forEach((t, i) => {
    termStore[i] = t.storeIdx;
    termCampaign[i] = t.campaignIdx;
    termStoreTerm[i] = t.storeTermIdx;
  });

  return {
    size: n,
    storeIds,
    campaigns,
    terms,
    storeTerms,
    start,
    end,
    term: termCol,
    summary,
    impressions,
    clicks,
    spend,
    sales,
    orders,
    units,
    termStore,
    termCampaign,
    termStoreTerm,
    latestByStore,
    earliestByStore,
    dailyRows,
    summaryRows,
  };
}

/* ----------------------------------------------------------------- period */

type Fx = Pick<ConsoleSettings, "baseCurrency" | "fxRates">;

export interface PeriodOptions {
  days: number;
  /** Stores in scope, in display order. Rows of any other store are ignored. */
  stores: readonly Store[];
  fx: Fx;
  /** All-stores scope: money is converted to the base currency for totals. */
  convert: boolean;
  /** Trailing data days checked by the gone-dark alerts. Default 3. */
  darkDays?: number;
}

export interface StorePeriod {
  store: Store;
  /** Display-currency units per 1 unit of store currency: 1 when not converting, NaN when the FX rate is missing. */
  rate: number;
  /** Base-currency units per 1 unit of store currency (NaN when missing). */
  baseRate: number;
  /** Store currency. */
  cur: Counters;
  prev: Counters;
  /** Spend in the scope's last `darkDays` data days (store currency). */
  recentSpend: number;
  /** Latest / earliest data date for the store across all of its rows. */
  latest?: string;
  earliest?: string;
  /** The previous window is fully inside the store's data span. */
  prevCovered: boolean;
  /** Campaigns with spend in the current period. */
  activeCampaigns: number;
}

export interface CampaignPeriod {
  /** Index into `OverviewIndex.campaigns` — stable key for React. */
  index: number;
  storeId: string;
  name: string;
  rate: number;
  /** Store currency. */
  cur: Counters;
  prev: Counters;
  /** Spend per day of the current window, oldest first (daily rows only, store currency). */
  spark: number[];
  /** Spend in the store's own last `darkDays` data days (store currency). */
  recentSpend: number;
}

export interface DailyPoint {
  date: string;
  /** Display currency; stores without an FX rate are left out. */
  total: Counters;
  /** Aligned with `PeriodResult.stores`; money in display currency (NaN when the rate is missing). */
  byStore: Counters[];
  /**
   * The same, summed over the trailing `ROLLING_DAYS` days ending on this day
   * (reaching back before the window when that data exists). Daily ACoS on a
   * small store swings wildly; the rolling figure is what the chart plots.
   */
  total7: Counters;
  byStore7: Counters[];
}

/** Days in the rolling ACoS shown on the trend chart. */
export const ROLLING_DAYS = 7;

export type WasteKind = "dead" | "watching";

export interface WastedTerm {
  storeId: string;
  term: string;
  campaign: string;
  adGroup: string;
  clicks: number;
  /** Display currency. */
  spend: number;
  /** Store currency. */
  spendNative: number;
  kind: WasteKind;
  /** Brand / competitor terms are never negated, so they never count as dead clicks. */
  protectedKind?: "brand" | "competitor";
}

export interface WastedByStore {
  storeId: string;
  /** Display currency (NaN when the store has no FX rate). */
  total: number;
  dead: number;
  watching: number;
  /** Store currency. */
  totalNative: number;
  terms: number;
}

export interface WastedSummary {
  /** Display currency, stores with a rate only. */
  total: number;
  dead: number;
  watching: number;
  deadTerms: number;
  watchingTerms: number;
  /** total × 30 ÷ days of data in the period (the period, or less when the data starts inside it). */
  monthly: number;
  deadMonthly: number;
  /** total ÷ current spend. */
  share: number;
  byStore: WastedByStore[];
  /** Five biggest wasted terms (campaign + ad group + term). */
  top: WastedTerm[];
  /** Click threshold used for "dead" when every store in scope shares it; undefined when they differ. */
  negateClicks?: number;
}

export interface PeriodResult {
  days: number;
  /** null when the scope has no rows. */
  window: DateWindow | null;
  previous: DateWindow | null;
  latest?: string;
  earliest?: string;
  /** Display currency: the base currency when converting, else the store's own. */
  currency: string;
  convert: boolean;
  stores: StorePeriod[];
  /** Store ids left out of totals because their currency has no FX rate. */
  excluded: string[];
  /** Display currency. */
  total: { cur: Counters; prev: Counters };
  /**
   * Every store in the totals has data covering the whole previous window, so
   * period totals compare like for like.
   */
  prevCovered: boolean;
  /** Stores whose data starts after the previous window begins (why `prevCovered` is false). */
  prevGaps: { storeId: string; earliest: string }[];
  /** Any data at all in the previous window. */
  prevHasData: boolean;
  /** Current-spend-weighted target and break-even ACoS (plain mean when there is no spend). */
  target: { acos: number; breakEven: number };
  /** Campaigns with activity in either period, current spend descending. */
  campaigns: CampaignPeriod[];
  /** One point per day of the window; empty when the window has no daily rows. */
  daily: DailyPoint[];
  dailyRowsInWindow: number;
  summaryRowsInWindow: number;
  /** Smallest `lagDays` among stores in scope (the trailing days whose sales are still attributing). */
  lagDays: number;
  wasted: WastedSummary;
}

const FIELDS = 6; // impressions, clicks, spend, sales, orders, units

function addRowInto(buf: Float64Array, offset: number, ix: OverviewIndex, i: number): void {
  buf[offset] += ix.impressions[i];
  buf[offset + 1] += ix.clicks[i];
  buf[offset + 2] += ix.spend[i];
  buf[offset + 3] += ix.sales[i];
  buf[offset + 4] += ix.orders[i];
  buf[offset + 5] += ix.units[i];
}

function countersAt(buf: Float64Array, offset: number, rate = 1): Counters {
  return {
    impressions: buf[offset],
    clicks: buf[offset + 1],
    spend: buf[offset + 2] * rate,
    sales: buf[offset + 3] * rate,
    orders: buf[offset + 4],
    units: buf[offset + 5],
  };
}

function scaleMoney(c: Counters, rate: number): Counters {
  return rate === 1 ? { ...c } : { ...c, spend: c.spend * rate, sales: c.sales * rate };
}

function addCountersInto(t: Counters, c: Counters): void {
  t.impressions += c.impressions;
  t.clicks += c.clicks;
  t.spend += c.spend;
  t.sales += c.sales;
  t.orders += c.orders;
  t.units += c.units;
}

const hasActivity = (c: Counters) => c.spend > 0 || c.clicks > 0 || c.impressions > 0 || c.sales > 0;

function emptyWasted(): WastedSummary {
  return { total: 0, dead: 0, watching: 0, deadTerms: 0, watchingTerms: 0, monthly: 0, deadMonthly: 0, share: NaN, byStore: [], top: [] };
}

/**
 * Everything the overview shows for one period, in one pass over the index.
 * The window ends on the latest data date across the stores in scope.
 */
export function computePeriod(index: OverviewIndex, opts: PeriodOptions): PeriodResult {
  const days = Math.max(1, Math.floor(opts.days));
  const darkDays = Math.max(1, Math.floor(opts.darkDays ?? 3));
  const stores = opts.stores;
  const S = stores.length;
  const baseCurrency = opts.fx.baseCurrency.toUpperCase();
  const currency = opts.convert ? baseCurrency : (stores[0]?.currency ?? baseCurrency).toUpperCase();

  // Map index store slots → period store slots.
  const slotOf = new Int32Array(index.storeIds.length).fill(-1);
  const byId = new Map<string, number>();
  stores.forEach((s, i) => byId.set(s.id, i));
  index.storeIds.forEach((id, i) => {
    const p = byId.get(id);
    if (p !== undefined) slotOf[i] = p;
  });

  const storeLatest: number[] = new Array(S).fill(NaN);
  const storeEarliest: number[] = new Array(S).fill(NaN);
  let latest = -Infinity;
  let earliest = Infinity;
  index.storeIds.forEach((_, i) => {
    const p = slotOf[i];
    if (p < 0 || index.latestByStore[i] === undefined) return;
    storeLatest[p] = index.latestByStore[i];
    storeEarliest[p] = index.earliestByStore[i];
    if (index.latestByStore[i] > latest) latest = index.latestByStore[i];
    if (index.earliestByStore[i] < earliest) earliest = index.earliestByStore[i];
  });

  const baseRates = stores.map((s) => fxRate(s.currency, opts.fx));
  const rates = stores.map((s, i) => (opts.convert ? baseRates[i] : 1));
  const excluded = opts.convert ? stores.filter((_, i) => !Number.isFinite(rates[i])).map((s) => s.id) : [];
  const lagDays = S ? Math.min(...stores.map((s) => Math.max(0, Math.floor(s.rules?.lagDays ?? 2)))) : 2;

  const makeStore = (i: number, cur: Counters, prev: Counters, recentSpend: number, activeCampaigns: number): StorePeriod => ({
    store: stores[i],
    rate: rates[i],
    baseRate: baseRates[i],
    cur,
    prev,
    recentSpend,
    latest: Number.isFinite(storeLatest[i]) ? isoFromDay(storeLatest[i]) : undefined,
    earliest: Number.isFinite(storeEarliest[i]) ? isoFromDay(storeEarliest[i]) : undefined,
    prevCovered: false,
    activeCampaigns,
  });

  if (!Number.isFinite(latest)) {
    return {
      days,
      window: null,
      previous: null,
      currency,
      convert: opts.convert,
      stores: stores.map((_, i) => makeStore(i, emptyCounters(), emptyCounters(), 0, 0)),
      excluded,
      total: { cur: emptyCounters(), prev: emptyCounters() },
      prevCovered: false,
      prevGaps: [],
      prevHasData: false,
      target: weightedTarget(
        stores,
        stores.map(() => 0),
      ),
      campaigns: [],
      daily: [],
      dailyRowsInWindow: 0,
      summaryRowsInWindow: 0,
      lagDays,
      wasted: emptyWasted(),
    };
  }

  const to = latest;
  const from = to - days + 1;
  const pto = from - 1;
  const pfrom = from - days;
  const scopeRecentFrom = to - darkDays + 1;
  const storeRecentFrom = storeLatest.map((d) => (Number.isFinite(d) ? d - darkDays + 1 : Infinity));

  const C = index.campaigns.length;
  const T = index.terms.length;
  const storeCur = new Float64Array(S * FIELDS);
  const storePrev = new Float64Array(S * FIELDS);
  const storeRecent = new Float64Array(S);
  const campCur = new Float64Array(C * FIELDS);
  const campPrev = new Float64Array(C * FIELDS);
  const campRecent = new Float64Array(C);
  const campSpark = new Float64Array(C * days);
  // Daily buckets reach ROLLING_DAYS − 1 days before the window for the rolling series.
  const lead = ROLLING_DAYS - 1;
  const dayCount = days + lead;
  const dStart = from - lead;
  const daily = new Float64Array(S * dayCount * FIELDS);
  const termClicks = new Float64Array(T);
  const termSpend = new Float64Array(T);
  const termOrders = new Float64Array(T);
  const storeTermOrders = new Float64Array(index.storeTerms.length);
  let dailyRowsInWindow = 0;
  let summaryRowsInWindow = 0;
  let prevRows = 0;

  const {
    start,
    end,
    term,
    summary,
    spend: spendCol,
    orders: ordersCol,
    clicks: clicksCol,
    termStore,
    termCampaign,
    termStoreTerm,
  } = index;
  for (let i = 0; i < index.size; i++) {
    const t = term[i];
    const p = slotOf[termStore[t]];
    if (p < 0) continue;
    const a = start[i];
    const b = end[i];
    if (b < pfrom) continue; // older than anything we look at
    const c = termCampaign[t];
    if (a <= to && b >= from) {
      addRowInto(storeCur, p * FIELDS, index, i);
      addRowInto(campCur, c * FIELDS, index, i);
      termClicks[t] += clicksCol[i];
      termSpend[t] += spendCol[i];
      termOrders[t] += ordersCol[i];
      storeTermOrders[termStoreTerm[t]] += ordersCol[i];
      if (summary[i]) {
        summaryRowsInWindow++;
      } else {
        dailyRowsInWindow++;
        campSpark[c * days + (a - from)] += spendCol[i];
      }
    }
    if (!summary[i] && a >= dStart && a <= to) addRowInto(daily, (p * dayCount + (a - dStart)) * FIELDS, index, i);
    if (a <= pto && b >= pfrom) {
      addRowInto(storePrev, p * FIELDS, index, i);
      addRowInto(campPrev, c * FIELDS, index, i);
      prevRows++;
    }
    if (b >= scopeRecentFrom) storeRecent[p] += spendCol[i];
    if (b >= storeRecentFrom[p]) campRecent[c] += spendCol[i];
  }

  /* ---- campaigns */
  const campaigns: CampaignPeriod[] = [];
  const activeByStore = new Array<number>(S).fill(0);
  for (let c = 0; c < C; c++) {
    const ref = index.campaigns[c];
    const p = slotOf[ref.storeIdx];
    if (p < 0) continue;
    const cur = countersAt(campCur, c * FIELDS);
    const prev = countersAt(campPrev, c * FIELDS);
    if (!hasActivity(cur) && !hasActivity(prev)) continue;
    if (cur.spend > 0) activeByStore[p]++;
    campaigns.push({
      index: c,
      storeId: ref.storeId,
      name: ref.name,
      rate: rates[p],
      cur,
      prev,
      spark: Array.from(campSpark.subarray(c * days, (c + 1) * days)),
      recentSpend: campRecent[c],
    });
  }
  campaigns.sort((x, y) => y.cur.spend * safeRate(y.rate) - x.cur.spend * safeRate(x.rate) || x.name.localeCompare(y.name));

  /* ---- stores + totals */
  const storeResults: StorePeriod[] = [];
  const total = { cur: emptyCounters(), prev: emptyCounters() };
  const curSpendDisplay: number[] = [];
  for (let p = 0; p < S; p++) {
    const cur = countersAt(storeCur, p * FIELDS);
    const prev = countersAt(storePrev, p * FIELDS);
    const sp = makeStore(p, cur, prev, storeRecent[p], activeByStore[p]);
    sp.prevCovered = Number.isFinite(storeEarliest[p]) && storeEarliest[p] <= pfrom;
    storeResults.push(sp);
    const r = rates[p];
    if (Number.isFinite(r)) {
      addCountersInto(total.cur, scaleMoney(cur, r));
      addCountersInto(total.prev, scaleMoney(prev, r));
      curSpendDisplay.push(cur.spend * r);
    } else {
      curSpendDisplay.push(0);
    }
  }

  const prevGaps = storeResults
    .filter((sp) => sp.earliest && !sp.prevCovered && Number.isFinite(sp.rate))
    .map((sp) => ({ storeId: sp.store.id, earliest: sp.earliest as string }));

  /* ---- daily */
  const dailyPoints: DailyPoint[] = [];
  if (dailyRowsInWindow > 0) {
    for (let d = 0; d < days; d++) {
      const k = d + lead;
      const byStore: Counters[] = [];
      const byStore7: Counters[] = [];
      const tot = emptyCounters();
      const tot7 = emptyCounters();
      for (let p = 0; p < S; p++) {
        const r = rates[p];
        const c = countersAt(daily, (p * dayCount + k) * FIELDS, r);
        const c7 = emptyCounters();
        for (let j = k - lead; j <= k; j++) addCountersInto(c7, countersAt(daily, (p * dayCount + j) * FIELDS, r));
        byStore.push(c);
        byStore7.push(c7);
        if (Number.isFinite(r)) {
          addCountersInto(tot, c);
          addCountersInto(tot7, c7);
        }
      }
      dailyPoints.push({ date: isoFromDay(from + d), total: tot, byStore, total7: tot7, byStore7 });
    }
  }

  /* ---- wasted spend */
  const wasted = computeWasted(index, {
    stores,
    slotOf,
    rates,
    termClicks,
    termSpend,
    termOrders,
    storeTermOrders,
    // Run-rate over the days the data covers: a period longer than the data
    // (90 days of a 20-day history) must not dilute the monthly figure.
    days: Math.max(1, Math.min(days, to - Math.max(from, earliest) + 1)),
    curSpend: total.cur.spend,
  });

  return {
    days,
    window: { from: isoFromDay(from), to: isoFromDay(to) },
    previous: { from: isoFromDay(pfrom), to: isoFromDay(pto) },
    latest: isoFromDay(latest),
    earliest: isoFromDay(earliest),
    currency,
    convert: opts.convert,
    stores: storeResults,
    excluded,
    total,
    prevCovered: prevGaps.length === 0,
    prevGaps,
    prevHasData: prevRows > 0,
    target: weightedTarget(stores, curSpendDisplay),
    campaigns,
    daily: dailyPoints,
    dailyRowsInWindow,
    summaryRowsInWindow,
    lagDays,
    wasted,
  };
}

function safeRate(r: number): number {
  return Number.isFinite(r) ? r : 0;
}

/** Current-spend-weighted target / break-even ACoS; plain mean when nothing was spent. */
export function weightedTarget(stores: readonly Pick<Store, "economics">[], spend: readonly number[]): { acos: number; breakEven: number } {
  if (!stores.length) return { acos: NaN, breakEven: NaN };
  let w = 0;
  let t = 0;
  let be = 0;
  stores.forEach((s, i) => {
    const x = spend[i] > 0 && Number.isFinite(spend[i]) ? spend[i] : 0;
    w += x;
    t += x * s.economics.targetAcos;
    be += x * s.economics.breakEvenAcos;
  });
  if (w > 0) return { acos: t / w, breakEven: be / w };
  const mean = (f: (s: Pick<Store, "economics">) => number) => stores.reduce((sum, s) => sum + f(s), 0) / stores.length;
  return { acos: mean((s) => s.economics.targetAcos), breakEven: mean((s) => s.economics.breakEvenAcos) };
}

interface WastedInput {
  stores: readonly Store[];
  slotOf: Int32Array;
  rates: number[];
  termClicks: Float64Array;
  termSpend: Float64Array;
  termOrders: Float64Array;
  storeTermOrders: Float64Array;
  /** Days of data in the period — the monthly run-rate divisor. */
  days: number;
  curSpend: number;
}

/**
 * Wasted spend: spend on a search term (campaign + ad group + term — the unit
 * the engine negates) with 0 orders in the period, counted only when the term
 * has no orders anywhere in the store during the period (spend on a term that
 * converts in another ad group is routing, not waste — the engine never
 * negates it either).
 *
 * "dead" = at least the store's `negateClicks` clicks: the engine's negate
 * rule, recoverable now. "watching" = fewer clicks, or a brand / competitor
 * term (never negated).
 */
function computeWasted(index: OverviewIndex, w: WastedInput): WastedSummary {
  const out = emptyWasted();
  const S = w.stores.length;
  const byStore: WastedByStore[] = w.stores.map((s) => ({ storeId: s.id, total: 0, dead: 0, watching: 0, totalNative: 0, terms: 0 }));
  const protectedCache = new Map<number, "brand" | "competitor" | null>();
  const candidates: WastedTerm[] = [];
  const thresholds = new Set<number>();
  for (const s of w.stores) thresholds.add(s.rules?.negateClicks ?? 15);

  for (let t = 0; t < index.terms.length; t++) {
    const spend = w.termSpend[t];
    if (!(spend > 0) || w.termOrders[t] !== 0) continue;
    const ref = index.terms[t];
    if (w.storeTermOrders[ref.storeTermIdx] !== 0) continue;
    const p = w.slotOf[ref.storeIdx];
    if (p < 0 || p >= S) continue;
    const store = w.stores[p];
    let prot = protectedCache.get(ref.storeTermIdx);
    if (prot === undefined) {
      prot = protectedMatch(ref.term, store)?.kind ?? null;
      protectedCache.set(ref.storeTermIdx, prot);
    }
    const clicks = w.termClicks[t];
    const kind: WasteKind = !prot && clicks >= (store.rules?.negateClicks ?? 15) ? "dead" : "watching";
    const rate = w.rates[p];
    const display = spend * rate;
    const bs = byStore[p];
    bs.totalNative += spend;
    bs.terms++;
    if (Number.isFinite(rate)) {
      bs.total += display;
      if (kind === "dead") bs.dead += display;
      else bs.watching += display;
      out.total += display;
      if (kind === "dead") {
        out.dead += display;
        out.deadTerms++;
      } else {
        out.watching += display;
        out.watchingTerms++;
      }
      candidates.push({
        storeId: store.id,
        term: ref.term,
        campaign: ref.campaign,
        adGroup: ref.adGroup,
        clicks,
        spend: display,
        spendNative: spend,
        kind,
        ...(prot ? { protectedKind: prot } : {}),
      });
    } else {
      bs.total = NaN;
      bs.dead = NaN;
      bs.watching = NaN;
    }
  }

  candidates.sort((a, b) => b.spend - a.spend || b.clicks - a.clicks || a.term.localeCompare(b.term));
  out.top = candidates.slice(0, 5);
  out.monthly = (out.total * 30) / w.days;
  out.deadMonthly = (out.dead * 30) / w.days;
  out.share = w.curSpend > 0 ? out.total / w.curSpend : NaN;
  out.byStore = byStore;
  out.negateClicks = thresholds.size === 1 ? [...thresholds][0] : undefined;
  return out;
}

/* ----------------------------------------------------------------- deltas */

export type Better = "up" | "down" | "neutral";
export type DeltaTone = "good" | "bad" | "neutral";

export interface MetricDelta {
  /** Relative change (0.12 = +12%) or ratio points (0.012 = +1.2 pts). */
  value: number;
  kind: "relative" | "points";
  direction: "up" | "down" | "flat";
  tone: DeltaTone;
  label: string;
}

const FLAT_RELATIVE = 0.005; // ±0.5 %
const FLAT_POINTS = 0.0005; // ±0.05 pts

function toneFor(direction: MetricDelta["direction"], better: Better): DeltaTone {
  if (direction === "flat" || better === "neutral") return "neutral";
  return (direction === "up") === (better === "up") ? "good" : "bad";
}

function signed(n: number, digits: number, suffix: string): string {
  const text = Math.abs(n).toFixed(digits);
  // No sign on a value that rounds to zero ("0.0 pts", never "−0.0 pts").
  const sign = Number(text) === 0 ? "" : n > 0 ? "+" : "−";
  return `${sign}${text}${suffix}`;
}

/** Relative change label: "+12.3%", "−4%", "+240%". */
export function formatRelative(value: number): string {
  if (!Number.isFinite(value)) return "—";
  const p = value * 100;
  return signed(p, Math.abs(p) < 10 ? 1 : 0, "%");
}

/** Ratio-points label: 0.012 → "+1.2 pts". */
export function formatPoints(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return signed(value * 100, 1, " pts");
}

/** (cur − prev) ÷ prev. null when there is no usable baseline. */
export function relativeDelta(cur: number, prev: number, better: Better): MetricDelta | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev <= 0) return null;
  const value = (cur - prev) / prev;
  const direction = Math.abs(value) < FLAT_RELATIVE ? "flat" : value > 0 ? "up" : "down";
  return { value, kind: "relative", direction, tone: toneFor(direction, better), label: formatRelative(value) };
}

/** cur − prev for ratios, shown in percentage points. null when either side is undefined. */
export function pointsDelta(cur: number, prev: number, better: Better): MetricDelta | null {
  if (!Number.isFinite(cur) || !Number.isFinite(prev)) return null;
  const value = cur - prev;
  const direction = Math.abs(value) < FLAT_POINTS ? "flat" : value > 0 ? "up" : "down";
  return { value, kind: "points", direction, tone: toneFor(direction, better), label: formatPoints(value) };
}

/**
 * ACoS verdict against a target: at or under target is good; up to break-even
 * (or 20% over target when break-even is not above it) is the warning band;
 * beyond that the ads lose money. Spend with no sales is bad; no spend is neutral.
 */
export function acosTone(acos: number, target: number, breakEven: number, spend = 1): "good" | "warn" | "bad" | "neutral" {
  if (!Number.isFinite(acos)) return spend > 0 ? "bad" : "neutral";
  if (!Number.isFinite(target) || target <= 0) return "neutral";
  if (acos <= target) return "good";
  const ceiling = Number.isFinite(breakEven) && breakEven > target ? breakEven : target * 1.2;
  return acos <= ceiling ? "warn" : "bad";
}

/* ------------------------------------------------------------------- KPIs */

export type KpiKey = "spend" | "sales" | "acos" | "roas" | "orders" | "cpc" | "ctr" | "cvr";
export type KpiFormat = "money" | "moneyPrecise" | "pct" | "ratio" | "count";

export interface Kpi {
  key: KpiKey;
  label: string;
  value: number;
  prev: number;
  format: KpiFormat;
  delta: MetricDelta | null;
  /** Tone of the value itself (ACoS vs target only). */
  tone?: "good" | "warn" | "bad" | "neutral";
}

/**
 * The eight headline tiles. Totals (spend, sales, orders) only get a delta
 * when the previous window is fully covered by data — comparing 30 days with
 * a partly-imported 12 would read as a collapse. Rates only need some data.
 */
export function buildKpis(period: Pick<PeriodResult, "total" | "prevCovered" | "prevHasData" | "target">): Kpi[] {
  const { cur, prev } = period.total;
  const totals = period.prevCovered;
  const rates = period.prevHasData;
  const k = (
    key: KpiKey,
    label: string,
    value: number,
    prevValue: number,
    format: KpiFormat,
    delta: MetricDelta | null,
    tone?: Kpi["tone"],
  ): Kpi => ({
    key,
    label,
    value,
    prev: prevValue,
    format,
    delta,
    ...(tone ? { tone } : {}),
  });
  const a = acosOf(cur);
  return [
    k("spend", "Spend", cur.spend, prev.spend, "money", totals ? relativeDelta(cur.spend, prev.spend, "neutral") : null),
    k("sales", "Sales", cur.sales, prev.sales, "money", totals ? relativeDelta(cur.sales, prev.sales, "up") : null),
    k(
      "acos",
      "ACoS",
      a,
      acosOf(prev),
      "pct",
      rates ? pointsDelta(a, acosOf(prev), "down") : null,
      acosTone(a, period.target.acos, period.target.breakEven, cur.spend),
    ),
    k("roas", "ROAS", roasOf(cur), roasOf(prev), "ratio", rates ? relativeDelta(roasOf(cur), roasOf(prev), "up") : null),
    k("orders", "Orders", cur.orders, prev.orders, "count", totals ? relativeDelta(cur.orders, prev.orders, "up") : null),
    k("cpc", "CPC", cpcOf(cur), cpcOf(prev), "moneyPrecise", rates ? relativeDelta(cpcOf(cur), cpcOf(prev), "down") : null),
    k("ctr", "CTR", ctrOf(cur), ctrOf(prev), "pct", rates ? pointsDelta(ctrOf(cur), ctrOf(prev), "up") : null),
    k("cvr", "CVR", cvrOf(cur), cvrOf(prev), "pct", rates ? pointsDelta(cvrOf(cur), cvrOf(prev), "up") : null),
  ];
}

/* ----------------------------------------------------------------- alerts */

export type AlertSeverity = "critical" | "warning" | "info";
export type AlertKind = "acos-spike" | "cpc-inflation" | "gone-dark" | "concentration" | "stale-data" | "missing-fx" | "no-bulk";

export type AlertLink =
  /** Switch the overview to this store. */
  | { kind: "scope"; storeId: string; label: string }
  /** Navigate; when `storeId` is set, switch scope to it first. */
  | { kind: "href"; href: string; storeId?: string; label: string };

export interface OverviewAlert {
  id: string;
  kind: AlertKind;
  severity: AlertSeverity;
  title: string;
  detail: string;
  storeId?: string;
  campaign?: string;
  link: AlertLink;
  /** Sort weight within a severity (bigger first). */
  magnitude: number;
}

export const ALERT_RULES = {
  /** ACoS up more than 25% vs the previous period. */
  acosSpike: 0.25,
  /** …and critical at +50% when current ACoS is also above target. */
  acosSpikeCritical: 0.5,
  /** CPC up more than 20%. */
  cpcInflation: 0.2,
  /** Trailing data days checked for "gone dark". */
  darkDays: 3,
  /** One campaign above this share of its store's spend. */
  concentration: 0.5,
  /** Latest data more than this many days before today. */
  staleDays: 3,
  staleCritical: 7,
  /** A campaign must carry at least this share of its store's current spend to raise a spike alert. */
  minCampaignShare: 0.05,
  /** …and at least this much spend, in base currency (skipped when the store has no FX rate). */
  minSpendBase: 20,
  /** ACoS comparisons need this many orders in the previous period. */
  minPrevOrders: 3,
  /**
   * …and the order shortfall must be real: at the previous ACoS, this period's
   * spend should have bought E orders; the alert fires only when the observed
   * orders sit at least this many Poisson standard deviations (√E) below E and
   * at least 2 orders short. Keeps a 7-day view of small campaigns quiet.
   */
  acosSpikeMinZ: 2,
  /** CPC comparisons need this many clicks in both periods. */
  minClicks: 20,
} as const;

export interface AlertInput {
  period: PeriodResult;
  today: string;
  /** All-stores scope: FX alerts apply and store-level rows are compared. */
  allScope: boolean;
  /** Currencies with no FX rate (All scope). */
  missingFx: readonly string[];
  /** Store ids with a bulk file imported. */
  bulkStores: ReadonlySet<string>;
  rules?: Partial<typeof ALERT_RULES>;
}

const SEVERITY_RANK: Record<AlertSeverity, number> = { critical: 0, warning: 1, info: 2 };

/** Deterministic alert list, most severe first. */
export function computeAlerts(input: AlertInput): OverviewAlert[] {
  const R = { ...ALERT_RULES, ...input.rules };
  const { period, today } = input;
  const out: OverviewAlert[] = [];
  const storeById = new Map(period.stores.map((s) => [s.store.id, s]));
  const multi = period.stores.length > 1;
  const minSpendNative = (sp: StorePeriod) => (Number.isFinite(sp.baseRate) && sp.baseRate > 0 ? R.minSpendBase / sp.baseRate : 0);
  const baseMoney = (sp: StorePeriod, n: number) => n * safeRate(sp.baseRate);

  /* gone dark (store level) — first, because a lagging store's stale alert folds into it */
  const darkStores = new Set<string>();
  const laggingStores = new Set<string>();
  for (const sp of period.stores) {
    const { store, prev } = sp;
    if (!(prev.spend > 0) || sp.recentSpend !== 0 || !period.latest) continue;
    darkStores.add(store.id);
    const lagging = !!sp.latest && sp.latest < period.latest;
    if (lagging) laggingStores.add(store.id);
    const prefix = multi ? `${store.name}: ` : "";
    out.push({
      id: `gone-dark|${store.id}`,
      kind: "gone-dark",
      severity: "critical",
      title: `${prefix}no spend in the last ${R.darkDays} data days`,
      detail: lagging
        ? `Its data ends ${day(sp.latest)}; the other stores run to ${day(period.latest)}. Import its newer report, or check whether its campaigns stopped.`
        : `It spent ${money(prev.spend, store.currency)} in the previous period. Check budgets, the payment method and campaign status.`,
      storeId: store.id,
      link: lagging
        ? { kind: "href", href: "/dashboard/import", storeId: store.id, label: "Import a report" }
        : multi
          ? { kind: "scope", storeId: store.id, label: "Open store" }
          : { kind: "href", href: "/dashboard/bids", storeId: store.id, label: "Review targets" },
      // Whole stores outrank single campaigns within a severity.
      magnitude: 1e5 + baseMoney(sp, prev.spend),
    });
  }

  /* stale data */
  const staleStores: { sp: StorePeriod; daysOld: number }[] = [];
  for (const sp of period.stores) {
    if (!sp.latest) continue;
    const f = freshness(sp.latest, today, R.staleDays);
    if (f.stale) staleStores.push({ sp, daysOld: f.daysOld });
  }
  const withData = period.stores.filter((s) => s.latest).length;
  if (multi && staleStores.length > 1 && staleStores.length === withData && new Set(staleStores.map((s) => s.sp.latest)).size === 1) {
    const { sp, daysOld } = staleStores[0];
    out.push({
      id: "stale-data|all",
      kind: "stale-data",
      severity: daysOld > R.staleCritical ? "critical" : "warning",
      title: `Data ends ${day(sp.latest)} (${daysOld} days ago)`,
      detail: `Every store's latest report is more than ${R.staleDays} days old, so this page shows last week's traffic, not today's.`,
      link: { kind: "href", href: "/dashboard/import", label: "Import newer reports" },
      // Data-health alerts affect every number on the page: first within their severity.
      magnitude: 1e6 + daysOld,
    });
  } else {
    for (const { sp, daysOld } of staleStores) {
      if (laggingStores.has(sp.store.id)) continue;
      out.push({
        id: `stale-data|${sp.store.id}`,
        kind: "stale-data",
        severity: daysOld > R.staleCritical ? "critical" : "warning",
        title: `${multi ? `${sp.store.name}: data` : "Data"} ends ${day(sp.latest)} (${daysOld} days ago)`,
        detail: `Reports more than ${R.staleDays} days old hide what the campaigns are doing now. Import the latest Search Term Report.`,
        storeId: sp.store.id,
        link: { kind: "href", href: "/dashboard/import", storeId: sp.store.id, label: "Import a report" },
        magnitude: 1e6 + daysOld,
      });
    }
  }

  /* missing FX */
  if (input.allScope && input.missingFx.length) {
    const affected = period.stores.filter((s) => period.excluded.includes(s.store.id)).map((s) => s.store.name);
    out.push({
      id: "missing-fx",
      kind: "missing-fx",
      severity: "warning",
      title: `No exchange rate for ${input.missingFx.join(", ")}`,
      detail: affected.length
        ? `${affected.join(", ")} ${affected.length === 1 ? "is" : "are"} left out of every all-store total until a rate is added.`
        : "Stores in these currencies are left out of all-store totals until a rate is added.",
      link: { kind: "href", href: "/dashboard/stores#currency", label: "Add rates" },
      magnitude: 1e6 + input.missingFx.length,
    });
  }

  /* no bulk file */
  const noBulk = period.stores.filter((sp) => !input.bulkStores.has(sp.store.id));
  if (noBulk.length === 1) {
    const sp = noBulk[0];
    out.push({
      id: `no-bulk|${sp.store.id}`,
      kind: "no-bulk",
      severity: "info",
      title: `${multi ? `${sp.store.name}: no` : "No"} bulk file imported`,
      detail: "Exports will lack campaign, ad group and keyword IDs, and bids fall back to average CPC.",
      storeId: sp.store.id,
      link: { kind: "href", href: "/dashboard/import", storeId: sp.store.id, label: "Import bulk file" },
      magnitude: 0,
    });
  } else if (noBulk.length > 1) {
    out.push({
      id: "no-bulk|several",
      kind: "no-bulk",
      severity: "info",
      title: `${noBulk.length} stores have no bulk file`,
      detail: `${noBulk.map((s) => s.store.name).join(", ")}: exports will lack IDs and bids fall back to average CPC.`,
      link: { kind: "href", href: "/dashboard/import", label: "Import bulk files" },
      magnitude: 0,
    });
  }

  /* store level: ACoS spike, CPC inflation */
  for (const sp of period.stores) {
    const { store, cur, prev } = sp;
    const prefix = multi ? `${store.name}: ` : "";
    const spike = acosSpike(cur, prev, R);
    if (spike && cur.spend >= minSpendNative(sp) * 5) {
      const curAcos = acosOf(cur);
      const over = Number.isFinite(curAcos) ? curAcos > store.economics.targetAcos : true;
      out.push({
        id: `acos-spike|${store.id}`,
        kind: "acos-spike",
        severity: !over ? "info" : spike.change >= R.acosSpikeCritical ? "critical" : "warning",
        title: `${prefix}ACoS ${spike.label}`,
        detail: spike.noSales
          ? `No sales on ${money(cur.spend, store.currency)} spend this period, against ${pct(acosOf(prev))} ACoS before.`
          : `${pct(acosOf(prev))} → ${pct(curAcos)} against a ${pct(store.economics.targetAcos)} target${over ? "." : " — still under target."}`,
        storeId: store.id,
        link: multi
          ? { kind: "scope", storeId: store.id, label: "Open store" }
          : { kind: "href", href: "/dashboard/bids", storeId: store.id, label: "Review bids" },
        magnitude: capped(spike.change) * 1000 + baseMoney(sp, cur.spend),
      });
    }
    const cpcUp = cpcInflation(cur, prev, R);
    if (cpcUp) {
      out.push({
        id: `cpc-inflation|${store.id}`,
        kind: "cpc-inflation",
        severity: "warning",
        title: `${prefix}CPC ${formatRelative(cpcUp)}`,
        detail: `${money(cpcOf(prev), store.currency)} → ${money(cpcOf(cur), store.currency)} a click. Look for bid raises, placement boosts or a new competitor.`,
        storeId: store.id,
        link: { kind: "href", href: "/dashboard/bids", storeId: store.id, label: "Review bids" },
        magnitude: capped(cpcUp) * 1000,
      });
    }
  }

  /* campaign level */
  const byStoreCampaigns = new Map<string, CampaignPeriod[]>();
  for (const c of period.campaigns) {
    const list = byStoreCampaigns.get(c.storeId);
    if (list) list.push(c);
    else byStoreCampaigns.set(c.storeId, [c]);
  }
  for (const [storeId, list] of byStoreCampaigns) {
    const sp = storeById.get(storeId);
    if (!sp) continue;
    const store = sp.store;
    const suffix = multi ? ` · ${store.name}` : "";
    const minSpend = minSpendNative(sp);
    const storeSpend = sp.cur.spend;

    // Concentration: one campaign above half of the store's spend.
    const spending = list.filter((c) => c.cur.spend > 0);
    if (spending.length >= 2 && storeSpend >= minSpend) {
      const top = spending.reduce((a, b) => (b.cur.spend > a.cur.spend ? b : a));
      const share = top.cur.spend / storeSpend;
      if (share > R.concentration) {
        out.push({
          id: `concentration|${storeId}|${norm(top.name)}`,
          kind: "concentration",
          severity: "info",
          title: `${top.name} takes ${pct(share, 0)} of spend${suffix}`,
          detail: "One budget cap or bid change now swings the whole store. Consider moving proven winners into their own campaign.",
          storeId,
          campaign: top.name,
          link: { kind: "href", href: campaignHref(top.name), storeId, label: "View search terms" },
          magnitude: share,
        });
      }
    }

    for (const c of list) {
      // Gone dark — skipped when the whole store went dark (one alert says it).
      if (!darkStores.has(storeId) && c.prev.spend > 0 && c.recentSpend === 0 && c.prev.spend >= Math.max(minSpend, sp.prev.spend * 0.02)) {
        out.push({
          id: `gone-dark|${storeId}|${norm(c.name)}`,
          kind: "gone-dark",
          severity: "warning",
          title: `${c.name} went dark${suffix}`,
          detail: `${money(c.prev.spend, store.currency)} spend last period, none in the store's last ${R.darkDays} data days. Paused on purpose, or out of budget?`,
          storeId,
          campaign: c.name,
          link: { kind: "href", href: campaignHref(c.name), storeId, label: "View search terms" },
          magnitude: baseMoney(sp, c.prev.spend),
        });
      }

      if (c.cur.spend < Math.max(minSpend, storeSpend * R.minCampaignShare)) continue;
      const spike = acosSpike(c.cur, c.prev, R);
      if (spike) {
        const curAcos = acosOf(c.cur);
        const over = Number.isFinite(curAcos) ? curAcos > store.economics.targetAcos : true;
        out.push({
          id: `acos-spike|${storeId}|${norm(c.name)}`,
          kind: "acos-spike",
          severity: !over ? "info" : spike.change >= R.acosSpikeCritical ? "critical" : "warning",
          title: `${c.name}: ACoS ${spike.label}${suffix}`,
          detail: spike.noSales
            ? `No sales on ${money(c.cur.spend, store.currency)} spend, against ${pct(acosOf(c.prev))} ACoS last period.`
            : `${pct(acosOf(c.prev))} → ${pct(curAcos)} on ${money(c.cur.spend, store.currency)} spend (target ${pct(store.economics.targetAcos)}).`,
          storeId,
          campaign: c.name,
          link: { kind: "href", href: campaignHref(c.name), storeId, label: "View search terms" },
          magnitude: capped(spike.change) * 100 + baseMoney(sp, c.cur.spend) / 1000,
        });
      }
      const cpcUp = cpcInflation(c.cur, c.prev, R);
      if (cpcUp) {
        out.push({
          id: `cpc-inflation|${storeId}|${norm(c.name)}`,
          kind: "cpc-inflation",
          severity: "warning",
          title: `${c.name}: CPC ${formatRelative(cpcUp)}${suffix}`,
          detail: `${money(cpcOf(c.prev), store.currency)} → ${money(cpcOf(c.cur), store.currency)} a click over ${c.cur.clicks.toLocaleString("en-US")} clicks.`,
          storeId,
          campaign: c.name,
          link: { kind: "href", href: "/dashboard/bids", storeId, label: "Review bids" },
          magnitude: capped(cpcUp) * 100,
        });
      }
    }
  }

  out.sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity] || b.magnitude - a.magnitude || a.id.localeCompare(b.id));
  return out;
}

/** Finite sort weight: an unbounded change (no sales at all) ranks as +1000%. */
function capped(change: number): number {
  return Number.isFinite(change) ? Math.min(change, 10) : 10;
}

/** Search-terms page filtered to one campaign (the page may ignore the parameter). */
export function campaignHref(campaign: string): string {
  return `/dashboard/search-terms?campaign=${encodeURIComponent(campaign)}`;
}

/**
 * ACoS up more than `acosSpike` with a real order shortfall behind it (see
 * `acosSpikeMinZ`). Exported for the self-test.
 */
export function acosSpike(
  cur: Counters,
  prev: Counters,
  R: Pick<typeof ALERT_RULES, "acosSpike" | "minPrevOrders" | "acosSpikeMinZ"> = ALERT_RULES,
): { change: number; label: string; noSales: boolean; expectedOrders: number } | null {
  if (prev.orders < R.minPrevOrders || !(prev.sales > 0) || !(cur.spend > 0)) return null;
  const before = prev.spend / prev.sales;
  if (!(before > 0)) return null;
  const aovBefore = prev.sales / prev.orders;
  const expectedOrders = cur.spend / before / aovBefore;
  const shortfall = expectedOrders - cur.orders;
  if (shortfall < 2 || shortfall < R.acosSpikeMinZ * Math.sqrt(expectedOrders)) return null;
  if (!(cur.sales > 0)) return { change: Infinity, label: "with no sales", noSales: true, expectedOrders };
  const change = cur.spend / cur.sales / before - 1;
  return change > R.acosSpike ? { change, label: formatRelative(change), noSales: false, expectedOrders } : null;
}

function cpcInflation(cur: Counters, prev: Counters, R: Pick<typeof ALERT_RULES, "cpcInflation" | "minClicks">): number | null {
  if (cur.clicks < R.minClicks || prev.clicks < R.minClicks) return null;
  const change = cur.spend / cur.clicks / (prev.spend / prev.clicks) - 1;
  return Number.isFinite(change) && change > R.cpcInflation ? change : null;
}

/* -------------------------------------------------------- recommendations */

/** Needs a decision: no decision yet, or a snooze that has run out. */
export function isOpen(decision: Decision | undefined, today: string): boolean {
  if (!decision) return true;
  if (decision.status !== "snoozed") return false;
  return !!decision.snoozeUntil && decision.snoozeUntil.slice(0, 10) <= today;
}

/**
 * Recommendations that still need a decision, order preserved. A decision made
 * for an earlier instance of a rec (work/decisions.ts `isOutdated`) does not count.
 */
export function openRecommendations(recs: readonly Recommendation[], decisions: readonly Decision[], today: string): Recommendation[] {
  if (!decisions.length) return recs.slice();
  const byId = decisionMap(decisions, recs);
  return recs.filter((r) => isOpen(byId.get(r.id), today));
}

/** Companion rows that belong to a harvest: the paired negative and the phrase companion. */
export function isCompanion(r: Recommendation): boolean {
  return !!r.pairedWith && (r.impact ?? 0) === 0 && (r.action.startsWith("negate") || r.action === "harvest-phrase");
}

/** Open recommendation count per store (companions excluded) and how many are high priority. */
export function recCountsByStore(recs: readonly Recommendation[]): Map<string, { total: number; high: number }> {
  const out = new Map<string, { total: number; high: number }>();
  for (const r of recs) {
    if (isCompanion(r)) continue;
    const c = out.get(r.storeId) ?? { total: 0, high: 0 };
    c.total++;
    if (r.priority === "high") c.high++;
    out.set(r.storeId, c);
  }
  return out;
}

/** The first `limit` recommendations worth acting on (companions folded into their harvest). */
export function topActions(recs: readonly Recommendation[], limit = 10): Recommendation[] {
  const out: Recommendation[] = [];
  for (const r of recs) {
    if (isCompanion(r)) continue;
    out.push(r);
    if (out.length >= limit) break;
  }
  return out;
}

export type ActionGroup = "harvest" | "negate" | "bid-up" | "bid-down" | "pause" | "relevance";

export function actionGroup(action: ActionType): ActionGroup {
  if (action.startsWith("harvest")) return "harvest";
  if (action.startsWith("negate")) return "negate";
  if (action === "bid-up" || action === "bid-down" || action === "pause") return action;
  return "relevance";
}

export const ACTION_META: Record<
  ActionGroup,
  { label: string; tone: "good" | "bad" | "info" | "warn" | "neutral" }
> = {
  harvest: { label: "Harvest", tone: "good" },
  negate: { label: "Negate", tone: "bad" },
  "bid-up": { label: "Bid ↑", tone: "info" },
  "bid-down": { label: "Bid ↓", tone: "warn" },
  pause: { label: "Pause", tone: "bad" },
  relevance: { label: "Relevance", tone: "neutral" },
};

export interface HarvestItem {
  rec: Recommendation;
  /** Display currency. */
  sales: number;
  spend: number;
}

export interface HarvestSummary {
  count: number;
  /** Display currency, stores with a rate only. */
  sales: number;
  spend: number;
  orders: number;
  acos: number;
  /** Estimated monthly sales the harvests carry (engine impact, display currency). */
  monthly: number;
  /** Harvests from stores without an FX rate (not in the money totals). */
  unconverted: number;
  top: HarvestItem[];
}

/**
 * Harvest opportunity from the engine's harvest-exact / harvest-product
 * recommendations (the phrase companion repeats the same term, so it is not
 * counted). Counters are the engine's window, not the overview period.
 */
export function harvestSummary(recs: readonly Recommendation[], rateOf: (storeId: string) => number): HarvestSummary {
  const out: HarvestSummary = { count: 0, sales: 0, spend: 0, orders: 0, acos: NaN, monthly: 0, unconverted: 0, top: [] };
  const items: HarvestItem[] = [];
  for (const r of recs) {
    if (r.action !== "harvest-exact" && r.action !== "harvest-product") continue;
    out.count++;
    const rate = rateOf(r.storeId);
    if (!Number.isFinite(rate)) {
      out.unconverted++;
      continue;
    }
    const sales = r.counters.sales * rate;
    const spend = r.counters.spend * rate;
    out.sales += sales;
    out.spend += spend;
    out.orders += r.counters.orders;
    out.monthly += (r.impact ?? 0) * rate;
    items.push({ rec: r, sales, spend });
  }
  out.acos = out.sales > 0 ? out.spend / out.sales : NaN;
  items.sort((a, b) => b.sales - a.sales || b.rec.counters.orders - a.rec.counters.orders || a.rec.id.localeCompare(b.rec.id));
  out.top = items.slice(0, 5);
  return out;
}

/* ------------------------------------------------------------ trend series */

export type TrendMetric = "spend" | "sales" | "acos" | "orders";

export interface TrendRow {
  date: string;
  /** Scope total for the metric (display currency / ratio / count); null when undefined (ACoS without sales). */
  total: number | null;
  spend: number;
  sales: number;
  orders: number;
  /** ACoS for the day alone. */
  acosDay: number | null;
  /** Rolling ROLLING_DAYS-day ACoS ending on the day (what the chart plots). */
  acos: number | null;
  /** Per-store metric value keyed `s0`, `s1`, … (aligned with PeriodResult.stores). */
  [series: `s${number}`]: number | null;
}

/**
 * Chart rows for `metric`. Stores without an FX rate get null values. ACoS
 * (total and per store) is the rolling `ROLLING_DAYS`-day figure; `acosDay`
 * keeps the single-day value for the data table.
 */
export function trendRows(period: Pick<PeriodResult, "daily" | "stores">, metric: TrendMetric): TrendRow[] {
  return period.daily.map((d) => {
    const row: TrendRow = {
      date: d.date,
      total: metric === "acos" ? nullIfNaN(acosOf(d.total7)) : metricValue(d.total, metric),
      spend: d.total.spend,
      sales: d.total.sales,
      orders: d.total.orders,
      acosDay: nullIfNaN(acosOf(d.total)),
      acos: nullIfNaN(acosOf(d.total7)),
    };
    d.byStore.forEach((c, i) => {
      const included = Number.isFinite(period.stores[i]?.rate);
      row[`s${i}`] = !included ? null : metric === "acos" ? nullIfNaN(acosOf(d.byStore7[i])) : metricValue(c, metric);
    });
    return row;
  });
}

function nullIfNaN(n: number): number | null {
  return Number.isFinite(n) ? n : null;
}

function metricValue(c: Counters, metric: TrendMetric): number | null {
  switch (metric) {
    case "spend":
      return c.spend;
    case "sales":
      return c.sales;
    case "orders":
      return c.orders;
    case "acos":
      return nullIfNaN(acosOf(c));
  }
}

/* -------------------------------------------------------------- sparkline */

export interface SparkPath {
  line: string;
  area: string;
  last: { x: number; y: number };
}

/**
 * SVG path for a small inline sparkline. Values map to `[pad, height − pad]`
 * with the minimum pinned to zero (spend never goes negative, and a zero
 * baseline keeps small and large campaigns honest). null for < 2 points.
 */
export function sparklinePath(values: readonly number[], width: number, height: number, pad = 1.5): SparkPath | null {
  if (values.length < 2) return null;
  const clean = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const max = Math.max(...clean);
  const stepX = (width - pad * 2) / (clean.length - 1);
  const usable = height - pad * 2;
  const pts = clean.map((v, i) => {
    const x = pad + i * stepX;
    const y = max > 0 ? pad + usable - (v / max) * usable : height - pad;
    return { x: round1(x), y: round1(y) };
  });
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p.x} ${p.y}`).join(" ");
  const area = `${line} L${pts[pts.length - 1].x} ${round1(height - pad)} L${pts[0].x} ${round1(height - pad)} Z`;
  return { line, area, last: pts[pts.length - 1] };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Compare the last third of a series with the first third: "up" / "down"
 * beyond ±10%, else "flat". Used for the sparkline's spoken summary.
 */
export function trendDirection(values: readonly number[]): { direction: "up" | "down" | "flat"; change: number } {
  const n = values.length;
  if (n < 3) return { direction: "flat", change: 0 };
  const k = Math.max(1, Math.floor(n / 3));
  const mean = (xs: readonly number[]) => xs.reduce((s, v) => s + (Number.isFinite(v) ? v : 0), 0) / xs.length;
  const first = mean(values.slice(0, k));
  const last = mean(values.slice(n - k));
  if (first <= 0) return { direction: last > 0 ? "up" : "flat", change: last > 0 ? Infinity : 0 };
  const change = last / first - 1;
  return { direction: change > 0.1 ? "up" : change < -0.1 ? "down" : "flat", change };
}

/* ---------------------------------------------------------------- sorting */

export type SortDir = "asc" | "desc";

/** Compare for sorting; NaN / undefined always sort last, whatever the direction. */
export function compareValues(a: number | string | undefined, b: number | string | undefined, dir: SortDir): number {
  const aMissing = a === undefined || (typeof a === "number" && !Number.isFinite(a));
  const bMissing = b === undefined || (typeof b === "number" && !Number.isFinite(b));
  if (aMissing || bMissing) return aMissing === bMissing ? 0 : aMissing ? 1 : -1;
  const c = typeof a === "string" || typeof b === "string" ? String(a).localeCompare(String(b)) : (a as number) - (b as number);
  return dir === "asc" ? c : -c;
}
