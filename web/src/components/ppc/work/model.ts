/**
 * Shared bid model for the Keywords "Why" panels and the Bids target table —
 * the same priors and fallbacks `rules.ts` uses, rebuilt from the rows so the
 * page can show every number behind a suggestion (the engine only returns
 * the result). Pure; relative imports only.
 *
 * Mirrors rules.ts exactly:
 * - CVR prior = ad group → campaign → store CVR in the engine window, first
 *   level with orders > 0 and clicks > 0.
 * - AOV for a target = its own → ad group → campaign → store → store price.
 * - Store median impressions over targets with impressions > 0 (starved-winner
 *   check).
 */

import { adGroupKey, norm, targetKey } from "../../../lib/ppc/keys";
import { addInto, aov as aovOf, emptyCounters, inWindow, median, type DateWindow } from "../../../lib/ppc/metrics";
import type { Counters, SearchTermRow } from "../../../lib/ppc/types";

export type PriorSource = "ad group" | "campaign" | "store" | "none";
export type AovSource = "own" | "ad group" | "campaign" | "store" | "price" | "none";

export interface PriorIndex {
  window: DateWindow;
  adGroups: Map<string, Counters>;
  campaigns: Map<string, Counters>;
  store: Counters;
  /** Impressions per target in the window (targetKey). */
  targetImpressions: Map<string, number>;
  /** Median of target impressions > 0 (NaN when none). */
  medianTargetImpressions: number;
  /** Rows of this store inside the window. */
  rowsInWindow: number;
}

/**
 * Normalised keys for report rows, cached per raw spelling in nested maps so
 * each lookup hashes the row's own strings (V8 caches a string's hash on the
 * string) instead of a fresh concatenation — the difference between ~40 ms
 * and ~120 ms on a 100k-row store.
 */
export interface KeyCache {
  /** Normalised keys for a row's campaign / ad group: `c` = norm(campaign), `ag` = adGroupKey. */
  group(campaign: string, adGroup: string): GroupKeys;
  /** targetKey(campaign, adGroup, targeting, matchType) for a group returned by `group`. */
  target(group: GroupKeys, targeting: string, matchType: string): string;
}

export interface GroupKeys {
  c: string;
  ag: string;
  /** targeting → matchType → targetKey */
  targets: Map<string, Map<string, string>>;
  campaign: string;
  adGroup: string;
}

export function makeKeyCache(): KeyCache {
  const groups = new Map<string, Map<string, GroupKeys>>();
  const campaigns = new Map<string, string>();
  return {
    group(campaign, adGroup) {
      let byAg = groups.get(campaign);
      if (!byAg) groups.set(campaign, (byAg = new Map()));
      let g = byAg.get(adGroup);
      if (!g) {
        let c = campaigns.get(campaign);
        if (c === undefined) campaigns.set(campaign, (c = norm(campaign)));
        g = { c, ag: adGroupKey(campaign, adGroup), targets: new Map(), campaign, adGroup };
        byAg.set(adGroup, g);
      }
      return g;
    },
    target(g, targeting, matchType) {
      let byMt = g.targets.get(targeting);
      if (!byMt) g.targets.set(targeting, (byMt = new Map()));
      let k = byMt.get(matchType);
      if (k === undefined) byMt.set(matchType, (k = targetKey(g.campaign, g.adGroup, targeting, matchType)));
      return k;
    },
  };
}

/**
 * One pass over a store's rows. `storeId` limits the rows (the engine filters
 * by store first).
 */
export function buildPriorIndex(rows: readonly SearchTermRow[], window: DateWindow, storeId?: string, keys: KeyCache = makeKeyCache()): PriorIndex {
  const adGroups = new Map<string, Counters>();
  const campaigns = new Map<string, Counters>();
  const store = emptyCounters();
  const targetImpressions = new Map<string, number>();
  let n = 0;
  if (window.from && window.to) {
    for (const r of rows) {
      if (storeId !== undefined && r.storeId !== storeId) continue;
      if (!inWindow(r, window)) continue;
      n++;
      const gk = keys.group(r.campaign, r.adGroup);
      let g = adGroups.get(gk.ag);
      if (!g) adGroups.set(gk.ag, (g = emptyCounters()));
      addInto(g, r);
      let c = campaigns.get(gk.c);
      if (!c) campaigns.set(gk.c, (c = emptyCounters()));
      addInto(c, r);
      addInto(store, r);
      const tk = keys.target(gk, r.targeting, r.matchType);
      targetImpressions.set(tk, (targetImpressions.get(tk) ?? 0) + r.impressions);
    }
  }
  const medianTargetImpressions = median([...targetImpressions.values()].filter((v) => v > 0));
  return { window, adGroups, campaigns, store, targetImpressions, medianTargetImpressions, rowsInWindow: n };
}

/** CVR prior for a campaign / ad group, like `priorCvr` in rules.ts. */
export function priorCvr(p: PriorIndex, campaign: string, adGroup: string): { cvr: number; source: PriorSource; counters?: Counters } {
  const g = p.adGroups.get(adGroupKey(campaign, adGroup));
  if (g && g.orders > 0 && g.clicks > 0) return { cvr: g.orders / g.clicks, source: "ad group", counters: g };
  const c = p.campaigns.get(norm(campaign));
  if (c && c.orders > 0 && c.clicks > 0) return { cvr: c.orders / c.clicks, source: "campaign", counters: c };
  if (p.store.orders > 0 && p.store.clicks > 0) return { cvr: p.store.orders / p.store.clicks, source: "store", counters: p.store };
  return { cvr: NaN, source: "none" };
}

/** AOV with the target fallback chain from rules.ts (`aovFor`). */
export function aovWithFallback(
  p: PriorIndex,
  c: Counters,
  campaign: string,
  adGroup: string,
  price?: number,
): { aov: number; source: AovSource } {
  const own = aovOf(c);
  if (Number.isFinite(own)) return { aov: own, source: "own" };
  const g = p.adGroups.get(adGroupKey(campaign, adGroup));
  if (g && Number.isFinite(aovOf(g))) return { aov: aovOf(g), source: "ad group" };
  const cc = p.campaigns.get(norm(campaign));
  if (cc && Number.isFinite(aovOf(cc))) return { aov: aovOf(cc), source: "campaign" };
  if (Number.isFinite(aovOf(p.store))) return { aov: aovOf(p.store), source: "store" };
  if (price && price > 0) return { aov: price, source: "price" };
  return { aov: NaN, source: "none" };
}

/** Plain-English label for where an AOV came from. */
export function aovSourceLabel(source: AovSource): string {
  switch (source) {
    case "own":
      return "its own orders";
    case "ad group":
      return "the ad group's orders";
    case "campaign":
      return "the campaign's orders";
    case "store":
      return "the store's orders";
    case "price":
      return "your product price";
    default:
      return "no orders yet";
  }
}
