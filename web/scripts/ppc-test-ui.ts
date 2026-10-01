/**
 * Self-test: console-UI logic defects (src/components/ppc/work/* and format.ts) —
 * typed amounts with thousands separators, phrase companions following their
 * harvest's destination into the bulk sheet, rule-aware explorer quick filters
 * and glossary wording, and currency symbols that tell dollar currencies apart.
 */

import assert from "node:assert/strict";

import { makeDemoData } from "../src/lib/ppc/demo";
import { buildBulkSheet } from "../src/lib/ppc/export";
import { DEFAULT_LADDER, DEFAULT_RULES, recommend } from "../src/lib/ppc/rules";
import type { Decision, HarvestDestination, Store } from "../src/lib/ppc/types";
import { money } from "../src/components/ppc/format";
import { normalizeAmountText, parseAmount } from "../src/components/ppc/work/calculator";
import {
  buildFamilies,
  decisionMap,
  exportSelection,
  planApprove,
  planEditDestination,
  type DecisionPlan,
  type PlanContext,
} from "../src/components/ppc/work/decisions";
import { adGroupOptions } from "../src/components/ppc/work/destinations";
import { activePreset, applyPreset, DEFAULT_EXPLORER_FILTER, presetsFor, PRESETS } from "../src/components/ppc/work/explorer";
import { GLOSSARY, guardrailsText, ladderText } from "../src/components/ppc/work/glossary";
import { group, test } from "./ppc-test-harness";

group("ui");

const NOW = "2026-10-01T09:00:00.000Z";
const TODAY = "2026-10-01";

/* ---------------------------------------------------------------- amounts */

test("typed amounts: a comma before three digits is a thousands separator, not a decimal point", () => {
  assert.equal(parseAmount("1,299"), 1299);
  assert.equal(parseAmount("2,500"), 2500);
  assert.equal(parseAmount("₹1,299"), 1299);
  assert.equal(parseAmount("$1,299.00"), 1299);
  assert.equal(parseAmount("1,29,999"), 129999, "Indian grouping");
  assert.equal(parseAmount("1.299,50"), 1299.5, "European grouping");
  assert.equal(parseAmount("1.299.000"), 1299000);
  // A lone comma with one or two decimals (or a zero whole part) is a decimal comma.
  assert.equal(parseAmount("0,72"), 0.72);
  assert.equal(parseAmount("12,5"), 12.5);
  assert.equal(parseAmount("0,725"), 0.725);
  assert.equal(parseAmount("29.99"), 29.99);
  assert.equal(parseAmount(""), undefined);
  assert.equal(parseAmount("   "), undefined);
  assert.ok(Number.isNaN(parseAmount("1-2")));
  assert.equal(normalizeAmountText("€ 1,299"), "1299");
});

/* --------------------------------------------------- phrase companions */

const demo = makeDemoData();
const base = demo.stores.find((s) => s.id === "demo-kitchen-us")!;
const rows = demo.rows.filter((r) => r.storeId === base.id);
const bulk = demo.bulk.filter((b) => b.storeId === base.id);

function apply(decisions: Decision[], plan: DecisionPlan): Decision[] {
  const m = decisionMap(decisions);
  for (const id of plan.remove) m.delete(id);
  for (const d of plan.save) m.set(d.recId, d);
  return [...m.values()];
}

test("a phrase companion goes where its harvest was sent, never to the store default", () => {
  const store: Store = {
    ...base,
    rules: { ...base.rules, alsoHarvestPhrase: true },
    harvestDestination: { mode: "new-campaign", productLabel: "GarlicPress", dailyBudget: 25 },
  };
  const res = recommend({ store, rows, bulk });
  const families = buildFamilies(res.recommendations);
  const phrase = res.recommendations.find((r) => r.action === "harvest-phrase" && r.pairedWith && families.rootOf.get(r.id) === r.pairedWith);
  assert.ok(phrase, "the demo produces a phrase companion");
  const root = families.byId.get(phrase.pairedWith!)!;
  assert.equal(root.action, "harvest-exact");
  const option = adGroupOptions(bulk, store.id).find((o) => o.manual && o.holds !== "product" && o.adGroupId !== root.ids.adGroupId);
  assert.ok(option, "an existing manual keyword ad group to send it to");
  const dest: HarvestDestination = {
    mode: "existing",
    campaignId: option.campaignId,
    adGroupId: option.adGroupId,
    campaignName: option.campaignName,
    adGroupName: option.adGroupName,
  };
  const ctx = (decisions: Decision[], extra: Partial<PlanContext> = {}): PlanContext => ({
    decisions: decisionMap(decisions, res.recommendations),
    families,
    now: NOW,
    today: TODAY,
    ...extra,
  });

  // The destination is typed on the harvest row only (the companion has no control of its own).
  const plan = planApprove([root.id], ctx([], { drafts: { [root.id]: { destination: dest } } }));
  assert.deepEqual(plan.save.find((d) => d.recId === root.id)?.destination, dest);
  assert.deepEqual(plan.save.find((d) => d.recId === phrase.id)?.destination, dest, "phrase decision carries the harvest's destination");
  let decisions = apply([], plan);

  const sel = exportSelection(res.recommendations, decisions);
  assert.ok(sel.recs.some((r) => r.id === phrase.id));
  const sheet = buildBulkSheet({ store, recs: sel.recs, decisions: sel.decisions, bulk, today: TODAY });
  const [header, ...data] = sheet.rows;
  const col = (name: string) => header.indexOf(name);
  const campaignCreates = data.filter((r) => r[col("Entity")] === "Campaign" && r[col("Operation")] === "Create");
  assert.deepEqual(campaignCreates, [], "no unrequested new campaign for the phrase keyword");
  const phraseRow = data.find((r) => r[col("Entity")] === "Keyword" && r[col("Match Type")] === "phrase" && r[col("Keyword Text")] === phrase.subject);
  assert.ok(phraseRow, "phrase keyword is in the sheet");
  assert.equal(phraseRow[col("Ad Group ID")], option.adGroupId, "phrase keyword lands in the chosen ad group");

  // Changing the approved harvest's destination moves the phrase keyword too.
  const back: HarvestDestination = { mode: "source" };
  const edit = planEditDestination(root.id, back, ctx(decisions));
  assert.deepEqual(edit.affected.sort(), [root.id, phrase.id].sort());
  decisions = apply(decisions, edit);
  assert.deepEqual(decisions.find((d) => d.recId === phrase.id)?.destination, back);
});

/* ------------------------------------------------------- rule-aware copy */

test("explorer quick filters use the store's own thresholds (defaults without a store)", () => {
  const bleedDefault = presetsFor().find((p) => p.id === "bleeders")!;
  assert.equal(bleedDefault.patch.minClicks, DEFAULT_RULES.negateClicks);
  assert.match(bleedDefault.description, /15\+ clicks.*default rules/);
  assert.deepEqual(PRESETS.map((p) => p.id), ["winners", "bleeders", "low-ctr", "asin"]);

  const rules = { ...DEFAULT_RULES, negateClicks: 25, harvestMinOrders: 3, relevanceMinImpressions: 2000, relevanceMaxCtr: 0.0015 };
  const presets = presetsFor(rules);
  const bleed = presets.find((p) => p.id === "bleeders")!;
  assert.equal(bleed.patch.minClicks, 25);
  assert.match(bleed.description, /25\+ clicks/);
  assert.doesNotMatch(bleed.description, /default/);
  const lowCtr = presets.find((p) => p.id === "low-ctr")!;
  assert.deepEqual(lowCtr.patch, { minImpressions: 2000, ctrMax: 0.0015 });
  assert.match(lowCtr.description, /2,000\+ impressions and CTR under 0\.15%/);
  assert.match(presets.find((p) => p.id === "winners")!.description, /3\+ orders/);

  const applied = applyPreset(DEFAULT_EXPLORER_FILTER, "bleeders", rules);
  assert.equal(applied.minClicks, 25);
  assert.equal(activePreset(applied, rules), "bleeders");
  assert.equal(activePreset(applied), null, "15-click default preset is a different filter");
});

test("ladder / guardrails tooltips state a store's own numbers; the defaults say they are defaults", () => {
  assert.match(GLOSSARY.ladder.text, /By default/);
  assert.match(GLOSSARY.guardrails.text, /By default/);
  assert.equal(
    ladderText(DEFAULT_LADDER),
    "How far to move a bid based on ACoS ÷ target, for this store: under 0.5× +15%, up to 0.8× +8%, up to 1.2× hold, up to 1.5× −12%, up to 2× −20%, above 2× −20% and flag for pausing.",
  );
  const custom = ladderText([
    { upTo: 0.6, change: 0.1 },
    { upTo: 1.3, change: 0 },
    { upTo: null as unknown as number, change: -0.25, flagPause: true },
  ]);
  assert.match(custom, /under 0\.6× \+10%, up to 1\.3× hold, above 1\.3× −25% and flag for pausing\.$/);
  const g = guardrailsText({ maxMove: 0.3, bidFloor: 1, bidCeiling: 300 }, (n) => money(n, "INR"));
  assert.match(g, /±30% per change/);
  assert.match(g, /₹1\.00 floor/);
  assert.match(g, /₹300\.00 ceiling/);
});

/* ---------------------------------------------------------------- money */

test("money tells dollar currencies apart and keeps the familiar single symbols", () => {
  assert.equal(money(901, "USD"), "$901.00");
  assert.equal(money(1234, "CAD"), "CA$1,234.00");
  assert.equal(money(40, "AUD", { decimals: 0 }), "A$40");
  assert.equal(money(40, "MXN", { decimals: 0 }), "MX$40");
  assert.notEqual(money(12.5, "SGD"), money(12.5, "USD"));
  assert.equal(money(12.5, "GBP"), "£12.50");
  assert.equal(money(12.5, "EUR"), "€12.50");
  assert.equal(money(1299, "INR"), "₹1,299.00");
  assert.equal(money(1299, "JPY"), "¥1,299");
  assert.equal(money(Number.NaN, "USD"), "—");
});
