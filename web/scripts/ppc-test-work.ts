/**
 * Self-test: the Keywords / Search terms / Bids page models (src/components/ppc/work/*) —
 * decision transitions (paired approve / undo, snooze, applied exclusion from export),
 * list views and filters, the plain-English maths (must add up to the engine's bids),
 * the target table, explorer aggregation / presets / chips at 100k rows, and
 * Bid-Calculator.xlsx parity.
 */

import assert from "node:assert/strict";

import { addDays } from "../src/lib/ppc/dates";
import { makeDemoData } from "../src/lib/ppc/demo";
import { isReopenMarker } from "../src/lib/ppc/db";
import { buildBulkSheet } from "../src/lib/ppc/export";
import { filterByWindow, round2 } from "../src/lib/ppc/metrics";
import { createStore, recommend } from "../src/lib/ppc/rules";
import type { Decision, Recommendation, SearchTermRow, Store } from "../src/lib/ppc/types";
import { bidCalc, checkEconomics, fromUnits, parsePercent, storeCalcInputs, WORKBOOK_DEFAULTS } from "../src/components/ppc/work/calculator";
import {
  appliedHistory,
  bidError,
  buildFamilies,
  decisionMap,
  exportSelection,
  familyOf,
  pairedNegative,
  parseBid,
  parseRecId,
  planApprove,
  planEditBid,
  planMarkApplied,
  planReject,
  planRestore,
  planSnooze,
  planUnapply,
  planUndo,
  snapshotFor,
  statusOf,
  type DecisionPlan,
  type PlanContext,
} from "../src/components/ppc/work/decisions";
import { bidMaths, explainRecommendation, harvestMaths, rate } from "../src/components/ppc/work/explain";
import {
  activePreset,
  aggregateExplorer,
  applyPreset,
  buildExplorerIndex,
  DEFAULT_EXPLORER_FILTER,
  entityDetail,
  explorerCsv,
  filterChips,
  filterExplorer,
  isDefaultFilter,
  parseTextQuery,
  removeChip,
  sortExplorer,
  type ExplorerFilter,
} from "../src/components/ppc/work/explorer";
import { buildPriorIndex } from "../src/components/ppc/work/model";
import {
  buildRecModel,
  DEFAULT_REC_FILTER,
  filterItems,
  itemsInView,
  parseView,
  skipCategory,
  sortItems,
  storeRecSummary,
  viewCounts,
} from "../src/components/ppc/work/recs";
import { bandCounts, buildTargetRows, filterTargets, DEFAULT_TARGET_FILTER, sortTargets } from "../src/components/ppc/work/targets";
import { group, note, test } from "./ppc-test-harness";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≈ ${b}`);

const demo = makeDemoData();
const kitchen = demo.stores.find((s) => s.id === "demo-kitchen-us")!;
const storeData = (s: Store) => ({
  rows: demo.rows.filter((r) => r.storeId === s.id),
  bulk: demo.bulk.filter((b) => b.storeId === s.id),
});
const kd = storeData(kitchen);
const kres = recommend({ store: kitchen, rows: kd.rows, bulk: kd.bulk });
const NOW = "2026-10-01T09:00:00.000Z";
const TODAY = "2026-10-01";

function ctxFor(recs: Recommendation[], decisions: Decision[], extra: Partial<PlanContext> = {}): PlanContext {
  return { decisions: decisionMap(decisions), families: buildFamilies(recs), now: NOW, today: TODAY, ...extra };
}

/** Apply a plan to a decision list (what saveDecisions / deleteDecision do). */
function apply(decisions: Decision[], plan: DecisionPlan): Decision[] {
  const m = decisionMap(decisions);
  for (const id of plan.remove) m.delete(id);
  for (const d of plan.save) m.set(d.recId, d);
  return [...m.values()];
}

const harvest = kres.recommendations.find((r) => r.action === "harvest-exact" && r.pairedWith)!;
const negative = kres.recommendations.find((r) => r.id === harvest.pairedWith)!;

/* --------------------------------------------------------------- decisions */

group("work");

test("families: harvest ↔ paired negative, companions are not list rows", () => {
  assert.ok(harvest && negative, "demo has a paired harvest");
  const fam = buildFamilies(kres.recommendations);
  assert.deepEqual(
    familyOf(harvest.id, fam).map((r) => r.id),
    [harvest.id, negative.id],
  );
  assert.deepEqual(
    familyOf(negative.id, fam).map((r) => r.id),
    [harvest.id, negative.id],
    "a companion resolves to its whole family",
  );
  assert.equal(pairedNegative(harvest.id, fam)?.id, negative.id);
  const model = buildRecModel(kres.recommendations, [], TODAY);
  assert.equal(model.items.length, kres.recommendations.length - fam.rootOf.size);
  assert.ok(!model.byId.has(negative.id), "paired negative rides on its harvest");
  assert.equal(model.byId.get(harvest.id)?.companions[0].id, negative.id);
});

test("approve a harvest approves its paired negative; undo either removes both", () => {
  let decisions: Decision[] = [];
  const plan = planApprove([harvest.id], ctxFor(kres.recommendations, decisions));
  assert.equal(plan.save.length, 2);
  assert.equal(plan.companions, 1);
  assert.ok(plan.save.every((d) => d.status === "approved" && d.decidedAt === NOW && d.storeId === kitchen.id));
  decisions = apply(decisions, plan);
  const m = decisionMap(decisions);
  assert.equal(statusOf(m.get(harvest.id), TODAY), "approved");
  assert.equal(statusOf(m.get(negative.id), TODAY), "approved");

  const undo = planUndo([harvest.id], ctxFor(kres.recommendations, decisions));
  assert.deepEqual(undo.remove.sort(), [harvest.id, negative.id].sort());
  const undoFromNegative = planUndo([negative.id], ctxFor(kres.recommendations, decisions));
  assert.deepEqual(undoFromNegative.remove.sort(), [harvest.id, negative.id].sort(), "vice versa: undo from the negative");
  assert.equal(apply(decisions, undo).length, 0);
});

test("approve carries the typed bid and destination; skipNegative rejects only the negative; bad bids block", () => {
  const dest = { mode: "source" } as const;
  const plan = planApprove(
    [harvest.id],
    ctxFor(kres.recommendations, [], { drafts: { [harvest.id]: { bid: "1,10", destination: dest, skipNegative: true } } }),
  );
  const h = plan.save.find((d) => d.recId === harvest.id)!;
  const n = plan.save.find((d) => d.recId === negative.id)!;
  assert.equal(h.status, "approved");
  assert.equal(h.editedBid, 1.1);
  assert.deepEqual(h.destination, dest);
  assert.equal(n.status, "rejected");
  // Typed bid equal to the suggestion is not stored as an edit.
  const same = planApprove([harvest.id], ctxFor(kres.recommendations, [], { drafts: { [harvest.id]: { bid: String(harvest.suggestedBid) } } }));
  assert.equal(same.save.find((d) => d.recId === harvest.id)?.editedBid, undefined);
  const bad = planApprove([harvest.id], ctxFor(kres.recommendations, [], { drafts: { [harvest.id]: { bid: "0" } } }));
  assert.deepEqual(bad.invalid, [harvest.id]);
  assert.equal(bad.save.length, 0);
  assert.ok(Number.isNaN(parseBid("abc")) && Number.isNaN(parseBid("-1")) && parseBid("$0.755") === 0.76);
  assert.equal(bidError(""), null);
  assert.match(bidError("0") ?? "", /above 0/);
  assert.match(bidError("0.01") ?? "", /minimum/);
});

test("reject and snooze cascade; snoozed rows come back after the date", () => {
  const rej = planReject([harvest.id], ctxFor(kres.recommendations, []));
  assert.deepEqual(rej.save.map((d) => d.status), ["rejected", "rejected"]);
  const snz = planSnooze([harvest.id], ctxFor(kres.recommendations, []));
  assert.ok(snz.save.every((d) => d.snoozeUntil === addDays(TODAY, 7)));
  const d = snz.save[0];
  assert.equal(statusOf(d, TODAY), "snoozed");
  assert.equal(statusOf(d, addDays(TODAY, 6)), "snoozed");
  assert.equal(statusOf(d, addDays(TODAY, 7)), "open", "open again on the snooze date");
  const model = buildRecModel(kres.recommendations, snz.save, TODAY);
  assert.ok(!itemsInView(model.items, "harvest").some((i) => i.rec.id === harvest.id), "snoozed rows hide from the view");
  assert.ok(itemsInView(model.items, "harvest", true).some((i) => i.rec.id === harvest.id), "…and show under Show decided");
});

test("mark as applied: leaves Approved, never exported twice; unapply restores", () => {
  const negs = kres.recommendations.filter((r) => r.action === "negate-exact" && !r.pairedWith).slice(0, 2);
  const bid = kres.recommendations.find((r) => r.action === "bid-down")!;
  let decisions = apply([], planApprove([harvest.id, ...negs.map((r) => r.id), bid.id], ctxFor(kres.recommendations, [])));
  const before = exportSelection(kres.recommendations, decisions);
  assert.equal(before.recs.length, 5, "harvest + paired negative + 2 negatives + 1 bid");
  const sheet1 = buildBulkSheet({ store: kitchen, recs: kres.recommendations, decisions: before.decisions, bulk: kd.bulk, today: TODAY });
  assert.ok(sheet1.count >= 4);

  // Apply the harvest family and one negative; the rest stays approved.
  const applied = planMarkApplied([harvest.id, negs[0].id], ctxFor(kres.recommendations, decisions));
  assert.equal(applied.save.length, 3);
  assert.ok(applied.save.every((d) => d.appliedAt === NOW && d.status === "approved"));
  decisions = apply(decisions, applied);
  const model = buildRecModel(kres.recommendations, decisions, TODAY);
  assert.equal(model.byId.get(harvest.id)?.status, "applied");
  assert.ok(!itemsInView(model.items, "approved").some((i) => i.rec.id === harvest.id), "applied rows leave Approved");
  assert.equal(viewCounts(model.items, 0).approved, 2);
  const after = exportSelection(kres.recommendations, decisions);
  assert.deepEqual(after.recs.map((r) => r.id).sort(), [negs[1].id, bid.id].sort());
  const sheet2 = buildBulkSheet({ store: kitchen, recs: kres.recommendations, decisions: after.decisions, bulk: kd.bulk, today: TODAY });
  const flat = sheet2.rows.flat().map(String);
  assert.ok(!flat.includes(harvest.subject), "applied harvest is not in the next sheet");
  assert.ok(flat.includes(negs[1].subject));
  assert.equal(sheet2.count, 2);

  // Applied rows are protected from undo / re-approve.
  assert.equal(planUndo([harvest.id], ctxFor(kres.recommendations, decisions)).remove.length, 0);
  assert.equal(planApprove([harvest.id], ctxFor(kres.recommendations, decisions)).save.length, 0);

  const hist = appliedHistory(decisions);
  assert.equal(hist.length, 1);
  assert.equal(hist[0].decisions.length, 3);
  const un = planUnapply(
    hist[0].decisions.map((d) => d.recId),
    { decisions: decisionMap(decisions), now: NOW },
  );
  decisions = apply(decisions, un);
  assert.equal(exportSelection(kres.recommendations, decisions).recs.length, 5);
});

test("bulk-action undo restores the exact previous decisions; edit bid in place", () => {
  const start = apply([], planReject([harvest.id], ctxFor(kres.recommendations, [])));
  const ctx = ctxFor(kres.recommendations, start);
  const plan = planApprove([harvest.id], ctx);
  const snap = snapshotFor(plan, ctx.decisions);
  const after = apply(start, plan);
  const restored = apply(after, planRestore(snap));
  assert.deepEqual(
    restored.map((d) => [d.recId, d.status]).sort(),
    start.map((d) => [d.recId, d.status]).sort(),
  );
  const edited = planEditBid(harvest.id, 0.99, ctxFor(kres.recommendations, after));
  assert.equal(edited.save[0].editedBid, 0.99);
  assert.equal(edited.save[0].status, "approved");
});

test("large reopen plans are real deletes (one db transaction), legacy reopen markers read as open", () => {
  const harvests = kres.recommendations.filter((r) => r.action === "harvest-exact" && r.pairedWith).slice(0, 4);
  const approved = apply([], planApprove(harvests.map((r) => r.id), ctxFor(kres.recommendations, [])));
  const undo = planUndo(harvests.map((r) => r.id), ctxFor(kres.recommendations, approved));
  assert.equal(undo.remove.length, 8);
  assert.equal(undo.save.length, 0, "no expired-snooze markers are written any more");
  const after = apply(approved, undo);
  assert.equal(after.length, 0, "nothing is left behind to inflate counts and backups");
  const model = buildRecModel(kres.recommendations, after, TODAY);
  for (const r of harvests) assert.equal(model.byId.get(r.id)?.status, "open");
  assert.equal(viewCounts(model.items, 0).approved, 0);
  assert.equal(exportSelection(kres.recommendations, after).recs.length, 0);
  // Markers written by earlier versions: purged by db.ts, and open until then.
  const legacy: Decision = { recId: harvests[0].id, storeId: kitchen.id, status: "snoozed", snoozeUntil: "1970-01-01", decidedAt: NOW };
  assert.equal(isReopenMarker(legacy), true);
  assert.equal(isReopenMarker({ ...legacy, snoozeUntil: "2026-10-08" }), false, "a real snooze is kept");
  assert.equal(statusOf(legacy, TODAY), "open");
});

test("parseRecId splits target and search-term ids", () => {
  const p = parseRecId("demo|bid-down|camp a|ag 1|garlic press|exact");
  assert.equal(p.action, "bid-down");
  assert.equal(p.subject, "garlic press");
  assert.equal(p.matchType, "exact");
  const q = parseRecId(harvest.id);
  assert.equal(q.subject, harvest.subject.toLowerCase());
  assert.equal(q.matchType, undefined);
});

/* ------------------------------------------------------------------- views */

test("views, counts, filters and sorting", () => {
  const model = buildRecModel(kres.recommendations, [], TODAY);
  const counts = viewCounts(model.items, kres.skipped.length);
  const harvestRoots = kres.recommendations.filter((r) => r.action === "harvest-exact" || r.action === "harvest-product").length;
  assert.equal(counts.open.harvest, harvestRoots);
  assert.equal(counts.open.bids, kres.recommendations.filter((r) => r.action === "bid-up" || r.action === "bid-down" || r.action === "pause").length);
  assert.equal(counts.open.flags, kres.recommendations.filter((r) => r.action === "relevance").length);
  assert.equal(parseView("negatives"), "negatives");
  assert.equal(parseView("bogus"), "harvest");

  const negs = itemsInView(model.items, "negatives");
  assert.ok(negs.every((i) => i.rec.action.startsWith("negate") && !i.rec.pairedWith));
  const whisk = filterItems(model.items, { ...DEFAULT_REC_FILTER, text: "WHISK" });
  assert.ok(whisk.length > 0 && whisk.every((i) => i.haystack.includes("whisk")));
  const camp = filterItems(model.items, { ...DEFAULT_REC_FILTER, campaign: "whisk_auto_auto" });
  assert.ok(camp.length > 0 && camp.every((i) => i.rec.campaign === "Whisk_Auto_Auto"));
  const high = filterItems(model.items, { ...DEFAULT_REC_FILTER, priority: "high" });
  assert.ok(high.every((i) => i.rec.priority === "high"));
  const big = filterItems(model.items, { ...DEFAULT_REC_FILTER, minImpact: 50 });
  assert.ok(big.length > 0 && big.every((i) => (i.rec.impact ?? 0) >= 50));
  const byImpact = sortItems(model.items, "impact", "desc");
  for (let i = 1; i < byImpact.length; i++) assert.ok((byImpact[i - 1].rec.impact ?? 0) >= (byImpact[i].rec.impact ?? 0));
  const bySpendAsc = sortItems(model.items, "spend", "asc");
  assert.ok(bySpendAsc[0].rec.counters.spend <= bySpendAsc[bySpendAsc.length - 1].rec.counters.spend);
  assert.deepEqual(
    sortItems(model.items, "priority").map((i) => i.rec.id),
    model.items.map((i) => i.rec.id),
    "priority = engine order",
  );

  const summary = storeRecSummary(kres.recommendations, [], TODAY);
  assert.equal(summary.harvest, counts.open.harvest);
  assert.ok(summary.impact > 0);

  const cats = new Set(kres.skipped.map(skipCategory));
  assert.ok(cats.has("targeted") && cats.has("protected") && cats.has("learning"), [...cats].join(","));
});

/* -------------------------------------------------------------- explanations */

test("Why maths adds up to the engine's bids for every demo harvest and bid change", () => {
  let checkedH = 0;
  let checkedB = 0;
  for (const store of demo.stores) {
    const d = storeData(store);
    const res = recommend({ store, rows: d.rows, bulk: d.bulk });
    const priors = buildPriorIndex(d.rows, res.window, store.id);
    for (const r of res.recommendations) {
      if (r.action === "harvest-exact" || r.action === "harvest-product" || r.action === "harvest-phrase") {
        const m = harvestMaths(r, { store, priors });
        assert.equal(m.bid, r.suggestedBid, `${store.id} ${r.subject}: harvest bid`);
        assert.equal(round2(m.mc), r.maxCpc, `${store.id} ${r.subject}: max CPC`);
        checkedH++;
      } else if (r.action === "bid-up" || r.action === "bid-down") {
        const m = bidMaths(r, { store, priors });
        assert.equal(m.guard?.bid, r.suggestedBid, `${store.id} ${r.subject} (${r.matchType}): bid`);
        assert.equal(round2(m.mc), r.maxCpc, `${store.id} ${r.subject}: max CPC`);
        checkedB++;
      }
      const ex = explainRecommendation(r, { store, priors, windowDays: 30 });
      assert.ok(ex.headline.length > 20 && ex.what.length > 10 && ex.impact.length > 5, `${r.action} explanation`);
      assert.ok(!/NaN|undefined/.test(JSON.stringify([ex.headline, ex.what, ex.lines, ex.summary])), `${r.id}: no NaN in copy`);
    }
  }
  assert.ok(checkedH >= 15 && checkedB >= 10, `${checkedH} harvests / ${checkedB} bid changes`);
  const priors = buildPriorIndex(kd.rows, kres.window, kitchen.id);
  const top = kres.recommendations.find((r) => r.subject === "heavy duty garlic press")!;
  const ex = explainRecommendation(top, { store: kitchen, priors, windowDays: 30 });
  assert.equal(ex.summary, "Max CPC = 30% target × $19.99 AOV × 21.57% smoothed CVR = $1.29 → bid $1.03 (80%)");
  assert.equal(rate(0.3), "30%");
  assert.equal(rate(0.2157, 2), "21.57%");
  assert.equal(rate(0.125), "12.5%");
});

/* ------------------------------------------------------------------ targets */

test("target table: every target, same bids as the engine where it recommends", () => {
  for (const store of demo.stores) {
    const d = storeData(store);
    const res = recommend({ store, rows: d.rows, bulk: d.bulk });
    const rows = buildTargetRows({ store, rows: d.rows, bulk: d.bulk, window: res.window, recs: res.recommendations });
    const targetRecs = res.recommendations.filter((r) => r.action === "bid-up" || r.action === "bid-down" || r.action === "pause");
    assert.ok(rows.length > targetRecs.length, "more targets than bid recs");
    for (const r of targetRecs) {
      const row = rows.find((x) => x.rec?.id === r.id);
      assert.ok(row, `${store.id}: row for ${r.id}`);
      if (r.action === "pause") assert.equal(row.band, "pause", r.id);
      else {
        assert.equal(row.band, r.action === "bid-up" ? "raise" : "cut", `${r.id}: ${row.bandLabel}`);
        assert.equal(row.suggestedBid, r.suggestedBid, r.id);
        assert.equal(row.currentBid, r.currentBid, r.id);
      }
    }
    // Rows the engine skipped as learning are learning here.
    for (const s of res.skipped.filter((x) => x.reason.startsWith("learning"))) {
      const row = rows.find((x) => x.targeting.toLowerCase() === s.subject.toLowerCase() && x.campaign === s.campaign);
      assert.equal(row?.band, "learning", s.subject);
    }
    // No row claims a raise / cut that the engine did not recommend.
    const recIds = new Set(targetRecs.map((r) => r.id));
    for (const row of rows) if (row.band === "raise" || row.band === "cut" || row.band === "pause") assert.ok(row.rec && recIds.has(row.rec.id), row.key);
    const counts = bandCounts(rows);
    assert.equal(Object.values(counts).reduce((a, b) => a + b, 0), rows.length);
  }
  const res = kres;
  const rows = buildTargetRows({ store: kitchen, rows: kd.rows, bulk: kd.bulk, window: res.window, recs: res.recommendations });
  const cuts = filterTargets(rows, { ...DEFAULT_TARGET_FILTER, band: "cut" });
  assert.ok(cuts.length > 0 && cuts.every((r) => r.band === "cut"));
  const sorted = sortTargets(rows, "spend", "desc");
  assert.ok(sorted[0].counters.spend >= sorted[sorted.length - 1].counters.spend);
});

/* ----------------------------------------------------------------- explorer */

function row(o: Partial<SearchTermRow> & Pick<SearchTermRow, "searchTerm">): SearchTermRow {
  return {
    key: "",
    storeId: "s1",
    batchId: "t",
    date: "2026-09-20",
    campaign: "Camp A",
    adGroup: "AG 1",
    targeting: "garlic press",
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

const S1 = createStore({ id: "s1", name: "Store 1", currency: "USD", marketplace: "US" });
const S2 = createStore({ id: "s2", name: "Store 2", currency: "GBP", marketplace: "UK" });
const FX = { baseCurrency: "USD", fxRates: { GBP: 1.25 } };

const exRows: SearchTermRow[] = [
  // Winner: 3 orders, ACoS 10%.
  row({ searchTerm: "garlic press", clicks: 10, spend: 6, orders: 3, sales: 60, units: 3 }),
  row({ searchTerm: "Garlic  Press", date: "2026-09-21", clicks: 5, spend: 3, orders: 0, sales: 0, targeting: "close-match", matchType: "auto", campaign: "camp a" }),
  // Same term in another ad group → store-term adds up.
  row({ searchTerm: "garlic press", adGroup: "AG 2", clicks: 4, spend: 2, orders: 1, sales: 20 }),
  // Bleeder: 20 clicks, 0 orders.
  row({ searchTerm: "garlic slicer machine", clicks: 20, spend: 12 }),
  // Low CTR: 5,000 impressions, 3 clicks.
  row({ searchTerm: "kitchen gadgets", impressions: 5000, clicks: 3, spend: 2 }),
  // ASIN term.
  row({ searchTerm: "b0c7k2m9qx", clicks: 6, spend: 3, orders: 2, sales: 40, targeting: "substitutes", matchType: "auto" }),
  // Outside a 7-day period.
  row({ searchTerm: "old term", date: "2026-08-01", clicks: 50, spend: 50 }),
  // Second store (GBP).
  row({ storeId: "s2", searchTerm: "spatula", clicks: 8, spend: 4, orders: 2, sales: 30, campaign: "UK Camp" }),
];

test("explorer: modes, period, row-level filters, FX", () => {
  const ix = buildExplorerIndex(exRows);
  const base = { days: 30, fx: FX, convert: false };
  const byTerm = aggregateExplorer(ix, { ...base, mode: "term", stores: [S1] });
  assert.equal(byTerm.period?.to, "2026-09-21");
  assert.equal(byTerm.period?.from, "2026-08-23");
  const gp = byTerm.rows.filter((r) => r.label.toLowerCase().replace(/\s+/g, " ") === "garlic press");
  assert.equal(gp.length, 2, "case / spacing variants merge; AG 2 is its own row");
  const ag1 = gp.find((r) => r.adGroup === "AG 1")!;
  assert.equal(ag1.counters.clicks, 15);
  assert.equal(ag1.matchMask, (1 << 2) | (1 << 3), "broad + auto");
  assert.ok(!byTerm.rows.some((r) => r.label === "old term"), "outside the 30-day period");
  const store = aggregateExplorer(ix, { ...base, mode: "store-term", stores: [S1] });
  const gpStore = store.rows.find((r) => r.label.toLowerCase() === "garlic press")!;
  assert.equal(gpStore.counters.clicks, 19);
  assert.equal(gpStore.adGroupCount, 2);
  assert.equal(gpStore.adGroup, "2 ad groups");
  const targets = aggregateExplorer(ix, { ...base, mode: "target", stores: [S1] });
  assert.ok(targets.rows.some((r) => r.label === "close-match" && r.counters.clicks === 5));
  const auto = aggregateExplorer(ix, { ...base, mode: "term", stores: [S1], matchType: "auto" });
  assert.deepEqual(auto.rows.map((r) => r.counters.clicks).sort((a, b) => a - b), [5, 6], "match type filters rows before adding up");
  const camp = aggregateExplorer(ix, { ...base, mode: "term", stores: [S1], campaign: "nope" });
  assert.equal(camp.rows.length, 0);
  const all = aggregateExplorer(ix, { days: 30, fx: FX, convert: true, mode: "term", stores: [S1, S2] });
  const uk = all.rows.find((r) => r.storeId === "s2")!;
  assert.equal(uk.spend, 5, "GBP converted to USD");
  assert.equal(uk.currency, "USD");
  const noRate = aggregateExplorer(ix, { days: 30, fx: { baseCurrency: "USD", fxRates: {} }, convert: true, mode: "term", stores: [S1, S2] });
  const uk2 = noRate.rows.find((r) => r.storeId === "s2")!;
  assert.equal(uk2.currency, "GBP", "no rate: shown in its own currency");
  assert.deepEqual(noRate.unconverted, ["s2"]);
  const week = aggregateExplorer(ix, { ...base, days: 7, mode: "term", stores: [S1] });
  assert.equal(week.period?.from, "2026-09-15");
});

test("explorer: presets, chips, text search", () => {
  const ix = buildExplorerIndex(exRows);
  const { rows } = aggregateExplorer(ix, { days: 30, fx: FX, convert: false, mode: "term", stores: [S1] });
  const labels = (f: ExplorerFilter) => filterExplorer(rows, f).map((r) => r.label.toLowerCase()).sort();

  const winners = applyPreset(DEFAULT_EXPLORER_FILTER, "winners");
  assert.equal(activePreset(winners), "winners");
  assert.deepEqual(labels(winners), ["b0c7k2m9qx", "garlic press"], "≥ 2 orders and ACoS < target (AG 1 garlic press: 3 orders, 12.5%)");
  const bleeders = applyPreset(DEFAULT_EXPLORER_FILTER, "bleeders");
  assert.deepEqual(labels(bleeders), ["garlic slicer machine"]);
  assert.deepEqual(labels(applyPreset(DEFAULT_EXPLORER_FILTER, "low-ctr")), ["kitchen gadgets"]);
  assert.deepEqual(labels(applyPreset(DEFAULT_EXPLORER_FILTER, "asin")), ["b0c7k2m9qx"]);
  // A preset keeps the text / campaign filters but replaces the metric ones.
  const mixed = applyPreset({ ...bleeders, text: "garlic", minSpend: 100 }, "winners");
  assert.equal(mixed.text, "garlic");
  assert.equal(mixed.minSpend, null);
  assert.equal(mixed.minClicks, null);

  assert.deepEqual(parseTextQuery("garlic, Kitchen , -slicer"), { include: ["garlic", "kitchen"], exclude: ["slicer"] });
  assert.deepEqual(labels({ ...DEFAULT_EXPLORER_FILTER, text: "garlic, kitchen, -slicer" }), ["garlic press", "garlic press", "kitchen gadgets"]);

  const f: ExplorerFilter = { ...DEFAULT_EXPLORER_FILTER, text: "garlic", minClicks: 15, acosMin: 0.1, acosMax: 0.4, orders: "0", campaign: "camp a" };
  const chips = filterChips(f, { money: (n) => `$${n}`, campaignLabel: () => "Camp A" });
  assert.deepEqual(
    chips.map((c) => c.label),
    ["Contains “garlic”", "Campaign: Camp A", "0 orders", "Clicks ≥ 15", "ACoS 10%–40%"],
  );
  let g = f;
  for (const c of chips) g = removeChip(g, c.key);
  assert.ok(isDefaultFilter(g), "removing every chip clears the filter");

  const sorted = sortExplorer(rows, "clicks", "desc");
  assert.equal(sorted[0].label, "garlic slicer machine");
  const csv = explorerCsv(sorted, { mode: "term", showStore: false, storeName: (id) => id });
  assert.equal(csv[0][0], "Search term");
  assert.equal(csv.length, rows.length + 1);

  const detail = entityDetail(ix, ag(rows), "term", { days: 30, from: "2026-08-23", to: "2026-09-21" });
  assert.equal(detail.days.length, 30);
  assert.equal(detail.clicks.reduce((a, b) => a + b, 0), 15);
  assert.equal(detail.breakdownKind, "targets");
  assert.equal(detail.breakdown.length, 2);
});

function ag(rows: ReturnType<typeof aggregateExplorer>["rows"]) {
  return rows.find((r) => r.label.toLowerCase() === "garlic press" && r.adGroup === "AG 1")!;
}

test("explorer: engine badges on demo data", () => {
  const ix = buildExplorerIndex(kd.rows);
  const res = aggregateExplorer(ix, { days: 30, fx: FX, convert: false, mode: "term", stores: [kitchen], recs: kres.recommendations });
  const badged = res.rows.filter((r) => r.rec);
  assert.ok(badged.some((r) => r.rec?.action === "harvest-exact" && r.label === "heavy duty garlic press"));
  assert.ok(badged.some((r) => r.rec?.action === "negate-phrase"), "phrase negatives badge the searches they block");
  const t = aggregateExplorer(ix, { days: 30, fx: FX, convert: false, mode: "target", stores: [kitchen], recs: kres.recommendations });
  assert.ok(t.rows.some((r) => r.rec?.action === "pause"));
});

test("performance: 100k-row store — explorer index, period pass, filter + sort, target table", () => {
  const S = createStore({ id: "big", name: "Big", currency: "USD", marketplace: "US" });
  const rows: SearchTermRow[] = [];
  for (let i = 0; i < 100_000; i++) {
    const clicks = i % 7;
    rows.push(
      row({
        storeId: "big",
        date: addDays("2026-07-01", i % 90),
        campaign: `Campaign ${i % 40}`,
        adGroup: `AG ${i % 5}`,
        targeting: `kw ${i % 400}`,
        matchType: (["exact", "phrase", "broad"] as const)[i % 3],
        searchTerm: `term ${i % 12000}`,
        clicks,
        spend: clicks * 0.6,
        orders: i % 11 === 0 ? 1 : 0,
        sales: i % 11 === 0 ? 25 : 0,
        impressions: 50 + (i % 300),
      }),
    );
  }
  const t0 = performance.now();
  const ix = buildExplorerIndex(rows);
  const t1 = performance.now();
  const res = aggregateExplorer(ix, { days: 90, fx: FX, convert: false, mode: "term", stores: [S] });
  const t2 = performance.now();
  const filtered = filterExplorer(res.rows, { ...DEFAULT_EXPLORER_FILTER, text: "term 1, term 2", minClicks: 1 });
  const sorted = sortExplorer(filtered, "spend", "desc");
  const t3 = performance.now();
  const store = aggregateExplorer(ix, { days: 90, fx: FX, convert: false, mode: "store-term", stores: [S] });
  const t4 = performance.now();
  const win = { from: "2026-08-29", to: "2026-09-27" };
  const priors = buildPriorIndex(rows, win, "big");
  const t5 = performance.now();
  const targets = buildTargetRows({ store: S, rows, bulk: [], window: win, recs: [], priors });
  const t6 = performance.now();
  assert.ok(res.rows.length > 10_000 && sorted.length > 0 && store.rows.length === 12_000 && targets.length > 0);
  note(
    `work 100k rows: explorer index ${(t1 - t0).toFixed(0)} ms, 90-day pass ${(t2 - t1).toFixed(0)} ms (${res.rows.length} terms), ` +
      `filter+sort ${(t3 - t2).toFixed(0)} ms, store-term pass ${(t4 - t3).toFixed(0)} ms, priors ${(t5 - t4).toFixed(0)} ms, target table ${(t6 - t5).toFixed(0)} ms`,
  );
  assert.ok(t1 - t0 < 3000 && t2 - t1 < 1000 && t3 - t2 < 1000, "well under budget");
  void filterByWindow;
});

/* --------------------------------------------------------------- calculator */

test("bid calculator: Bid-Calculator.xlsx parity", () => {
  const r = bidCalc({ ...WORKBOOK_DEFAULTS });
  close(r.maxCpc, 0.8997, 1e-9);
  assert.equal(r.recommended, 0.72);
  assert.equal(r.aggressive, 0.9);
  assert.equal(r.conservative, 0.54);
  const bid = Object.fromEntries(r.perMatch.map((m) => [m.match, m.bid]));
  assert.deepEqual(bid, { exact: 0.72, phrase: 0.61, broad: 0.5, auto: 0.43 });
  assert.deepEqual(
    r.sensitivity.map((s) => s.cvr),
    [0.05, 0.08, 0.1, 0.12, 0.15, 0.2],
  );
  const at = (c: number) => r.sensitivity.find((s) => Math.abs(s.cvr - c) < 1e-9)!;
  assert.equal(at(0.1).affordable, true, "0.85 CPC ≤ 0.8997 max CPC at 10%");
  assert.equal(at(0.1).current, true);
  assert.equal(at(0.08).affordable, false, "max CPC 0.72 < 0.85 at 8%");
  close(at(0.05).acosAtCurrent, 0.85 / (29.99 * 0.05), 1e-12);
  // A CVR off the sweep is inserted in order.
  const odd = bidCalc({ ...WORKBOOK_DEFAULTS, cvr: 0.09 });
  assert.deepEqual(
    odd.sensitivity.map((s) => s.cvr),
    [0.05, 0.08, 0.09, 0.1, 0.12, 0.15, 0.2],
  );
  const none = bidCalc({ ...WORKBOOK_DEFAULTS, aov: 0 });
  assert.equal(none.valid, false);
  assert.ok(Number.isNaN(none.recommended));
});

test("economics helpers: unit maths, validation, store inputs", () => {
  const u = fromUnits({ price: 19.99, cogs: 5, fbaFee: 4.5, referralPct: 0.15, otherCosts: 0.5 }, "profit");
  close(u.breakEven, (19.99 - 5 - 4.5 - 0.15 * 19.99 - 0.5) / 19.99, 1e-12);
  close(u.suggestedTarget, Math.round(u.breakEven * 0.75 * 10000) / 10000, 1e-12);
  assert.deepEqual(checkEconomics({ breakEvenAcos: 0.32, targetAcos: 0.3, goal: "profit" }), { errors: {}, warnings: [] });
  assert.equal(checkEconomics({ breakEvenAcos: 0.3, targetAcos: 0.35, goal: "profit" }).warnings.length, 1);
  assert.match(checkEconomics({ breakEvenAcos: 0.3, targetAcos: 0.35, goal: "launch" }).warnings[0], /launch/);
  assert.ok(checkEconomics({ breakEvenAcos: 0, targetAcos: 2, goal: "profit" }).errors.target);
  close(parsePercent("30"), 0.3);
  close(parsePercent("28.5%"), 0.285);
  assert.ok(Number.isNaN(parsePercent("")));
  const inputs = storeCalcInputs(kd.rows, kres.window, kitchen.id);
  assert.ok(inputs.aov > 10 && inputs.aov < 25 && inputs.cvr > 0.05 && inputs.cpc > 0.3, JSON.stringify(inputs));
});
