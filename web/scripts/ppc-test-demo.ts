/**
 * Self-test: demo data determinism / invariants / coverage, and db.ts import safety.
 */

import assert from "node:assert/strict";

import * as db from "../src/lib/ppc/db";
import { DEMO_END_DATE, makeDemoData } from "../src/lib/ppc/demo";
import { recommend } from "../src/lib/ppc/rules";
import type { ActionType } from "../src/lib/ppc/types";
import { group, note, test } from "./ppc-test-harness";

group("demo");

function fingerprint(seed?: number) {
  const d = makeDemoData(seed);
  let clicks = 0;
  let spend = 0;
  let sales = 0;
  let orders = 0;
  for (const r of d.rows) {
    clicks += r.clicks;
    spend += r.spend;
    sales += r.sales;
    orders += r.orders;
  }
  return {
    stores: d.stores.map((s) => s.id).join(","),
    rows: d.rows.length,
    bulk: d.bulk.length,
    clicks,
    orders,
    spend: Math.round(spend * 100),
    sales: Math.round(sales * 100),
    firstKey: d.rows[0]?.key,
    lastKey: d.rows[d.rows.length - 1]?.key,
  };
}

test("deterministic: same seed → same data; different seed → different data", () => {
  const a = fingerprint(7);
  const b = fingerprint(7);
  assert.deepEqual(a, b);
  assert.deepEqual(fingerprint(), fingerprint());
  assert.notDeepEqual(fingerprint(8), a);
});

test("shape and invariants", () => {
  const d = makeDemoData();
  assert.equal(d.stores.length, 3);
  assert.deepEqual(
    d.stores.map((s) => [s.name, s.currency, s.marketplace, s.demo]),
    [
      ["Kitchen Co — US", "USD", "US", true],
      ["Kitchen Co — UK", "GBP", "UK", true],
      ["Pet Supply — US", "USD", "US", true],
    ],
  );
  assert.ok(d.rows.length > 1000 && d.rows.length <= 15000, `row count ${d.rows.length}`);
  const dates = new Set(d.rows.map((r) => r.date));
  assert.equal(dates.size, 60);
  assert.equal([...dates].sort().pop(), DEMO_END_DATE);
  const keys = new Set<string>();
  const prices = new Set([19.99, 12.99, 14.99, 24.99, 29.99]);
  for (const r of d.rows) {
    assert.ok(r.orders <= r.clicks && r.clicks <= r.impressions, `counts ${r.key}`);
    assert.ok(r.spend >= 0 && Math.abs(r.spend * 100 - Math.round(r.spend * 100)) < 1e-6, `spend cents ${r.key}`);
    if (r.clicks === 0) assert.equal(r.spend, 0);
    if (r.orders > 0) assert.ok(prices.has(Math.round((r.sales / r.orders) * 100) / 100), `sales = orders × price ${r.key}`);
    else assert.equal(r.sales, 0);
    assert.equal(r.units, r.orders);
    assert.ok(!keys.has(r.key), `unique key ${r.key}`);
    keys.add(r.key);
  }
  for (const s of d.stores) {
    const campaigns = new Set(d.bulk.filter((b) => b.storeId === s.id && b.entity === "Campaign").map((b) => b.campaignName));
    assert.ok(campaigns.size >= 4 && campaigns.size <= 6, `${s.name}: ${campaigns.size} campaigns`);
    for (const c of campaigns) assert.match(c, /^[A-Za-z]+_(Auto_Auto|Broad_Exp|Phrase_Exp|Exact_Top5|Prod_Comp1)$/);
  }
  const bulkKeys = new Set(d.bulk.map((b) => b.key));
  assert.equal(bulkKeys.size, d.bulk.length);
  assert.ok(d.bulk.some((b) => b.entity === "Product Ad" && b.sku));
  note(`demo: ${d.rows.length} rows, ${d.bulk.length} bulk entities, ${d.stores.length} stores`);
});

test("recommend() on each demo store covers every headline action", () => {
  const d = makeDemoData();
  const summary: string[] = [];
  for (const store of d.stores) {
    const res = recommend({ store, rows: d.rows, bulk: d.bulk });
    const actions = new Set<ActionType>(res.recommendations.map((r) => r.action));
    for (const a of ["harvest-exact", "negate-exact", "negate-phrase"] as ActionType[]) assert.ok(actions.has(a), `${store.name}: ${a}`);
    assert.ok(actions.has("bid-up") || actions.has("bid-down"), `${store.name}: bid change`);
    assert.ok(res.skipped.length > 0, `${store.name}: skipped`);
    // The "freezer" term must never produce a "free" negative.
    assert.ok(!res.recommendations.some((r) => r.action === "negate-phrase" && r.evidence.some((e) => e.includes("freezer"))));
    // Brand terms are never negated.
    assert.ok(!res.recommendations.some((r) => r.action.startsWith("negate") && store.brandTerms.some((b) => r.subject.includes(b))));
    // Every bid rec from the demo has bulk IDs.
    for (const r of res.recommendations.filter((x) => x.action === "bid-up" || x.action === "bid-down")) {
      assert.equal(r.currentBidSource, "bulk");
      assert.ok(r.ids.keywordId || r.ids.productTargetingId, `ids for ${r.subject}`);
    }
    summary.push(`${store.id}: ${res.recommendations.length} recs / ${res.skipped.length} skipped`);
  }
  note(`demo recommend: ${summary.join(", ")}`);
});

group("db");

test("db.ts is import-safe without IndexedDB and fails with a clear error", async () => {
  assert.equal(db.isDbAvailable(), false);
  await assert.rejects(() => db.getSettings(), /IndexedDB is not available/);
  await assert.rejects(() => db.listStores(), /IndexedDB is not available/);
  let calls = 0;
  const unsubscribe = db.subscribe(() => calls++);
  assert.equal(typeof db.getVersion(), "number");
  unsubscribe();
  assert.equal(calls, 0);
  assert.throws(() => db.validateBackup({ app: "other" }), /Not a PPC console backup/);
  assert.equal(db.DEFAULT_SETTINGS.baseCurrency, "USD");
  assert.equal(db.DEFAULT_SETTINGS.fxRates.GBP, 1.27);
});
