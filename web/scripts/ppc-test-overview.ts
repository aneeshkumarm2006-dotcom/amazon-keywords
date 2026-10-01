/**
 * Self-test: the /dashboard overview computations (src/components/ppc/overview/compute.ts) —
 * index interning, period windows and FX, summary rows, the rolling series, wasted spend,
 * deltas, KPI tiles, alerts, recommendation helpers, sparklines and sorting.
 */

import assert from "node:assert/strict";

import {
  ALERT_RULES,
  ROLLING_DAYS,
  acosSpike,
  acosTone,
  actionGroup,
  buildKpis,
  buildOverviewIndex,
  compareValues,
  computeAlerts,
  computePeriod,
  dayNumber,
  formatPoints,
  formatRelative,
  freshness,
  harvestSummary,
  isCompanion,
  isOpen,
  isoFromDay,
  openRecommendations,
  pointsDelta,
  recCountsByStore,
  relativeDelta,
  sparklinePath,
  topActions,
  trendDirection,
  trendRows,
  weightedTarget,
} from "../src/components/ppc/overview/compute";
import { addDays } from "../src/lib/ppc/dates";
import { makeDemoData } from "../src/lib/ppc/demo";
import { dateWindow, filterByWindow, totals } from "../src/lib/ppc/metrics";
import { createStore } from "../src/lib/ppc/rules";
import type { ActionType, Counters, Decision, Recommendation, SearchTermRow, Store } from "../src/lib/ppc/types";
import { group, note, test } from "./ppc-test-harness";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

function row(o: Partial<SearchTermRow> & Pick<SearchTermRow, "storeId" | "date" | "campaign" | "searchTerm">): SearchTermRow {
  return {
    key: "",
    batchId: "t",
    adGroup: "AG",
    targeting: "kw",
    matchType: "broad",
    impressions: 100,
    clicks: 1,
    spend: 1,
    sales: 0,
    orders: 0,
    units: 0,
    ...o,
  };
}

/** One row per day from `from` for `n` days. */
function daily(
  n: number,
  from: string,
  base: Pick<SearchTermRow, "storeId" | "campaign" | "searchTerm"> & Partial<SearchTermRow>,
): SearchTermRow[] {
  return Array.from({ length: n }, (_, i) => row({ ...base, date: addDays(from, i), units: base.orders ?? 0 }));
}

function store(id: string, currency: string, over: Partial<Store> & { targetAcos?: number; breakEvenAcos?: number } = {}): Store {
  const { targetAcos = 0.3, breakEvenAcos = 0.35, ...rest } = over;
  return createStore({
    id,
    name: id.toUpperCase(),
    currency,
    marketplace: currency === "GBP" ? "UK" : "US",
    economics: { targetAcos, breakEvenAcos },
    ...rest,
  });
}

const c = (o: Partial<Counters>): Counters => ({ impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0, ...o });

group("overview");

/* ----------------------------------------------------------- basics */

test("day numbers, freshness", () => {
  assert.equal(isoFromDay(dayNumber("2026-09-28")), "2026-09-28");
  assert.equal(dayNumber("2026-03-01") - dayNumber("2026-02-28"), 1);
  assert.deepEqual(freshness("2026-09-28", "2026-10-01"), { daysOld: 3, stale: false });
  assert.deepEqual(freshness("2026-09-27", "2026-10-01"), { daysOld: 4, stale: true });
  assert.equal(freshness(undefined, "2026-10-01").stale, false);
});

test("index interns campaigns / terms case- and space-insensitively", () => {
  const rows = [
    row({ storeId: "a", date: "2026-09-01", campaign: "Camp One", searchTerm: "Blue Widget" }),
    row({ storeId: "a", date: "2026-09-02", campaign: "camp  one", searchTerm: "blue widget" }),
    row({ storeId: "a", date: "2026-09-03", campaign: " CAMP ONE ", searchTerm: "blue  widget " }),
    row({ storeId: "a", date: "2026-09-03", campaign: "Camp One", adGroup: "Other", searchTerm: "blue widget" }),
    row({ storeId: "b", date: "2026-08-01", endDate: "2026-08-31", campaign: "Camp One", searchTerm: "blue widget" }),
  ];
  const ix = buildOverviewIndex(rows);
  assert.equal(ix.storeIds.length, 2);
  assert.equal(ix.campaigns.length, 2, "one campaign per store");
  assert.equal(ix.terms.length, 3, "store a: two ad groups; store b: one");
  assert.equal(ix.storeTerms.length, 2, "one store-wide term per store");
  assert.equal(ix.campaigns[0].name, "Camp One", "first spelling kept");
  assert.equal(ix.dailyRows, 4);
  assert.equal(ix.summaryRows, 1);
  assert.equal(isoFromDay(ix.latestByStore[0]), "2026-09-03");
  assert.equal(isoFromDay(ix.latestByStore[1]), "2026-08-31", "summary rows end on endDate");
  assert.equal(isoFromDay(ix.earliestByStore[1]), "2026-08-01");
});

/* ----------------------------------------------------------- period */

// S1 (USD): 14 daily rows 1–14 Sep. S2 (GBP): daily 8–14 Sep plus one summary row 1–10 Sep.
const S1 = store("s1", "USD", { targetAcos: 0.3, breakEvenAcos: 0.4 });
const S2 = store("s2", "GBP", { targetAcos: 0.2, breakEvenAcos: 0.25 });
const PERIOD_ROWS: SearchTermRow[] = [
  ...daily(14, "2026-09-01", { storeId: "s1", campaign: "A", searchTerm: "t1", clicks: 2, spend: 2, sales: 10, orders: 1 }),
  ...daily(7, "2026-09-08", { storeId: "s2", campaign: "B", searchTerm: "t2", clicks: 1, spend: 4, sales: 8, orders: 1 }),
  row({ storeId: "s2", date: "2026-09-01", endDate: "2026-09-10", campaign: "B", searchTerm: "t3", clicks: 10, spend: 20 }),
];
const FX = { baseCurrency: "USD", fxRates: { GBP: 1.25 } };

test("period: window ends on the latest date; FX; summary rows overlap both windows", () => {
  const ix = buildOverviewIndex(PERIOD_ROWS);
  const p = computePeriod(ix, { days: 7, stores: [S1, S2], fx: FX, convert: true });
  assert.deepEqual(p.window, { from: "2026-09-08", to: "2026-09-14" });
  assert.deepEqual(p.previous, { from: "2026-09-01", to: "2026-09-07" });
  assert.equal(p.latest, "2026-09-14");
  assert.equal(p.currency, "USD");
  const [s1, s2] = p.stores;
  assert.deepEqual([s1.cur.clicks, s1.cur.spend, s1.cur.sales, s1.cur.orders], [14, 14, 70, 7]);
  assert.deepEqual([s1.prev.clicks, s1.prev.spend, s1.prev.sales], [14, 14, 70]);
  // S2 current: 7 daily rows + the summary row (1–10 Sep overlaps 8–14 Sep) in full.
  assert.deepEqual([s2.cur.clicks, s2.cur.spend, s2.cur.sales, s2.cur.orders], [17, 48, 56, 7]);
  // …and the summary row overlaps the previous window too.
  assert.deepEqual([s2.prev.clicks, s2.prev.spend, s2.prev.sales], [10, 20, 0]);
  close(p.total.cur.spend, 14 + 48 * 1.25);
  close(p.total.cur.sales, 70 + 56 * 1.25);
  assert.equal(p.total.cur.clicks, 31);
  close(p.total.prev.spend, 14 + 20 * 1.25);
  assert.equal(p.summaryRowsInWindow, 1);
  assert.equal(p.dailyRowsInWindow, 14);
  assert.equal(p.prevCovered, true);
  assert.equal(p.prevHasData, true);
  assert.equal(p.lagDays, 2);
  // Spend-weighted target: (14 × 0.30 + 60 × 0.20) ÷ 74.
  close(p.target.acos, (14 * 0.3 + 60 * 0.2) / 74);
  close(p.target.breakEven, (14 * 0.4 + 60 * 0.25) / 74);
});

test("period: daily series, rolling 7-day sums, sparklines (summary rows excluded)", () => {
  const p = computePeriod(buildOverviewIndex(PERIOD_ROWS), { days: 7, stores: [S1, S2], fx: FX, convert: true });
  assert.equal(p.daily.length, 7);
  assert.equal(p.daily[0].date, "2026-09-08");
  close(p.daily[0].total.spend, 2 + 4 * 1.25);
  close(p.daily[0].byStore[1].spend, 5);
  assert.equal(ROLLING_DAYS, 7);
  // 8 Sep rolling window = 2–8 Sep: S1 seven days × 2, S2 only 8 Sep (4 GBP).
  close(p.daily[0].total7.spend, 14 + 4 * 1.25);
  close(p.daily[6].total7.spend, 14 + 28 * 1.25);
  const rows = trendRows(p, "acos");
  close(rows[6].acos ?? NaN, (14 + 35) / (70 + 56 * 1.25));
  close(rows[0].acosDay ?? NaN, 7 / (10 + 10));
  assert.equal(rows[0].s0, 14 / 70, "per-store series use the rolling figure for ACoS");
  const spendRows = trendRows(p, "spend");
  close(spendRows[0].s1 ?? NaN, 5);
  const a = p.campaigns.find((x) => x.name === "A")!;
  const b = p.campaigns.find((x) => x.name === "B")!;
  assert.deepEqual(a.spark, [2, 2, 2, 2, 2, 2, 2]);
  assert.deepEqual(b.spark, [4, 4, 4, 4, 4, 4, 4], "summary row never enters the daily series");
  assert.equal(p.campaigns[0].name, "B", "campaigns sorted by display spend");
});

test("period: missing FX excludes a store; single-store scope keeps its own currency", () => {
  const ix = buildOverviewIndex(PERIOD_ROWS);
  const p = computePeriod(ix, { days: 7, stores: [S1, S2], fx: { baseCurrency: "USD", fxRates: {} }, convert: true });
  assert.deepEqual(p.excluded, ["s2"]);
  assert.equal(p.total.cur.spend, 14);
  assert.ok(Number.isNaN(p.stores[1].rate));
  assert.equal(p.daily[0].total.spend, 2, "excluded store left out of the daily totals");
  assert.equal(trendRows(p, "spend")[0].s1, null);
  const one = computePeriod(ix, { days: 7, stores: [S2], fx: FX, convert: false });
  assert.equal(one.currency, "GBP");
  assert.equal(one.total.cur.spend, 48);
  assert.equal(one.stores.length, 1);
  assert.ok(
    one.campaigns.every((x) => x.storeId === "s2"),
    "rows of other stores ignored",
  );
  close(one.target.acos, 0.2);
});

test("period: coverage gaps, empty scope, window before the data", () => {
  const ix = buildOverviewIndex(PERIOD_ROWS);
  const p14 = computePeriod(ix, { days: 14, stores: [S1, S2], fx: FX, convert: true });
  assert.equal(p14.prevHasData, false);
  assert.equal(p14.prevCovered, false);
  assert.deepEqual(
    p14.prevGaps.map((g) => g.storeId),
    ["s1", "s2"],
  );
  const kpis = buildKpis(p14);
  assert.equal(kpis.find((k) => k.key === "spend")!.delta, null);
  assert.equal(kpis.find((k) => k.key === "acos")!.delta, null);
  // A store whose data starts inside the previous window hides total deltas but not rate deltas.
  const late = [
    ...PERIOD_ROWS.filter((r) => r.storeId === "s1"),
    ...daily(10, "2026-09-05", { storeId: "s3", campaign: "C", searchTerm: "x", clicks: 5, spend: 5, sales: 20, orders: 1 }),
  ];
  const S3 = store("s3", "USD");
  const pl = computePeriod(buildOverviewIndex(late), { days: 7, stores: [S1, S3], fx: FX, convert: true });
  assert.equal(pl.prevCovered, false);
  assert.deepEqual(pl.prevGaps, [{ storeId: "s3", earliest: "2026-09-05" }]);
  const k2 = buildKpis(pl);
  assert.equal(k2.find((k) => k.key === "sales")!.delta, null);
  assert.ok(k2.find((k) => k.key === "cvr")!.delta, "rates still compare");
  const empty = computePeriod(buildOverviewIndex([]), { days: 30, stores: [S1], fx: FX, convert: false });
  assert.equal(empty.window, null);
  assert.equal(empty.daily.length, 0);
  assert.equal(empty.stores[0].cur.spend, 0);
});

/* ----------------------------------------------------------- wasted */

test("wasted spend: dead vs watching, converts-elsewhere and brand terms, run-rate", () => {
  const W = store("w", "USD", { brandTerms: ["acme"] });
  const d = "2026-09-10";
  const rows = [
    row({ storeId: "w", date: d, campaign: "C1", searchTerm: "dead term", clicks: 20, spend: 10 }),
    row({ storeId: "w", date: d, campaign: "C1", searchTerm: "slow term", clicks: 5, spend: 4 }),
    row({ storeId: "w", date: d, campaign: "C1", searchTerm: "acme widget", clicks: 30, spend: 12 }),
    row({ storeId: "w", date: d, campaign: "C1", searchTerm: "routed term", clicks: 20, spend: 8 }),
    row({ storeId: "w", date: d, campaign: "C2", adGroup: "AG2", searchTerm: "Routed Term", clicks: 5, spend: 2, sales: 20, orders: 1 }),
    row({ storeId: "w", date: d, campaign: "C1", searchTerm: "good term", clicks: 10, spend: 5, sales: 40, orders: 2 }),
    row({ storeId: "w", date: "2026-08-01", campaign: "C1", searchTerm: "old dead", clicks: 50, spend: 30 }),
  ];
  const p = computePeriod(buildOverviewIndex(rows), { days: 7, stores: [W], fx: FX, convert: false });
  const w = p.wasted;
  assert.equal(w.total, 26);
  assert.equal(w.dead, 10);
  assert.equal(w.deadTerms, 1);
  assert.equal(w.watching, 16);
  assert.equal(w.watchingTerms, 2);
  close(w.share, 26 / 41);
  close(w.monthly, (26 * 30) / 7);
  close(w.deadMonthly, (10 * 30) / 7);
  assert.equal(w.negateClicks, 15);
  assert.deepEqual(
    w.top.map((t) => [t.term, t.kind, t.protectedKind ?? ""]),
    [
      ["acme widget", "watching", "brand"],
      ["dead term", "dead", ""],
      ["slow term", "watching", ""],
    ],
  );
  assert.deepEqual(w.byStore, [{ storeId: "w", total: 26, dead: 10, watching: 16, totalNative: 26, terms: 3 }]);
});

/* ----------------------------------------------------------- deltas / tone / KPIs */

test("deltas: direction, tone, labels, no baseline", () => {
  const up = relativeDelta(112, 100, "up")!;
  assert.equal(up.direction, "up");
  assert.equal(up.tone, "good");
  assert.equal(up.label, "+12%");
  assert.equal(relativeDelta(95, 100, "up")!.label, "−5.0%");
  assert.equal(relativeDelta(95, 100, "down")!.tone, "good");
  assert.equal(relativeDelta(100.2, 100, "up")!.direction, "flat");
  assert.equal(relativeDelta(100.2, 100, "up")!.tone, "neutral");
  assert.equal(relativeDelta(150, 100, "neutral")!.tone, "neutral");
  assert.equal(relativeDelta(5, 0, "up"), null);
  assert.equal(relativeDelta(NaN, 3, "up"), null);
  const pts = pointsDelta(0.32, 0.3, "down")!;
  assert.equal(pts.label, "+2.0 pts");
  assert.equal(pts.tone, "bad");
  assert.equal(pointsDelta(0.3001, 0.3, "down")!.direction, "flat");
  assert.equal(pointsDelta(NaN, 0.3, "down"), null);
  assert.equal(formatPoints(-0.0002), "0.0 pts", "never a signed zero");
  assert.equal(formatRelative(-0.0004), "0.0%");
  assert.equal(formatRelative(2.4), "+240%");
});

test("ACoS tone bands, weighted target", () => {
  assert.equal(acosTone(0.25, 0.3, 0.35), "good");
  assert.equal(acosTone(0.3, 0.3, 0.35), "good");
  assert.equal(acosTone(0.33, 0.3, 0.35), "warn");
  assert.equal(acosTone(0.36, 0.3, 0.35), "bad");
  assert.equal(acosTone(0.35, 0.3, 0.3), "warn", "break-even not above target → 20% band");
  assert.equal(acosTone(0.37, 0.3, 0.3), "bad");
  assert.equal(acosTone(NaN, 0.3, 0.35, 10), "bad", "spend with no sales");
  assert.equal(acosTone(NaN, 0.3, 0.35, 0), "neutral");
  const t = weightedTarget(
    [
      { economics: { targetAcos: 0.3, breakEvenAcos: 0.4, goal: "profit" } },
      { economics: { targetAcos: 0.2, breakEvenAcos: 0.3, goal: "profit" } },
    ],
    [0, 0],
  );
  close(t.acos, 0.25);
});

test("KPI tiles: eight metrics, deltas and ACoS tone", () => {
  const ix = buildOverviewIndex(PERIOD_ROWS);
  const p = computePeriod(ix, { days: 7, stores: [S1, S2], fx: FX, convert: true });
  const k = buildKpis(p);
  assert.deepEqual(
    k.map((x) => x.key),
    ["spend", "sales", "acos", "roas", "orders", "cpc", "ctr", "cvr"],
  );
  const spend = k[0];
  close(spend.value, 74);
  close(spend.delta!.value, 74 / 39 - 1);
  assert.equal(spend.delta!.tone, "neutral", "more spend is neither good nor bad");
  const acos = k[2];
  close(acos.value, 74 / 140);
  assert.equal(acos.tone, "bad");
  assert.equal(acos.delta!.kind, "points");
  assert.equal(k[5].format, "moneyPrecise");
});

/* ----------------------------------------------------------- alerts */

// US (USD, bulk file): Steady (flat), Spiky (ACoS ×3, CPC +50%), Gone (stops on 20 Sep).
// UK (GBP, no FX rate, no bulk file): data ends 20 Sep while US runs to 28 Sep.
const US = store("us", "USD", { targetAcos: 0.3, breakEvenAcos: 0.35 });
const UK = store("uk", "GBP");
const ALERT_ROWS: SearchTermRow[] = [
  ...daily(28, "2026-09-01", { storeId: "us", campaign: "Steady", searchTerm: "steady", clicks: 10, spend: 10, sales: 50, orders: 2 }),
  ...daily(14, "2026-09-01", { storeId: "us", campaign: "Spiky", searchTerm: "spiky", clicks: 10, spend: 5, sales: 40, orders: 2 }),
  ...daily(14, "2026-09-15", { storeId: "us", campaign: "Spiky", searchTerm: "spiky", clicks: 10, spend: 7.5, sales: 20, orders: 1 }),
  ...daily(20, "2026-09-01", { storeId: "us", campaign: "Gone", searchTerm: "gone", clicks: 3, spend: 3 }),
  ...daily(20, "2026-09-01", { storeId: "uk", campaign: "UK_Main", searchTerm: "main", clicks: 5, spend: 5 }),
];

test("alerts: spike, CPC, gone dark (campaign + lagging store), concentration, FX, bulk", () => {
  const ix = buildOverviewIndex(ALERT_ROWS);
  const p = computePeriod(ix, { days: 14, stores: [US, UK], fx: { baseCurrency: "USD", fxRates: {} }, convert: true });
  assert.deepEqual(p.window, { from: "2026-09-15", to: "2026-09-28" });
  const alerts = computeAlerts({ period: p, today: "2026-09-30", allScope: true, missingFx: ["GBP"], bulkStores: new Set(["us"]) });
  const ids = alerts.map((a) => `${a.severity}:${a.id}`);
  assert.deepEqual(ids, [
    "critical:gone-dark|uk",
    "critical:acos-spike|us|spiky",
    "warning:missing-fx",
    "warning:cpc-inflation|us|spiky",
    "warning:gone-dark|us|gone",
    "info:acos-spike|us",
    "info:concentration|us|steady",
    "info:no-bulk|uk",
  ]);
  const dark = alerts.find((a) => a.id === "gone-dark|uk")!;
  assert.match(dark.detail, /data ends 20 Sept? 2026/);
  assert.deepEqual(dark.link, { kind: "href", href: "/dashboard/import", storeId: "uk", label: "Import a report" });
  assert.ok(!alerts.some((a) => a.id === "stale-data|uk"), "a lagging store's stale alert folds into gone-dark");
  assert.ok(!alerts.some((a) => a.id === "gone-dark|uk|uk_main"), "campaigns of a dark store stay quiet");
  const spike = alerts.find((a) => a.id === "acos-spike|us|spiky")!;
  assert.match(spike.title, /Spiky: ACoS \+200%/);
  assert.equal(spike.link.kind, "href");
  assert.equal(alerts.find((a) => a.id === "cpc-inflation|us|spiky")!.title, "Spiky: CPC +50% · US");
  assert.equal(alerts.find((a) => a.id === "acos-spike|us")!.link.kind, "scope");
});

test("alerts: stale data, single-store scope, no false spike on thin data", () => {
  const ix = buildOverviewIndex(ALERT_ROWS);
  const single = computePeriod(ix, { days: 14, stores: [US], fx: FX, convert: false });
  const stale = computeAlerts({ period: single, today: "2026-10-09", allScope: false, missingFx: [], bulkStores: new Set(["us"]) });
  const s = stale.find((a) => a.kind === "stale-data")!;
  assert.equal(s.severity, "critical", "11 days old");
  assert.match(s.title, /^Data ends 28 Sept? 2026 \(11 days ago\)$/);
  const week = computeAlerts({ period: single, today: "2026-10-05", allScope: false, missingFx: [], bulkStores: new Set(["us"]) });
  assert.equal(week.find((a) => a.kind === "stale-data")!.severity, "warning");
  const fresh = computeAlerts({ period: single, today: "2026-09-30", allScope: false, missingFx: [], bulkStores: new Set() });
  assert.ok(!fresh.some((a) => a.kind === "stale-data"));
  assert.equal(fresh.find((a) => a.kind === "no-bulk")!.title, "No bulk file imported");
  // Two stores, same stale end date → one combined alert.
  const both = computeAlerts({
    period: computePeriod(buildOverviewIndex(PERIOD_ROWS), { days: 7, stores: [S1, S2], fx: FX, convert: true }),
    today: "2026-09-25",
    allScope: true,
    missingFx: [],
    bulkStores: new Set(["s1", "s2"]),
  });
  assert.deepEqual(
    both.filter((a) => a.kind === "stale-data").map((a) => a.id),
    ["stale-data|all"],
    "every store ends 14 Sep (s2's summary row ends earlier, its daily rows do not)",
  );
  // 5 orders on 50 spend against 7 orders on 30 spend: ACoS +150% but only 1.9σ short → no alert.
  assert.equal(acosSpike(c({ spend: 50, sales: 100, orders: 5 }), c({ spend: 30, sales: 150, orders: 7 })), null);
  assert.ok(acosSpike(c({ spend: 100, sales: 100, orders: 5 }), c({ spend: 30, sales: 150, orders: 7 })));
  assert.equal(acosSpike(c({ spend: 50, sales: 0, orders: 0 }), c({ spend: 30, sales: 150, orders: 2 })), null, "needs ≥ minPrevOrders");
  assert.equal(acosSpike(c({ spend: 60, sales: 0, orders: 0 }), c({ spend: 30, sales: 150, orders: 7 }))!.noSales, true);
  assert.equal(ALERT_RULES.staleDays, 3);
});

/* ----------------------------------------------------------- recommendations */

function rec(id: string, action: ActionType, o: Partial<Recommendation> = {}): Recommendation {
  return {
    id,
    storeId: "us",
    action,
    priority: "medium",
    subject: id,
    campaign: "C",
    adGroup: "AG",
    matchType: "exact",
    counters: c({ clicks: 10, spend: 10, sales: 50, orders: 3 }),
    reason: "",
    evidence: [],
    ids: {},
    impact: 10,
    ...o,
  };
}

test("recommendation helpers: open, companions, counts, top actions, harvest summary", () => {
  const h1 = rec("h1", "harvest-exact", { priority: "high", pairedWith: "n1", impact: 100 });
  const n1 = rec("n1", "negate-exact", { priority: "high", pairedWith: "h1", impact: 0 });
  const p1 = rec("p1", "harvest-phrase", { pairedWith: "h1", impact: 0 });
  const h2 = rec("h2", "harvest-product", { storeId: "uk", impact: 40, counters: c({ spend: 8, sales: 40, orders: 2 }) });
  const b1 = rec("b1", "bid-down", { impact: 5 });
  const x1 = rec("x1", "negate-exact", { priority: "high", impact: 20 });
  const all = [h1, n1, p1, x1, h2, b1];
  assert.equal(isCompanion(n1), true);
  assert.equal(isCompanion(p1), true);
  assert.equal(isCompanion(x1), false);
  assert.equal(isCompanion(h1), false);
  const decisions: Decision[] = [
    { recId: "x1", storeId: "us", status: "rejected", decidedAt: "2026-09-29T00:00:00Z" },
    { recId: "b1", storeId: "us", status: "snoozed", decidedAt: "2026-09-20T00:00:00Z", snoozeUntil: "2026-09-30" },
    { recId: "h2", storeId: "uk", status: "snoozed", decidedAt: "2026-09-20T00:00:00Z", snoozeUntil: "2026-10-10" },
  ];
  assert.equal(isOpen(undefined, "2026-10-01"), true);
  assert.equal(isOpen(decisions[0], "2026-10-01"), false);
  assert.equal(isOpen(decisions[1], "2026-10-01"), true, "snooze ran out");
  assert.equal(isOpen(decisions[2], "2026-10-01"), false);
  const open = openRecommendations(all, decisions, "2026-10-01");
  assert.deepEqual(
    open.map((r) => r.id),
    ["h1", "n1", "p1", "b1"],
  );
  assert.deepEqual([...recCountsByStore(open)], [["us", { total: 2, high: 1 }]]);
  assert.deepEqual(
    topActions(all, 3).map((r) => r.id),
    ["h1", "x1", "h2"],
  );
  assert.equal(actionGroup("harvest-product"), "harvest");
  assert.equal(actionGroup("negate-phrase"), "negate");
  assert.equal(actionGroup("relevance"), "relevance");
  const hs = harvestSummary(all, (id) => (id === "uk" ? 1.25 : 1));
  assert.equal(hs.count, 2, "phrase companion not counted");
  close(hs.sales, 50 + 40 * 1.25);
  close(hs.spend, 10 + 8 * 1.25);
  close(hs.acos, 20 / 100);
  close(hs.monthly, 100 + 40 * 1.25);
  assert.equal(hs.top[0].rec.id, "h1");
  const noFx = harvestSummary(all, (id) => (id === "uk" ? NaN : 1));
  assert.equal(noFx.unconverted, 1);
  assert.equal(noFx.sales, 50);
});

/* ----------------------------------------------------------- sparkline / sort */

test("sparkline path, trend direction, sorting with missing values last", () => {
  const path = sparklinePath([0, 5, 10], 84, 24)!;
  assert.equal(path.line, "M1.5 22.5 L42 12 L82.5 1.5");
  assert.match(path.area, /Z$/);
  assert.deepEqual(path.last, { x: 82.5, y: 1.5 });
  assert.equal(sparklinePath([3], 84, 24), null);
  assert.equal(sparklinePath([0, 0, 0], 84, 24)!.line, "M1.5 22.5 L42 22.5 L82.5 22.5", "flat zero line on the baseline");
  assert.equal(trendDirection([1, 1, 1, 2, 2, 2]).direction, "up");
  assert.equal(trendDirection([4, 4, 3, 3, 1, 1]).direction, "down");
  assert.equal(trendDirection([5, 5, 5.2, 5, 5, 5.1]).direction, "flat");
  const vals = [3, NaN, 1, undefined, 2];
  assert.deepEqual(
    [...vals].sort((a, b) => compareValues(a, b, "asc")),
    [1, 2, 3, NaN, undefined],
  );
  assert.deepEqual(
    [...vals].sort((a, b) => compareValues(a, b, "desc")),
    [3, 2, 1, NaN, undefined],
  );
  assert.deepEqual(
    ["b", "a", "c"].sort((a, b) => compareValues(a, b, "asc")),
    ["a", "b", "c"],
  );
});

/* ----------------------------------------------------------- demo cross-check + timing */

test("demo: per-store period totals match metrics.ts window filtering", () => {
  const d = makeDemoData();
  const ix = buildOverviewIndex(d.rows);
  const fx = { baseCurrency: "USD", fxRates: { GBP: 1.27 } };
  const all = computePeriod(ix, { days: 30, stores: d.stores, fx, convert: true });
  let expectedSpend = 0;
  for (const s of d.stores) {
    const rows = d.rows.filter((r) => r.storeId === s.id);
    const w = dateWindow(all.latest!, 30, 0)!;
    const t = totals(filterByWindow(rows, w));
    const sp = all.stores.find((x) => x.store.id === s.id)!;
    close(sp.cur.spend, t.spend, 1e-6);
    assert.equal(sp.cur.orders, t.orders);
    assert.equal(sp.cur.clicks, t.clicks);
    expectedSpend += t.spend * (s.currency === "GBP" ? 1.27 : 1);
    const one = computePeriod(buildOverviewIndex(rows), { days: 30, stores: [s], fx, convert: false });
    close(one.total.cur.sales, t.sales, 1e-6);
  }
  close(all.total.cur.spend, expectedSpend, 1e-6);
  const dailySum = all.daily.reduce((n, x) => n + x.total.spend, 0);
  close(dailySum, all.total.cur.spend, 1e-6);
  const campSum = all.campaigns.reduce((n, x) => n + x.cur.spend * x.rate, 0);
  close(campSum, all.total.cur.spend, 1e-6);
});

test("performance: 100k-row store — index once, period pass per switch", () => {
  const S = store("big", "USD");
  const rows: SearchTermRow[] = [];
  for (let i = 0; i < 100_000; i++) {
    const clicks = i % 7;
    rows.push(
      row({
        storeId: "big",
        date: addDays("2026-07-01", i % 90),
        campaign: `Campaign ${i % 40}`,
        adGroup: `AG ${i % 5}`,
        searchTerm: `term ${i % 6000}`,
        clicks,
        spend: clicks * 0.6,
        orders: i % 11 === 0 ? 1 : 0,
        sales: i % 11 === 0 ? 25 : 0,
        impressions: 50 + (i % 300),
      }),
    );
  }
  const t0 = performance.now();
  const ix = buildOverviewIndex(rows);
  const t1 = performance.now();
  const p = computePeriod(ix, { days: 30, stores: [S], fx: FX, convert: false });
  const t2 = performance.now();
  computePeriod(ix, { days: 90, stores: [S], fx: FX, convert: false });
  const t3 = performance.now();
  computeAlerts({ period: p, today: "2026-10-01", allScope: false, missingFx: [], bulkStores: new Set(["big"]) });
  const t4 = performance.now();
  assert.equal(ix.terms.length, 6000 * 1, "term i%6000 lands in one campaign / ad group each");
  assert.ok(p.wasted.total > 0);
  note(
    `overview 100k rows: index ${(t1 - t0).toFixed(0)} ms, 30-day pass ${(t2 - t1).toFixed(1)} ms, 90-day pass ${(t3 - t2).toFixed(1)} ms, alerts ${(t4 - t3).toFixed(1)} ms`,
  );
  assert.ok(t1 - t0 < 3000 && t2 - t1 < 1000, "well under a frame budget per switch");
});
