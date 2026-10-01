/**
 * Self-test: data-layer defects — overlapping Summary / Daily imports
 * (resolveOverlaps), per-import row versions (what importRows / deleteBatch
 * write, via the pure helpers they use), and decisions tied to the rec they
 * were made for (recurring bid moves, orphaned approvals, family drift).
 */

import assert from "node:assert/strict";

import { dropRowVersion, MAX_ROW_VERSIONS, mergeRowVersion } from "../src/lib/ppc/db";
import { addDays } from "../src/lib/ppc/dates";
import { makeDemoData } from "../src/lib/ppc/demo";
import { buildBulkIndex, findKeyword, findTarget } from "../src/lib/ppc/bulk-index";
import { searchTermKey } from "../src/lib/ppc/keys";
import { dateWindow, filterByWindow, resolveOverlaps, totals } from "../src/lib/ppc/metrics";
import { createStore, recommend } from "../src/lib/ppc/rules";
import type { Decision, MatchType, Recommendation, SearchTermRow } from "../src/lib/ppc/types";
import { openRecommendations } from "../src/components/ppc/overview/compute";
import {
  buildFamilies,
  decisionMap,
  exportSelection,
  isOutdated,
  orphanedApprovals,
  planApprove,
  planMarkApplied,
  planReject,
  REVIEW_AFTER_DAYS,
  type DecisionPlan,
  type PlanContext,
} from "../src/components/ppc/work/decisions";
import { buildRecModel } from "../src/components/ppc/work/recs";
import { group, test } from "./ppc-test-harness";

group("data");

const STORE = createStore({ id: "ov", name: "Overlap", currency: "USD", marketplace: "US" });

interface RowSpec {
  date: string;
  endDate?: string;
  term: string;
  clicks: number;
  spend: number;
  orders?: number;
  sales?: number;
  batchId?: string;
  campaign?: string;
  adGroup?: string;
  targeting?: string;
  matchType?: MatchType;
}

function row(s: RowSpec): SearchTermRow {
  const orders = s.orders ?? 0;
  const r: SearchTermRow = {
    key: "",
    storeId: STORE.id,
    batchId: s.batchId ?? "b",
    date: s.date,
    ...(s.endDate ? { endDate: s.endDate } : {}),
    campaign: s.campaign ?? "SP Auto",
    adGroup: s.adGroup ?? "Auto AG",
    targeting: s.targeting ?? "close-match",
    matchType: s.matchType ?? "auto",
    searchTerm: s.term,
    impressions: s.clicks * 40,
    clicks: s.clicks,
    spend: s.spend,
    sales: s.sales ?? 0,
    orders,
    units: orders,
  };
  r.key = searchTermKey(r);
  return r;
}

/** One row per day for `term` (a "daily report" that covers every day of the span). */
function daily(term: string, from: string, days: number, perDay: (d: string, i: number) => Partial<RowSpec> = () => ({})): SearchTermRow[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return row({ date, term, clicks: 1, spend: 1, ...perDay(date, i) });
  });
}

const termTotal = (rows: SearchTermRow[], term: string) => totals(rows.filter((r) => r.searchTerm === term));
const recsFor = (rows: SearchTermRow[], term: string) => recommend({ store: STORE, rows, bulk: [] }).recommendations.filter((r) => r.subject === term);

/* ---------------------------------------------------------------- overlaps */

test("two overlapping 'last 30 days' summaries count once (no negate on 10 + 10 clicks)", () => {
  const a = row({ date: "2026-08-29", endDate: "2026-09-27", term: "garlic slicer", clicks: 10, spend: 8 });
  const b = row({ date: "2026-09-05", endDate: "2026-10-04", term: "garlic slicer", clicks: 10, spend: 8 });
  assert.notEqual(a.key, b.key, "different periods are different stored rows");
  const resolved = resolveOverlaps([a, b]);
  assert.deepEqual(resolved, [b], "the later period wins");
  const win = dateWindow([a, b], STORE.rules.lookbackDays, STORE.rules.lagDays)!;
  assert.equal(termTotal(filterByWindow(resolved, win), "garlic slicer").clicks, 10);
  assert.ok(!recsFor([a, b], "garlic slicer").some((r) => r.action === "negate-exact"), "no report ever reached 15 clicks");
});

test("four weekly 30-day summaries: one series, no 36-click negative", () => {
  const starts = ["2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22"];
  const rows = starts.map((s) => row({ date: s, endDate: addDays(s, 29), term: "junk term", clicks: 9, spend: 9 }));
  const resolved = resolveOverlaps(rows);
  assert.equal(resolved.length, 1);
  assert.equal(resolved[0].date, "2026-09-22");
  assert.ok(!recsFor(rows, "junk term").some((r) => r.action.startsWith("negate")));
  // Periods that do not overlap all count.
  const aug = row({ date: "2026-08-01", endDate: "2026-08-31", term: "junk term", clicks: 4, spend: 4 });
  const sep = row({ date: "2026-09-01", endDate: "2026-09-30", term: "junk term", clicks: 5, spend: 5 });
  assert.equal(resolveOverlaps([aug, sep]).length, 2);
});

test("summary + daily rows of the same days: daily wins, nothing doubles (no harvest on 1 + 1 orders)", () => {
  // 28-day summary with the same 9 clicks the daily rows hold.
  const days = daily("garlic slicer", "2026-09-01", 28, (_d, i) => ({ clicks: i < 9 ? 1 : 0, spend: i < 9 ? 1 : 0 })).filter((r) => r.clicks > 0);
  const summary = row({ date: "2026-09-01", endDate: "2026-09-28", term: "garlic slicer", clicks: 9, spend: 9 });
  assert.equal(termTotal(resolveOverlaps([...days, summary]), "garlic slicer").clicks, 9);
  assert.ok(!recsFor([...days, summary], "garlic slicer").some((r) => r.action === "negate-exact"));

  // Daily Sep 1–30 then the Summary of the same month: 7 clicks, 1 order stays 1 order.
  const good = daily("good term", "2026-09-01", 7, (d) => (d === "2026-09-05" ? { orders: 1, sales: 40 } : {}));
  const filler = daily("filler", "2026-09-01", 30);
  const goodSummary = row({ date: "2026-09-01", endDate: "2026-09-30", term: "good term", clicks: 7, spend: 7, orders: 1, sales: 40 });
  const rows = [...filler, ...good, goodSummary];
  assert.deepEqual(
    [termTotal(resolveOverlaps(rows), "good term").clicks, termTotal(resolveOverlaps(rows), "good term").orders],
    [7, 1],
  );
  assert.ok(!recsFor(rows, "good term").some((r) => r.action.startsWith("harvest")), "1 order is not the 2-order harvest bar");
});

test("summary partly covered by daily data keeps only the uncovered remainder, moved onto the uncovered days", () => {
  // Daily report Sep 15 – Oct 14 (the filler term has a row every day); Summary Sep 1–30.
  const filler = daily("filler", "2026-09-15", 30);
  const days = [
    row({ date: "2026-09-16", term: "garlic slicer", clicks: 2, spend: 2 }),
    row({ date: "2026-09-20", term: "garlic slicer", clicks: 2, spend: 2 }),
    row({ date: "2026-09-25", term: "garlic slicer", clicks: 2, spend: 2 }),
    row({ date: "2026-10-03", term: "garlic slicer", clicks: 1, spend: 1 }),
  ];
  const summary = row({ date: "2026-09-01", endDate: "2026-09-30", term: "garlic slicer", clicks: 10, spend: 10 });
  const resolved = resolveOverlaps([...filler, ...days, summary]);
  const rest = resolved.find((r) => r.searchTerm === "garlic slicer" && r.endDate)!;
  assert.deepEqual([rest.date, rest.endDate, rest.clicks, rest.spend], ["2026-09-01", "2026-09-14", 4, 4], "Sep 1–14 had the other 4 clicks");
  assert.equal(termTotal(resolved, "garlic slicer").clicks, 11);
  // Fully covered (daily data every day of the period) → dropped, even when the summary differs a little.
  const full = daily("filler", "2026-09-01", 30);
  const late = row({ date: "2026-09-01", endDate: "2026-09-30", term: "filler", clicks: 30, spend: 30, orders: 1, sales: 25 });
  assert.equal(resolveOverlaps([...full, late]).length, 30);
});

test("resolveOverlaps is idempotent, keeps order, and returns the same array when nothing overlaps", () => {
  const plain = daily("filler", "2026-09-01", 10);
  assert.equal(resolveOverlaps(plain), plain);
  const lone = [...plain, row({ date: "2026-08-01", endDate: "2026-08-31", term: "other", clicks: 3, spend: 3 })];
  assert.equal(resolveOverlaps(lone), lone, "a summary that overlaps nothing changes nothing");
  const mixed = [
    ...daily("filler", "2026-09-15", 30),
    row({ date: "2026-09-20", term: "x", clicks: 2, spend: 2 }),
    row({ date: "2026-09-01", endDate: "2026-09-30", term: "x", clicks: 5, spend: 5 }),
    row({ date: "2026-08-25", endDate: "2026-09-23", term: "x", clicks: 6, spend: 6 }),
    row({ date: "2026-09-10", endDate: "2026-10-09", term: "y", clicks: 6, spend: 6 }),
  ];
  const once = resolveOverlaps(mixed);
  assert.deepEqual(resolveOverlaps(once), once);
  const twice = resolveOverlaps(once);
  assert.equal(twice, once, "second pass finds nothing to change");
});

/* ------------------------------------------------------------ row versions */

/** What importRows does per row (Map instead of IndexedDB). */
function importInto(store: Map<string, SearchTermRow>, batchId: string, rows: SearchTermRow[]) {
  const n = { inserted: 0, updated: 0, skipped: 0 };
  for (const raw of rows) {
    const { write, outcome } = mergeRowVersion(store.get(raw.key), { ...raw, batchId });
    if (write) store.set(write.key, write);
    n[outcome]++;
  }
  return n;
}

/** What deleteBatch does: every row it owns or holds. */
function deleteFrom(store: Map<string, SearchTermRow>, batchId: string) {
  let deleted = 0;
  for (const r of [...store.values()]) {
    if (r.batchId !== batchId && !r.versions?.some((v) => v.batchId === batchId)) continue;
    const next = dropRowVersion(r, batchId);
    if (next) store.set(r.key, next);
    else {
      store.delete(r.key);
      deleted++;
    }
  }
  return deleted;
}

const sumOrders = (store: Map<string, SearchTermRow>, from: string, to: string) =>
  [...store.values()].filter((r) => r.date >= from && r.date <= to).reduce((n, r) => n + r.orders, 0);

function overlappingImports() {
  // A: Sep 1–30, 2 orders on Sep 20. B: Sep 15 – Oct 14, attribution matured (Sep 20: 3, Sep 24: 1).
  const A = daily("garlic press", "2026-09-01", 30, (d) => (d === "2026-09-20" ? { orders: 2, sales: 100 } : {}));
  const B = daily("garlic press", "2026-09-15", 30, (d) =>
    d === "2026-09-20" ? { orders: 3, sales: 150 } : d === "2026-09-24" ? { orders: 1, sales: 50 } : {},
  );
  const store = new Map<string, SearchTermRow>();
  assert.deepEqual(importInto(store, "A", A), { inserted: 30, updated: 0, skipped: 0 });
  assert.deepEqual(importInto(store, "B", B), { inserted: 14, updated: 2, skipped: 14 });
  return store;
}

test("deleting the newer overlapping import restores the older import's numbers (no hole, no false negative)", () => {
  const store = overlappingImports();
  assert.equal(sumOrders(store, "2026-09-01", "2026-09-30"), 4);
  assert.equal(deleteFrom(store, "B"), 14, "only the Oct rows were B's alone");
  assert.equal(store.size, 30);
  assert.equal(sumOrders(store, "2026-09-01", "2026-09-30"), 2, "A's own numbers are back");
  assert.ok([...store.values()].every((r) => r.batchId === "A" && !r.versions));
  const rows = [...store.values()];
  assert.ok(recsFor(rows, "garlic press").some((r) => r.action === "harvest-exact"), "the converting term is not negated");
});

test("deleting the older import keeps every row the newer one also holds", () => {
  const store = overlappingImports();
  assert.equal(deleteFrom(store, "A"), 14, "Sep 1–14 were A's alone");
  assert.equal(store.size, 30);
  assert.ok([...store.values()].every((r) => r.batchId === "B" && !r.versions));
  assert.equal(sumOrders(store, "2026-09-15", "2026-10-14"), 4, "B's numbers");
});

test("failed import + retry: deleting the failed batch keeps the rows the retry also holds", () => {
  const rows = Array.from({ length: 2500 }, (_, i) => row({ date: "2026-09-10", term: `term ${i}`, clicks: 1, spend: 1 }));
  const store = new Map<string, SearchTermRow>();
  importInto(store, "F", rows.slice(0, 2000));
  assert.deepEqual(importInto(store, "R", rows), { inserted: 500, updated: 0, skipped: 2000 });
  assert.equal(deleteFrom(store, "F"), 0);
  assert.equal(store.size, 2500);
  assert.ok([...store.values()].every((r) => r.batchId === "R"));
  // The other order: the retry is deleted, the failed batch's rows stay.
  const again = new Map<string, SearchTermRow>();
  importInto(again, "F", rows.slice(0, 2000));
  importInto(again, "R", rows);
  assert.equal(deleteFrom(again, "R"), 500);
  assert.equal(again.size, 2000);
});

test("row versions: duplicate key in one file, middle deletes, and the cap", () => {
  const base = row({ date: "2026-09-10", term: "t", clicks: 1, spend: 1 });
  const store = new Map<string, SearchTermRow>();
  importInto(store, "A", [base, { ...base, clicks: 2, spend: 2 }]);
  assert.equal(store.get(base.key)!.clicks, 2, "last duplicate in a file wins");
  assert.equal(store.get(base.key)!.versions, undefined);
  importInto(store, "B", [{ ...base, clicks: 3, spend: 3 }]);
  importInto(store, "C", [{ ...base, clicks: 3, spend: 3 }]);
  deleteFrom(store, "B");
  assert.equal(store.get(base.key)!.clicks, 3, "C still holds the 3-click version");
  assert.equal(store.get(base.key)!.batchId, "C");
  deleteFrom(store, "C");
  assert.equal(store.get(base.key)!.clicks, 2, "back to A");
  for (let i = 0; i < 20; i++) importInto(store, `X${i}`, [{ ...base, clicks: 2, spend: 2 }]);
  assert.equal(store.get(base.key)!.versions!.length, MAX_ROW_VERSIONS);
});

/* ------------------------------------------------------------- decisions */

const NOW = "2026-10-01T10:00:00.000Z";
const TODAY = "2026-10-01";
const demo = makeDemoData();
const kitchen = demo.stores.find((s) => s.id === "demo-kitchen-us")!;
const kRows = demo.rows.filter((r) => r.storeId === kitchen.id);
const kBulk = demo.bulk.filter((b) => b.storeId === kitchen.id);
const kres = recommend({ store: kitchen, rows: kRows, bulk: kBulk });

function ctxFor(recs: Recommendation[], decisions: Decision[]): PlanContext {
  return { decisions: decisionMap(decisions, recs), families: buildFamilies(recs), now: NOW, today: TODAY };
}
function apply(decisions: Decision[], plan: DecisionPlan): Decision[] {
  const m = decisionMap(decisions);
  for (const id of plan.remove) m.delete(id);
  for (const d of plan.save) m.set(d.recId, d);
  return [...m.values()];
}

test("an applied bid move does not hide the next one once a fresh bulk file shows the new bid", () => {
  const bids = kres.recommendations.filter((r) => r.action === "bid-up" || r.action === "bid-down");
  assert.ok(bids.length >= 5);
  assert.ok(kres.recommendations.every((r) => r.windowTo === kres.window.to), "recs carry their window end");
  let decisions = apply([], planApprove(bids.map((r) => r.id), ctxFor(kres.recommendations, [])));
  assert.ok(decisions.every((d) => d.basis?.currentBid !== undefined && d.basis.windowTo === kres.window.to));
  decisions = apply(decisions, planMarkApplied(bids.map((r) => r.id), ctxFor(kres.recommendations, decisions)));
  // Same data, same bulk: still applied, never exported twice.
  const same = buildRecModel(kres.recommendations, decisions, TODAY);
  assert.ok(bids.every((r) => same.byId.get(r.id)?.status === "applied"));
  assert.equal(exportSelection(kres.recommendations, decisions).recs.length, 0);

  // The bulk file after the upload: every bid is now the suggested one.
  const idx = buildBulkIndex(kBulk);
  const next = kBulk.map((b) => ({ ...b }));
  const byKey = new Map(next.map((b) => [b.key, b]));
  for (const r of bids) {
    const e = r.matchType === "product" || r.matchType === "auto" ? findTarget(idx, r.campaign, r.adGroup, r.subject) : findKeyword(idx, r.campaign, r.adGroup, r.subject, r.matchType);
    if (e) byKey.get(e.key)!.bid = r.suggestedBid;
  }
  const res2 = recommend({ store: kitchen, rows: kRows, bulk: next });
  const again = res2.recommendations.filter((r) => bids.some((b) => b.id === r.id));
  assert.ok(again.length >= 3, "the ladder proposes the next move under the same ids");
  const model = buildRecModel(res2.recommendations, decisions, TODAY);
  for (const r of again) {
    assert.equal(model.byId.get(r.id)?.status, "open", `${r.subject}: new move is open`);
    assert.ok(isOutdated(decisions.find((d) => d.recId === r.id)!, r));
  }
  assert.equal(openRecommendations(res2.recommendations, decisions, TODAY).filter((r) => again.includes(r)).length, again.length, "overview counts them");
  // Approving the new move replaces the old applied decision and exports it.
  const plan = planApprove([again[0].id], { ...ctxFor(res2.recommendations, decisions), decisions: model.decisions });
  assert.equal(plan.save.length, 1);
  decisions = apply(decisions, plan);
  assert.deepEqual(exportSelection(res2.recommendations, decisions).recs.map((r) => r.id), [again[0].id]);
  // The stored map still has every record for exact undo snapshots.
  assert.equal(model.stored.size, decisions.length);
});

test("rejected / applied bid moves come back for review after REVIEW_AFTER_DAYS more days of data", () => {
  const down = kres.recommendations.find((r) => r.action === "bid-down")!;
  const rejected = apply([], planReject([down.id], ctxFor(kres.recommendations, [])))[0];
  assert.equal(isOutdated(rejected, down), false);
  const later = (days: number): Recommendation => ({ ...down, windowTo: addDays(down.windowTo!, days) });
  assert.equal(isOutdated(rejected, later(REVIEW_AFTER_DAYS - 1)), false);
  assert.equal(isOutdated(rejected, later(REVIEW_AFTER_DAYS)), true);
  assert.equal(isOutdated(rejected, { ...down, currentBid: (down.currentBid ?? 0) + 0.1, currentBidSource: "bulk" }), true, "the bid changed");
  // A decision saved before `basis` existed: dates only.
  const legacy: Decision = { recId: down.id, storeId: kitchen.id, status: "approved", decidedAt: NOW, appliedAt: NOW };
  assert.equal(isOutdated(legacy, down), false);
  assert.equal(isOutdated(legacy, { ...down, windowTo: addDays(TODAY, REVIEW_AFTER_DAYS) }), true);
  // Search-term decisions do not expire on dates.
  const neg = kres.recommendations.find((r) => r.action === "negate-exact" && !r.pairedWith)!;
  const negRejected = apply([], planReject([neg.id], ctxFor(kres.recommendations, [])))[0];
  assert.equal(isOutdated(negRejected, { ...neg, windowTo: addDays(neg.windowTo!, 60) }), false);
});

test("approvals whose rec is gone are listed, and a paired negative that now stands alone is not exported", () => {
  const harvest = kres.recommendations.find((r) => r.action === "harvest-exact" && r.pairedWith)!;
  const negative = kres.recommendations.find((r) => r.id === harvest.pairedWith)!;
  let decisions = apply([], planApprove([harvest.id], ctxFor(kres.recommendations, [])));
  assert.equal(decisions.length, 2);
  assert.deepEqual(orphanedApprovals(kres.recommendations, decisions), []);

  // After a re-import the harvest no longer qualifies; the same term now gets a standalone negative.
  const standalone: Recommendation = { ...negative, pairedWith: undefined, impact: 12, reason: "expensive" };
  const recs2 = [...kres.recommendations.filter((r) => r.id !== harvest.id && r.id !== negative.id), standalone];
  const orphans = orphanedApprovals(recs2, decisions).map((d) => d.recId).sort();
  assert.deepEqual(orphans, [harvest.id, negative.id].sort(), "both are surfaced instead of vanishing");
  assert.equal(buildRecModel(recs2, decisions, TODAY).byId.get(standalone.id)?.status, "open", "not inherited from the harvest approval");
  assert.ok(!exportSelection(recs2, decisions).recs.some((r) => r.id === standalone.id), "never exported on its own by accident");
  // Discarding them clears the list.
  decisions = apply(decisions, { save: [], remove: orphans, affected: orphans, companions: 0, invalid: [] });
  assert.deepEqual(orphanedApprovals(recs2, decisions), []);
});
