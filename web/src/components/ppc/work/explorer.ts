/**
 * Search-term explorer model — pure functions, no React. Relative imports only.
 *
 * Performance model (100k-row stores)
 * - `buildExplorerIndex(rows)` interns every row once (memoise on the array):
 *   stores, campaigns, ad groups, search terms (per ad group and per store)
 *   and targets become integer ids in typed columns; a raw-string cache keeps
 *   normalisation to once per distinct spelling.
 * - `aggregateExplorer(index, …)` is one pass over those columns for a period
 *   and the row-level filters (store scope, campaign, ad group, match type).
 * - Metric filters, text search and sorting then run on the aggregated
 *   entities (tens of thousands at most), not on the rows.
 *
 * Periods follow the overview: the last N days ending on the latest data date
 * in scope. Daily rows count when their day is inside; summary rows (with an
 * end date) count in full when they overlap it.
 */

import { adGroupKey, isAsin, norm, normTargeting } from "../../../lib/ppc/keys";
import { fxRate } from "../../../lib/ppc/metrics";
import { DEFAULT_RULES } from "../../../lib/ppc/rules";
import type { ActionType, ConsoleSettings, Counters, MatchType, Recommendation, RuleConfig, SearchTermRow, Store } from "../../../lib/ppc/types";
import { compareValues, dayNumber, isoFromDay, type SortDir } from "../overview/compute";
import { viewForAction, type WorkView } from "./recs";

/* ------------------------------------------------------------------ index */

export type ExplorerMode = "term" | "store-term" | "target";

export const MODE_META: Record<ExplorerMode, { label: string; noun: string; nouns: string; description: string }> = {
  term: {
    label: "Search term",
    noun: "search term",
    nouns: "search terms",
    description: "Each search term in each ad group it came through.",
  },
  "store-term": {
    label: "Term, whole store",
    noun: "search term",
    nouns: "search terms",
    description: "Each search term added up across every campaign and ad group.",
  },
  target: {
    label: "Target",
    noun: "target",
    nouns: "targets",
    description: "Each keyword or product target (targeting + match type).",
  },
};

export const MATCH_CODES: readonly MatchType[] = ["exact", "phrase", "broad", "auto", "product", "unknown"];
const MATCH_CODE = new Map(MATCH_CODES.map((m, i) => [m, i] as const));

export interface ExplorerTerm {
  storeIdx: number;
  campaignIdx: number;
  adGroupIdx: number;
  storeTermIdx: number;
  campaign: string;
  adGroup: string;
  term: string;
}

export interface ExplorerStoreTerm {
  storeIdx: number;
  term: string;
  normTerm: string;
  asin: boolean;
}

export interface ExplorerTarget {
  storeIdx: number;
  campaignIdx: number;
  adGroupIdx: number;
  campaign: string;
  adGroup: string;
  targeting: string;
  normTargeting: string;
  matchType: MatchType;
}

export interface ExplorerIndex {
  size: number;
  storeIds: string[];
  /** Normalised campaign names (shared across stores) and a display label for each. */
  campaignKeys: string[];
  campaignLabels: string[];
  /** Normalised `campaign|adGroup` key per ad group (one id per store; keys repeat across stores) and its label. */
  adGroupKeys: string[];
  adGroupLabels: string[];
  adGroupCampaign: Int32Array;
  terms: ExplorerTerm[];
  storeTerms: ExplorerStoreTerm[];
  targets: ExplorerTarget[];
  start: Int32Array;
  end: Int32Array;
  summary: Uint8Array;
  store: Int32Array;
  campaign: Int32Array;
  adGroup: Int32Array;
  match: Uint8Array;
  term: Int32Array;
  target: Int32Array;
  impressions: Float64Array;
  clicks: Float64Array;
  spend: Float64Array;
  sales: Float64Array;
  orders: Float64Array;
  units: Float64Array;
  termStoreTerm: Int32Array;
  latestByStore: number[];
  earliestByStore: number[];
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export function buildExplorerIndex(rows: readonly SearchTermRow[]): ExplorerIndex {
  const n = rows.length;
  const start = new Int32Array(n);
  const end = new Int32Array(n);
  const summary = new Uint8Array(n);
  const storeCol = new Int32Array(n);
  const campaignCol = new Int32Array(n);
  const adGroupCol = new Int32Array(n);
  const matchCol = new Uint8Array(n);
  const termCol = new Int32Array(n);
  const targetCol = new Int32Array(n);
  const impressions = new Float64Array(n);
  const clicks = new Float64Array(n);
  const spend = new Float64Array(n);
  const sales = new Float64Array(n);
  const orders = new Float64Array(n);
  const units = new Float64Array(n);

  const storeIds: string[] = [];
  const storeMap = new Map<string, number>();
  const campaignKeys: string[] = [];
  const campaignLabels: string[] = [];
  const campaignMap = new Map<string, number>();
  const adGroupKeys: string[] = [];
  const adGroupLabels: string[] = [];
  const adGroupCampaign: number[] = [];
  const adGroupMap = new Map<string, number>();
  // Raw-string caches, nested so every lookup uses the row's own strings (V8
  // caches a string's hash on the string) instead of a fresh concatenation.
  const groupRaw: Map<string, Map<string, number>>[] = []; // per store: campaign → ad group → g
  const groupTerms: Map<string, number>[] = []; // per g: search term → t
  const groupTargets: Map<string, Int32Array>[] = []; // per g: targeting → match code → tg
  const terms: ExplorerTerm[] = [];
  const termNorm = new Map<string, number>();
  const storeTerms: ExplorerStoreTerm[] = [];
  const storeTermMap = new Map<string, number>();
  const targets: ExplorerTarget[] = [];
  const targetNorm = new Map<string, number>();
  const dayCache = new Map<string, number>();
  const latestByStore: number[] = [];
  const earliestByStore: number[] = [];

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
      groupRaw.push(new Map());
    }
    // Campaign + ad group (normalised once per spelling).
    let byCampaign = groupRaw[s].get(r.campaign);
    if (byCampaign === undefined) groupRaw[s].set(r.campaign, (byCampaign = new Map()));
    let g = byCampaign.get(r.adGroup);
    if (g === undefined) {
      const ck = norm(r.campaign);
      let cIdx = campaignMap.get(ck);
      if (cIdx === undefined) {
        cIdx = campaignKeys.length;
        campaignKeys.push(ck);
        campaignLabels.push((r.campaign ?? "").trim() || "(no campaign)");
        campaignMap.set(ck, cIdx);
      }
      const gk = adGroupKey(r.campaign, r.adGroup);
      const sgk = `${s}|${gk}`;
      g = adGroupMap.get(sgk);
      if (g === undefined) {
        g = adGroupKeys.length;
        adGroupKeys.push(gk);
        adGroupLabels.push((r.adGroup ?? "").trim() || "(no ad group)");
        adGroupCampaign.push(cIdx);
        adGroupMap.set(sgk, g);
        groupTerms.push(new Map());
        groupTargets.push(new Map());
      }
      byCampaign.set(r.adGroup, g);
    }
    const c = adGroupCampaign[g];

    let t = groupTerms[g].get(r.searchTerm);
    if (t === undefined) {
      const normTerm = norm(r.searchTerm);
      const nk = `${g}|${normTerm}`;
      t = termNorm.get(nk);
      if (t === undefined) {
        const sk = `${s}|${normTerm}`;
        let st = storeTermMap.get(sk);
        if (st === undefined) {
          st = storeTerms.length;
          storeTerms.push({ storeIdx: s, term: (r.searchTerm ?? "").trim(), normTerm, asin: isAsin(normTerm) });
          storeTermMap.set(sk, st);
        }
        t = terms.length;
        terms.push({
          storeIdx: s,
          campaignIdx: c,
          adGroupIdx: g,
          storeTermIdx: st,
          campaign: (r.campaign ?? "").trim(),
          adGroup: (r.adGroup ?? "").trim(),
          term: (r.searchTerm ?? "").trim(),
        });
        termNorm.set(nk, t);
      }
      groupTerms[g].set(r.searchTerm, t);
    }

    const code = MATCH_CODE.get(r.matchType) ?? 5;
    let byMatch = groupTargets[g].get(r.targeting);
    if (byMatch === undefined) groupTargets[g].set(r.targeting, (byMatch = new Int32Array(MATCH_CODES.length).fill(-1)));
    let tg = byMatch[code];
    if (tg === -1) {
      const mt = MATCH_CODES[code];
      const nt = normTargeting(r.targeting);
      const nk = `${g}|${nt}|${mt}`;
      let found = targetNorm.get(nk);
      if (found === undefined) {
        found = targets.length;
        targets.push({
          storeIdx: s,
          campaignIdx: c,
          adGroupIdx: g,
          campaign: (r.campaign ?? "").trim(),
          adGroup: (r.adGroup ?? "").trim(),
          targeting: (r.targeting ?? "").trim() || "(no targeting)",
          normTargeting: nt,
          matchType: mt,
        });
        targetNorm.set(nk, found);
      }
      tg = found;
      byMatch[code] = tg;
    }

    storeCol[i] = s;
    campaignCol[i] = c;
    adGroupCol[i] = g;
    matchCol[i] = code;
    termCol[i] = t;
    targetCol[i] = tg;
    const a = dayOf(r.date);
    const b = r.endDate ? dayOf(r.endDate) : a;
    start[i] = a;
    end[i] = b < a ? a : b;
    summary[i] = r.endDate ? 1 : 0;
    impressions[i] = num(r.impressions);
    clicks[i] = num(r.clicks);
    spend[i] = num(r.spend);
    sales[i] = num(r.sales);
    orders[i] = num(r.orders);
    units[i] = num(r.units);
    if (latestByStore[s] === undefined || end[i] > latestByStore[s]) latestByStore[s] = end[i];
    if (earliestByStore[s] === undefined || a < earliestByStore[s]) earliestByStore[s] = a;
  }

  const termStoreTerm = new Int32Array(terms.length);
  terms.forEach((t, i) => (termStoreTerm[i] = t.storeTermIdx));

  return {
    size: n,
    storeIds,
    campaignKeys,
    campaignLabels,
    adGroupKeys,
    adGroupLabels,
    adGroupCampaign: Int32Array.from(adGroupCampaign),
    terms,
    storeTerms,
    targets,
    start,
    end,
    summary,
    store: storeCol,
    campaign: campaignCol,
    adGroup: adGroupCol,
    match: matchCol,
    term: termCol,
    target: targetCol,
    impressions,
    clicks,
    spend,
    sales,
    orders,
    units,
    termStoreTerm,
    latestByStore,
    earliestByStore,
  };
}

/* -------------------------------------------------------------- aggregate */

type Fx = Pick<ConsoleSettings, "baseCurrency" | "fxRates">;

export interface ExplorerRecRef {
  id: string;
  /** The rec's own subject (the word for a negative phrase) — used to find it in Keywords. */
  subject: string;
  action: ActionType;
  view: WorkView;
  priority: Recommendation["priority"];
}

export interface ExplorerRow {
  /** Entity index in the mode's list (stable per index). */
  id: number;
  /** Unique across stores and modes. */
  key: string;
  storeId: string;
  label: string;
  campaign: string;
  adGroup: string;
  /** Distinct campaigns / ad groups the entity spans in the period (store-term mode). */
  campaignCount: number;
  adGroupCount: number;
  matchMask: number;
  /** Store currency. */
  counters: Counters;
  /** Display currency per 1 unit of store currency: 1 in one-store scope, NaN when the FX rate is missing. */
  rate: number;
  /** Currency the money columns are shown in for this row. */
  currency: string;
  spend: number;
  sales: number;
  cpc: number;
  acos: number;
  ctr: number;
  cvr: number;
  targetAcos: number;
  breakEvenAcos: number;
  asin: boolean;
  /** Normalised label for text search. */
  search: string;
  rec?: ExplorerRecRef;
}

export interface ExplorerPeriod {
  days: number;
  from: string;
  to: string;
}

export interface AggregateOptions {
  mode: ExplorerMode;
  days: number;
  stores: readonly Store[];
  fx: Fx;
  /** Convert money to the base currency (All-stores scope). */
  convert: boolean;
  /** Row-level filters (applied before adding up). */
  campaign?: string;
  adGroup?: string;
  matchType?: MatchType | "";
  /** Open recommendations to badge rows with. */
  recs?: readonly Recommendation[];
}

export interface ExplorerResult {
  period: ExplorerPeriod | null;
  rows: ExplorerRow[];
  currency: string;
  /** Stores in scope with no FX rate (money shown in their own currency). */
  unconverted: string[];
  /** Summary-report rows that overlapped the period. */
  summaryRows: number;
}

/** Bitmask → "exact", "exact, broad". */
export function matchLabel(mask: number): string {
  const out: string[] = [];
  MATCH_CODES.forEach((m, i) => {
    if (mask & (1 << i)) out.push(m);
  });
  return out.join(", ") || "unknown";
}

/** Latest data day across the stores in scope (day number, NaN when none). */
function scopeLatest(ix: ExplorerIndex, slots: Int32Array): number {
  let latest = -Infinity;
  ix.storeIds.forEach((_, i) => {
    if (slots[i] >= 0 && ix.latestByStore[i] !== undefined && ix.latestByStore[i] > latest) latest = ix.latestByStore[i];
  });
  return Number.isFinite(latest) ? latest : NaN;
}

/** Engine recommendations keyed the way explorer rows are (see `recKeyFor`). */
export function explorerRecIndex(recs: readonly Recommendation[], mode: ExplorerMode): Map<string, ExplorerRecRef> {
  const out = new Map<string, ExplorerRecRef>();
  // When one row matches several recs, show the most useful one.
  const rank = (a: ActionType): number =>
    a.startsWith("harvest") ? 0 : a.startsWith("negate") ? 1 : a === "pause" ? 2 : a === "bid-down" ? 3 : a === "bid-up" ? 4 : 5;
  const put = (k: string, r: Recommendation) => {
    const cur = out.get(k);
    if (!cur || rank(r.action) < rank(cur.action)) {
      out.set(k, { id: r.id, subject: r.subject, action: r.action, view: viewForAction(r.action), priority: r.priority });
    }
  };
  for (const r of recs) {
    if (r.level === "target") {
      if (mode === "target") put(`${r.storeId}|${adGroupKey(r.campaign, r.adGroup)}|${normTargeting(r.subject)}|${r.matchType}`, r);
      continue;
    }
    if (mode === "target") continue;
    // Companions (paired negative, phrase companion) ride along with their harvest.
    const companion = !!r.pairedWith && (r.impact ?? 0) === 0 && r.action !== "harvest-exact" && r.action !== "harvest-product";
    if (companion) continue;
    if (r.action === "negate-phrase") {
      // The phrase rec's evidence lists the searches it blocks.
      for (const e of r.evidence) {
        const m = /^term “(.+)”: /.exec(e);
        if (!m) continue;
        const t = norm(m[1]);
        put(mode === "term" ? `${r.storeId}|${adGroupKey(r.campaign, r.adGroup)}|${t}` : `${r.storeId}|${t}`, r);
      }
      continue;
    }
    const t = norm(r.subject);
    put(mode === "term" ? `${r.storeId}|${adGroupKey(r.campaign, r.adGroup)}|${t}` : `${r.storeId}|${t}`, r);
  }
  return out;
}

const F = 6; // counter fields per entity

/** Ad group ids whose normalised key equals `key` (one per store that has it); null = no filter. */
function adGroupFlags(ix: ExplorerIndex, key: string | undefined): Uint8Array | null {
  if (!key) return null;
  const flags = new Uint8Array(ix.adGroupKeys.length);
  ix.adGroupKeys.forEach((k, g) => {
    if (k === key) flags[g] = 1;
  });
  return flags;
}

export function aggregateExplorer(ix: ExplorerIndex, o: AggregateOptions): ExplorerResult {
  const base = o.fx.baseCurrency.toUpperCase();
  const currency = o.convert ? base : (o.stores[0]?.currency ?? base).toUpperCase();
  const slots = new Int32Array(ix.storeIds.length).fill(-1);
  const byId = new Map(o.stores.map((s, i) => [s.id, i] as const));
  ix.storeIds.forEach((id, i) => {
    const p = byId.get(id);
    if (p !== undefined) slots[i] = p;
  });
  const rates = o.stores.map((s) => (o.convert ? fxRate(s.currency, o.fx) : 1));
  const unconverted = o.convert ? o.stores.filter((_, i) => !Number.isFinite(rates[i])).map((s) => s.id) : [];
  const latest = scopeLatest(ix, slots);
  if (!Number.isFinite(latest)) return { period: null, rows: [], currency, unconverted, summaryRows: 0 };
  const days = Math.max(1, Math.floor(o.days));
  const to = latest;
  const from = to - days + 1;

  const campaignFilter = o.campaign ? ix.campaignKeys.indexOf(o.campaign) : -1;
  const groupFlags = adGroupFlags(ix, o.adGroup);
  if ((o.campaign && campaignFilter < 0) || (groupFlags && !groupFlags.includes(1))) {
    return { period: { days, from: isoFromDay(from), to: isoFromDay(to) }, rows: [], currency, unconverted, summaryRows: 0 };
  }
  const matchFilter = o.matchType ? (MATCH_CODE.get(o.matchType) ?? -1) : -1;

  const E = o.mode === "term" ? ix.terms.length : o.mode === "store-term" ? ix.storeTerms.length : ix.targets.length;
  const acc = new Float64Array(E * F);
  const seen = new Uint8Array(E);
  const mask = new Int32Array(E);
  const firstGroup = new Int32Array(E).fill(-1);
  const multiGroup = new Uint8Array(E);
  const firstCampaign = new Int32Array(E).fill(-1);
  const multiCampaign = new Uint8Array(E);
  let summaryRows = 0;

  const n = ix.size;
  for (let i = 0; i < n; i++) {
    if (slots[ix.store[i]] < 0) continue;
    if (ix.start[i] > to || ix.end[i] < from) continue;
    if (campaignFilter >= 0 && ix.campaign[i] !== campaignFilter) continue;
    if (groupFlags && !groupFlags[ix.adGroup[i]]) continue;
    if (matchFilter >= 0 && ix.match[i] !== matchFilter) continue;
    const e = o.mode === "term" ? ix.term[i] : o.mode === "store-term" ? ix.termStoreTerm[ix.term[i]] : ix.target[i];
    const b = e * F;
    acc[b] += ix.impressions[i];
    acc[b + 1] += ix.clicks[i];
    acc[b + 2] += ix.spend[i];
    acc[b + 3] += ix.sales[i];
    acc[b + 4] += ix.orders[i];
    acc[b + 5] += ix.units[i];
    seen[e] = 1;
    mask[e] |= 1 << ix.match[i];
    const g = ix.adGroup[i];
    if (firstGroup[e] === -1) firstGroup[e] = g;
    else if (firstGroup[e] !== g) multiGroup[e] = 1;
    const c = ix.campaign[i];
    if (firstCampaign[e] === -1) firstCampaign[e] = c;
    else if (firstCampaign[e] !== c) multiCampaign[e] = 1;
    if (ix.summary[i]) summaryRows++;
  }

  // Distinct campaign / ad group counts only matter for store-term rows that span several.
  let campaignCounts: Map<number, Set<number>> | null = null;
  let groupCounts: Map<number, Set<number>> | null = null;
  if (o.mode === "store-term") {
    campaignCounts = new Map();
    groupCounts = new Map();
    for (let t = 0; t < ix.terms.length; t++) {
      const st = ix.termStoreTerm[t];
      if (!seen[st] || (!multiGroup[st] && !multiCampaign[st])) continue;
      const term = ix.terms[t];
      if (campaignFilter >= 0 && term.campaignIdx !== campaignFilter) continue;
      if (groupFlags && !groupFlags[term.adGroupIdx]) continue;
      (campaignCounts.get(st) ?? campaignCounts.set(st, new Set()).get(st)!).add(term.campaignIdx);
      (groupCounts.get(st) ?? groupCounts.set(st, new Set()).get(st)!).add(term.adGroupIdx);
    }
  }

  const recIdx = o.recs?.length ? explorerRecIndex(o.recs, o.mode) : null;
  const rows: ExplorerRow[] = [];
  for (let e = 0; e < E; e++) {
    if (!seen[e]) continue;
    const b = e * F;
    const counters: Counters = {
      impressions: acc[b],
      clicks: acc[b + 1],
      spend: acc[b + 2],
      sales: acc[b + 3],
      orders: acc[b + 4],
      units: acc[b + 5],
    };
    let storeIdx: number;
    let label: string;
    let campaign: string;
    let adGroup: string;
    let recKey: string;
    let search: string;
    let asin = false;
    let campaignCount = 1;
    let adGroupCount = 1;
    if (o.mode === "term") {
      const t = ix.terms[e];
      const st = ix.storeTerms[t.storeTermIdx];
      storeIdx = t.storeIdx;
      label = t.term;
      campaign = t.campaign;
      adGroup = t.adGroup;
      asin = st.asin;
      recKey = `${ix.storeIds[storeIdx]}|${ix.adGroupKeys[t.adGroupIdx]}|${st.normTerm}`;
      search = `${st.normTerm}\u0000${ix.adGroupKeys[t.adGroupIdx]}`;
    } else if (o.mode === "store-term") {
      const t = ix.storeTerms[e];
      storeIdx = t.storeIdx;
      label = t.term;
      asin = t.asin;
      campaignCount = campaignCounts?.get(e)?.size ?? 1;
      adGroupCount = groupCounts?.get(e)?.size ?? 1;
      campaign = campaignCount > 1 ? `${campaignCount} campaigns` : ix.campaignLabels[firstCampaign[e]];
      adGroup = adGroupCount > 1 ? `${adGroupCount} ad groups` : ix.adGroupLabels[firstGroup[e]];
      recKey = `${ix.storeIds[storeIdx]}|${t.normTerm}`;
      search = campaignCount > 1 || adGroupCount > 1 ? t.normTerm : `${t.normTerm}\u0000${ix.adGroupKeys[firstGroup[e]]}`;
    } else {
      const t = ix.targets[e];
      storeIdx = t.storeIdx;
      label = t.targeting;
      campaign = t.campaign;
      adGroup = t.adGroup;
      recKey = `${ix.storeIds[storeIdx]}|${ix.adGroupKeys[t.adGroupIdx]}|${t.normTargeting}|${t.matchType}`;
      search = `${t.normTargeting}\u0000${ix.adGroupKeys[t.adGroupIdx]}`;
    }
    const slot = slots[storeIdx];
    const store = o.stores[slot];
    const rate = rates[slot];
    const r = Number.isFinite(rate) ? rate : 1;
    const rowCurrency = Number.isFinite(rate) ? currency : store.currency.toUpperCase();
    rows.push({
      id: e,
      key: `${o.mode}|${ix.storeIds[storeIdx]}|${e}`,
      storeId: ix.storeIds[storeIdx],
      label,
      campaign,
      adGroup,
      campaignCount,
      adGroupCount,
      matchMask: mask[e],
      counters,
      rate,
      currency: rowCurrency,
      spend: counters.spend * r,
      sales: counters.sales * r,
      cpc: counters.clicks > 0 ? (counters.spend * r) / counters.clicks : NaN,
      acos: counters.sales > 0 ? counters.spend / counters.sales : NaN,
      ctr: counters.impressions > 0 ? counters.clicks / counters.impressions : NaN,
      cvr: counters.clicks > 0 ? counters.orders / counters.clicks : NaN,
      targetAcos: store.economics.targetAcos,
      breakEvenAcos: store.economics.breakEvenAcos,
      asin,
      search,
      rec: recIdx?.get(recKey),
    });
  }
  return { period: { days, from: isoFromDay(from), to: isoFromDay(to) }, rows, currency, unconverted, summaryRows };
}

/* ---------------------------------------------------------------- filters */

export type OrdersFilter = "any" | "0" | "1+" | "2+";
export type TermKind = "all" | "asin" | "keyword";

export interface ExplorerFilter {
  /** Comma-separated; any token may match. A leading "-" excludes. */
  text: string;
  /** Normalised campaign name, "" for all. */
  campaign: string;
  /** Normalised campaign|adGroup key, "" for all. */
  adGroup: string;
  matchType: MatchType | "";
  minClicks: number | null;
  minSpend: number | null;
  minImpressions: number | null;
  orders: OrdersFilter;
  /** Ratios. */
  acosMin: number | null;
  acosMax: number | null;
  acosVsTarget: "any" | "below" | "above";
  ctrMin: number | null;
  ctrMax: number | null;
  cvrMin: number | null;
  cvrMax: number | null;
  termKind: TermKind;
}

export const DEFAULT_EXPLORER_FILTER: ExplorerFilter = {
  text: "",
  campaign: "",
  adGroup: "",
  matchType: "",
  minClicks: null,
  minSpend: null,
  minImpressions: null,
  orders: "any",
  acosMin: null,
  acosMax: null,
  acosVsTarget: "any",
  ctrMin: null,
  ctrMax: null,
  cvrMin: null,
  cvrMax: null,
  termKind: "all",
};

/** Filter fields that presets set (text / campaign / ad group / match type are kept). */
const METRIC_FIELDS = [
  "minClicks",
  "minSpend",
  "minImpressions",
  "orders",
  "acosMin",
  "acosMax",
  "acosVsTarget",
  "ctrMin",
  "ctrMax",
  "cvrMin",
  "cvrMax",
  "termKind",
] as const satisfies readonly (keyof ExplorerFilter)[];

export type PresetId = "winners" | "bleeders" | "low-ctr" | "asin";

export interface Preset {
  id: PresetId;
  label: string;
  description: string;
  patch: Partial<ExplorerFilter>;
}

/** The rule thresholds the quick filters mirror. */
export type PresetRules = Pick<RuleConfig, "harvestMinOrders" | "negateClicks" | "relevanceMinImpressions" | "relevanceMaxCtr">;

function ctrLabel(r: number): string {
  return `${Number((r * 100).toFixed(3))}%`;
}

/**
 * Quick filters built from a store's own thresholds (`rules`), so "Bleeders"
 * lists the terms the negative rule would act on in that store. Without a
 * store (All stores) they use the toolkit defaults and say so.
 */
export function presetsFor(rules?: PresetRules): Preset[] {
  const R = rules ?? DEFAULT_RULES;
  const suffix = rules ? "" : " (default rules)";
  const harvestOrders = Math.max(0, Math.round(R.harvestMinOrders));
  return [
    {
      id: "winners",
      label: "Winners",
      description:
        harvestOrders === 2
          ? `2+ orders and ACoS under the store's target — harvest candidates${suffix}.`
          : `2+ orders and ACoS under the store's target — this store harvests at ${harvestOrders}+ orders.`,
      patch: { orders: "2+", acosVsTarget: "below" },
    },
    {
      id: "bleeders",
      label: "Bleeders",
      description: `0 orders after ${R.negateClicks.toLocaleString("en-US")}+ clicks — negative candidates${suffix}.`,
      patch: { orders: "0", minClicks: R.negateClicks },
    },
    {
      id: "low-ctr",
      label: "High impressions, low CTR",
      description: `${R.relevanceMinImpressions.toLocaleString("en-US")}+ impressions and CTR under ${ctrLabel(R.relevanceMaxCtr)} — the listing may not match the search${suffix}.`,
      patch: { minImpressions: R.relevanceMinImpressions, ctrMax: R.relevanceMaxCtr },
    },
    {
      id: "asin",
      label: "ASIN terms",
      description: "Shoppers who saw the ad on a product page (the search term is an ASIN).",
      patch: { termKind: "asin" },
    },
  ];
}

/** The quick filters with the toolkit's default thresholds. */
export const PRESETS: readonly Preset[] = presetsFor();

/** Replace the metric filters with a preset's (text, campaign, ad group and match type stay). */
export function applyPreset(f: ExplorerFilter, id: PresetId, rules?: PresetRules): ExplorerFilter {
  const preset = presetsFor(rules).find((p) => p.id === id);
  if (!preset) return f;
  const next: ExplorerFilter = { ...f };
  for (const k of METRIC_FIELDS) (next as unknown as Record<string, unknown>)[k] = DEFAULT_EXPLORER_FILTER[k];
  return { ...next, ...preset.patch };
}

/** The preset whose metric filters equal the current ones, if any. */
export function activePreset(f: ExplorerFilter, rules?: PresetRules): PresetId | null {
  for (const p of presetsFor(rules)) {
    const same = METRIC_FIELDS.every((k) => (k in p.patch ? p.patch[k] : DEFAULT_EXPLORER_FILTER[k]) === f[k]);
    if (same) return p.id;
  }
  return null;
}

export interface TextQuery {
  include: string[];
  exclude: string[];
}

/** "garlic, press, -free" → include [garlic, press], exclude [free]. */
export function parseTextQuery(text: string): TextQuery {
  const include: string[] = [];
  const exclude: string[] = [];
  for (const raw of text.split(",")) {
    const t = norm(raw);
    if (!t) continue;
    if (t.startsWith("-") && t.length > 1) exclude.push(t.slice(1).trim());
    else include.push(t);
  }
  return { include, exclude: exclude.filter(Boolean) };
}

export function filterExplorer(rows: readonly ExplorerRow[], f: ExplorerFilter): ExplorerRow[] {
  const q = parseTextQuery(f.text);
  return rows.filter((r) => {
    const c = r.counters;
    if (f.minClicks !== null && c.clicks < f.minClicks) return false;
    if (f.minImpressions !== null && c.impressions < f.minImpressions) return false;
    if (f.minSpend !== null && !(r.spend >= f.minSpend)) return false;
    if (f.orders === "0" && c.orders !== 0) return false;
    if (f.orders === "1+" && c.orders < 1) return false;
    if (f.orders === "2+" && c.orders < 2) return false;
    if (f.acosMin !== null && !(r.acos >= f.acosMin)) return false;
    if (f.acosMax !== null && !(r.acos <= f.acosMax)) return false;
    if (f.acosVsTarget === "below" && !(r.acos < r.targetAcos)) return false;
    if (f.acosVsTarget === "above" && !(r.acos > r.targetAcos || (c.orders === 0 && c.spend > 0))) return false;
    if (f.ctrMin !== null && !(r.ctr >= f.ctrMin)) return false;
    if (f.ctrMax !== null && !(r.ctr < f.ctrMax)) return false;
    if (f.cvrMin !== null && !(r.cvr >= f.cvrMin)) return false;
    if (f.cvrMax !== null && !(r.cvr <= f.cvrMax)) return false;
    if (f.termKind === "asin" && !r.asin) return false;
    if (f.termKind === "keyword" && r.asin) return false;
    if (q.include.length && !q.include.some((t) => r.search.includes(t))) return false;
    if (q.exclude.length && q.exclude.some((t) => r.search.includes(t))) return false;
    return true;
  });
}

export interface FilterChip {
  key: string;
  label: string;
}

export interface ChipContext {
  campaignLabel?: (key: string) => string;
  adGroupLabel?: (key: string) => string;
  /** Money formatter in the display currency. */
  money: (n: number) => string;
}

function pctLabel(r: number): string {
  return `${Number((r * 100).toFixed(2))}%`;
}

/** Removable chips for every non-default filter. */
export function filterChips(f: ExplorerFilter, ctx: ChipContext): FilterChip[] {
  const out: FilterChip[] = [];
  const q = parseTextQuery(f.text);
  if (q.include.length || q.exclude.length) {
    const parts = [...q.include.map((t) => `“${t}”`), ...q.exclude.map((t) => `not “${t}”`)];
    out.push({ key: "text", label: `Contains ${parts.join(" or ")}` });
  }
  if (f.campaign) out.push({ key: "campaign", label: `Campaign: ${ctx.campaignLabel?.(f.campaign) ?? f.campaign}` });
  if (f.adGroup) out.push({ key: "adGroup", label: `Ad group: ${ctx.adGroupLabel?.(f.adGroup) ?? f.adGroup}` });
  if (f.matchType) out.push({ key: "matchType", label: `Match: ${f.matchType}` });
  if (f.orders !== "any") out.push({ key: "orders", label: f.orders === "0" ? "0 orders" : `${f.orders.replace("+", "")}+ orders` });
  if (f.minClicks !== null) out.push({ key: "minClicks", label: `Clicks ≥ ${f.minClicks}` });
  if (f.minImpressions !== null) out.push({ key: "minImpressions", label: `Impressions ≥ ${f.minImpressions.toLocaleString("en-US")}` });
  if (f.minSpend !== null) out.push({ key: "minSpend", label: `Spend ≥ ${ctx.money(f.minSpend)}` });
  if (f.acosVsTarget !== "any") out.push({ key: "acosVsTarget", label: f.acosVsTarget === "below" ? "ACoS under target" : "ACoS over target" });
  if (f.acosMin !== null || f.acosMax !== null) {
    const label =
      f.acosMin !== null && f.acosMax !== null
        ? `ACoS ${pctLabel(f.acosMin)}–${pctLabel(f.acosMax)}`
        : f.acosMin !== null
          ? `ACoS ≥ ${pctLabel(f.acosMin)}`
          : `ACoS ≤ ${pctLabel(f.acosMax!)}`;
    out.push({ key: "acos", label });
  }
  if (f.ctrMin !== null) out.push({ key: "ctrMin", label: `CTR ≥ ${pctLabel(f.ctrMin)}` });
  if (f.ctrMax !== null) out.push({ key: "ctrMax", label: `CTR < ${pctLabel(f.ctrMax)}` });
  if (f.cvrMin !== null) out.push({ key: "cvrMin", label: `CVR ≥ ${pctLabel(f.cvrMin)}` });
  if (f.cvrMax !== null) out.push({ key: "cvrMax", label: `CVR ≤ ${pctLabel(f.cvrMax)}` });
  if (f.termKind !== "all") out.push({ key: "termKind", label: f.termKind === "asin" ? "ASIN terms only" : "Keyword terms only" });
  return out;
}

/** Reset the filter behind one chip. */
export function removeChip(f: ExplorerFilter, key: string): ExplorerFilter {
  const d = DEFAULT_EXPLORER_FILTER;
  switch (key) {
    case "acos":
      return { ...f, acosMin: d.acosMin, acosMax: d.acosMax };
    case "campaign":
      return { ...f, campaign: "", adGroup: "" };
    default:
      if (key in d) return { ...f, [key]: d[key as keyof ExplorerFilter] } as ExplorerFilter;
      return f;
  }
}

export function isDefaultFilter(f: ExplorerFilter): boolean {
  return (Object.keys(DEFAULT_EXPLORER_FILTER) as (keyof ExplorerFilter)[]).every((k) =>
    k === "text" ? !f.text.trim() : f[k] === DEFAULT_EXPLORER_FILTER[k],
  );
}

/* ---------------------------------------------------------------- sorting */

export type ExplorerSortKey =
  | "label"
  | "store"
  | "campaign"
  | "match"
  | "impressions"
  | "clicks"
  | "ctr"
  | "spend"
  | "cpc"
  | "orders"
  | "sales"
  | "acos"
  | "cvr";

export const EXPLORER_TEXT_COLUMNS: readonly ExplorerSortKey[] = ["label", "store", "campaign", "match"];

export function sortExplorer(
  rows: readonly ExplorerRow[],
  key: ExplorerSortKey,
  dir: SortDir,
  storeName: (id: string) => string = (id) => id,
): ExplorerRow[] {
  const value = (r: ExplorerRow): number | string | undefined => {
    switch (key) {
      case "label":
        return r.label.toLowerCase();
      case "store":
        return storeName(r.storeId).toLowerCase();
      case "campaign":
        return `${r.campaign}\u0000${r.adGroup}`.toLowerCase();
      case "match":
        return matchLabel(r.matchMask);
      case "impressions":
        return r.counters.impressions;
      case "clicks":
        return r.counters.clicks;
      case "orders":
        return r.counters.orders;
      default:
        return r[key];
    }
  };
  // Decorate once: comparing precomputed values keeps a 50k-row sort well under a frame budget.
  const decorated = rows.map((r) => ({ r, v: value(r) }));
  decorated.sort((a, b) => compareValues(a.v, b.v, dir) || b.r.spend - a.r.spend || a.r.key.localeCompare(b.r.key));
  return decorated.map((d) => d.r);
}

/** Totals of a filtered list, in display currency (unconverted rows are left out of money). */
export function explorerTotals(rows: readonly ExplorerRow[]): Counters & { unconverted: number } {
  const t = { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0, unconverted: 0 };
  for (const r of rows) {
    t.impressions += r.counters.impressions;
    t.clicks += r.counters.clicks;
    t.orders += r.counters.orders;
    t.units += r.counters.units;
    if (Number.isFinite(r.rate)) {
      t.spend += r.spend;
      t.sales += r.sales;
    } else t.unconverted++;
  }
  return t;
}

/* ----------------------------------------------------------------- detail */

export interface EntityDetail {
  days: string[];
  spend: number[];
  clicks: number[];
  orders: number[];
  sales: number[];
  /** Days with at least one click. */
  activeDays: number;
  firstDay?: string;
  lastDay?: string;
  /** Summary-report rows that overlap the period (not in the daily series). */
  summaryRows: number;
  /** Breakdown: ad groups for store-wide terms, search terms for targets, targets for terms. Top 5 by spend. */
  breakdown: { label: string; sub?: string; clicks: number; spend: number; orders: number; sales: number }[];
  breakdownKind: "ad groups" | "search terms" | "targets";
  breakdownTotal: number;
}

/** Daily series and a breakdown for one explorer row. One pass over the rows. */
export function entityDetail(
  ix: ExplorerIndex,
  row: Pick<ExplorerRow, "id">,
  mode: ExplorerMode,
  period: ExplorerPeriod,
  filters: Pick<AggregateOptions, "campaign" | "adGroup" | "matchType"> = {},
): EntityDetail {
  const from = dayNumber(period.from);
  const to = dayNumber(period.to);
  const len = to - from + 1;
  const spend = new Array<number>(len).fill(0);
  const clicks = new Array<number>(len).fill(0);
  const orders = new Array<number>(len).fill(0);
  const sales = new Array<number>(len).fill(0);
  const campaignFilter = filters.campaign ? ix.campaignKeys.indexOf(filters.campaign) : -1;
  const groupFlags = adGroupFlags(ix, filters.adGroup);
  const matchFilter = filters.matchType ? (MATCH_CODE.get(filters.matchType) ?? -1) : -1;
  const breakdown = new Map<number, { clicks: number; spend: number; orders: number; sales: number }>();
  let summaryRows = 0;
  let first = Infinity;
  let last = -Infinity;
  for (let i = 0; i < ix.size; i++) {
    const e = mode === "term" ? ix.term[i] : mode === "store-term" ? ix.termStoreTerm[ix.term[i]] : ix.target[i];
    if (e !== row.id) continue;
    if (ix.start[i] > to || ix.end[i] < from) continue;
    if (campaignFilter >= 0 && ix.campaign[i] !== campaignFilter) continue;
    if (groupFlags && !groupFlags[ix.adGroup[i]]) continue;
    if (matchFilter >= 0 && ix.match[i] !== matchFilter) continue;
    const bk = mode === "store-term" ? ix.adGroup[i] : mode === "target" ? ix.term[i] : ix.target[i];
    const b = breakdown.get(bk) ?? { clicks: 0, spend: 0, orders: 0, sales: 0 };
    b.clicks += ix.clicks[i];
    b.spend += ix.spend[i];
    b.orders += ix.orders[i];
    b.sales += ix.sales[i];
    breakdown.set(bk, b);
    if (ix.summary[i]) {
      summaryRows++;
      continue;
    }
    const d = ix.start[i] - from;
    if (d < 0 || d >= len) continue;
    spend[d] += ix.spend[i];
    clicks[d] += ix.clicks[i];
    orders[d] += ix.orders[i];
    sales[d] += ix.sales[i];
    if (ix.clicks[i] > 0) {
      if (ix.start[i] < first) first = ix.start[i];
      if (ix.start[i] > last) last = ix.start[i];
    }
  }
  const days = Array.from({ length: len }, (_, k) => isoFromDay(from + k));
  const kind: EntityDetail["breakdownKind"] = mode === "store-term" ? "ad groups" : mode === "target" ? "search terms" : "targets";
  const list = [...breakdown.entries()]
    .map(([k, v]) => {
      if (mode === "store-term") return { label: ix.adGroupLabels[k], sub: ix.campaignLabels[ix.adGroupCampaign[k]], ...v };
      if (mode === "target") return { label: ix.terms[k].term, ...v };
      const t = ix.targets[k];
      return { label: t.targeting, sub: t.matchType, ...v };
    })
    .sort((a, b) => b.spend - a.spend || b.clicks - a.clicks);
  return {
    days,
    spend,
    clicks,
    orders,
    sales,
    activeDays: clicks.filter((c) => c > 0).length,
    firstDay: Number.isFinite(first) ? isoFromDay(first) : undefined,
    lastDay: Number.isFinite(last) ? isoFromDay(last) : undefined,
    summaryRows,
    breakdown: list.slice(0, 5),
    breakdownKind: kind,
    breakdownTotal: list.length,
  };
}

/* -------------------------------------------------------------------- CSV */

export function explorerCsv(
  rows: readonly ExplorerRow[],
  o: { mode: ExplorerMode; showStore: boolean; storeName: (id: string) => string },
): (string | number)[][] {
  const header = [
    ...(o.showStore ? ["Store"] : []),
    o.mode === "target" ? "Target" : "Search term",
    "Campaign",
    "Ad group",
    "Match type",
    "Impressions",
    "Clicks",
    "CTR",
    "Currency",
    "Spend",
    "CPC",
    "Orders",
    "Sales",
    "ACoS",
    "CVR",
    "Engine says",
  ];
  const r2 = (n: number) => (Number.isFinite(n) ? Math.round(n * 100) / 100 : "");
  const p = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(2)}%` : "");
  const out: (string | number)[][] = [header];
  for (const r of rows) {
    out.push([
      ...(o.showStore ? [o.storeName(r.storeId)] : []),
      r.label,
      r.campaign,
      r.adGroup,
      matchLabel(r.matchMask),
      r.counters.impressions,
      r.counters.clicks,
      p(r.ctr),
      r.currency,
      r2(r.spend),
      r2(r.cpc),
      r.counters.orders,
      r2(r.sales),
      p(r.acos),
      p(r.cvr),
      r.rec ? r.rec.action : "",
    ]);
  }
  return out;
}

/** Campaign options in scope: normalised key → display label (first spelling seen). */
export function explorerCampaigns(ix: ExplorerIndex, storeIds: readonly string[]): { value: string; label: string }[] {
  const allowed = new Set(storeIds);
  const used = new Set<number>();
  for (let i = 0; i < ix.size; i++) if (allowed.has(ix.storeIds[ix.store[i]])) used.add(ix.campaign[i]);
  return [...used]
    .map((c) => ({ value: ix.campaignKeys[c], label: ix.campaignLabels[c] }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Ad group options for one campaign. */
export function explorerAdGroups(ix: ExplorerIndex, campaign: string): { value: string; label: string }[] {
  const c = ix.campaignKeys.indexOf(campaign);
  if (c < 0) return [];
  const seen = new Map<string, string>();
  ix.adGroupKeys.forEach((k, g) => {
    if (ix.adGroupCampaign[g] === c && !seen.has(k)) seen.set(k, ix.adGroupLabels[g]);
  });
  return [...seen.entries()].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label));
}
