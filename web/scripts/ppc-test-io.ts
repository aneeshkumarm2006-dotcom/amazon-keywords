/**
 * Self-test: CSV, ZIP/XLSX, detection and file routing.
 */

import assert from "node:assert/strict";
import { deflateRawSync } from "node:zlib";

import { parseCsv, sniffDelimiter, toCsv } from "../src/lib/ppc/csv";
import {
  detectReport,
  isDetectionError,
  parseFile,
  suggestStore,
  toBulkEntities,
  toSearchTermRows,
  type Detection,
} from "../src/lib/ppc/detect";
import { parseDate, parseNumber, normalizeMatchType } from "../src/lib/ppc/parse";
import { columnIndex, columnName, readXlsx, writeXlsx } from "../src/lib/ppc/xlsx";
import { crc32, listZip, unzip } from "../src/lib/ppc/zip";
import { group, note, test } from "./ppc-test-harness";

const ctx = { storeId: "s1", batchId: "b1" };

function det(rows: string[][]): Detection {
  const d = detectReport(rows);
  if (isDetectionError(d)) throw new Error(d.error);
  return d;
}

/* ------------------------------------------------------------------ CSV */

group("csv");

test("quotes, escaped quotes, embedded delimiters and newlines", () => {
  const text = 'a,"b,c","say ""hi""","multi\nline",\r\n1,2,3,4,5\r\n';
  assert.deepEqual(parseCsv(text), [
    ["a", "b,c", 'say "hi"', "multi\nline", ""],
    ["1", "2", "3", "4", "5"],
  ]);
});

test("BOM stripped, CRLF / LF / CR endings, blank lines skipped", () => {
  const text = "﻿h1,h2\r\nx,y\n\nz,w\rq,r";
  assert.deepEqual(parseCsv(text), [
    ["h1", "h2"],
    ["x", "y"],
    ["z", "w"],
    ["q", "r"],
  ]);
});

test("tab and semicolon delimiters are sniffed", () => {
  assert.equal(sniffDelimiter("a\tb\tc\n1\t2\t3"), "\t");
  assert.deepEqual(parseCsv("a\tb,c\tc\n1\t2\t3"), [
    ["a", "b,c", "c"],
    ["1", "2", "3"],
  ]);
  assert.equal(sniffDelimiter("Report title\na;b;c\n1,5;2;3\n4;5;6"), ";");
  assert.deepEqual(parseCsv('a;"b;x";c\n1,5;2;3'), [
    ["a", "b;x", "c"],
    ["1,5", "2", "3"],
  ]);
});

test("toCsv round-trips through parseCsv", () => {
  const rows = [
    ["name", "note", "n"],
    ['He said "go"', "comma, here", 3.5],
    ["line\nbreak", " padded ", null],
  ];
  const back = parseCsv(toCsv(rows), { skipEmptyRows: false });
  assert.deepEqual(back, [
    ["name", "note", "n"],
    ['He said "go"', "comma, here", "3.5"],
    ["line\nbreak", " padded ", ""],
  ]);
});

/* ----------------------------------------------------------------- XLSX */

group("xlsx");

test("column letters", () => {
  assert.equal(columnName(0), "A");
  assert.equal(columnName(25), "Z");
  assert.equal(columnName(26), "AA");
  assert.equal(columnName(27), "AB");
  assert.equal(columnName(701), "ZZ");
  assert.equal(columnName(702), "AAA");
  assert.equal(columnIndex("AB12"), 27);
  assert.equal(columnIndex("a1"), 0);
});

test("writeXlsx → readXlsx round trip (32 columns, blanks, numbers)", async () => {
  const header = Array.from({ length: 32 }, (_, i) => `Col ${columnName(i)}`);
  const rows: (string | number | null)[][] = [
    header,
    Array.from({ length: 32 }, (_, i) => (i % 3 === 0 ? i * 1.5 : i % 3 === 1 ? `v${i} & <x>` : null)),
    ["  leading space", "", null, 0, -12.75, "B0ABCDEF12", 'quote "q"', "tab\there", "new\nline"],
  ];
  const bytes = writeXlsx([
    { name: "First", rows },
    { name: "Bad/Name:[x]", rows: [["only"]] },
  ]);
  const { sheets } = await readXlsx(bytes);
  assert.equal(sheets.length, 2);
  assert.equal(sheets[0].name, "First");
  assert.equal(sheets[1].name, "Bad Name  x");
  const expected = rows.map((r) => {
    const s = r.map((v) => (v === null ? "" : String(v)));
    while (s.length && s[s.length - 1] === "") s.pop();
    return s;
  });
  assert.deepEqual(sheets[0].rows, expected);
  assert.equal(sheets[0].rows[1][27], "40.5"); // column AB
  assert.equal(sheets[0].rows[1][28], "v28 & <x>"); // column AC
  assert.equal(sheets[0].rows[1][30], "45"); // column AE
  // Stored entries carry valid CRCs.
  const files = await unzip(bytes);
  for (const e of listZip(bytes)) assert.equal(crc32(files.get(e.name)!), e.crc32, `crc ${e.name}`);
});

/** Build a ZIP by hand with DEFLATE entries (test-only; uses Node's zlib). */
function buildDeflateZip(entries: { name: string; text: string; descriptor?: boolean }[]): Uint8Array {
  const chunks: Buffer[] = [];
  const central: Buffer[] = [];
  let offset = 0;
  for (const e of entries) {
    const data = Buffer.from(e.text, "utf8");
    const comp = deflateRawSync(data);
    const crc = crc32(new Uint8Array(data));
    const name = Buffer.from(e.name, "utf8");
    const flags = 0x0800 | (e.descriptor ? 0x0008 : 0);
    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(flags, 6);
    local.writeUInt16LE(8, 8);
    local.writeUInt32LE(e.descriptor ? 0 : crc, 14);
    local.writeUInt32LE(e.descriptor ? 0 : comp.length, 18);
    local.writeUInt32LE(e.descriptor ? 0 : data.length, 22);
    local.writeUInt16LE(name.length, 26);
    const parts = [local, name, comp];
    if (e.descriptor) {
      const dd = Buffer.alloc(16);
      dd.writeUInt32LE(0x08074b50, 0);
      dd.writeUInt32LE(crc, 4);
      dd.writeUInt32LE(comp.length, 8);
      dd.writeUInt32LE(data.length, 12);
      parts.push(dd);
    }
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(flags, 8);
    cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(comp.length, 20);
    cd.writeUInt32LE(data.length, 24);
    cd.writeUInt16LE(name.length, 28);
    cd.writeUInt32LE(offset, 42);
    central.push(cd, name);
    for (const p of parts) {
      chunks.push(p);
      offset += p.length;
    }
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...chunks, cdBuf, eocd]));
}

const NS = 'xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"';
const NSR = 'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';

test("DEFLATE zip, data descriptors, rich-text shared strings, entities, prefixes, sparse cells", async () => {
  const bytes = buildDeflateZip([
    { name: "[Content_Types].xml", text: '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"/>' },
    {
      name: "_rels/.rels",
      text: '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    },
    {
      name: "xl/workbook.xml",
      text: `<?xml version="1.0"?><workbook ${NS} ${NSR}><sheets><sheet name="Data &amp; More" sheetId="1" r:id="rId1"/></sheets></workbook>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      text:
        '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="/xl/worksheets/sheet1.xml"/>' +
        '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sharedStrings" Target="sharedStrings.xml"/>' +
        "</Relationships>",
      descriptor: true,
    },
    {
      name: "xl/sharedStrings.xml",
      text:
        `<?xml version="1.0"?><sst ${NS} count="5" uniqueCount="5">` +
        "<si><t>Customer Search Term</t></si>" +
        '<si><r><rPr><b/></rPr><t>Rich </t></r><r><t xml:space="preserve">text &amp; more </t></r></si>' +
        '<si><t>caf&#233; &#x1F600; &lt;b&gt;</t><rPh sb="0" eb="1"><t>PHONETIC</t></rPh></si>' +
        "<si><t>line_x000D_break _x005F_x0041_</t></si>" +
        "<si/>" +
        "</sst>",
      descriptor: true,
    },
    {
      name: "xl/worksheets/sheet1.xml",
      text:
        '<?xml version="1.0"?><x:worksheet xmlns:x="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><x:sheetData>' +
        '<x:row r="1"><x:c r="A1" t="s"><x:v>0</x:v></x:c><x:c r="C1" t="s"><x:v>1</x:v></x:c><x:c r="AB1" t="inlineStr"><x:is><x:t>inline</x:t></x:is></x:c></x:row>' +
        '<x:row r="2"><x:c r="A2" s="1"><x:v>46266</x:v></x:c><x:c r="B2" t="b"><x:v>1</x:v></x:c><x:c r="C2" t="str"><x:f>A1</x:f><x:v>formula &amp; text</x:v></x:c>' +
        '<x:c r="D2" t="e"><x:v>#DIV/0!</x:v></x:c><x:c r="E2" t="s"><x:v>2</x:v></x:c><x:c r="F2" t="s"><x:v>3</x:v></x:c><x:c r="G2" t="s"><x:v>4</x:v></x:c></x:row>' +
        '<x:row r="3"/>' +
        '<x:row r="5"><x:c r="B5"><x:f>SUM(A1)</x:f><x:v>1.5</x:v></x:c><x:c r="C5" t="s"/></x:row>' +
        "</x:sheetData></x:worksheet>",
    },
  ]);
  const { sheets } = await readXlsx(bytes);
  assert.equal(sheets.length, 1);
  assert.equal(sheets[0].name, "Data & More");
  const row1 = Array(28).fill("");
  row1[0] = "Customer Search Term";
  row1[2] = "Rich text & more ";
  row1[27] = "inline";
  assert.deepEqual(sheets[0].rows, [
    row1,
    ["46266", "TRUE", "formula & text", "#DIV/0!", "café \u{1F600} <b>", "line\rbreak _x0041_"],
    ["", "1.5"],
  ]);
});

/* --------------------------------------------------------------- detect */

group("detect");

test("parseNumber: currency, thousands, EU decimals, %, blanks", () => {
  assert.equal(parseNumber("$1,234.50"), 1234.5);
  assert.equal(parseNumber("£0.52"), 0.52);
  assert.equal(parseNumber("1.234,56 €"), 1234.56);
  assert.equal(parseNumber("1.234", "eu"), 1234);
  assert.equal(parseNumber("12,5", "eu"), 12.5);
  assert.equal(parseNumber("1,204"), 1204);
  assert.equal(parseNumber("12.5%"), 0.125);
  assert.equal(parseNumber("(3.20)"), -3.2);
  assert.equal(parseNumber(""), 0);
  assert.equal(parseNumber("--"), 0);
  assert.equal(parseNumber("USD 12.00"), 12);
  assert.equal(parseNumber("EUR 12,00"), 12);
  assert.equal(parseNumber("1.5E-3"), 0.0015);
  assert.ok(Number.isNaN(parseNumber("abc")));
});

test("parseDate: ISO, month names, numeric orders, serials", () => {
  assert.equal(parseDate("2026-09-01"), "2026-09-01");
  assert.equal(parseDate("2026-09-01T00:00:00Z"), "2026-09-01");
  assert.equal(parseDate("Sep 01, 2026"), "2026-09-01");
  assert.equal(parseDate("September 1 2026"), "2026-09-01");
  assert.equal(parseDate("01 Sep 2026"), "2026-09-01");
  assert.equal(parseDate("1-Sep-26"), "2026-09-01");
  assert.equal(parseDate("9/1/2026", "MDY"), "2026-09-01");
  assert.equal(parseDate("01/09/2026", "DMY"), "2026-09-01");
  assert.equal(parseDate("13/09/2026", "MDY"), "2026-09-13"); // impossible month flips per cell
  assert.equal(parseDate("20260901"), "2026-09-01");
  assert.equal(parseDate("46266"), "2026-09-01"); // Excel serial
  assert.equal(parseDate("not a date"), null);
});

test("normalizeMatchType", () => {
  assert.equal(normalizeMatchType("EXACT"), "exact");
  assert.equal(normalizeMatchType("Phrase"), "phrase");
  assert.equal(normalizeMatchType("-", "close-match"), "auto");
  assert.equal(normalizeMatchType("", "substitutes"), "auto");
  assert.equal(normalizeMatchType("-", 'asin="B0ABCDEF12"'), "product");
  assert.equal(normalizeMatchType("-", 'asin-expanded="B0ABCDEF12"'), "product");
  assert.equal(normalizeMatchType("TARGETING_EXPRESSION", 'category="123"'), "product");
  assert.equal(normalizeMatchType("TARGETING_EXPRESSION_PREDEFINED", "loose-match"), "auto");
  assert.equal(normalizeMatchType("weird", "something"), "unknown");
});

const SP_CONSOLE_CSV = [
  "Sponsored Products Search Term Report,,,,",
  "Date,Portfolio name,Currency,Campaign Name,Ad Group Name,Targeting,Match Type,Customer Search Term,Impressions,Clicks,Click-Thru Rate (CTR),Cost Per Click (CPC),Spend,7 Day Total Sales ,Total Advertising Cost of Sales (ACOS) ,Total Return on Advertising Spend (ROAS),7 Day Total Orders (#),7 Day Total Units (#),7 Day Conversion Rate,7 Day Advertised SKU Units (#),7 Day Other SKU Units (#),7 Day Advertised SKU Sales ,7 Day Other SKU Sales ",
  '"Sep 01, 2026",Not grouped,USD,W_Auto,Auto,close-match,-,wireless widget,"1,204",31,2.57%,$0.52,$16.12,"$1,234.50",1.31%,76.58,41,43,132.26%,40,3,"$1,200.00",$34.50',
  '"Sep 02, 2026",Not grouped,USD,W_Prod,Comp1,"asin=""B0ABCDEF12""",-,b0abcdef12,800,8,1.00%,$0.75,$6.00,$60.00,10.00%,10.00,2,2,25.00%,2,0,$60.00,$0.00',
  '"Sep 02, 2026",Not grouped,USD,W_Exact,Exact,blue widget,EXACT,blue widget,500,10,2.00%,$1.00,$10.00,$0.00,,0.00,0,0,0.00%,0,0,$0.00,$0.00',
  '"Sep 02, 2026",Not grouped,USD,W_Exact,Exact,blue widget,EXACT,blue widget,100,2,2.00%,$1.00,$2.00,$30.00,,15.00,1,1,50.00%,1,0,$30.00,$0.00',
].join("\n");

test("SP console CSV: title row, CPC ≠ Spend, trailing-space header, $1,234.50, Sep 01, 2026", () => {
  const table = parseCsv(SP_CONSOLE_CSV);
  const d = det(table);
  assert.equal(d.kind, "search-term");
  assert.equal(d.headerRow, 1);
  assert.equal(d.columns.spend, 12, "Spend, not Cost Per Click (CPC)");
  assert.equal(d.columns.sales, 13);
  assert.equal(d.columns.orders, 16);
  assert.equal(d.columns.units, 17);
  assert.equal(d.columns.searchTerm, 7);
  assert.equal(d.columns.targeting, 5);
  assert.equal(d.attributionDays, 7);
  assert.deepEqual(d.missing, []);
  const { rows, errors } = toSearchTermRows(table, d, ctx);
  assert.deepEqual(errors, []);
  assert.equal(rows.length, 3, "duplicate natural keys merge");
  const r = rows[0];
  assert.equal(r.date, "2026-09-01");
  assert.equal(r.impressions, 1204);
  assert.equal(r.clicks, 31);
  assert.equal(r.spend, 16.12);
  assert.equal(r.sales, 1234.5);
  assert.equal(r.orders, 41);
  assert.equal(r.units, 43);
  assert.equal(r.matchType, "auto");
  assert.equal(r.currency, "USD");
  assert.equal(r.portfolio, "Not grouped");
  assert.equal(r.key, "s1|2026-09-01||w_auto|auto|close-match|auto|wireless widget");
  assert.equal(rows[1].matchType, "product");
  assert.equal(rows[1].targeting, 'asin="B0ABCDEF12"');
  const merged = rows[2];
  assert.deepEqual([merged.clicks, merged.spend, merged.sales, merged.orders], [12, 12, 30, 1]);
  assert.deepEqual(suggestStore({ table, detection: d }), { currency: "USD", country: "US", countryInferred: true });
});

test("SB 14-day header → attributionDays 14", () => {
  const table = parseCsv(
    "Date,Campaign Name,Ad Group Name,Targeting,Match Type,Customer Search Term,Impressions,Clicks,Spend,14 Day Total Sales ,14 Day Total Orders (#),14 Day Total Units (#)\n" +
      "2026-09-01,SB_Brand,AG,widget,BROAD,widget pro,100,5,4.00,50.00,2,2",
  );
  const d = det(table);
  assert.equal(d.attributionDays, 14);
  const { rows } = toSearchTermRows(table, d, ctx);
  assert.equal(rows[0].sales, 50);
  assert.equal(rows[0].matchType, "broad");
});

test("Ads API v3 camelCase header (prefers 7-day, 'targeting' over 'keyword')", () => {
  const table = parseCsv(
    "date,campaignName,adGroupName,keyword,targeting,matchType,searchTerm,impressions,clicks,cost,sales1d,sales7d,sales14d,purchases1d,purchases7d,purchases14d,unitsSoldClicks7d\n" +
      '2026-09-01,C,G,,"asin=""B0ABCDEF12""",TARGETING_EXPRESSION,b0abcdef12,50,4,3.2,10,20,30,1,2,3,2\n' +
      "2026-09-01,C,G,widget,widget,BROAD,widget case,70,3,2.1,0,0,0,0,0,0,0",
  );
  const d = det(table);
  assert.equal(d.columns.targeting, 4);
  assert.equal(d.columns.sales, 11);
  assert.equal(d.columns.orders, 14);
  assert.equal(d.columns.units, 16);
  assert.equal(d.columns.spend, 9);
  assert.equal(d.attributionDays, 7);
  const { rows } = toSearchTermRows(table, d, ctx);
  assert.equal(rows[0].matchType, "product");
  assert.deepEqual([rows[0].sales, rows[0].orders, rows[0].spend], [20, 2, 3.2]);
  assert.equal(rows[1].matchType, "broad");
});

test("D/M dates with EU numbers (semicolon file) and M/D default", () => {
  const eu = parseCsv(
    "Date;Currency;Campaign Name;Ad Group Name;Targeting;Match Type;Customer Search Term;Impressions;Clicks;Spend;7 Day Total Sales;7 Day Total Orders (#)\n" +
      "13/09/2026;EUR;C;G;kw;EXACT;kw;1.500;12;9,60;1.234,56;3\n" +
      "01/09/2026;EUR;C;G;kw;EXACT;kw;900;5;4,00;0,00;0",
  );
  const d = det(eu);
  assert.equal(d.dateOrder, "DMY");
  assert.equal(d.numberStyle, "eu");
  const { rows } = toSearchTermRows(eu, d, ctx);
  assert.deepEqual(
    rows.map((r) => [r.date, r.impressions, r.spend, r.sales]),
    [
      ["2026-09-13", 1500, 9.6, 1234.56],
      ["2026-09-01", 900, 4, 0],
    ],
  );
  const us = parseCsv(
    "Date,Currency,Campaign Name,Ad Group Name,Targeting,Match Type,Customer Search Term,Impressions,Clicks,Spend\n" +
      "09/01/2026,USD,C,G,kw,EXACT,kw,10,1,1.00\n09/02/2026,USD,C,G,kw,EXACT,kw,10,1,1.00",
  );
  const du = det(us);
  assert.equal(du.dateOrder, "MDY");
  assert.equal(toSearchTermRows(us, du, ctx).rows[0].date, "2026-09-01");
  // Ambiguous numeric dates in a GBP file default to day-first.
  const gb = parseCsv(
    "Date,Currency,Campaign Name,Ad Group Name,Customer Search Term,Clicks,Spend\n" + "01/09/2026,GBP,C,G,kw,1,1.00\n02/09/2026,GBP,C,G,kw,1,1.00",
  );
  assert.equal(det(gb).dateOrder, "DMY");
});

test("summary report (Start Date + End Date) keeps endDate; bad rows become errors", () => {
  const table = parseCsv(
    "Start Date,End Date,Campaign Name,Ad Group Name,Customer Search Term,Impressions,Clicks,Spend,7 Day Total Sales,7 Day Total Orders (#)\n" +
      "2026-09-01,2026-09-30,C,G,kw,100,5,4.00,20.00,1\n" +
      "garbage,2026-09-30,C,G,kw2,100,5,4.00,20.00,1\n" +
      "2026-09-01,2026-09-30,C,G,,100,5,4.00,20.00,1",
  );
  const d = det(table);
  const { rows, errors } = toSearchTermRows(table, d, ctx);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].endDate, "2026-09-30");
  assert.deepEqual(
    errors.map((e) => e.row),
    [2, 3],
  );
});

const BULK_HEADER =
  "Product,Entity,Operation,Campaign ID,Ad Group ID,Portfolio ID,Ad ID,Keyword ID,Product Targeting ID,Campaign Name,Ad Group Name,Campaign Name (Informational only),Ad Group Name (Informational only),Portfolio Name (Informational only),Start Date,End Date,Targeting Type,State,Campaign State (Informational only),Ad Group State (Informational only),Daily Budget,SKU,ASIN (Informational only),Ad Group Default Bid,Ad Group Default Bid (Informational only),Bid,Keyword Text,Native Language Keyword,Native Language Locale,Match Type,Bidding Strategy,Placement,Percentage,Product Targeting Expression,Resolved Product Targeting Expression (Informational only)";

function bulkRow(fields: Record<string, string | number>): string[] {
  const headers = BULK_HEADER.split(",");
  return headers.map((h) => (fields[h] === undefined ? "" : String(fields[h])));
}

const BULK_ROWS: string[][] = [
  bulkRow({ Product: "Sponsored Products", Entity: "Campaign", Operation: "", "Campaign ID": "111", "Campaign Name": "W_Exact", "Campaign Name (Informational only)": "W_Exact", "Targeting Type": "Manual", State: "enabled", "Daily Budget": 25, "Bidding Strategy": "Dynamic bids - down only" }),
  bulkRow({ Product: "Sponsored Products", Entity: "Ad Group", "Campaign ID": "111", "Ad Group ID": "222", "Ad Group Name": "Exact", "Campaign Name (Informational only)": "W_Exact", "Ad Group Name (Informational only)": "Exact", State: "enabled", "Ad Group Default Bid": 0.75 }),
  bulkRow({ Product: "Sponsored Products", Entity: "Product Ad", "Campaign ID": "111", "Ad Group ID": "222", "Ad ID": "333", "Campaign Name (Informational only)": "W_Exact", "Ad Group Name (Informational only)": "Exact", State: "enabled", SKU: "SKU-1", "ASIN (Informational only)": "B0OWN00001" }),
  bulkRow({ Product: "Sponsored Products", Entity: "Keyword", "Campaign ID": "111", "Ad Group ID": "222", "Keyword ID": "444", "Campaign Name (Informational only)": "W_Exact", "Ad Group Name (Informational only)": "Exact", State: "enabled", Bid: "1.25", "Keyword Text": "blue widget", "Match Type": "exact" }),
  bulkRow({ Product: "Sponsored Products", Entity: "Product Targeting", "Campaign ID": "111", "Ad Group ID": "222", "Product Targeting ID": "555", "Campaign Name (Informational only)": "W_Exact", "Ad Group Name (Informational only)": "Exact", State: "paused", Bid: "0.90", "Product Targeting Expression": 'asin="B0ABCDEF12"' }),
  bulkRow({ Product: "Sponsored Products", Entity: "Negative keyword", "Campaign ID": "111", "Ad Group ID": "222", "Keyword ID": "666", "Campaign Name (Informational only)": "W_Exact", "Ad Group Name (Informational only)": "Exact", State: "enabled", "Keyword Text": "free widget", "Match Type": "negativePhrase" }),
  bulkRow({ Product: "Sponsored Products", Entity: "Bidding Adjustment", "Campaign ID": "111", "Campaign Name (Informational only)": "W_Exact", Placement: "Placement Top", Percentage: 50 }),
  bulkRow({ Product: "Sponsored Products", Entity: "Bidding Adjustment", "Campaign ID": "111", "Campaign Name (Informational only)": "W_Exact", Placement: "Placement Product Page", Percentage: 0 }),
  bulkRow({ Product: "Sponsored Brands", Entity: "Campaign", "Campaign ID": "999", "Campaign Name": "SB" }),
];

test("bulk file: header, entity mapping, informational names, IDs, SP filter", () => {
  const table = [["Some export title"], BULK_HEADER.split(","), ...BULK_ROWS];
  const d = det(table);
  assert.equal(d.kind, "bulk");
  assert.equal(d.headerRow, 1);
  const { entities, errors } = toBulkEntities(table, d, ctx);
  assert.deepEqual(errors, []);
  assert.equal(entities.length, 8, "Sponsored Brands row dropped");
  const kw = entities.find((e) => e.entity === "Keyword")!;
  assert.deepEqual(
    [kw.campaignId, kw.adGroupId, kw.keywordId, kw.campaignName, kw.adGroupName, kw.bid, kw.keywordText, kw.matchType],
    ["111", "222", "444", "W_Exact", "Exact", 1.25, "blue widget", "exact"],
  );
  assert.equal(entities.find((e) => e.entity === "Ad Group")!.defaultBid, 0.75);
  assert.equal(entities.find((e) => e.entity === "Product Ad")!.sku, "SKU-1");
  assert.equal(entities.find((e) => e.entity === "Product Ad")!.asin, "B0OWN00001");
  assert.equal(entities.find((e) => e.entity === "Negative Keyword")!.matchType, "negativePhrase");
  assert.equal(entities.find((e) => e.entity === "Product Targeting")!.state, "paused");
  const adj = entities.filter((e) => e.entity === "Bidding Adjustment");
  assert.equal(new Set(adj.map((e) => e.key)).size, 2, "placement keeps bidding adjustment keys unique");
  assert.equal(entities.find((e) => e.entity === "Campaign")!.dailyBudget, 25);
});

test("parseFile: xlsx bulk picks the SP sheet; numeric IDs survive; CSV + UTF-16 routes", async () => {
  const header = BULK_HEADER.split(",");
  const numericRows = BULK_ROWS.slice(0, 4).map((r) => r.map((v, i) => (header[i].endsWith(" ID") && v ? Number(v) + 123456789012000 : v)));
  const xlsx = writeXlsx([
    { name: "Portfolios", rows: [["Portfolio ID", "Portfolio Name"], ["1", "P"]] },
    { name: "Sponsored Products Campaigns", rows: [header, ...numericRows] },
  ]);
  const parsed = await parseFile("bulk.csv", xlsx); // extension lies — content decides
  assert.equal(parsed.format, "xlsx");
  assert.equal(parsed.tables.length, 1);
  assert.equal(parsed.tables[0].sheet, "Sponsored Products Campaigns");
  const d = parsed.tables[0].detection as Detection;
  assert.equal(d.kind, "bulk");
  const { entities } = toBulkEntities(parsed.tables[0].rows, d, ctx);
  assert.equal(entities.find((e) => e.entity === "Keyword")!.keywordId, "123456789012444");

  const csvBytes = new TextEncoder().encode("﻿" + SP_CONSOLE_CSV);
  const csv = await parseFile("report.xlsx", csvBytes);
  assert.equal(csv.format, "csv");
  assert.equal((csv.tables[0].detection as Detection).kind, "search-term");

  const tsv = SP_CONSOLE_CSV.split("\n")
    .slice(1)
    .map((l) => parseCsv(l)[0].join("\t"))
    .join("\n");
  const u16 = Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from(tsv, "utf16le")]);
  const t = await parseFile("report.txt", new Uint8Array(u16));
  const td = t.tables[0].detection as Detection;
  assert.equal(td.kind, "search-term");
  assert.equal(toSearchTermRows(t.tables[0].rows, td, ctx).rows[0].sales, 1234.5);

  const xls = await parseFile("old.xls", new Uint8Array([0xd0, 0xcf, 0x11, 0xe0, 0, 0]));
  assert.ok(xls.error && /\.xls/.test(xls.error));
});

test("unrecognised table → error", () => {
  const d = detectReport([["foo", "bar"], ["1", "2"]]);
  assert.ok(isDetectionError(d));
});

test("performance: 100k-row report parses and converts quickly", () => {
  const header = SP_CONSOLE_CSV.split("\n")[1];
  const lines = [header];
  for (let i = 0; i < 100_000; i++) {
    const day = String(1 + (i % 28)).padStart(2, "0");
    lines.push(
      `2026-09-${day},Not grouped,USD,Camp ${i % 40},AG ${i % 7},kw ${i % 300},BROAD,"term ${i}, variant",${100 + (i % 50)},${i % 9},1%,$0.50,$${(i % 9) * 0.5},$${(i % 3) * 20}.00,,0,${i % 3},${i % 3},0%,0,0,$0,$0`,
    );
  }
  const text = lines.join("\n");
  const t0 = Date.now();
  const table = parseCsv(text);
  const t1 = Date.now();
  const d = det(table);
  const { rows, errors } = toSearchTermRows(table, d, ctx);
  const t2 = Date.now();
  assert.equal(table.length, 100_001);
  assert.equal(rows.length, 100_000);
  assert.equal(errors.length, 0);
  note(`100k rows (${(text.length / 1e6).toFixed(1)} MB): parseCsv ${t1 - t0} ms, detect+convert ${t2 - t1} ms`);
  assert.ok(t2 - t0 < 15000, "should take well under 15 s");
});
