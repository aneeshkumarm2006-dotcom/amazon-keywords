/**
 * Self-test: bid maths, the recommendation engine on a hand-worked dataset,
 * conflict resolution and the exports.
 */

import assert from "node:assert/strict";

import { applyGuardrails, bidLadder, breakEvenFromUnits, harvestBid, ladderChange, maxCpc, smoothedCvr, targetForGoal } from "../src/lib/ppc/bidding";
import { detectReport, isDetectionError } from "../src/lib/ppc/detect";
import { BULK_HEADERS, SP_SHEET_NAME, buildBulkSheet, bulkSheetXlsx, recommendationsCsv } from "../src/lib/ppc/export";
import { bulkEntityKey, searchTermKey } from "../src/lib/ppc/keys";
import { dateWindow, filterByWindow, previousWindow, toBase, missingRates, acos, cvr } from "../src/lib/ppc/metrics";
import { DEFAULT_LADDER, containsTokens, createStore, protectedMatch, recommend, resolveConflicts, tokenize } from "../src/lib/ppc/rules";
import type { BulkEntity, Decision, MatchType, Recommendation, SearchTermRow } from "../src/lib/ppc/types";
import { readXlsx } from "../src/lib/ppc/xlsx";
import { group, test } from "./ppc-test-harness";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

/* ------------------------------------------------------------- bid maths */

group("bidding");

test("break-even, goal targets, smoothed CVR, max CPC, bid ladder", () => {
  // (29.99 − 8 − 5.5 − 0.15×29.99 − 1) ÷ 29.99 = 10.9915 ÷ 29.99 = 0.36651
  close(breakEvenFromUnits({ price: 29.99, cogs: 8, fbaFee: 5.5, referralPct: 0.15, otherCosts: 1 }), 10.9915 / 29.99);
  assert.ok(Number.isNaN(breakEvenFromUnits({ price: 0 })));
  close(targetForGoal(0.4, "profit"), 0.3);
  close(targetForGoal(0.4, "growth"), 0.4);
  close(targetForGoal(0.4, "launch"), 0.52);
  close(targetForGoal(0.7, "launch"), 0.8); // capped
  close(targetForGoal(0.4, "liquidate"), 0.6);
  close(smoothedCvr(2, 5, 0.1, 15), 3.5 / 20);
  close(smoothedCvr(2, 5, NaN, 15), 0.4);
  close(maxCpc(0.3, 29.99, 0.1), 0.8997);
  assert.deepEqual(bidLadder(1), { conservative: 0.6, recommended: 0.8, aggressive: 1 });
  assert.equal(harvestBid({ targetAcos: 0.3, aov: 30, cvr: 0.1, harvestBidFactor: 0.8, matchMultiplier: 0.85, floor: 0.3, ceiling: 5 }), 0.61);
  assert.equal(harvestBid({ targetAcos: 0.3, aov: 5, cvr: 0.05, harvestBidFactor: 0.8, matchMultiplier: 1, floor: 0.3, ceiling: 5 }), 0.3);
});

test("ladder bands", () => {
  const band = (a: number) => ladderChange(a, 0.3, DEFAULT_LADDER)!;
  assert.equal(band(0.1).change, 0.15); // 0.33
  assert.equal(band(0.149).change, 0.15); // 0.497
  assert.equal(band(0.15).change, 0.08); // exactly 0.5: the first rung is strict (< 0.5 → +15%)
  assert.equal(band(0.2).change, 0.08); // 0.67
  assert.equal(band(0.33).change, 0); // 1.1
  assert.equal(band(0.42).change, -0.12); // 1.4
  assert.equal(band(0.54).change, -0.2); // 1.8
  assert.equal(band(0.75).flagPause, true); // 2.5
  assert.equal(ladderChange(NaN, 0.3, DEFAULT_LADDER), undefined);
  // JSON backups store Infinity as null.
  const fromJson = JSON.parse(JSON.stringify(DEFAULT_LADDER));
  assert.equal(ladderChange(3, 0.3, fromJson)!.flagPause, true);
});

test("guardrails: ±maxMove, max CPC, floor/ceiling, rounding, hold", () => {
  const o = { maxMove: 0.2, floor: 0.3, ceiling: 5 };
  assert.deepEqual(applyGuardrails(1, 1.5, o), { bid: 1.2, change: 0.19999999999999996, hold: false, capped: ["max-move"] });
  assert.equal(applyGuardrails(1, 0.5, o).bid, 0.8);
  assert.equal(applyGuardrails(1, 1.15, { ...o, maxCpc: 1.08 }).bid, 1.08); // raise capped at max CPC
  assert.equal(applyGuardrails(1.2, 1.38, { ...o, maxCpc: 1.0 }).hold, true); // raise never becomes a cut
  assert.equal(applyGuardrails(1.2, 1.1, { ...o, maxCpc: 0.5 }).bid, 0.96); // cut goes toward max CPC, one step max
  assert.equal(applyGuardrails(0.32, 0.25, o).bid, 0.3); // floor
  assert.equal(applyGuardrails(4.8, 5.6, o).bid, 5); // ceiling
  assert.equal(applyGuardrails(1, 1.004, o).hold, true); // < 1 cent
});

test("metrics: NaN not Infinity, windows, FX", () => {
  assert.ok(Number.isNaN(acos({ impressions: 10, clicks: 2, spend: 3, sales: 0, orders: 0, units: 0 })));
  assert.ok(Number.isNaN(cvr({ impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 })));
  const w = dateWindow("2026-09-28", 30, 2)!;
  assert.deepEqual(w, { from: "2026-08-28", to: "2026-09-26" });
  assert.deepEqual(previousWindow(w), { from: "2026-07-29", to: "2026-08-27" });
  const rows = [
    { date: "2026-08-27" },
    { date: "2026-08-28" },
    { date: "2026-09-27" },
    { date: "2026-08-01", endDate: "2026-08-30" }, // summary row overlapping the window
    { date: "2026-07-01", endDate: "2026-07-31" },
  ];
  assert.deepEqual(
    filterByWindow(rows, w).map((r) => r.date),
    ["2026-08-28", "2026-08-01"],
  );
  const settings = { baseCurrency: "USD", fxRates: { GBP: 1.27 } };
  close(toBase(10, "GBP", settings), 12.7);
  assert.equal(toBase(10, "USD", settings), 10);
  assert.ok(Number.isNaN(toBase(10, "EUR", settings)));
  assert.deepEqual(missingRates([{ currency: "USD" }, { currency: "EUR" }, { currency: "GBP" }], settings), ["EUR"]);
});

test("token matching and brand protection", () => {
  assert.equal(containsTokens(tokenize("free garlic press"), ["free"]), true);
  assert.equal(containsTokens(tokenize("garlic freezer tray"), ["free"]), false);
  assert.equal(containsTokens(tokenize("how to use a press"), ["how", "to"]), true);
  assert.equal(containsTokens(tokenize("to how"), ["how", "to"]), false);
  const s = { brandTerms: ["kitchen co"], competitorTerms: ["oxo"] };
  assert.equal(protectedMatch("kitchen co garlic press", s)?.kind, "brand");
  assert.equal(protectedMatch("kitchenco press", s)?.kind, "brand");
  assert.equal(protectedMatch("oxo good grips", s)?.kind, "competitor");
  assert.equal(protectedMatch("toxoplasma", s), null);
});

/* --------------------------------------------------- hand-worked dataset */

const STORE = "t1";
const W = "2026-09-01"; // inside the window (2026-08-12 … 2026-09-10)
const H = "2026-08-01"; // history, before the window
const L = "2026-09-12"; // latest date → inside the 2-day lag, excluded

function r(
  date: string,
  campaign: string,
  adGroup: string,
  targeting: string,
  matchType: MatchType,
  term: string,
  impressions: number,
  clicks: number,
  orders: number,
  spend: number,
  sales: number,
): SearchTermRow {
  const row: SearchTermRow = { key: "", storeId: STORE, batchId: "b", date, campaign, adGroup, targeting, matchType, searchTerm: term, impressions, clicks, spend, sales, orders, units: orders };
  row.key = searchTermKey(row);
  return row;
}

const A = (t: string, term: string, i: number, c: number, o: number, s: number, sa: number, d = W) => r(d, "W_Auto", "Auto", t, "auto", term, i, c, o, s, sa);
const B = (t: string, term: string, i: number, c: number, o: number, s: number, sa: number, d = W) => r(d, "W_Broad", "Broad", t, "broad", term, i, c, o, s, sa);
const E = (kw: string, i: number, c: number, o: number, s: number, sa: number, d = W) => r(d, "W_Exact", "Exact", kw, "exact", kw, i, c, o, s, sa);

const EXACT_KWS = ["blue widget", "red widget", "green widget", "black widget", "white widget", "pink widget", "gold widget", "tiny widget", "acme deluxe"];

export const MINI_ROWS: SearchTermRow[] = [
  // Auto ad group — window totals: 150 clicks, 15 orders → ad-group CVR prior = 0.10 exactly.
  A("close-match", "wireless widget", 4000, 40, 4, 20, 120),
  A("loose-match", "widget holder", 1500, 15, 0, 9, 0), // 15 clicks, 0 orders → negate
  A("loose-match", "widget case", 1400, 14, 0, 8.4, 0), // 14 clicks → no negate
  A("loose-match", "widget case", 500, 5, 0, 3, 0, L), // lag day: excluded
  A("close-match", "free widget ideas", 300, 3, 0, 1.5, 0), // irrelevant "free"
  A("close-match", "widget freezer bag", 400, 4, 0, 2, 0), // "freezer" ≠ "free"
  A("loose-match", "acme widget", 2000, 20, 0, 12, 0), // brand
  A("close-match", "cheap widget", 600, 6, 0, 3, 0), // "cheap", but converts in Broad
  A("loose-match", "widget stand", 1600, 16, 0, 9.6, 0), // converts in Broad
  A("close-match", "blue widget", 1000, 10, 3, 5, 90), // already an exact keyword
  A("close-match", "b0abcdef12", 800, 8, 2, 6, 60), // ASIN winner
  A("close-match", "gadget alpha", 400, 4, 2, 2, 60),
  A("close-match", "gadget beta", 400, 4, 2, 2, 60),
  A("close-match", "gadget gamma", 400, 4, 2, 2, 60),
  A("close-match", "gadget delta", 200, 2, 0, 1, 0),
  A("close-match", "history filler", 10, 1, 0, 0.5, 0, H),
  A("loose-match", "history filler", 10, 1, 0, 0.5, 0, H),
  // Broad ad group.
  B("widget", "cheap widget", 500, 5, 2, 2.5, 60),
  B("widget", "widget stand", 500, 5, 1, 3, 30),
  B("widget", "widget replacement", 1200, 12, 1, 30, 30), // 100% ACoS = 3.1× BE → negate (medium)
  B("widget", "widget lamp", 1000, 10, 1, 20, 30), // 66.7% = 2.1× BE → evidence on the bid
  B("widget accessories", "widget accessories", 3000, 3, 0, 1.5, 0), // CTR 0.1% → relevance
  B("widget", "history filler", 10, 1, 0, 0.5, 0, H),
  B("widget accessories", "widget accessories", 10, 1, 0, 0.5, 0, H),
  // Exact ad group (search term = keyword). Window totals: 315 clicks, 40 orders.
  E("blue widget", 5000, 50, 10, 30, 300), // ACoS 10%  → ÷target 0.33 → +15%
  E("red widget", 5000, 50, 5, 63, 150), // 42% → 1.4 → −12%
  E("green widget", 5000, 50, 5, 81, 150), // 54% → 1.8 → −20%
  E("black widget", 30000, 50, 4, 90, 120), // 75% → 2.5 → pause (+ low CTR → relevance folds)
  E("white widget", 9000, 20, 2, 12.6, 60), // 21% → 0.7 → +8% but only 2 orders
  E("pink widget", 300, 10, 2, 6, 60), // starved winner → +20%
  E("gold widget", 2000, 20, 4, 12, 120), // +20% capped by max CPC
  E("tiny widget", 1500, 15, 0, 12, 0), // 0 orders, 15 clicks → pause (never negated)
  E("new widget", 3000, 30, 6, 15, 180), // first seen 9 days before window end → learning
  E("acme deluxe", 2000, 20, 2, 32.4, 60), // brand keyword: no cut
  ...EXACT_KWS.map((kw) => E(kw, 10, 1, 0, 1, 0, H)),
];

function ent(e: Omit<BulkEntity, "key" | "storeId" | "batchId">): BulkEntity {
  const full: BulkEntity = { key: "", storeId: STORE, batchId: "bulk", ...e };
  full.key = bulkEntityKey(full);
  return full;
}

const KW_BIDS: Record<string, number> = { "pink widget": 0.5, "gold widget": 1.4 };

export const MINI_BULK: BulkEntity[] = [
  ent({ entity: "Campaign", campaignId: "C1", campaignName: "W_Auto", state: "enabled", targetingType: "Auto", dailyBudget: 20 }),
  ent({ entity: "Ad Group", campaignId: "C1", adGroupId: "AG1", campaignName: "W_Auto", adGroupName: "Auto", state: "enabled", defaultBid: 0.75 }),
  ent({ entity: "Product Ad", campaignId: "C1", adGroupId: "AG1", adId: "AD1", campaignName: "W_Auto", adGroupName: "Auto", state: "enabled", sku: "SKU-W-1", asin: "B0OWN00001" }),
  ent({ entity: "Product Targeting", campaignId: "C1", adGroupId: "AG1", productTargetingId: "T1", campaignName: "W_Auto", adGroupName: "Auto", state: "enabled", bid: 0.75, expression: "close-match" }),
  ent({ entity: "Product Targeting", campaignId: "C1", adGroupId: "AG1", productTargetingId: "T2", campaignName: "W_Auto", adGroupName: "Auto", state: "enabled", bid: 0.75, expression: "loose-match" }),
  ent({ entity: "Campaign", campaignId: "C2", campaignName: "W_Broad", state: "enabled", targetingType: "Manual", dailyBudget: 15 }),
  ent({ entity: "Ad Group", campaignId: "C2", adGroupId: "AG2", campaignName: "W_Broad", adGroupName: "Broad", state: "enabled", defaultBid: 0.8 }),
  ent({ entity: "Product Ad", campaignId: "C2", adGroupId: "AG2", adId: "AD2", campaignName: "W_Broad", adGroupName: "Broad", state: "enabled", sku: "SKU-W-1" }),
  ent({ entity: "Keyword", campaignId: "C2", adGroupId: "AG2", keywordId: "KB1", campaignName: "W_Broad", adGroupName: "Broad", state: "enabled", bid: 0.8, keywordText: "widget", matchType: "broad" }),
  ent({ entity: "Keyword", campaignId: "C2", adGroupId: "AG2", keywordId: "KB2", campaignName: "W_Broad", adGroupName: "Broad", state: "enabled", bid: 0.8, keywordText: "widget accessories", matchType: "broad" }),
  ent({ entity: "Campaign", campaignId: "C3", campaignName: "W_Exact", state: "enabled", targetingType: "Manual", dailyBudget: 25 }),
  ent({ entity: "Ad Group", campaignId: "C3", adGroupId: "AG3", campaignName: "W_Exact", adGroupName: "Exact", state: "enabled", defaultBid: 1 }),
  ent({ entity: "Product Ad", campaignId: "C3", adGroupId: "AG3", adId: "AD3", campaignName: "W_Exact", adGroupName: "Exact", state: "enabled", sku: "SKU-W-1" }),
  ...[...EXACT_KWS, "new widget"].map((kw, i) =>
    ent({ entity: "Keyword", campaignId: "C3", adGroupId: "AG3", keywordId: `K${i + 1}`, campaignName: "W_Exact", adGroupName: "Exact", state: "enabled", bid: KW_BIDS[kw] ?? 1, keywordText: kw, matchType: "exact" }),
  ),
];

export const MINI_STORE = createStore({
  id: STORE,
  name: "Widget Co",
  marketplace: "US",
  currency: "USD",
  brandTerms: ["acme"],
  economics: { breakEvenAcos: 0.32, targetAcos: 0.3 },
  harvestDestination: { mode: "new-campaign", productLabel: "Widget", dailyBudget: 20 },
});

group("rules");

const result = recommend({ store: MINI_STORE, rows: MINI_ROWS, bulk: MINI_BULK });
const recs = result.recommendations;
const find = (action: string, subject: string) => recs.find((x) => x.action === action && x.subject === subject);

test("window = 30 days ending latest date − 2", () => {
  assert.deepEqual(result.window, { from: "2026-08-12", to: "2026-09-10" });
});

test("exactly the expected recommendations", () => {
  const got = recs.map((x) => `${x.action}|${x.subject}|${x.campaign}`).sort();
  const expected = [
    "harvest-exact|wireless widget|W_Auto",
    "negate-exact|wireless widget|W_Auto",
    "harvest-product|b0abcdef12|W_Auto",
    "negate-product|b0abcdef12|W_Auto",
    "harvest-exact|cheap widget|W_Broad",
    "negate-exact|cheap widget|W_Broad",
    "negate-exact|widget holder|W_Auto",
    "negate-phrase|free|W_Auto",
    "negate-exact|widget replacement|W_Broad",
    "bid-up|blue widget|W_Exact",
    "bid-down|red widget|W_Exact",
    "bid-down|green widget|W_Exact",
    "pause|black widget|W_Exact",
    "bid-up|pink widget|W_Exact",
    "bid-up|gold widget|W_Exact",
    "pause|tiny widget|W_Exact",
    "bid-down|widget|W_Broad",
    "relevance|widget accessories|W_Broad",
    "bid-up|close-match|W_Auto",
    "pause|loose-match|W_Auto",
  ].sort();
  assert.deepEqual(got, expected);
});

test("harvest bid to the cent (hand calculation)", () => {
  // wireless widget: 40 clicks, 4 orders, $20 spend, $120 sales → ACoS 16.7% < 30%.
  // Prior = Auto ad-group CVR in window = 15 orders ÷ 150 clicks = 0.10.
  // Smoothed CVR = (4 + 15 × 0.10) ÷ (40 + 15) = 5.5 ÷ 55 = 0.10.
  // AOV = 120 ÷ 4 = $30.
  // Bid = 0.30 × 30 × 0.10 × 0.80 × 1.0 (exact) = $0.72. Max CPC = 0.30 × 30 × 0.10 = $0.90.
  const h = find("harvest-exact", "wireless widget")!;
  assert.equal(h.suggestedBid, 0.72);
  assert.equal(h.maxCpc, 0.9);
  assert.equal(h.priority, "high"); // ≥ 3 orders
  assert.equal(h.matchType, "exact");
  assert.deepEqual(h.ids, { campaignId: "C1", adGroupId: "AG1" });
  close(h.impact!, 120, 1e-6); // $120 sales in a 30-day window → $120 / 30 days
  // ASIN: (2 + 1.5) ÷ 23 = 0.152174 → 0.3 × 30 × 0.152174 × 0.8 = 1.0957 → $1.10.
  const p = find("harvest-product", "b0abcdef12")!;
  assert.equal(p.suggestedBid, 1.1);
  assert.equal(p.priority, "medium");
  // Broad prior 5 ÷ 35: (2 + 15 × 5/35) ÷ 20 = 0.207143 → 0.3 × 30 × 0.207143 × 0.8 = 1.4914 → $1.49.
  assert.equal(find("harvest-exact", "cheap widget")!.suggestedBid, 1.49);
});

test("paired negatives link both ways and sit in the source ad group", () => {
  const h = find("harvest-exact", "wireless widget")!;
  const n = find("negate-exact", "wireless widget")!;
  assert.equal(h.pairedWith, n.id);
  assert.equal(n.pairedWith, h.id);
  assert.equal(n.adGroup, "Auto");
  assert.equal(n.impact, 0);
  assert.equal(find("negate-product", "b0abcdef12")!.pairedWith, find("harvest-product", "b0abcdef12")!.id);
});

test("negate-exact at 15 clicks, not at 14; lag days excluded", () => {
  const n = find("negate-exact", "widget holder")!;
  assert.equal(n.priority, "high");
  assert.equal(n.pairedWith, undefined);
  close(n.impact!, 9, 1e-6);
  assert.equal(find("negate-exact", "widget case"), undefined);
  // With no lag the 09-12 row counts: 19 clicks → negate.
  const noLag = createStore({ ...MINI_STORE, rules: { ...MINI_STORE.rules, lagDays: 0 } });
  const r2 = recommend({ store: noLag, rows: MINI_ROWS, bulk: MINI_BULK });
  assert.ok(r2.recommendations.some((x) => x.action === "negate-exact" && x.subject === "widget case"));
});

test("irrelevant phrase: 'free' matches, 'freezer' does not; converting 'cheap' protected", () => {
  const ph = recs.filter((x) => x.action === "negate-phrase");
  assert.deepEqual(
    ph.map((x) => x.subject),
    ["free"],
  );
  assert.ok(ph[0].evidence.some((e) => e.includes("free widget ideas")));
  assert.ok(!ph[0].evidence.some((e) => e.includes("freezer")));
  const cheap = result.skipped.filter((s) => s.subject === "cheap");
  assert.equal(cheap.length, 2);
  assert.ok(cheap.every((s) => /negative would block a converting term/.test(s.reason)));
});

test("expensive converting term → negate (medium); 2–3× BE → evidence on the bid", () => {
  const n = find("negate-exact", "widget replacement")!;
  assert.equal(n.priority, "medium");
  assert.match(n.reason, /3\.1× break-even/);
  const bid = find("bid-down", "widget")!;
  assert.ok(bid.evidence.some((e) => e.includes("widget lamp") && e.includes("2.1× break-even")));
  assert.equal(bid.suggestedBid, 0.7); // 0.80 × (1 − 12%) = 0.704
});

test("safety skips: converting elsewhere, brand, already targeted, learning, raise needs orders, brand keyword", () => {
  const reason = (subject: string) => result.skipped.find((s) => s.subject === subject)?.reason ?? "";
  assert.match(reason("widget stand"), /negative would block a converting term \(1 order in W_Broad \/ Broad\)/);
  assert.match(reason("acme widget"), /brand term/);
  assert.match(reason("blue widget"), /already an exact keyword in W_Exact \/ Exact/);
  assert.match(reason("new widget"), /learning: 10 days/); // first seen 09-01, window end 09-10: 10 days of data
  assert.match(reason("white widget"), /raise needs ≥ 3 orders \(has 2\)/);
  assert.match(reason("acme deluxe"), /brand keyword/);
  assert.equal(result.skipped.length, 8);
  // Never a negative for the brand term, the converting term or the exact keyword's own term.
  assert.ok(!recs.some((x) => x.action.startsWith("negate") && ["acme widget", "widget stand", "tiny widget"].includes(x.subject)));
});

test("bid ladder bands, starved winner, max-CPC cap, pause at top rung", () => {
  const up = find("bid-up", "blue widget")!;
  assert.deepEqual([up.currentBid, up.suggestedBid, up.currentBidSource], [1, 1.15, "bulk"]);
  assert.equal(up.ids.keywordId, "K1");
  assert.equal(find("bid-down", "red widget")!.suggestedBid, 0.88);
  assert.equal(find("bid-down", "green widget")!.suggestedBid, 0.8);
  const pink = find("bid-up", "pink widget")!;
  assert.equal(pink.suggestedBid, 0.6); // 0.50 + 20% (starved winner)
  assert.ok(pink.evidence.some((e) => e.startsWith("starved winner")));
  // gold: +20% → 1.68, but max CPC = 0.3 × 30 × (4 + 15 × 40/315) ÷ 35 = 1.5184 → $1.52.
  const gold = find("bid-up", "gold widget")!;
  assert.equal(gold.suggestedBid, 1.52);
  assert.equal(gold.maxCpc, 1.52);
  assert.ok(gold.evidence.some((e) => e.includes("max-cpc")));
  const black = find("pause", "black widget")!;
  assert.equal(black.priority, "high");
  assert.ok(black.evidence.some((e) => e.startsWith("bid-down alternative: −20%")));
  assert.ok(black.evidence.some((e) => e.startsWith("folded relevance")), "relevance folded into the pause");
  const tiny = find("pause", "tiny widget")!;
  assert.match(tiny.reason, /15 clicks, \$12\.00 spend, 0 orders/);
  assert.equal(find("pause", "loose-match")!.ids.productTargetingId, "T2");
});

test("±20% cap applies inside recommend()", () => {
  const ladder = DEFAULT_LADDER.map((x, i) => (i === 0 ? { ...x, change: 0.3 } : { ...x }));
  const s = createStore({ ...MINI_STORE, rules: { ...MINI_STORE.rules, ladder } });
  const up = recommend({ store: s, rows: MINI_ROWS, bulk: MINI_BULK }).recommendations.find((x) => x.action === "bid-up" && x.subject === "blue widget")!;
  assert.equal(up.suggestedBid, 1.2);
  assert.ok(up.evidence.some((e) => e.includes("max-move")));
});

test("no bulk file: keywords fall back to avg CPC, product/auto targets are skipped", () => {
  const r2 = recommend({ store: MINI_STORE, rows: MINI_ROWS, bulk: [] });
  const up = r2.recommendations.find((x) => x.action === "bid-up" && x.subject === "blue widget")!;
  assert.equal(up.currentBidSource, "avg-cpc");
  assert.equal(up.currentBid, 0.6); // $30 ÷ 50 clicks
  assert.ok(!r2.recommendations.some((x) => x.subject === "close-match"));
  assert.ok(r2.skipped.some((x) => x.subject === "close-match" && /import a bulk file/.test(x.reason)));
});

test("deterministic ids, sorted by priority then impact", () => {
  const again = recommend({ store: MINI_STORE, rows: [...MINI_ROWS].reverse(), bulk: MINI_BULK }).recommendations;
  assert.deepEqual(
    again.map((x) => x.id),
    recs.map((x) => x.id),
  );
  assert.equal(find("harvest-exact", "wireless widget")!.id, "t1|harvest-exact|w_auto|auto|wireless widget");
  const rank = { high: 0, medium: 1, low: 2 };
  for (let i = 1; i < recs.length; i++) {
    const a = recs[i - 1];
    const b = recs[i];
    assert.ok(rank[a.priority] < rank[b.priority] || (rank[a.priority] === rank[b.priority] && (a.impact ?? 0) >= (b.impact ?? 0)));
  }
});

test("conflict resolver: most destructive wins, harvest pairs are not conflicts", () => {
  const base = (id: string, action: Recommendation["action"], extra: Partial<Recommendation> = {}): Recommendation => ({
    id,
    storeId: STORE,
    action,
    priority: "medium",
    subject: "kw",
    campaign: "C",
    adGroup: "G",
    matchType: "exact",
    counters: { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 },
    reason: action,
    evidence: [],
    ids: {},
    level: "target",
    ...extra,
  });
  const out = resolveConflicts([base("1", "bid-up"), base("2", "relevance"), base("3", "pause"), base("4", "bid-down")]);
  assert.deepEqual(
    out.map((x) => x.action),
    ["pause"],
  );
  assert.equal(out[0].evidence.length, 3);
  const pair = resolveConflicts([
    base("h", "harvest-exact", { level: "search-term", pairedWith: "n" }),
    base("n", "negate-exact", { level: "search-term", pairedWith: "h" }),
  ]);
  assert.equal(pair.length, 2);
});

/* ---------------------------------------------------------------- export */

group("export");

const approve = (rec: Recommendation, extra: Partial<Decision> = {}): Decision => ({
  recId: rec.id,
  storeId: STORE,
  status: "approved",
  decidedAt: "2026-09-30T00:00:00.000Z",
  ...extra,
});

function exportDecisions(): Decision[] {
  const pick = (action: string, subject: string) => find(action, subject)!;
  return [
    approve(pick("harvest-exact", "wireless widget")),
    approve(pick("negate-exact", "wireless widget")),
    approve(pick("harvest-product", "b0abcdef12")),
    approve(pick("negate-product", "b0abcdef12")),
    approve(pick("negate-exact", "widget holder")),
    approve(pick("negate-phrase", "free")),
    approve(pick("bid-up", "blue widget"), { editedBid: 1.1 }),
    approve(pick("pause", "tiny widget")),
    approve(pick("bid-up", "close-match")),
    approve(pick("relevance", "widget accessories")),
    { ...approve(pick("bid-down", "red widget")), status: "rejected" },
  ];
}

const col = (name: (typeof BULK_HEADERS)[number]) => BULK_HEADERS.indexOf(name);

test("bulk sheet: new-campaign harvests with temp IDs + Product Ad SKUs, negatives, updates", () => {
  const { rows, warnings, count } = buildBulkSheet({ store: MINI_STORE, recs, decisions: exportDecisions(), bulk: MINI_BULK, today: "2026-09-30" });
  assert.deepEqual(rows[0], [...BULK_HEADERS]);
  assert.equal(count, rows.length - 1);
  const data = rows.slice(1);
  const summary = data.map((x) => `${x[col("Entity")]}|${x[col("Operation")]}|${x[col("Campaign ID")] ?? ""}|${x[col("Ad Group ID")] ?? ""}`);
  assert.deepEqual(summary.slice(0, 8), [
    "Campaign|Create|Widget_Exact_Harvest|",
    "Ad Group|Create|Widget_Exact_Harvest|Exact_Harvest",
    "Product Ad|Create|Widget_Exact_Harvest|Exact_Harvest",
    "Keyword|Create|Widget_Exact_Harvest|Exact_Harvest",
    "Campaign|Create|Widget_Prod_Harvest|",
    "Ad Group|Create|Widget_Prod_Harvest|Prod_Harvest",
    "Product Ad|Create|Widget_Prod_Harvest|Prod_Harvest",
    "Product Targeting|Create|Widget_Prod_Harvest|Prod_Harvest",
  ]);
  const camp = data[0];
  assert.equal(camp[col("Product")], "Sponsored Products");
  assert.equal(camp[col("Campaign Name")], "Widget_Exact_Harvest");
  assert.equal(camp[col("Start Date")], "20260930");
  assert.equal(camp[col("Targeting Type")], "Manual");
  assert.equal(camp[col("State")], "enabled");
  assert.equal(camp[col("Daily Budget")], 20);
  assert.equal(camp[col("Bidding Strategy")], "Dynamic bids - down only");
  assert.equal(data[1][col("Ad Group Default Bid")], 0.72);
  assert.equal(data[2][col("SKU")], "SKU-W-1");
  const kw = data[3];
  assert.deepEqual([kw[col("Keyword Text")], kw[col("Match Type")], kw[col("Bid")]], ["wireless widget", "exact", 0.72]);
  assert.equal(data[7][col("Product Targeting Expression")], 'asin="B0ABCDEF12"');
  assert.equal(data[7][col("Bid")], 1.1);

  const negatives = data.filter((x) => String(x[col("Entity")]).startsWith("Negative"));
  const negSummary = negatives
    .map((x) => `${x[col("Entity")]}|${x[col("Campaign ID")]}|${x[col("Ad Group ID")]}|${x[col("Keyword Text")] ?? x[col("Product Targeting Expression")]}|${x[col("Match Type")] ?? ""}`)
    .sort();
  assert.deepEqual(negSummary, [
    "Negative Keyword|C1|AG1|free|negativePhrase",
    "Negative Keyword|C1|AG1|widget holder|negativeExact",
    "Negative Keyword|C1|AG1|wireless widget|negativeExact",
    'Negative Product Targeting|C1|AG1|asin="B0ABCDEF12"|',
  ]);
  const updates = data.filter((x) => x[col("Operation")] === "Update");
  const upd = updates.map((x) => `${x[col("Entity")]}|${x[col("Keyword ID")] ?? x[col("Product Targeting ID")]}|${x[col("Bid")] ?? ""}|${x[col("State")] ?? ""}`).sort();
  assert.deepEqual(upd, ["Keyword|K1|1.1|", "Keyword|K8||paused", "Product Targeting|T1|0.86|"]);
  // Parents first: every Update after every Create.
  const lastCreate = Math.max(...data.map((x, i) => (x[col("Operation")] === "Create" ? i : -1)));
  const firstUpdate = data.findIndex((x) => x[col("Operation")] === "Update");
  assert.ok(lastCreate < firstUpdate);
  assert.ok(warnings.some((w) => /relevance check is informational/.test(w)));
  assert.ok(!warnings.some((w) => /need IDs/.test(w)));
  assert.equal(data.length, 15);
});

test("source destination drops the paired negative; missing IDs are flagged", () => {
  // "cheap widget" comes from W_Broad / Broad, a manual keyword ad group: source mode keeps it there.
  const cheapH = find("harvest-exact", "cheap widget")!;
  const cheapN = find("negate-exact", "cheap widget")!;
  const decisions = [approve(cheapH, { destination: { mode: "source" } }), approve(cheapN)];
  const { rows, warnings } = buildBulkSheet({ store: MINI_STORE, recs, decisions, bulk: MINI_BULK, today: "2026-09-30" });
  const kw = rows.find((x) => x[col("Entity")] === "Keyword" && x[col("Operation")] === "Create")!;
  assert.deepEqual([kw[col("Campaign ID")], kw[col("Ad Group ID")], kw[col("Keyword Text")]], ["C2", "AG2", "cheap widget"]);
  assert.ok(!rows.some((x) => x[col("Keyword Text")] === "cheap widget" && x[col("Match Type")] === "negativeExact"));
  assert.ok(warnings.some((w) => /Paired negative .*cheap widget.* same ad group/.test(w)));
  assert.equal(rows.length, 2);

  const noBulk = recommend({ store: MINI_STORE, rows: MINI_ROWS, bulk: [] }).recommendations;
  const holder = noBulk.find((x) => x.action === "negate-exact" && x.subject === "widget holder")!;
  const res = buildBulkSheet({ store: MINI_STORE, recs: noBulk, decisions: [approve(holder)], bulk: [], today: "2026-09-30" });
  assert.equal(res.rows.length, 2);
  assert.equal(res.rows[1][col("Campaign ID")], null);
  assert.ok(res.warnings.some((w) => /1 row need IDs — import a bulk file/.test(w)));
});

test("existing destination and edited bids", () => {
  const store = createStore({
    ...MINI_STORE,
    harvestDestination: { mode: "existing", campaignId: "C3", adGroupId: "AG3", campaignName: "W_Exact", adGroupName: "Exact" },
  });
  const h = find("harvest-exact", "wireless widget")!;
  const { rows } = buildBulkSheet({ store, recs, decisions: [approve(h, { editedBid: 0.66 })], bulk: MINI_BULK, today: "2026-09-30" });
  assert.equal(rows.length, 2);
  assert.deepEqual([rows[1][col("Campaign ID")], rows[1][col("Ad Group ID")], rows[1][col("Bid")]], ["C3", "AG3", 0.66]);
});

test("bulkSheetXlsx round trip: sheet name and headers exact, re-detected as bulk", async () => {
  const bytes = bulkSheetXlsx({ store: MINI_STORE, recs, decisions: exportDecisions(), bulk: MINI_BULK, today: "2026-09-30" });
  const { sheets } = await readXlsx(bytes);
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].name, SP_SHEET_NAME);
  assert.equal(sheets[0].name, "Sponsored Products Campaigns");
  assert.deepEqual(sheets[0].rows[0], [...BULK_HEADERS]);
  assert.equal(sheets[0].rows.length, 16);
  const d = detectReport(sheets[0].rows);
  assert.ok(!isDetectionError(d) && d.kind === "bulk");
});

test("recommendationsCsv: Template 2 columns + bid and reason", () => {
  const out = recommendationsCsv(recs, MINI_STORE);
  assert.equal(out.length, recs.length + 1);
  assert.deepEqual(out[0].slice(0, 4), ["Search Term / Target", "Campaign", "Ad Group", "Match Type"]);
  assert.equal(out[0][out[0].length - 1], "Reason");
  const blue = out.find((x) => x[0] === "blue widget")!;
  assert.equal(blue[12], "BID UP +15%");
  assert.equal(blue[15], "1.15");
  const holder = out.find((x) => x[0] === "widget holder")!;
  assert.equal(holder[9], "no sales");
});
