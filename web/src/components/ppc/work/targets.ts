/**
 * Bids page target table: every keyword / product target in the engine
 * window with its current bid, the maths behind a suggested bid, and the
 * ladder band — not just the targets the engine flagged. Pure; relative
 * imports only.
 *
 * The per-target logic mirrors the TARGET level of `rules.ts` step by step
 * (ladder → min orders to raise → starved winner → learning hold → brand
 * protection → bulk state → guardrails), using the engine's own exported
 * helpers, so a row with a recommendation shows the same suggested bid.
 */

import { applyGuardrails, bidDecimals, ladderChange, maxCpc as maxCpcOf, roundBid, smoothedCvr, type GuardrailResult } from "../../../lib/ppc/bidding";
import { buildBulkIndex, effectiveBid, findKeyword, findTarget, inactiveState } from "../../../lib/ppc/bulk-index";
import { daysBetween } from "../../../lib/ppc/dates";
import { norm, targetKey } from "../../../lib/ppc/keys";
import { acos as acosOf, addInto, cpc as cpcOf, ctr as ctrOf, cvr as cvrOf, emptyCounters, inWindow, type DateWindow } from "../../../lib/ppc/metrics";
import { protectedMatch } from "../../../lib/ppc/rules";
import type { ActionType, BulkEntity, Counters, MatchType, Recommendation, SearchTermRow, Store } from "../../../lib/ppc/types";
import { money, pct } from "../format";
import { compareValues, type SortDir } from "../overview/compute";
import { aovWithFallback, buildPriorIndex, makeKeyCache, priorCvr, type AovSource, type PriorIndex, type PriorSource } from "./model";

export type TargetBand = "raise" | "hold" | "cut" | "pause" | "no-sales" | "learning" | "inactive" | "no-bid";

export const BAND_META: Record<TargetBand, { label: string; tone: "good" | "info" | "warn" | "bad" | "neutral" }> = {
  raise: { label: "Raise", tone: "info" },
  hold: { label: "Hold", tone: "neutral" },
  cut: { label: "Cut", tone: "warn" },
  pause: { label: "Pause", tone: "bad" },
  "no-sales": { label: "No sales yet", tone: "neutral" },
  learning: { label: "Learning", tone: "neutral" },
  inactive: { label: "Not live", tone: "neutral" },
  "no-bid": { label: "No bid", tone: "neutral" },
};

export interface TargetRow {
  key: string;
  campaign: string;
  adGroup: string;
  targeting: string;
  matchType: MatchType;
  isKeyword: boolean;
  counters: Counters;
  acos: number;
  cvr: number;
  ctr: number;
  cpc: number;
  currentBid?: number;
  currentBidSource?: "bulk" | "avg-cpc";
  /** "keyword paused", "ad group archived"… when the bulk file says it is not live. */
  inactive?: string;
  priorCvr: number;
  priorSource: PriorSource;
  smoothedCvr: number;
  aov: number;
  aovSource: AovSource;
  maxCpc: number;
  /** ACoS ÷ target (NaN without sales). */
  ratio: number;
  /** Ladder rung change before the order / starved rules. */
  ladderChange?: number;
  flagPause: boolean;
  /** Change after "raises need N orders" and the starved-winner rule. */
  proposedChange: number;
  raiseBlocked: boolean;
  starved: boolean;
  brandProtected: boolean;
  guard?: GuardrailResult;
  /** Final bid when the band is raise / cut. */
  suggestedBid?: number;
  band: TargetBand;
  /** One line, e.g. "ACoS 1.22× target → −12%". */
  bandLabel: string;
  /** Days between the target's first row (all history) and the window end. */
  historyDays: number;
  learning: boolean;
  /** Open or decided engine recommendation for this target (bid / pause preferred over relevance). */
  rec?: Recommendation;
}

export interface TargetTableInput {
  store: Store;
  /** All rows of the store (history is needed for the learning check). */
  rows: readonly SearchTermRow[];
  bulk: readonly BulkEntity[];
  window: DateWindow;
  recs?: readonly Recommendation[];
  /** Reuse a prior index built for the same rows / window. */
  priors?: PriorIndex;
}

function signed(r: number): string {
  if (!Number.isFinite(r) || r === 0) return "±0%";
  return `${r > 0 ? "+" : "−"}${pct(Math.abs(r), 0)}`;
}

function times(r: number): string {
  return `${r.toFixed(2)}×`;
}

/** Target-level recommendations keyed like the target rows. */
export function targetRecIndex(recs: readonly Recommendation[]): Map<string, Recommendation> {
  const rank: Partial<Record<ActionType, number>> = { pause: 0, "bid-down": 1, "bid-up": 2, relevance: 3 };
  const out = new Map<string, Recommendation>();
  for (const r of recs) {
    if (r.level !== "target" || rank[r.action] === undefined) continue;
    const k = targetKey(r.campaign, r.adGroup, r.subject, r.matchType);
    const cur = out.get(k);
    if (!cur || (rank[r.action] ?? 9) < (rank[cur.action] ?? 9)) out.set(k, r);
  }
  return out;
}

export function buildTargetRows(input: TargetTableInput): TargetRow[] {
  const { store, window: win } = input;
  if (!win.from || !win.to) return [];
  const R = store.rules;
  const E = store.economics;
  const cur = store.currency;
  const rows = input.rows;
  const idx = buildBulkIndex(input.bulk.filter((b) => b.storeId === store.id));
  const keys = makeKeyCache();
  const priors = input.priors ?? buildPriorIndex(rows, win, store.id, keys);
  const recIdx = targetRecIndex(input.recs ?? []);

  interface Agg {
    key: string;
    campaign: string;
    adGroup: string;
    targeting: string;
    matchType: MatchType;
    c: Counters;
  }
  const targets = new Map<string, Agg>();
  const firstSeen = new Map<string, string>();
  for (const r of rows) {
    if (r.storeId !== store.id) continue;
    const k = keys.target(keys.group(r.campaign, r.adGroup), r.targeting, r.matchType);
    const f = firstSeen.get(k);
    if (!f || r.date < f) firstSeen.set(k, r.date);
    if (!inWindow(r, win)) continue;
    let g = targets.get(k);
    if (!g) {
      g = { key: k, campaign: r.campaign.trim(), adGroup: r.adGroup.trim(), targeting: r.targeting.trim(), matchType: r.matchType, c: emptyCounters() };
      targets.set(k, g);
    }
    addInto(g.c, r);
  }

  const medianImpr = priors.medianTargetImpressions;
  const out: TargetRow[] = [];
  for (const g of targets.values()) {
    const mt = g.matchType;
    if (mt === "unknown") continue;
    const c = g.c;
    const isKeyword = mt === "exact" || mt === "phrase" || mt === "broad";
    const entity = isKeyword ? findKeyword(idx, g.campaign, g.adGroup, g.targeting, mt) : findTarget(idx, g.campaign, g.adGroup, g.targeting);
    const a = acosOf(c);
    const cvrV = cvrOf(c);
    const bulkBid = entity ? effectiveBid(idx, entity) : undefined;
    const avgCpc = cpcOf(c);
    // Like rules.ts: average CPC stands in for keywords without a bulk bid; product /
    // auto targets need a bulk entity to have a bid at all.
    const currentBid = bulkBid ?? (Number.isFinite(avgCpc) && avgCpc > 0 && (isKeyword || entity) ? roundBid(avgCpc, bidDecimals(cur)) : undefined);
    const currentBidSource: "bulk" | "avg-cpc" | undefined = bulkBid !== undefined ? "bulk" : currentBid !== undefined ? "avg-cpc" : undefined;
    const prior = priorCvr(priors, g.campaign, g.adGroup);
    const sCvr = smoothedCvr(c.orders, c.clicks, prior.cvr, R.cvrPriorWeight);
    const aov = aovWithFallback(priors, c, g.campaign, g.adGroup, E.price);
    const mc = maxCpcOf(E.targetAcos, aov.aov, sCvr);
    const first = firstSeen.get(g.key) ?? win.from;
    // Days of data, counted inclusively — same as rules.ts.
    const historyDays = daysBetween(first, win.to) + 1;
    const learning = historyDays < R.minDaysHistory;
    const inactive = entity ? inactiveState(idx, entity) : undefined;
    const brand = isKeyword ? protectedMatch(g.targeting, store) : null;
    const brandProtected = !!brand && brand.kind === "brand";

    const row: TargetRow = {
      key: g.key,
      campaign: g.campaign,
      adGroup: g.adGroup,
      targeting: g.targeting,
      matchType: mt,
      isKeyword,
      counters: c,
      acos: a,
      cvr: cvrV,
      ctr: ctrOf(c),
      cpc: avgCpc,
      currentBid,
      currentBidSource,
      inactive,
      priorCvr: prior.cvr,
      priorSource: prior.source,
      smoothedCvr: sCvr,
      aov: aov.aov,
      aovSource: aov.source,
      maxCpc: mc,
      ratio: NaN,
      flagPause: false,
      proposedChange: 0,
      raiseBlocked: false,
      starved: false,
      brandProtected: false,
      band: "hold",
      bandLabel: "",
      historyDays,
      learning,
      rec: recIdx.get(g.key),
    };

    // 1. What the ladder / zero-order rules propose.
    let proposal: "pause" | "raise" | "cut" | "hold" | "no-sales" = "hold";
    if (c.orders === 0) {
      if (c.clicks >= R.negateClicks) {
        proposal = "pause";
        row.bandLabel = `0 orders on ${c.clicks} clicks → pause`;
      } else {
        proposal = "no-sales";
        row.bandLabel =
          c.clicks === 0 ? "No clicks yet" : `0 orders on ${c.clicks} click${c.clicks === 1 ? "" : "s"} (pause at ${R.negateClicks})`;
      }
    } else {
      const lad = ladderChange(a, E.targetAcos, R.ladder);
      if (lad) {
        row.ratio = lad.ratio;
        row.ladderChange = lad.change;
        row.flagPause = lad.flagPause;
        let change = lad.change;
        let raiseBlocked = false;
        if (change > 0 && c.orders < R.minOrdersToRaise) {
          change = 0;
          raiseBlocked = true;
        }
        const starved =
          cvrV >= R.starvedMinCvr && c.orders >= R.starvedMinOrders && a < E.targetAcos && Number.isFinite(medianImpr) && c.impressions < medianImpr;
        if (starved && R.starvedRaise > change) {
          change = R.starvedRaise;
          raiseBlocked = false;
        }
        row.starved = starved && change === R.starvedRaise;
        row.raiseBlocked = raiseBlocked;
        row.proposedChange = change;
        const head = `ACoS ${times(lad.ratio)} target`;
        if (lad.flagPause) {
          proposal = "pause";
          row.bandLabel = `${head} → pause`;
        } else if (change > 0) {
          proposal = "raise";
          row.bandLabel = `${head} → ${signed(change)}${row.starved ? " (starved winner)" : ""}`;
        } else if (change < 0) {
          proposal = "cut";
          row.bandLabel = `${head} → ${signed(change)}`;
        } else if (raiseBlocked) {
          row.bandLabel = `${head} → ${signed(lad.change)}, but raises need ${R.minOrdersToRaise} orders (has ${c.orders})`;
        } else {
          row.bandLabel = `${head} → hold`;
        }
      }
    }

    // 2. The engine's holds, in its order.
    if (proposal === "no-sales") {
      row.band = "no-sales";
    } else if (proposal === "hold") {
      row.band = "hold";
    } else if (learning) {
      row.band = "learning";
      row.bandLabel = `Learning: ${historyDays} of ${R.minDaysHistory} days — would be: ${row.bandLabel}`;
    } else if (brandProtected && proposal !== "raise") {
      row.band = "hold";
      row.brandProtected = true;
      row.bandLabel = `Brand keyword (“${brand!.term}”): bids are kept — would be: ${row.bandLabel}`;
    } else if (!entity && !isKeyword) {
      row.band = "no-bid";
      row.bandLabel = `No bid for this target — import a bulk file. Would be: ${row.bandLabel}`;
    } else if (inactive) {
      row.band = "inactive";
      row.bandLabel = `${inactive[0].toUpperCase()}${inactive.slice(1)} in the bulk file`;
    } else if (proposal === "pause") {
      row.band = "pause";
    } else if (currentBid === undefined) {
      row.band = "no-bid";
      row.bandLabel = `No current bid or CPC to adjust — ${row.bandLabel}`;
    } else {
      const res = applyGuardrails(currentBid, currentBid * (1 + row.proposedChange), {
        maxMove: R.maxMove,
        floor: R.bidFloor,
        ceiling: R.bidCeiling,
        maxCpc: mc,
        decimals: bidDecimals(cur),
      });
      row.guard = res;
      const final = res.hold ? null : res.bid > currentBid ? "raise" : "cut";
      if (!final || final !== proposal) {
        row.band = "hold";
        const caps = res.capped
          .map((k) =>
            k === "max-cpc" ? `max CPC ${money(mc, cur)}` : k === "floor" ? `floor ${money(R.bidFloor, cur)}` : k === "ceiling" ? `ceiling ${money(R.bidCeiling, cur)}` : "max move",
          )
          .join(", ");
        row.bandLabel = `${row.bandLabel}, held at ${money(currentBid, cur)} by ${caps || "rounding"}`;
      } else {
        row.band = final;
        row.suggestedBid = res.bid;
      }
    }
    out.push(row);
  }
  return out;
}

/* ---------------------------------------------------------------- table UI */

export interface TargetFilter {
  text: string;
  campaign: string; // norm(campaign) or ""
  matchType: MatchType | "";
  band: TargetBand | "";
}

export const DEFAULT_TARGET_FILTER: TargetFilter = { text: "", campaign: "", matchType: "", band: "" };

export function filterTargets(rows: readonly TargetRow[], f: TargetFilter): TargetRow[] {
  const q = norm(f.text);
  return rows.filter((r) => {
    if (f.campaign && norm(r.campaign) !== f.campaign) return false;
    if (f.matchType && r.matchType !== f.matchType) return false;
    if (f.band && r.band !== f.band) return false;
    if (q && !`${norm(r.targeting)} ${norm(r.campaign)} ${norm(r.adGroup)}`.includes(q)) return false;
    return true;
  });
}

export type TargetSortKey =
  | "target"
  | "bid"
  | "clicks"
  | "orders"
  | "spend"
  | "acos"
  | "cvr"
  | "smoothed"
  | "maxCpc"
  | "ratio"
  | "suggested"
  | "change"
  | "history";

export const TARGET_TEXT_COLUMNS: readonly TargetSortKey[] = ["target"];

function sortValue(r: TargetRow, key: TargetSortKey): number | string | undefined {
  switch (key) {
    case "target":
      return norm(r.targeting);
    case "bid":
      return r.currentBid;
    case "clicks":
      return r.counters.clicks;
    case "orders":
      return r.counters.orders;
    case "spend":
      return r.counters.spend;
    case "acos":
      return r.acos;
    case "cvr":
      return r.cvr;
    case "smoothed":
      return r.smoothedCvr;
    case "maxCpc":
      return r.maxCpc;
    case "ratio":
      return r.ratio;
    case "suggested":
      return r.suggestedBid;
    case "change":
      return r.suggestedBid !== undefined && r.currentBid ? r.suggestedBid / r.currentBid - 1 : undefined;
    case "history":
      return r.historyDays;
  }
}

export function sortTargets(rows: readonly TargetRow[], key: TargetSortKey, dir: SortDir): TargetRow[] {
  return [...rows].sort(
    (a, b) => compareValues(sortValue(a, key), sortValue(b, key), dir) || b.counters.spend - a.counters.spend || a.key.localeCompare(b.key),
  );
}

export function bandCounts(rows: readonly TargetRow[]): Record<TargetBand, number> {
  const out = { raise: 0, hold: 0, cut: 0, pause: 0, "no-sales": 0, learning: 0, inactive: 0, "no-bid": 0 } as Record<TargetBand, number>;
  for (const r of rows) out[r.band]++;
  return out;
}
