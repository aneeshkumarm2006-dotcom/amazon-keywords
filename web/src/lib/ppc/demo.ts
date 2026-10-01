/**
 * Deterministic demo data: 3 stores, 60 daily dates ending 2026-09-28, Template 1
 * campaign names, and a bulk file with IDs so exports are complete.
 *
 * Every store is built from the same scenario template with its own vocabulary,
 * so each one contains: clear harvest winners (auto + broad), an ASIN harvest,
 * a 0-order bleeder (≥ 15 clicks), irrelevant-word terms ("free … recipe"), a
 * "freezer" term that must not match "free", a brand term, a low-CTR / high-
 * impression target, a term that converts elsewhere, an already-targeted
 * winner, exact keywords that deserve a raise / cut / pause, and a new keyword
 * still in its learning period — plus a long tail of ordinary terms.
 *
 * Invariants: orders ≤ clicks ≤ impressions, spend = Σ clicks × CPC (cents),
 * sales = orders × price. Search term rows exist only on days with a click
 * (as in Amazon's report), except for the low-CTR target which also reports
 * zero-click impression days.
 */

import { addDays } from "./dates";
import { bulkEntityKey, searchTermKey } from "./keys";
import { createStore } from "./rules";
import type { BulkEntity, HarvestDestination, MatchType, SearchTermRow, Store } from "./types";

export const DEMO_END_DATE = "2026-09-28";
export const DEMO_DAYS = 60;
export const DEMO_BATCH_ID = "demo";

/* -------------------------------------------------------------------- PRNG */

/** mulberry32 — small, fast, deterministic. */
export function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function poisson(rng: () => number, lambda: number): number {
  if (lambda <= 0) return 0;
  if (lambda > 30) {
    // Normal approximation (Box–Muller).
    const u = Math.max(rng(), 1e-12);
    const v = rng();
    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return Math.max(0, Math.round(lambda + z * Math.sqrt(lambda)));
  }
  const l = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rng();
  } while (p > l);
  return k - 1;
}

function binomial(rng: () => number, n: number, p: number): number {
  let k = 0;
  for (let i = 0; i < n; i++) if (rng() < p) k++;
  return k;
}

/* --------------------------------------------------------------- scenario */

interface Profile {
  campaign: string;
  adGroup: string;
  targeting: string;
  matchType: MatchType;
  term: string;
  clicksPerDay: number;
  ctr: number;
  cvr: number;
  cpc: number;
  price: number;
  /** First day index (0..59) the row can appear — later start = younger target. */
  start?: number;
  /** Also emit zero-click days (impressions only). */
  zeroClickRows?: boolean;
}

interface ProductSpec {
  label: string;
  price: number;
  sku: string;
  asin: string;
}

interface Vocab {
  product: ProductSpec;
  cpc: number;
  brand: string[];
  competitor: string[];
  exact: { winner: string; expensive: string; terrible: string; learning: string };
  broad: [string, string];
  phrase?: [string, string];
  lowCtr: { keyword: string; match: "phrase" | "broad" };
  autoHarvest: string;
  broadHarvest: string;
  asinHarvest: string;
  bleeder: string;
  irrelevant: string[];
  freezer: string;
  brandTerm: string;
  convertingElsewhere: string;
  compAsins: [string, string];
  heads: string[];
  modifiers: string[];
  second?: { product: ProductSpec; terms: string[] };
}

interface StoreSpec {
  id: string;
  name: string;
  marketplace: string;
  currency: string;
  colorIndex: number;
  breakEvenAcos: number;
  targetAcos: number;
  destination: (ids: CampaignIds) => HarvestDestination;
  idBase: number;
  vocab: Vocab;
}

interface CampaignIds {
  exactCampaignId: string;
  exactAdGroupId: string;
  exactCampaignName: string;
}

const STORES: StoreSpec[] = [
  {
    id: "demo-kitchen-us",
    name: "Kitchen Co — US",
    marketplace: "US",
    currency: "USD",
    colorIndex: 0,
    breakEvenAcos: 0.32,
    targetAcos: 0.3,
    destination: () => ({ mode: "new-campaign", productLabel: "GarlicPress", dailyBudget: 25 }),
    idBase: 1,
    vocab: {
      product: { label: "GarlicPress", price: 19.99, sku: "KC-GP-01", asin: "B0KCGP0001" },
      cpc: 0.62,
      brand: ["kitchen co", "kitchenco"],
      competitor: ["oxo"],
      exact: { winner: "garlic press", expensive: "best garlic press", terrible: "garlic press set", learning: "garlic press rocker" },
      broad: ["garlic press", "garlic mincer"],
      phrase: ["garlic press", "kitchen gadgets"],
      lowCtr: { keyword: "kitchen gadgets", match: "phrase" },
      autoHarvest: "stainless steel garlic press",
      broadHarvest: "heavy duty garlic press",
      asinHarvest: "b0c7k2m9qx",
      bleeder: "garlic slicer machine",
      irrelevant: ["free garlic press recipe", "garlic press repair parts", "used garlic press"],
      freezer: "freezer garlic cubes",
      brandTerm: "kitchen co garlic press",
      convertingElsewhere: "garlic mincer",
      compAsins: ["B0COMPA101", "B0COMPA102"],
      heads: ["garlic crusher", "garlic chopper", "garlic peeler", "ginger press", "potato ricer", "lemon squeezer", "garlic grater", "mincer tool"],
      modifiers: ["stainless", "heavy duty", "easy clean", "professional", "dishwasher safe", "large", "ergonomic", "rust proof"],
      second: {
        product: { label: "Whisk", price: 12.99, sku: "KC-WH-01", asin: "B0KCWH0001" },
        terms: ["stainless steel whisk", "balloon whisk", "egg beater", "wire whisk set", "silicone whisk", "mini whisk", "whisk for cooking", "french whisk"],
      },
    },
  },
  {
    id: "demo-kitchen-uk",
    name: "Kitchen Co — UK",
    marketplace: "UK",
    currency: "GBP",
    colorIndex: 1,
    breakEvenAcos: 0.32,
    targetAcos: 0.28,
    destination: (ids) => ({
      mode: "existing",
      campaignId: ids.exactCampaignId,
      adGroupId: ids.exactAdGroupId,
      campaignName: ids.exactCampaignName,
      adGroupName: "Exact",
    }),
    idBase: 2,
    vocab: {
      product: { label: "SpatulaSet", price: 14.99, sku: "KC-SS-UK", asin: "B0KCSS0002" },
      cpc: 0.46,
      brand: ["kitchen co"],
      competitor: ["joseph joseph"],
      exact: { winner: "silicone spatula set", expensive: "spatula set", terrible: "rubber spatula", learning: "heat resistant spatula set" },
      broad: ["silicone spatula", "kitchen utensils"],
      lowCtr: { keyword: "kitchen utensils", match: "broad" },
      autoHarvest: "silicone spatula set for cooking",
      broadHarvest: "non stick spatula set",
      asinHarvest: "b0d4t8r2kw",
      bleeder: "wooden spoon set",
      irrelevant: ["cheap spatula set", "spatula set diy", "free spatula recipe"],
      freezer: "freezer spatula",
      brandTerm: "kitchen co spatula",
      convertingElsewhere: "silicone spatula",
      compAsins: ["B0COMPB201", "B0COMPB202"],
      heads: ["spatula", "turner", "baking spatula", "fish slice", "scraper", "utensil set", "cooking spoon", "flipper"],
      modifiers: ["silicone", "heat proof", "non scratch", "large", "small", "flexible", "grey", "dishwasher safe"],
    },
  },
  {
    id: "demo-pet-us",
    name: "Pet Supply — US",
    marketplace: "US",
    currency: "USD",
    colorIndex: 2,
    breakEvenAcos: 0.35,
    targetAcos: 0.3,
    destination: () => ({ mode: "new-campaign", productLabel: "DogChew", dailyBudget: 30 }),
    idBase: 3,
    vocab: {
      product: { label: "DogChew", price: 24.99, sku: "PS-DC-01", asin: "B0PSDC0001" },
      cpc: 0.78,
      brand: ["pawprime"],
      competitor: ["kong"],
      exact: { winner: "dog chew toys", expensive: "tough dog toys", terrible: "puppy teething toys", learning: "indestructible dog chew toys" },
      broad: ["dog chew toy", "chew toys"],
      phrase: ["dog chew toys", "pet supplies"],
      lowCtr: { keyword: "pet supplies", match: "phrase" },
      autoHarvest: "dog chew toys for aggressive chewers",
      broadHarvest: "durable dog chew toy",
      asinHarvest: "b0b9h3n6zp",
      bleeder: "dog bed large",
      irrelevant: ["free dog toys", "how to make dog toys", "dog toy pdf template"],
      freezer: "freezer dog treats",
      brandTerm: "pawprime chew toy",
      convertingElsewhere: "chew toys",
      compAsins: ["B0COMPC301", "B0COMPC302"],
      heads: ["dog toy", "rope toy", "squeaky toy", "tug toy", "bone toy", "teething ring", "ball launcher", "dental chew"],
      modifiers: ["large dog", "small dog", "puppy", "rubber", "nylon", "natural", "long lasting", "interactive"],
      second: {
        product: { label: "LitterMat", price: 29.99, sku: "PS-LM-01", asin: "B0PSLM0001" },
        terms: ["cat litter mat", "litter trapping mat", "cat litter box mat", "waterproof cat mat", "litter catcher", "honeycomb litter mat", "large litter mat", "cat mat"],
      },
    },
  },
];

interface BuiltStore {
  store: Store;
  profiles: Profile[];
  bulk: BulkEntity[];
}

function buildStore(spec: StoreSpec, rng: () => number): BuiltStore {
  const v = spec.vocab;
  const P = v.product;
  const cpc = v.cpc;
  let seq = 0;
  const id = () => `${spec.idBase}${String(100000000000 + ++seq)}`; // 13-digit numeric strings
  const bulk: BulkEntity[] = [];
  const profiles: Profile[] = [];

  const addEntity = (e: Omit<BulkEntity, "key" | "storeId" | "batchId">) => {
    const full: BulkEntity = { key: "", storeId: spec.id, batchId: DEMO_BATCH_ID, ...e };
    full.key = bulkEntityKey(full);
    bulk.push(full);
    return full;
  };

  interface Camp {
    name: string;
    campaignId: string;
    adGroup: string;
    adGroupId: string;
  }
  const campaign = (name: string, adGroup: string, targetingType: "Auto" | "Manual", budget: number, defaultBid: number, product: ProductSpec): Camp => {
    const campaignId = id();
    const adGroupId = id();
    addEntity({ entity: "Campaign", campaignId, campaignName: name, state: "enabled", targetingType, dailyBudget: budget, biddingStrategy: "Dynamic bids - down only" });
    addEntity({ entity: "Ad Group", campaignId, adGroupId, campaignName: name, adGroupName: adGroup, state: "enabled", defaultBid });
    addEntity({ entity: "Product Ad", campaignId, adGroupId, adId: id(), campaignName: name, adGroupName: adGroup, state: "enabled", sku: product.sku, asin: product.asin });
    return { name, campaignId, adGroup, adGroupId };
  };
  const keyword = (c: Camp, text: string, match: "exact" | "phrase" | "broad", bid: number) =>
    addEntity({ entity: "Keyword", campaignId: c.campaignId, adGroupId: c.adGroupId, keywordId: id(), campaignName: c.name, adGroupName: c.adGroup, state: "enabled", bid, keywordText: text, matchType: match });
  const target = (c: Camp, expression: string, bid: number) =>
    addEntity({ entity: "Product Targeting", campaignId: c.campaignId, adGroupId: c.adGroupId, productTargetingId: id(), campaignName: c.name, adGroupName: c.adGroup, state: "enabled", bid, expression });

  const auto = campaign(`${P.label}_Auto_Auto`, "Auto", "Auto", 20, round(cpc * 1.0), P);
  const broad = campaign(`${P.label}_Broad_Exp`, "Broad", "Manual", 15, round(cpc * 1.05), P);
  const phrase = v.phrase ? campaign(`${P.label}_Phrase_Exp`, "Phrase", "Manual", 15, round(cpc * 1.1), P) : null;
  const exact = campaign(`${P.label}_Exact_Top5`, "Exact", "Manual", 25, round(cpc * 1.2), P);
  const prod = campaign(`${P.label}_Prod_Comp1`, "Comp1", "Manual", 10, round(cpc * 1.1), P);

  for (const t of ["close-match", "loose-match", "substitutes", "complements"]) target(auto, t, round(cpc * 1.0));
  keyword(broad, v.broad[0], "broad", round(cpc * 1.05));
  keyword(broad, v.broad[1], "broad", round(cpc * 1.0));
  if (phrase && v.phrase) {
    keyword(phrase, v.phrase[0], "phrase", round(cpc * 1.1));
    keyword(phrase, v.phrase[1], "phrase", round(cpc * 0.9));
  }
  keyword(exact, v.exact.winner, "exact", round(cpc * 0.95));
  keyword(exact, v.exact.expensive, "exact", round(cpc * 1.35));
  keyword(exact, v.exact.terrible, "exact", round(cpc * 1.5));
  keyword(exact, v.exact.learning, "exact", round(cpc * 1.0));
  for (const a of v.compAsins) target(prod, `asin="${a}"`, round(cpc * 1.1));
  addEntity({
    entity: "Campaign Negative Keyword",
    campaignId: auto.campaignId,
    keywordId: id(),
    campaignName: auto.name,
    state: "enabled",
    keywordText: "replacement parts",
    matchType: "negativePhrase",
  });

  const lowCtrCamp = v.lowCtr.match === "phrase" && phrase ? phrase : broad;
  const add = (c: Camp, targeting: string, matchType: MatchType, term: string, p: Partial<Profile> & { clicksPerDay: number; cvr: number }) =>
    profiles.push({
      campaign: c.name,
      adGroup: c.adGroup,
      targeting,
      matchType,
      term,
      ctr: 0.006,
      cpc,
      price: P.price,
      ...p,
    });

  // --- Scenario rows -------------------------------------------------------
  // Exact keywords (search term = keyword): raise / cut / pause / learning.
  add(exact, v.exact.winner, "exact", v.exact.winner, { clicksPerDay: 3.2, cvr: 0.2, cpc: cpc * 0.85, ctr: 0.012 });
  add(exact, v.exact.expensive, "exact", v.exact.expensive, { clicksPerDay: 4, cvr: 0.08, cpc: spec.targetAcos * 1.6 * 0.08 * P.price, ctr: 0.007 });
  add(exact, v.exact.terrible, "exact", v.exact.terrible, { clicksPerDay: 1.4, cvr: 0.02, cpc: cpc * 1.3, ctr: 0.005 });
  add(exact, v.exact.learning, "exact", v.exact.learning, { clicksPerDay: 3, cvr: 0.2, cpc: cpc * 0.8, ctr: 0.01, start: DEMO_DAYS - 12 });
  // Low-CTR, high-impression target (relevance) with zero-click impression days.
  add(lowCtrCamp, v.lowCtr.keyword, v.lowCtr.match, v.lowCtr.keyword, { clicksPerDay: 0.3, cvr: 0.03, ctr: 0.0012, zeroClickRows: true });
  // Harvest winners.
  add(auto, "close-match", "auto", v.autoHarvest, { clicksPerDay: 2.6, cvr: 0.18, cpc: cpc * 0.8 });
  add(broad, v.broad[0], "broad", v.broadHarvest, { clicksPerDay: 2.2, cvr: 0.17, cpc: cpc * 0.85 });
  add(auto, "substitutes", "auto", v.asinHarvest, { clicksPerDay: 2, cvr: 0.16, cpc: cpc * 0.85 });
  // Already targeted: converts in auto but is already an exact keyword.
  add(auto, "close-match", "auto", v.exact.winner, { clicksPerDay: 1.2, cvr: 0.16, cpc: cpc * 0.8 });
  // 0-order bleeder.
  add(auto, "loose-match", "auto", v.bleeder, { clicksPerDay: 0.95, cvr: 0 });
  // Irrelevant-word terms (0 orders, a few clicks each) and the "freezer" trap.
  v.irrelevant.forEach((t, i) => add(i % 2 ? broad : auto, i % 2 ? v.broad[0] : "loose-match", i % 2 ? "broad" : "auto", t, { clicksPerDay: 0.35, cvr: 0 }));
  add(auto, "complements", "auto", v.freezer, { clicksPerDay: 0.2, cvr: 0 });
  // Brand term bleeding (never negated).
  add(broad, v.broad[0], "broad", v.brandTerm, { clicksPerDay: 0.8, cvr: 0 });
  // Converting elsewhere: 0 orders in auto, converting in broad.
  add(auto, "loose-match", "auto", v.convertingElsewhere, { clicksPerDay: 0.75, cvr: 0 });
  add(broad, v.broad[1], "broad", v.convertingElsewhere, { clicksPerDay: 1.5, cvr: 0.14, cpc: cpc * 0.9 });
  // Product targets (term = the targeted ASIN).
  add(prod, `asin="${v.compAsins[0]}"`, "product", v.compAsins[0].toLowerCase(), { clicksPerDay: 1.8, cvr: 0.13, cpc: cpc * 0.9, ctr: 0.004 });
  add(prod, `asin="${v.compAsins[1]}"`, "product", v.compAsins[1].toLowerCase(), { clicksPerDay: 1.1, cvr: 0.04, cpc: cpc * 1.1, ctr: 0.003 });

  // --- Long tail -------------------------------------------------------------
  const tailTerms = new Set<string>();
  const reserved = new Set(profiles.map((p) => p.term));
  let guard = 0;
  while (tailTerms.size < 34 && guard++ < 1000) {
    const t = `${v.modifiers[Math.floor(rng() * v.modifiers.length)]} ${v.heads[Math.floor(rng() * v.heads.length)]}`;
    if (!reserved.has(t)) tailTerms.add(t);
  }
  const tailCamps: { c: Camp; targeting: string; mt: MatchType }[] = [
    { c: auto, targeting: "close-match", mt: "auto" },
    { c: auto, targeting: "loose-match", mt: "auto" },
    { c: broad, targeting: v.broad[0], mt: "broad" },
    { c: broad, targeting: v.broad[1], mt: "broad" },
  ];
  if (phrase && v.phrase) tailCamps.push({ c: phrase, targeting: v.phrase[0], mt: "phrase" });
  for (const t of tailTerms) {
    const tc = tailCamps[Math.floor(rng() * tailCamps.length)];
    add(tc.c, tc.targeting, tc.mt, t, {
      clicksPerDay: 0.08 + rng() * 0.27,
      cvr: 0.03 + rng() * 0.1,
      cpc: cpc * (0.8 + rng() * 0.5),
      ctr: 0.003 + rng() * 0.009,
    });
  }

  // --- Second product (auto only) ---------------------------------------------
  if (v.second) {
    const S = v.second.product;
    const auto2 = campaign(`${S.label}_Auto_Auto`, "Auto", "Auto", 12, round(cpc * 0.9), S);
    for (const t of ["close-match", "loose-match"]) target(auto2, t, round(cpc * 0.9));
    v.second.terms.forEach((term, i) =>
      profiles.push({
        campaign: auto2.name,
        adGroup: auto2.adGroup,
        targeting: i % 2 ? "loose-match" : "close-match",
        matchType: "auto",
        term,
        clicksPerDay: 0.15 + rng() * 0.6,
        ctr: 0.004 + rng() * 0.006,
        cvr: 0.05 + rng() * 0.12,
        cpc: cpc * (0.7 + rng() * 0.4),
        price: S.price,
      }),
    );
  }

  const store = createStore({
    id: spec.id,
    name: spec.name,
    marketplace: spec.marketplace,
    currency: spec.currency,
    colorIndex: spec.colorIndex,
    createdAt: `${DEMO_END_DATE}T00:00:00.000Z`,
    demo: true,
    brandTerms: v.brand,
    competitorTerms: v.competitor,
    harvestDestination: spec.destination({ exactCampaignId: exact.campaignId, exactAdGroupId: exact.adGroupId, exactCampaignName: exact.name }),
    economics: { breakEvenAcos: spec.breakEvenAcos, targetAcos: spec.targetAcos, goal: "profit", price: P.price },
  });
  return { store, profiles, bulk };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * Build the demo dataset. The same seed always yields identical stores, rows and
 * bulk entities (row keys, counters and IDs).
 */
export function makeDemoData(seed = 20260928): { stores: Store[]; rows: SearchTermRow[]; bulk: BulkEntity[] } {
  const stores: Store[] = [];
  const rows: SearchTermRow[] = [];
  const bulk: BulkEntity[] = [];
  const start = addDays(DEMO_END_DATE, -(DEMO_DAYS - 1));

  STORES.forEach((spec, si) => {
    const rng = makeRng((seed ^ Math.imul(si + 1, 0x9e3779b1)) >>> 0);
    const built = buildStore(spec, rng);
    stores.push(built.store);
    bulk.push(...built.bulk);
    for (const p of built.profiles) {
      for (let d = p.start ?? 0; d < DEMO_DAYS; d++) {
        const date = addDays(start, d);
        // Mild weekly seasonality: weekends +15%.
        const dow = new Date(`${date}T00:00:00Z`).getUTCDay();
        const season = dow === 0 || dow === 6 ? 1.15 : 0.95;
        const expectedClicks = p.clicksPerDay * season;
        const impressions = poisson(rng, expectedClicks / p.ctr);
        const clicks = Math.min(impressions, poisson(rng, impressions * p.ctr));
        if (clicks === 0 && !(p.zeroClickRows && impressions > 0)) continue;
        const orders = binomial(rng, clicks, p.cvr);
        let spend = 0;
        for (let k = 0; k < clicks; k++) spend += round(p.cpc * (0.85 + rng() * 0.3));
        const row: SearchTermRow = {
          key: "",
          storeId: spec.id,
          batchId: DEMO_BATCH_ID,
          date,
          campaign: p.campaign,
          adGroup: p.adGroup,
          targeting: p.targeting,
          matchType: p.matchType,
          searchTerm: p.term,
          currency: spec.currency,
          impressions,
          clicks,
          spend: round(spend),
          sales: round(orders * p.price),
          orders,
          units: orders,
        };
        row.key = searchTermKey(row);
        rows.push(row);
      }
    }
  });
  return { stores, rows, bulk };
}
