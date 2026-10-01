/**
 * Self-test: regressions for verified engine defects (parsing, rules, export).
 * One test per defect; each builds the failing input from the report.
 */

import assert from "node:assert/strict";

import { applyGuardrails, harvestBid, ladderChange } from "../src/lib/ppc/bidding";
import { cleanId, detectReport, isDetectionError, isLossyId, normalizeHeader, parseFile, suggestStore, toBulkEntities, toSearchTermRows, type Detection } from "../src/lib/ppc/detect";
import { buildBulkSheet, BULK_HEADERS } from "../src/lib/ppc/export";
import { bulkEntityKey, searchTermKey } from "../src/lib/ppc/keys";
import { countryCode, detectDateOrder, normalizeMatchType } from "../src/lib/ppc/parse";
import { DEFAULT_LADDER, containsPhrase, createStore, keywordLengthProblem, protectedMatch, recommend, resolveConflicts, tokenize } from "../src/lib/ppc/rules";
import type { BulkEntity, Decision, MatchType, Recommendation, SearchTermRow, Store } from "../src/lib/ppc/types";
import { parseWorksheet, parseWorksheetChunks } from "../src/lib/ppc/xlsx";
import { buildOverviewIndex, computePeriod } from "../src/components/ppc/overview/compute";
import { adGroupOptions, landsInSource, newCampaignName, routedDestination } from "../src/components/ppc/work/destinations";
import { buildTargetRows } from "../src/components/ppc/work/targets";
import { MINI_BULK, MINI_ROWS, MINI_STORE } from "./ppc-test-rules";
import { group, test } from "./ppc-test-harness";

const ctx = { storeId: "s1", batchId: "b1" };
const enc = new TextEncoder();

function det(rows: string[][]): Detection {
  const d = detectReport(rows);
  if (isDetectionError(d)) throw new Error(d.error);
  return d;
}

/** ASCII / UTF-8 strings and raw byte arrays, concatenated. */
function bytesOf(...parts: (string | number[])[]): Uint8Array {
  const chunks = parts.map((p) => (typeof p === "string" ? enc.encode(p) : Uint8Array.from(p)));
  const out = new Uint8Array(chunks.reduce((n, c) => n + c.length, 0));
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

function row(
  storeId: string,
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
  const r: SearchTermRow = { key: "", storeId, batchId: "b", date, campaign, adGroup, targeting, matchType, searchTerm: term, impressions, clicks, spend, sales, orders, units: orders };
  r.key = searchTermKey(r);
  return r;
}

function ent(storeId: string, e: Omit<BulkEntity, "key" | "storeId" | "batchId">): BulkEntity {
  const full: BulkEntity = { key: "", storeId, batchId: "bulk", ...e };
  full.key = bulkEntityKey(full);
  return full;
}

/** Consecutive ISO days from `from`, `n` of them. */
function days(from: string, n: number): string[] {
  const out: string[] = [];
  const t = Date.UTC(+from.slice(0, 4), +from.slice(5, 7) - 1, +from.slice(8, 10));
  for (let i = 0; i < n; i++) out.push(new Date(t + i * 86_400_000).toISOString().slice(0, 10));
  return out;
}

/* ================================================================ parsing */

group("regress");

const ST_HEADER = "Date,Currency,Country,Campaign Name,Ad Group Name,Targeting,Match Type,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)";

test("date order: Country 'United States' + USD with days ≤ 12 reads month-first; MX is day-first", () => {
  const lines = [ST_HEADER];
  for (let d = 1; d <= 7; d++) lines.push(`09/0${d}/2026,USD,United States,C,G,close-match,-,term ${d},100,5,2.50,0,0`);
  const table = lines.map((l) => l.split(","));
  const d = det(table);
  assert.equal(d.dateOrder, "MDY");
  const { rows, errors } = toSearchTermRows(table, d, ctx);
  assert.equal(errors.length, 0);
  assert.deepEqual(rows.map((r) => r.date).sort(), days("2026-09-01", 7));
  // The hint maps names, codes and domains; unknown countries fall back to the currency.
  assert.equal(countryCode("United States"), "US");
  assert.equal(countryCode("GB"), "UK");
  assert.equal(countryCode("Deutschland"), "DE");
  assert.equal(countryCode("amazon.co.jp"), "JP");
  assert.equal(countryCode("Narnia"), undefined);
  assert.equal(detectDateOrder(["01/09/2026"], { currency: "MXN", country: "MX" }), "DMY");
  assert.equal(detectDateOrder(["01/09/2026"], { currency: "MXN" }), "DMY");
  assert.equal(detectDateOrder(["01/09/2026"], { currency: "EUR", country: "France" }), "DMY");
  assert.equal(detectDateOrder(["01/09/2026"], { currency: "USD", country: "Narnia" }), "MDY");
  assert.equal(detectDateOrder(["01/09/2026"], { currency: "CAD", country: "Canada" }), "MDY");
  // suggestStore returns marketplace codes, not raw names.
  assert.deepEqual(suggestStore({ table, detection: d }), { currency: "USD", country: "US" });
  const fr = [ST_HEADER, "2026-09-01,EUR,France,C,G,close-match,-,t,1,1,1,0,0"].map((l) => l.split(","));
  assert.deepEqual(suggestStore({ table: fr, detection: det(fr) }), { currency: "EUR", country: "FR" });
  const odd = [ST_HEADER, "2026-09-01,GBP,Atlantis,C,G,close-match,-,t,1,1,1,0,0"].map((l) => l.split(","));
  assert.deepEqual(suggestStore({ table: odd, detection: det(odd) }), { currency: "GBP", country: "UK", countryInferred: true });
});

test("xlsx: a worksheet parsed from tiny chunks equals the whole-string parse (no single huge string)", async () => {
  const shared = ["Campaign Name", "Customer Search Term", "ニンニク絞り", "café"];
  const rowsXml: string[] = [];
  for (let i = 1; i <= 60; i++) {
    rowsXml.push(
      `<row r="${i}"><c r="A${i}" t="s"><v>${i === 1 ? 0 : 2}</v></c><c r="B${i}" t="s"><v>${i === 1 ? 1 : 3}</v></c>` +
        `<c r="D${i}"><v>${i * 1.5}</v></c><c r="E${i}" t="inlineStr"><is><t>été ${i} &amp; ü</t></is></c></row>`,
    );
  }
  for (const prefix of ["", "x:"]) {
    const xml =
      `<?xml version="1.0" encoding="UTF-8"?><${prefix}worksheet xmlns${prefix ? ":x" : ""}="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
      `<${prefix}sheetData>${rowsXml.join("").replace(/<(\/?)(row|c|v|is|t)\b/g, `<$1${prefix}$2`)}</${prefix}sheetData><${prefix}pageMargins left="0.7"/></${prefix}worksheet>`;
    const whole = parseWorksheet(xml, shared);
    assert.equal(whole.length, 60);
    const bytes = enc.encode(xml);
    for (const size of [1, 7, 64, 1000]) {
      const chunks: Uint8Array[] = [];
      for (let i = 0; i < bytes.length; i += size) chunks.push(bytes.subarray(i, i + size)); // splits multi-byte UTF-8 too
      assert.deepEqual(await parseWorksheetChunks(chunks, shared), whole, `prefix "${prefix}", chunk ${size}`);
    }
  }
  assert.deepEqual(await parseWorksheetChunks([enc.encode("<worksheet><sheetData/></worksheet>")], []), []);
});

test("text decoding: Shift_JIS (JP Excel CSV) decodes to Japanese; Latin-1 EU files stay Windows-1252", async () => {
  const NINNIKU = [0x83, 0x6a, 0x83, 0x93, 0x83, 0x6a, 0x83, 0x4e]; // ニンニク
  const DAIKON = [0x91, 0xe5, 0x8d, 0xaa]; // 大根 (kanji only — no kana to recognise)
  const head = "Date,Currency,Campaign Name,Ad Group Name,Targeting,Match Type,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)\r\n";
  const kana = await parseFile("jp.csv", bytesOf(head, "2026-09-01,JPY,SP ", NINNIKU, ",AG,close-match,-,", NINNIKU, ",100,10,500,0,0\r\n"));
  const t1 = kana.tables[0];
  const d1 = t1.detection as Detection;
  const r1 = toSearchTermRows(t1.rows, d1, ctx).rows[0];
  assert.equal(r1.campaign, "SP ニンニク");
  assert.equal(r1.searchTerm, "ニンニク");
  const kanji = await parseFile("jp2.csv", bytesOf(head, "2026-09-01,JPY,SP ", DAIKON, ",AG,close-match,-,", DAIKON, ",100,10,500,0,0\r\n"));
  const r2 = toSearchTermRows(kanji.tables[0].rows, kanji.tables[0].detection as Detection, ctx).rows[0];
  assert.equal(r2.searchTerm, "大根");
  // é (0xE9) / è (0xE8): Windows-1252, not misread as Shift_JIS.
  const eu = await parseFile("fr.csv", bytesOf(head, "2026-09-01,EUR,SP caf", [0xe9], ",AG,close-match,-,cr", [0xe8], "me br", [0xfb], "l", [0xe9], "e,100,10,5,0,0\r\n"));
  const r3 = toSearchTermRows(eu.tables[0].rows, eu.tables[0].detection as Detection, ctx).rows[0];
  assert.equal(r3.campaign, "SP café");
  assert.equal(r3.searchTerm, "crème brûlée");
});

test("localised console headers (DE / JP) are detected; normalizeHeader keeps accents' letters and CJK", () => {
  assert.equal(normalizeHeader("Währung"), "wahrung");
  assert.equal(normalizeHeader(" 7 Day Total Sales "), "7daytotalsales");
  assert.notEqual(normalizeHeader("カスタマーの検索キーワード"), "");
  const de = [
    "Datum;Portfolioname;Währung;Kampagnenname;Anzeigengruppenname;Ausrichtung;Übereinstimmungstyp;Suchbegriff des Kunden;Impressionen;Klicks;Klickrate (CTR);Kosten pro Klick (CPC);Ausgaben;Gesamtumsatz in 7 Tagen;Zugeordnete Umsatzkosten (ACOS) gesamt;Gesamtzahl der Bestellungen in 7 Tagen (#);Gesamtzahl der Einheiten in 7 Tagen (#)",
    "01.09.2026;-;EUR;SP Knoblauch;AG1;knoblauchpresse;Exakt;knoblauchpresse edelstahl;1.234;12;0,97%;0,50;6,00;59,90;10,02%;2;3",
  ].map((l) => l.split(";"));
  const d = det(de);
  assert.equal(d.kind, "search-term");
  assert.deepEqual(d.missing, []);
  assert.equal(d.columns.spend, 12); // Ausgaben, not "Kosten pro Klick"
  assert.equal(d.columns.sales, 13);
  assert.equal(d.columns.orders, 15);
  assert.equal(d.columns.units, 16);
  assert.equal(d.attributionDays, 7);
  const r = toSearchTermRows(de, d, ctx).rows[0];
  assert.deepEqual(
    [r.date, r.campaign, r.searchTerm, r.matchType, r.impressions, r.clicks, r.spend, r.sales, r.orders, r.units, r.currency],
    ["2026-09-01", "SP Knoblauch", "knoblauchpresse edelstahl", "exact", 1234, 12, 6, 59.9, 2, 3, "EUR"],
  );
  const jp = [
    "日付,通貨,キャンペーン名,広告グループ名,ターゲティング,マッチタイプ,カスタマーの検索キーワード,インプレッション,クリック,広告費,7日間の総売上高,7日間の総注文数,7日間の総販売数",
    "2026/09/01,JPY,SP にんにく,AG,にんにく絞り,完全一致,にんにく 絞り器,1000,10,400,3000,2,2",
  ].map((l) => l.split(","));
  const dj = det(jp);
  assert.deepEqual(dj.missing, []);
  const rj = toSearchTermRows(jp, dj, ctx).rows[0];
  assert.deepEqual([rj.searchTerm, rj.matchType, rj.spend, rj.sales, rj.orders], ["にんにく 絞り器", "exact", 400, 3000, 2]);
  assert.equal(normalizeMatchType("Weitgehend"), "broad");
  assert.equal(normalizeMatchType("フレーズ一致"), "phrase");
  assert.equal(normalizeMatchType("Requête large"), "broad");
});

test("bulk IDs: Excel-truncated scientific IDs are rejected with an import error, full-precision ones restored", () => {
  assert.equal(isLossyId("1.44383E+14"), true);
  assert.equal(isLossyId("1.44382946392851E+14"), false);
  assert.equal(isLossyId("1.4438294639285E+14"), false); // xlsx drops a trailing zero; 14 digits written = full precision
  assert.equal(cleanId("1.44382946392851E+14"), "144382946392851");
  assert.equal(cleanId("1.44383E+14"), "1.44383E+14"); // never expanded to a made-up 144383000000000
  const table = [
    ["Product", "Entity", "Operation", "Campaign ID", "Ad Group ID", "Keyword ID", "Campaign Name (Informational only)", "State", "Keyword Text", "Match Type", "Bid"],
    ["Sponsored Products", "Campaign", "", "1.44383E+14", "", "", "Widget_Exact", "enabled", "", "", ""],
    ["Sponsored Products", "Keyword", "", "1.44382946392851E+14", "2.71828E+14", "3.14159E+14", "Widget_Exact", "enabled", "widget", "exact", "1"],
  ];
  const { entities, errors } = toBulkEntities(table, det(table), ctx);
  assert.equal(entities.length, 1);
  assert.equal(entities[0].campaignId, "144382946392851");
  assert.equal(entities[0].adGroupId, undefined);
  assert.equal(entities[0].keywordId, undefined);
  assert.ok(errors.some((e) => e.row === 1 && /Campaign ID “1\.44383E\+14” lost digits/.test(e.message)));
  assert.ok(errors.some((e) => e.row === 2 && /Keyword ID/.test(e.message)));
});

/* ================================================================== rules */

test("conflicts: same keyword text in exact and phrase is two targets, not one conflict", () => {
  const S = "mt";
  const store = createStore({ id: S, name: "MT", marketplace: "US", currency: "USD" });
  const rows = [
    row(S, "2026-08-01", "C", "G", "garlic press", "exact", "garlic press", 10, 1, 0, 1, 0),
    row(S, "2026-08-01", "C", "G", "garlic press", "phrase", "best garlic press", 10, 1, 0, 1, 0),
    row(S, "2026-09-01", "C", "G", "garlic press", "exact", "garlic press", 4000, 40, 0, 30, 0),
    row(S, "2026-09-01", "C", "G", "garlic press", "phrase", "best garlic press", 10000, 100, 20, 60, 666.67),
    row(S, "2026-09-12", "C", "G", "garlic press", "exact", "garlic press", 1, 0, 0, 0, 0),
  ];
  const bulk = [
    ent(S, { entity: "Campaign", campaignId: "C1", campaignName: "C", state: "enabled", targetingType: "Manual", dailyBudget: 10 }),
    ent(S, { entity: "Ad Group", campaignId: "C1", adGroupId: "G1", campaignName: "C", adGroupName: "G", state: "enabled", defaultBid: 0.75 }),
    ent(S, { entity: "Keyword", campaignId: "C1", adGroupId: "G1", keywordId: "KE", campaignName: "C", adGroupName: "G", state: "enabled", bid: 1, keywordText: "garlic press", matchType: "exact" }),
    ent(S, { entity: "Keyword", campaignId: "C1", adGroupId: "G1", keywordId: "KP", campaignName: "C", adGroupName: "G", state: "enabled", bid: 0.6, keywordText: "garlic press", matchType: "phrase" }),
  ];
  const { recommendations } = recommend({ store, rows, bulk });
  const pause = recommendations.find((r) => r.action === "pause" && r.subject === "garlic press")!;
  const up = recommendations.find((r) => r.action === "bid-up" && r.subject === "garlic press")!;
  assert.equal(pause.ids.keywordId, "KE");
  assert.equal(up.ids.keywordId, "KP");
  assert.deepEqual([up.matchType, up.currentBid, up.suggestedBid], ["phrase", 0.6, 0.69]);
  assert.ok(!pause.evidence.some((e) => e.startsWith("folded bid-up")));
  // Direct: target recs fold only within one match type.
  const base = (id: string, action: Recommendation["action"], matchType: MatchType): Recommendation => ({
    id, storeId: S, action, priority: "medium", subject: "kw", campaign: "C", adGroup: "G", matchType,
    counters: { impressions: 0, clicks: 0, spend: 0, sales: 0, orders: 0, units: 0 }, reason: action, evidence: [], ids: {}, level: "target",
  });
  assert.deepEqual(resolveConflicts([base("a", "relevance", "exact"), base("b", "bid-up", "phrase"), base("c", "pause", "exact")]).map((r) => r.id), ["b", "c"]);
});

test("negate-phrase: never blocks a converting term in the ad group, whichever word that term counted under", () => {
  const S = "np";
  const store = createStore({ id: S, name: "NP", marketplace: "US", currency: "USD" }); // default words include "free" and "recipe"
  const rows = [
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "free garlic press recipe", 2000, 20, 8, 16, 160),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "garlic press recipe", 600, 6, 0, 4.8, 0),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "cheap bpa free water bottle", 2000, 20, 8, 64, 160),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "cheap water bottle", 600, 6, 0, 4.8, 0),
    row(S, "2026-09-12", "C", "G", "close-match", "auto", "filler", 1, 0, 0, 0, 0),
  ];
  const res = recommend({ store, rows, bulk: [] });
  const phrases = res.recommendations.filter((r) => r.action === "negate-phrase").map((r) => r.subject);
  assert.deepEqual(phrases, []);
  const why = (w: string) => res.skipped.find((s) => s.action === "negate-phrase" && s.subject === w)?.reason ?? "";
  assert.match(why("recipe"), /converting term \(“free garlic press recipe” has 8 orders\)/);
  assert.match(why("cheap"), /converting term \(“cheap bpa free water bottle” has 8 orders\)/);
});

test("non-Latin text: tokenize keeps Japanese / Arabic; brand protection and irrelevant words work in JP stores", () => {
  assert.deepEqual(tokenize("キッチンコ にんにく絞り"), ["キッチンコ", "にんにく絞り"]);
  assert.deepEqual(tokenize("مطبخ كو مكبس"), ["مطبخ", "كو", "مكبس"]);
  assert.equal(protectedMatch("キッチンコ にんにく絞り", { brandTerms: ["キッチンコ"], competitorTerms: [] })?.kind, "brand");
  assert.equal(protectedMatch("象印炊飯器", { brandTerms: ["象印"], competitorTerms: [] })?.kind, "brand"); // 2 chars, no spaces
  assert.equal(protectedMatch("مكبس مطبخ كو", { brandTerms: ["مطبخ كو"], competitorTerms: [] })?.kind, "brand");
  assert.equal(protectedMatch("toxoplasma", { brandTerms: [], competitorTerms: ["oxo"] }), null);
  assert.equal(containsPhrase(tokenize("無料にんにく絞り"), tokenize("無料")), true);
  assert.equal(containsPhrase(tokenize("garlic freezer"), tokenize("free")), false);
  const S = "jp";
  const store = createStore({ id: S, name: "JP", marketplace: "JP", currency: "JPY", brandTerms: ["キッチンコ"], irrelevantWords: ["無料"] });
  const rows = [
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "キッチンコ にんにく絞り", 2000, 20, 0, 800, 0),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "無料にんにく絞り", 500, 5, 0, 200, 0),
    row(S, "2026-09-12", "C", "G", "close-match", "auto", "filler", 1, 0, 0, 0, 0),
  ];
  const res = recommend({ store, rows, bulk: [] });
  assert.ok(!res.recommendations.some((r) => r.action === "negate-exact" && r.subject === "キッチンコ にんにく絞り"));
  assert.match(res.skipped.find((s) => s.subject === "キッチンコ にんにく絞り")?.reason ?? "", /brand term/);
  assert.ok(res.recommendations.some((r) => r.action === "negate-phrase" && r.subject === "無料"));
});

test("bid floor / ceiling are scaled to the store currency; JPY bids are whole yen", () => {
  assert.deepEqual(pick(createStore({ id: "u", name: "U", marketplace: "US", currency: "USD" })), [0.3, 5]);
  assert.deepEqual(pick(createStore({ id: "j", name: "J", marketplace: "JP", currency: "JPY" })), [10, 750]);
  assert.deepEqual(pick(createStore({ id: "i", name: "I", marketplace: "IN", currency: "INR" })), [1, 300]);
  assert.deepEqual(pick(createStore({ id: "m", name: "M", marketplace: "MX", currency: "MXN" })), [1, 100]);
  assert.deepEqual(pick(createStore({ id: "x", name: "X", marketplace: "JP", currency: "JPY", rules: { bidFloor: 5 } })), [5, 750]);
  const S = "jpy";
  const store = createStore({ id: S, name: "JPY", marketplace: "JP", currency: "JPY" });
  const rows = [
    row(S, "2026-08-01", "C", "G", "garlic press", "exact", "garlic press", 10, 1, 0, 40, 0),
    row(S, "2026-09-01", "C", "G", "garlic press", "exact", "garlic press", 5000, 50, 5, 2000, 5000), // ACoS 40% → 1.33× → −12%
    // A high-CVR sibling lifts the ad-group CVR prior so max CPC (¥43.8) does not bind the cut.
    row(S, "2026-08-01", "C", "G", "garlic tool", "exact", "garlic tool", 10, 1, 0, 40, 0),
    row(S, "2026-09-01", "C", "G", "garlic tool", "exact", "garlic tool", 5000, 50, 25, 500, 25000),
    row(S, "2026-09-01", "Auto", "A", "close-match", "auto", "garlic crusher", 3000, 30, 4, 600, 6000),
    row(S, "2026-09-12", "C", "G", "garlic press", "exact", "garlic press", 1, 0, 0, 0, 0),
  ];
  const bulk = [
    ent(S, { entity: "Campaign", campaignId: "C1", campaignName: "C", state: "enabled", targetingType: "Manual", dailyBudget: 2000 }),
    ent(S, { entity: "Ad Group", campaignId: "C1", adGroupId: "G1", campaignName: "C", adGroupName: "G", state: "enabled", defaultBid: 40 }),
    ent(S, { entity: "Keyword", campaignId: "C1", adGroupId: "G1", keywordId: "K1", campaignName: "C", adGroupName: "G", state: "enabled", bid: 40, keywordText: "garlic press", matchType: "exact" }),
  ];
  const recs = recommend({ store, rows, bulk }).recommendations;
  const down = recs.find((r) => r.action === "bid-down" && r.subject === "garlic press")!;
  assert.deepEqual([down.currentBid, down.suggestedBid], [40, 35]); // 40 × 0.88 = 35.2 → ¥35, not ¥5
  const h = recs.find((r) => r.action === "harvest-exact" && r.subject === "garlic crusher")!;
  assert.ok(h.suggestedBid! > 10 && Number.isInteger(h.suggestedBid), `whole-yen harvest bid, got ${h.suggestedBid}`);
  assert.equal(harvestBid({ targetAcos: 0.3, aov: 1500, cvr: 0.1, harvestBidFactor: 0.8, matchMultiplier: 1, floor: 10, ceiling: 750, decimals: 0 }), 36);
});

function pick(s: Store): [number, number] {
  return [s.rules.bidFloor, s.rules.bidCeiling];
}

test("negate-phrase wins over a negate-exact on the same word; the phrase covers the longer terms", () => {
  const S = "pe";
  const store = createStore({ id: S, name: "PE", marketplace: "US", currency: "USD", irrelevantWords: ["garlic crusher"] });
  const rows = [
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "garlic crusher", 2000, 20, 0, 15, 0),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "garlic crusher steel", 900, 9, 0, 7, 0),
    row(S, "2026-09-01", "C", "G", "close-match", "auto", "best garlic crusher", 800, 8, 0, 6, 0),
    row(S, "2026-09-12", "C", "G", "close-match", "auto", "filler", 1, 0, 0, 0, 0),
  ];
  const recs = recommend({ store, rows, bulk: [] }).recommendations;
  const phrase = recs.find((r) => r.action === "negate-phrase" && r.subject === "garlic crusher")!;
  assert.ok(phrase, "negate-phrase kept");
  assert.ok(!recs.some((r) => r.action === "negate-exact" && r.subject === "garlic crusher"));
  assert.ok(phrase.evidence.some((e) => e.startsWith("folded negate-exact")));
  assert.equal(phrase.counters.clicks, 37);
});

test("guardrails: floor / ceiling never break the ±max move, max CPC or the direction", () => {
  const o = { maxMove: 0.2, floor: 0.3, ceiling: 5 };
  const up = applyGuardrails(0.2, 0.216, { ...o, maxCpc: 0.25 });
  assert.equal(up.bid, 0.24); // toward the floor, one step max — never 0.30 (+50%)
  assert.ok(up.capped.includes("floor"));
  assert.equal(applyGuardrails(0.2, 0.216, { ...o, maxCpc: 0.12 }).hold, true); // never above max CPC
  assert.equal(applyGuardrails(0.1, 0.115, o).bid, 0.12);
  assert.equal(applyGuardrails(0.25, 0.22, o).hold, true); // a cut below the floor never becomes a raise
  assert.equal(applyGuardrails(7, 6.16, o).bid, 5.6); // ceiling cut limited to one step
  assert.equal(applyGuardrails(7, 8, o).hold, true); // a raise above the ceiling never becomes a cut
  assert.equal(applyGuardrails(0.32, 0.25, o).bid, 0.3); // ordinary floor clamp still works
  assert.equal(applyGuardrails(40, 35.2, { maxMove: 0.2, floor: 10, ceiling: 750, decimals: 0 }).bid, 35);
});

test("ladder: exact bounds land on their own rung (float-safe); below half target is strict", () => {
  assert.equal(ladderChange(0.525, 0.35, DEFAULT_LADDER)!.change, -0.12); // 1.5000000000000002 → still ≤ 1.5
  assert.equal(ladderChange(0.28, 0.35, DEFAULT_LADDER)!.change, 0.08); // 0.8000000000000002 → still ≤ 0.8
  assert.equal(ladderChange(0.15, 0.3, DEFAULT_LADDER)!.change, 0.08); // exactly 0.5 → not "< 0.5"
  assert.equal(ladderChange(0.6, 0.3, DEFAULT_LADDER)!.change, -0.2); // exactly 2 → ≤ 2
  assert.equal(ladderChange(0.6, 0.3, DEFAULT_LADDER)!.flagPause, false);
  // Through recommend(): 157.50 / 300 at a 35% target is exactly 1.5× → −12%, not −20%.
  const store = createStore({ ...MINI_STORE, economics: { ...MINI_STORE.economics, breakEvenAcos: 0.4, targetAcos: 0.35 } });
  const rows = MINI_ROWS.map((r) => (r.campaign === "W_Exact" && r.searchTerm === "red widget" && r.date === "2026-09-01" ? { ...r, spend: 157.5, sales: 300 } : r));
  const red = recommend({ store, rows, bulk: MINI_BULK }).recommendations.find((r) => r.action === "bid-down" && r.subject === "red widget")!;
  assert.equal(red.suggestedBid, 0.88);
  assert.match(red.reason, /1\.50× target .*−12%/);
});

test("learning hold counts days of data inclusively (14 daily rows = 14 days)", () => {
  const S = "lh";
  const store = createStore({ id: S, name: "LH", marketplace: "US", currency: "USD" });
  const bulk = [
    ent(S, { entity: "Campaign", campaignId: "C1", campaignName: "C", state: "enabled", targetingType: "Manual" }),
    ent(S, { entity: "Ad Group", campaignId: "C1", adGroupId: "G1", campaignName: "C", adGroupName: "G", state: "enabled", defaultBid: 1 }),
    ent(S, { entity: "Keyword", campaignId: "C1", adGroupId: "G1", keywordId: "K1", campaignName: "C", adGroupName: "G", state: "enabled", bid: 1, keywordText: "blue widget", matchType: "exact" }),
  ];
  const make = (n: number) => days(addDaysIso("2026-09-28", -(n - 1)), n).map((d) => row(S, d, "C", "G", "blue widget", "exact", "blue widget", 100, 5, 1, 1, 30));
  const asOf = "2026-09-30"; // window ends 09-28
  const r14 = recommend({ store, rows: make(14), bulk, asOf });
  assert.ok(r14.recommendations.some((r) => r.action === "bid-up" && r.subject === "blue widget"), "14 days of data → not learning");
  const r13 = recommend({ store, rows: make(13), bulk, asOf });
  assert.match(r13.skipped.find((s) => s.subject === "blue widget")?.reason ?? "", /learning: 13 days of history \(needs 14\)/);
  const t = buildTargetRows({ store, rows: make(14), bulk, window: r14.window, recs: r14.recommendations }).find((x) => x.targeting === "blue widget")!;
  assert.deepEqual([t.historyDays, t.learning], [14, false]);
  const one = recommend({ store, rows: [row(S, "2026-09-28", "C", "G", "tiny", "exact", "tiny", 100, 20, 0, 9, 0)], bulk, asOf });
  assert.match(one.skipped.find((s) => s.subject === "tiny")?.reason ?? "", /learning: 1 days/);
});

function addDaysIso(iso: string, n: number): string {
  return new Date(Date.parse(`${iso}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

test("an archived exact keyword in report history no longer blocks a harvest", () => {
  const S = "ar";
  const store = createStore({ id: S, name: "AR", marketplace: "US", currency: "USD" });
  const archived = (state: string) => [
    ent(S, { entity: "Campaign", campaignId: "OC", campaignName: "Old", state, targetingType: "Manual" }),
    ent(S, { entity: "Ad Group", campaignId: "OC", adGroupId: "OG", campaignName: "Old", adGroupName: "OldG", state }),
    ent(S, { entity: "Keyword", campaignId: "OC", adGroupId: "OG", keywordId: "OK", campaignName: "Old", adGroupName: "OldG", state, keywordText: "garlic rocker", matchType: "exact", bid: 1 }),
    ent(S, { entity: "Product Targeting", campaignId: "OC", adGroupId: "OG", productTargetingId: "OT", campaignName: "Old", adGroupName: "OldG", state, expression: 'asin="B0ABCDEF12"', bid: 1 }),
  ];
  const rows = [
    row(S, "2026-07-15", "Old", "OldG", "garlic rocker", "exact", "garlic rocker", 100, 5, 0, 3, 0),
    row(S, "2026-07-15", "Old", "OldG", 'asin="B0ABCDEF12"', "product", "b0abcdef12", 100, 5, 0, 3, 0),
    row(S, "2026-09-10", "Auto", "A", "close-match", "auto", "garlic rocker", 3000, 30, 6, 9, 180),
    row(S, "2026-09-10", "Auto", "A", "close-match", "auto", "b0abcdef12", 3000, 30, 6, 9, 180),
  ];
  const asOf = "2026-09-30";
  const actions = (bulk: BulkEntity[]) => recommend({ store, rows, bulk, asOf }).recommendations.filter((r) => r.action.startsWith("harvest")).map((r) => r.subject).sort();
  assert.deepEqual(actions(archived("archived")), ["b0abcdef12", "garlic rocker"]);
  assert.deepEqual(actions(archived("enabled")), []); // live in the bulk file → still "already targeted"
  assert.deepEqual(actions([]), ["b0abcdef12", "garlic rocker"]); // no bulk: only rows inside the window count
  const inWindow = [...rows, row(S, "2026-09-05", "Old", "OldG", "garlic rocker", "exact", "garlic rocker", 100, 5, 0, 3, 0)];
  assert.ok(!recommend({ store, rows: inWindow, bulk: [], asOf }).recommendations.some((r) => r.subject === "garlic rocker" && r.action === "harvest-exact"));
});

test("monthly impact uses the days the data covers (7-day report ≠ 30 days); overview run-rate too", () => {
  const S = "im";
  const store = createStore({ id: S, name: "IM", marketplace: "US", currency: "USD" });
  const rows = days("2026-09-22", 7).map((d) => row(S, d, "C", "G", "close-match", "auto", "garlic slicer", 400, 4, 0, 10, 0));
  const neg = recommend({ store, rows, bulk: [] }).recommendations.find((r) => r.action === "negate-exact" && r.subject === "garlic slicer")!;
  assert.equal(neg.counters.spend, 50); // 09-22 … 09-26 (lag excludes 09-27/28)
  assert.equal(neg.impact, 300); // $10/day × 30, not $50
  const fx = { baseCurrency: "USD", fxRates: {} };
  for (const period of [7, 30, 90]) {
    const p = computePeriod(buildOverviewIndex(rows), { days: period, stores: [store], fx, convert: false });
    assert.equal(p.wasted.total, 70);
    assert.equal(Math.round(p.wasted.monthly), 300, `period ${period}`);
  }
});

test("keywords over Amazon's length limits are never recommended or exported", () => {
  assert.match(keywordLengthProblem("dog chew toys for aggressive chewers large breed extra tough durable", "keyword") ?? "", /11 words \(max 10\)/);
  assert.match(keywordLengthProblem("one two three four five", "negativePhrase") ?? "", /5 words \(max 4\)/);
  assert.match(keywordLengthProblem("x".repeat(81), "negativeExact") ?? "", /81 characters/);
  assert.equal(keywordLengthProblem("garlic press", "keyword"), null);
  const S = "ln";
  const longHarvest = "dog chew toys for aggressive chewers large breed extra tough durable";
  const longBleeder = "indestructible dog chew toy for large aggressive chewers heavy duty rubber bone x";
  const store = createStore({ id: S, name: "LN", marketplace: "US", currency: "USD", irrelevantWords: ["dog chew toys for sale"] });
  const rows = [
    row(S, "2026-09-01", "Auto", "AG1", "close-match", "auto", longHarvest, 1000, 10, 3, 7, 90),
    row(S, "2026-09-01", "Auto", "AG1", "close-match", "auto", longBleeder, 2000, 20, 0, 14, 0),
    row(S, "2026-09-01", "Auto", "AG1", "close-match", "auto", "dog chew toys for sale cheap", 300, 3, 0, 2, 0),
    row(S, "2026-09-12", "Auto", "AG1", "close-match", "auto", "filler", 1, 0, 0, 0, 0),
  ];
  const res = recommend({ store, rows, bulk: [] });
  assert.ok(!res.recommendations.some((r) => [longHarvest, longBleeder, "dog chew toys for sale"].includes(r.subject)));
  const why = (s: string) => res.skipped.find((x) => x.subject === s)?.reason ?? "";
  assert.match(why(longHarvest), /too long for an Amazon keyword: 11 words/);
  assert.match(why(longBleeder), /too long for an Amazon negative exact: 13 words/);
  assert.match(why("dog chew toys for sale"), /too long for an Amazon negative phrase: 5 words/);
  // Export guard for recs approved before this check existed.
  const old: Recommendation = {
    id: `${S}|harvest-exact|auto|ag1|${longHarvest}`, storeId: S, action: "harvest-exact", priority: "high", subject: longHarvest, campaign: "Auto", adGroup: "AG1",
    matchType: "exact", counters: rows[0], reason: "", evidence: [], ids: {}, suggestedBid: 1.3, level: "search-term",
  };
  const sheet = buildBulkSheet({ store: { ...store, harvestDestination: { mode: "source" } }, recs: [old], decisions: [approve(old, S)], bulk: [], today: "2026-09-30" });
  assert.equal(sheet.count, 0);
  assert.ok(sheet.warnings.some((w) => /too long for an Amazon keyword/.test(w)));
});

/* ================================================================= export */

const approve = (rec: Recommendation, storeId = MINI_STORE.id, extra: Partial<Decision> = {}): Decision => ({
  recId: rec.id,
  storeId,
  status: "approved",
  decidedAt: "2026-09-30T00:00:00.000Z",
  ...extra,
});
const col = (name: (typeof BULK_HEADERS)[number]) => BULK_HEADERS.indexOf(name);
const miniRecs = recommend({ store: MINI_STORE, rows: MINI_ROWS, bulk: MINI_BULK }).recommendations;
const harvestPairs = (...subjects: [string, string][]) =>
  subjects.flatMap(([h, n]) => {
    const harvest = miniRecs.find((r) => r.action === h && r.subject === n)!;
    return [approve(harvest), approve(miniRecs.find((r) => r.id === harvest.pairedWith)!)];
  });
const summary = (rows: (string | number | null)[][]) =>
  rows.slice(1).map((x) => `${x[col("Entity")]}|${x[col("Operation")]}|${x[col("Campaign ID")] ?? ""}|${x[col("Ad Group ID")] ?? ""}|${x[col("Keyword Text")] ?? x[col("Product Targeting Expression")] ?? x[col("SKU")] ?? x[col("Ad Group Name")] ?? ""}`);
const S0 = MINI_STORE.id;

test("new-campaign harvest: an existing harvest campaign (earlier round, re-imported) is reused, never re-created", () => {
  const harvestCampaign = (state: string, adSku = "SKU-W-1") => [
    ent(S0, { entity: "Campaign", campaignId: "999000000000001", campaignName: "Widget_Exact_Harvest", state, targetingType: "Manual", dailyBudget: 20 }),
    ent(S0, { entity: "Ad Group", campaignId: "999000000000001", adGroupId: "999000000000002", campaignName: "Widget_Exact_Harvest", adGroupName: "Exact_Harvest", state, defaultBid: 0.7 }),
    ent(S0, { entity: "Product Ad", campaignId: "999000000000001", adGroupId: "999000000000002", adId: "A9", campaignName: "Widget_Exact_Harvest", adGroupName: "Exact_Harvest", state, sku: adSku }),
    ent(S0, { entity: "Keyword", campaignId: "999000000000001", adGroupId: "999000000000002", keywordId: "K9", campaignName: "Widget_Exact_Harvest", adGroupName: "Exact_Harvest", state, keywordText: "wireless widget", matchType: "exact", bid: 0.72 }),
  ];
  const decisions = harvestPairs(["harvest-exact", "cheap widget"]);
  // Same SKU: the keyword goes into the existing ad group with real IDs; no Campaign / Ad Group rows.
  const reuse = buildBulkSheet({ store: MINI_STORE, recs: miniRecs, decisions, bulk: [...MINI_BULK, ...harvestCampaign("enabled")], today: "2026-09-30" });
  assert.deepEqual(summary(reuse.rows), ["Keyword|Create|999000000000001|999000000000002|cheap widget", "Negative Keyword|Create|C2|AG2|cheap widget"]);
  assert.ok(!reuse.warnings.some((w) => /need IDs/.test(w)));
  // Different SKU in the existing ad group: a new ad group under the real Campaign ID (name taken → SKU suffix).
  const other = buildBulkSheet({ store: MINI_STORE, recs: miniRecs, decisions, bulk: [...MINI_BULK, ...harvestCampaign("enabled", "SKU-OTHER")], today: "2026-09-30" });
  assert.deepEqual(summary(other.rows), [
    "Ad Group|Create|999000000000001|Exact_Harvest_SKU-W-1|Exact_Harvest_SKU-W-1",
    "Product Ad|Create|999000000000001|Exact_Harvest_SKU-W-1|SKU-W-1",
    "Keyword|Create|999000000000001|Exact_Harvest_SKU-W-1|cheap widget",
    "Negative Keyword|Create|C2|AG2|cheap widget",
  ]);
  // An archived namesake keeps its name: the new campaign is dated.
  const dated = buildBulkSheet({ store: MINI_STORE, recs: miniRecs, decisions, bulk: [...MINI_BULK, ...harvestCampaign("archived")], today: "2026-09-30" });
  assert.equal(dated.rows[1][col("Campaign Name")], "Widget_Exact_Harvest_20260930");
});

test("source destination from an auto campaign is re-routed to a new harvest campaign (or skipped with its negative)", () => {
  const store = createStore({ ...MINI_STORE, harvestDestination: { mode: "source" } });
  const decisions = harvestPairs(["harvest-exact", "wireless widget"], ["harvest-product", "b0abcdef12"]);
  const res = buildBulkSheet({ store, recs: miniRecs, decisions, bulk: MINI_BULK, today: "2026-09-30" });
  const s = summary(res.rows);
  assert.ok(!s.some((x) => x.startsWith("Keyword|Create|C1|AG1") || x.startsWith("Product Targeting|Create|C1|AG1")), "nothing created in the auto ad group");
  assert.ok(s.includes("Keyword|Create|W_Exact_Harvest|Exact_Harvest|wireless widget"));
  assert.ok(s.includes('Product Targeting|Create|W_Prod_Harvest|Prod_Harvest|asin="B0ABCDEF12"'));
  assert.ok(s.includes("Negative Keyword|Create|C1|AG1|wireless widget"));
  assert.ok(s.includes('Negative Product Targeting|Create|C1|AG1|asin="B0ABCDEF12"'));
  const camp = res.rows.find((x) => x[col("Entity")] === "Campaign" && x[col("Campaign Name")] === "W_Exact_Harvest")!;
  assert.equal(camp[col("Daily Budget")], 20); // copied from W_Auto
  assert.ok(res.warnings.some((w) => /W_Auto is an auto-targeting campaign.*placed in W_Exact_Harvest/.test(w)));
  // No budget anywhere → the harvest and its paired negative are both left out.
  const noBudget = MINI_BULK.map((e) => (e.entity === "Campaign" && e.campaignId === "C1" ? { ...e, dailyBudget: undefined } : e));
  const skipped = buildBulkSheet({ store, recs: miniRecs, decisions: harvestPairs(["harvest-exact", "wireless widget"]), bulk: noBudget, today: "2026-09-30" });
  assert.equal(skipped.count, 0);
  assert.ok(skipped.warnings.some((w) => /wireless widget.* skipped: W_Auto is an auto-targeting campaign/.test(w)));
  assert.ok(skipped.warnings.some((w) => /Paired negative .*wireless widget.* harvest was not exported/.test(w)));
});

test("Keywords page destination mirrors the export's re-routing (auto source, wrong-kind ad group)", () => {
  const options = adGroupOptions(MINI_BULK, S0);
  assert.deepEqual(
    options.map((o) => [o.adGroupId, o.manual, o.holds ?? "", o.dailyBudget]),
    [["AG2", true, "keyword", 15], ["AG3", true, "keyword", 25], ["AG1", false, "", 20]],
  );
  const wireless = miniRecs.find((r) => r.action === "harvest-exact" && r.subject === "wireless widget")!;
  const cheap = miniRecs.find((r) => r.action === "harvest-exact" && r.subject === "cheap widget")!;
  const asin = miniRecs.find((r) => r.action === "harvest-product" && r.subject === "b0abcdef12")!;
  const sourceStore = { ...MINI_STORE, harvestDestination: { mode: "source" as const } };
  assert.deepEqual(routedDestination({ mode: "source" }, wireless, MINI_STORE, options), { mode: "new-campaign", productLabel: "Widget", dailyBudget: 20 });
  assert.deepEqual(routedDestination({ mode: "source" }, wireless, sourceStore, options), { mode: "new-campaign", productLabel: "W", dailyBudget: 20 });
  assert.deepEqual(routedDestination({ mode: "source" }, cheap, sourceStore, options), { mode: "source" });
  const exact = { mode: "existing" as const, campaignId: "C3", adGroupId: "AG3", campaignName: "W_Exact", adGroupName: "Exact" };
  assert.deepEqual(routedDestination(exact, wireless, sourceStore, options), exact);
  const routed = routedDestination(exact, asin, sourceStore, options);
  assert.deepEqual(routed, { mode: "new-campaign", productLabel: "W", dailyBudget: 20 });
  assert.equal(newCampaignName("W", "harvest-product", "Widget Co"), "W_Prod_Harvest"); // the export's name for it
  assert.equal(landsInSource(routedDestination({ mode: "source" }, wireless, sourceStore, options), wireless), false); // paired negative is kept
});

test("existing destination: an ASIN harvest never goes into a keyword ad group (nor a keyword into a product ad group)", () => {
  const toExact = createStore({ ...MINI_STORE, harvestDestination: { mode: "existing", campaignId: "C3", adGroupId: "AG3", campaignName: "W_Exact", adGroupName: "Exact" } });
  const res = buildBulkSheet({ store: toExact, recs: miniRecs, decisions: harvestPairs(["harvest-product", "b0abcdef12"], ["harvest-exact", "wireless widget"]), bulk: MINI_BULK, today: "2026-09-30" });
  const s = summary(res.rows);
  assert.ok(s.includes("Keyword|Create|C3|AG3|wireless widget"));
  assert.ok(!s.some((x) => x.startsWith("Product Targeting|Create|C3|AG3")));
  assert.ok(s.includes('Product Targeting|Create|W_Prod_Harvest|Prod_Harvest|asin="B0ABCDEF12"'));
  assert.ok(s.includes('Negative Product Targeting|Create|C1|AG1|asin="B0ABCDEF12"'));
  assert.ok(res.warnings.some((w) => /W_Exact \/ Exact holds keywords/.test(w)));
  const ptBulk = [
    ...MINI_BULK,
    ent(S0, { entity: "Campaign", campaignId: "C7", campaignName: "W_PT", state: "enabled", targetingType: "Manual", dailyBudget: 10 }),
    ent(S0, { entity: "Ad Group", campaignId: "C7", adGroupId: "AG7", campaignName: "W_PT", adGroupName: "PT", state: "enabled", defaultBid: 0.5 }),
    ent(S0, { entity: "Product Targeting", campaignId: "C7", adGroupId: "AG7", productTargetingId: "T7", campaignName: "W_PT", adGroupName: "PT", state: "enabled", expression: 'asin="B0ZZZZZZZZ"', bid: 0.5 }),
  ];
  const toPt = createStore({ ...MINI_STORE, harvestDestination: { mode: "existing", campaignId: "C7", adGroupId: "AG7", campaignName: "W_PT", adGroupName: "PT" } });
  const kw = summary(buildBulkSheet({ store: toPt, recs: miniRecs, decisions: harvestPairs(["harvest-exact", "wireless widget"]), bulk: ptBulk, today: "2026-09-30" }).rows);
  assert.ok(!kw.some((x) => x.startsWith("Keyword|Create|C7|AG7")));
  assert.ok(kw.includes("Keyword|Create|W_Exact_Harvest|Exact_Harvest|wireless widget"));
});

test("new harvest campaign: one ad group per advertised-SKU set, so keywords only serve their own product", () => {
  const bulk = MINI_BULK.map((e) => (e.entity === "Product Ad" && e.adGroupId === "AG2" ? { ...e, sku: "SKU-W-2" } : e));
  const recs = recommend({ store: MINI_STORE, rows: MINI_ROWS, bulk }).recommendations;
  const pairs = ["wireless widget", "cheap widget"].flatMap((n) => {
    const h = recs.find((r) => r.action === "harvest-exact" && r.subject === n)!;
    return [approve(h), approve(recs.find((r) => r.id === h.pairedWith)!)];
  });
  const s = summary(buildBulkSheet({ store: MINI_STORE, recs, decisions: pairs, bulk, today: "2026-09-30" }).rows);
  assert.deepEqual(s.slice(0, 7), [
    "Campaign|Create|Widget_Exact_Harvest||",
    "Ad Group|Create|Widget_Exact_Harvest|Exact_Harvest|Exact_Harvest",
    "Product Ad|Create|Widget_Exact_Harvest|Exact_Harvest|SKU-W-1",
    "Keyword|Create|Widget_Exact_Harvest|Exact_Harvest|wireless widget",
    "Ad Group|Create|Widget_Exact_Harvest|Exact_Harvest_SKU-W-2|Exact_Harvest_SKU-W-2",
    "Product Ad|Create|Widget_Exact_Harvest|Exact_Harvest_SKU-W-2|SKU-W-2",
    "Keyword|Create|Widget_Exact_Harvest|Exact_Harvest_SKU-W-2|cheap widget",
  ]);
});
