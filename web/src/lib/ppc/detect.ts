/**
 * Report detection and row conversion.
 *
 * `detectReport(table)` finds the header row (title rows above it are skipped),
 * maps columns through alias tables and decides whether the table is a Search
 * Term Report or a bulk operations sheet. `toSearchTermRows` / `toBulkEntities`
 * turn the table into typed records; `parseFile` routes raw bytes (CSV / TSV /
 * UTF-16 text / XLSX, sniffed by content, not by extension) into detected tables.
 *
 * Header normalisation: NFKD, accents dropped, lower-case, strip everything
 * that is not a letter or digit (any script). "7 Day Total Sales " →
 * "7daytotalsales"; "Cost Per Click (CPC)" → "costperclickcpc" (deliberately
 * NOT an alias of spend); "Währung" → "wahrung". Localised console headers
 * (DE / FR / IT / ES / JP) are matched after the English aliases.
 */

import { parseCsv } from "./csv";
import { bulkEntityKey, searchTermKey } from "./keys";
import {
  countryCode,
  detectDateOrder,
  detectNumberStyle,
  normalizeMatchType,
  parseDate,
  parseNumber,
  type DateOrder,
  type NumberStyle,
} from "./parse";
import type { BulkEntity, BulkEntityType, ImportError, ReportKind, SearchTermRow } from "./types";
import { readXlsx } from "./xlsx";
import { isZip } from "./zip";

/* --------------------------------------------------------------- fields */

export type SearchTermField =
  | "date"
  | "startDate"
  | "endDate"
  | "portfolio"
  | "currency"
  | "country"
  | "campaign"
  | "adGroup"
  | "targeting"
  | "matchType"
  | "searchTerm"
  | "impressions"
  | "clicks"
  | "spend"
  | "sales"
  | "orders"
  | "units";

export type BulkField =
  | "product"
  | "entity"
  | "operation"
  | "campaignId"
  | "adGroupId"
  | "portfolioId"
  | "adId"
  | "keywordId"
  | "productTargetingId"
  | "campaignName"
  | "campaignNameInfo"
  | "adGroupName"
  | "adGroupNameInfo"
  | "state"
  | "targetingType"
  | "dailyBudget"
  | "defaultBid"
  | "defaultBidInfo"
  | "bid"
  | "keywordText"
  | "matchType"
  | "expression"
  | "resolvedExpression"
  | "sku"
  | "asin"
  | "asinInfo"
  | "placement"
  | "percentage"
  | "biddingStrategy";

export type ReportField = SearchTermField | BulkField;

/**
 * Unicode-aware header key: NFKD (full-width → ASCII, accents split off),
 * combining marks removed, lower-cased, then everything that is not a letter
 * or digit in any script stripped. "Währung" → "wahrung"; Japanese headers
 * keep their kana / kanji (dakuten are marks, so "グ" → "ク").
 */
export function normalizeHeader(header: string): string {
  return header
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, "");
}

type AliasField = Exclude<SearchTermField, "sales" | "orders" | "units">;

/**
 * Localised console headers (Amazon Ads console set to German, French,
 * Italian, Spanish or Japanese). Written as they appear; normalised at load.
 * Tried after the English aliases.
 */
const LOCALIZED_SEARCH_TERM_HEADERS: Record<AliasField, string[]> = {
  date: ["Datum", "Fecha", "Día", "Data", "Giorno", "Jour", "日付"],
  startDate: ["Startdatum", "Beginndatum", "Date de début", "Data di inizio", "Fecha de inicio", "開始日"],
  endDate: ["Enddatum", "Date de fin", "Data di fine", "Fecha de finalización", "Fecha de fin", "終了日"],
  portfolio: [
    "Portfolioname", "Portfolio-Name", "Name des Portfolios", "Nom du portefeuille", "Portefeuille",
    "Nome portafoglio", "Nome del portafoglio", "Portafoglio", "Nombre de la cartera", "Cartera",
    "Nombre del portafolio", "Portafolio", "ポートフォリオ名", "ポートフォリオ",
  ],
  currency: ["Währung", "Devise", "Valuta", "Moneda", "Divisa", "通貨"],
  country: ["Land", "Marktplatz", "Pays", "Place de marché", "Paese", "País", "Mercado", "国", "マーケットプレイス"],
  campaign: [
    "Kampagnenname", "Name der Kampagne", "Kampagne", "Nom de la campagne", "Campagne", "Nome campagna",
    "Nome della campagna", "Campagna", "Nombre de la campaña", "Campaña", "キャンペーン名", "キャンペーン",
  ],
  adGroup: [
    "Anzeigengruppenname", "Name der Anzeigengruppe", "Anzeigengruppe", "Nom du groupe d'annonces",
    "Groupe d'annonces", "Nome gruppo di annunci", "Nome del gruppo di annunci", "Gruppo di annunci",
    "Nombre del grupo de anuncios", "Grupo de anuncios", "広告グループ名", "広告グループ",
  ],
  targeting: ["Ausrichtung", "Ciblage", "Segmentación", "ターゲティング", "キーワード"],
  matchType: [
    "Übereinstimmungstyp", "Keyword-Übereinstimmungstyp", "Type de correspondance", "Tipo di corrispondenza",
    "Tipo de concordancia", "Tipo de coincidencia", "マッチタイプ", "一致タイプ",
  ],
  searchTerm: [
    "Suchbegriff des Kunden", "Kundensuchbegriff", "Suchbegriff", "Terme de recherche client",
    "Terme de recherche du client", "Terme de recherche", "Termine di ricerca del cliente",
    "Termine di ricerca cliente", "Termine di ricerca", "Término de búsqueda del cliente",
    "Término de búsqueda de cliente", "Término de búsqueda", "カスタマーの検索キーワード",
    "カスタマー検索キーワード", "顧客の検索キーワード", "検索キーワード", "顧客の検索語句", "検索語句",
  ],
  impressions: ["Impressionen", "Sichtkontakte", "Einblendungen", "Impressioni", "Impresiones", "インプレッション", "インプレッション数", "表示回数"],
  clicks: ["Klicks", "Clics", "Clic", "クリック", "クリック数"],
  spend: ["Ausgaben", "Kosten", "Gesamtkosten", "Dépenses", "Dépense", "Coût", "Spesa", "Costo", "Gasto", "Coste", "Inversión", "広告費", "広告費用", "費用", "支出", "コスト"],
};

/**
 * Localised windowed-metric words (normalised substrings). A header counts
 * when it contains one of the words and a day count ("7 Tage", "7 jours",
 * "7日"); headers that name a rate (ACoS, ROAS, conversion rate) never count.
 */
const LOCALIZED_METRIC_WORDS = {
  sales: ["umsatz", "ventes", "vendite", "ventas", "売上"],
  orders: ["bestellungen", "commandes", "ordini", "pedidos", "注文"],
  units: ["einheiten", "unites", "unita", "unidades", "ユニット", "販売数", "個数"],
};
const LOCALIZED_TOTAL_WORDS = ["gesamt", "insgesamt", "total", "totale", "totales", "合計", "総"];
const LOCALIZED_RATE_WORDS = ["acos", "roas", "rate", "quote", "taux", "tasso", "tasa", "率", "cpc"];

/** Exact-match aliases (normalised), in priority order. */
const SEARCH_TERM_ALIASES: Record<AliasField, string[]> = {
  date: ["date", "day", "reportdate"],
  startDate: ["startdate"],
  endDate: ["enddate"],
  portfolio: ["portfolioname", "portfolio"],
  currency: ["currency", "currencycode"],
  country: ["country", "countrycode", "marketplace"],
  campaign: ["campaignname", "campaign"],
  adGroup: ["adgroupname", "adgroup"],
  targeting: ["targeting", "keyword", "keywordtext", "target", "targetingexpression", "targetingtext"],
  matchType: ["matchtype", "keywordtype"],
  searchTerm: ["customersearchterm", "searchterm", "query", "customersearchquery"],
  impressions: ["impressions", "impr"],
  clicks: ["clicks"],
  spend: ["spend", "cost", "totalspend", "totalcost", "adspend"],
};

/** Attribution-window metric patterns: capture group 1 = N days. */
const SALES_PATTERNS: RegExp[] = [/^(\d+)daytotalsales(?:click|clicks)?$/, /^sales(\d+)d$/];
const ORDERS_PATTERNS: RegExp[] = [/^(\d+)daytotalorders(?:click|clicks)?$/, /^purchases(\d+)d$/, /^orders(\d+)d$/];
const UNITS_PATTERNS: RegExp[] = [/^(\d+)daytotalunits(?:click|clicks)?$/, /^unitssoldclicks(\d+)d$/, /^unitssold(\d+)d$/, /^units(\d+)d$/];
const SALES_PLAIN = ["sales", "totalsales", "attributedsales"];
const ORDERS_PLAIN = ["orders", "purchases", "totalorders"];
const UNITS_PLAIN = ["units", "unitssold", "totalunits"];

/** Preferred attribution windows when a file carries several (Ads API v3 has 1/7/14/30). */
const ATTRIBUTION_PREFERENCE = [7, 14, 30, 1];

const BULK_ALIASES: Record<BulkField, string[]> = {
  product: ["product"],
  entity: ["entity", "recordtype"],
  operation: ["operation"],
  campaignId: ["campaignid"],
  adGroupId: ["adgroupid"],
  portfolioId: ["portfolioid"],
  adId: ["adid"],
  keywordId: ["keywordid"],
  productTargetingId: ["producttargetingid", "targetingid", "targetid"],
  campaignName: ["campaignname", "campaign"],
  campaignNameInfo: ["campaignnameinformationalonly"],
  adGroupName: ["adgroupname", "adgroup"],
  adGroupNameInfo: ["adgroupnameinformationalonly"],
  state: ["state", "status"],
  targetingType: ["targetingtype"],
  dailyBudget: ["dailybudget", "budget"],
  defaultBid: ["adgroupdefaultbid"],
  defaultBidInfo: ["adgroupdefaultbidinformationalonly"],
  bid: ["bid", "maxbid"],
  keywordText: ["keywordtext"],
  matchType: ["matchtype"],
  expression: ["producttargetingexpression"],
  resolvedExpression: ["resolvedproducttargetingexpressioninformationalonly"],
  sku: ["sku"],
  asin: ["asin"],
  asinInfo: ["asininformationalonly"],
  placement: ["placement"],
  percentage: ["percentage"],
  biddingStrategy: ["biddingstrategy"],
};

const SEARCH_TERM_REQUIRED: SearchTermField[] = ["campaign", "adGroup", "searchTerm", "clicks", "spend"];
const SEARCH_TERM_OPTIONAL: SearchTermField[] = ["impressions", "sales", "orders", "targeting", "matchType", "units"];
const BULK_REQUIRED: BulkField[] = ["entity", "campaignId"];

/* ------------------------------------------------------------- detection */

export interface Detection {
  kind: ReportKind;
  /** 0-based index of the header row in the table. */
  headerRow: number;
  /** Field → 0-based column index. */
  columns: Partial<Record<ReportField, number>>;
  /** Required fields that were not found. */
  missing: string[];
  /** Optional fields that were not found (treated as blank / 0). */
  missingOptional: string[];
  /** 7 (SP) or 14 (SB), when the sales header names it. */
  attributionDays?: number;
  /** Day/month order used for numeric dates. */
  dateOrder?: DateOrder;
  /** Decimal style used for numbers. */
  numberStyle: NumberStyle;
  /** Original header texts, in column order. */
  headers: string[];
}

export interface DetectionError {
  error: string;
}

export function isDetectionError(d: Detection | DetectionError): d is DetectionError {
  return (d as DetectionError).error !== undefined;
}

/** English aliases first, then the localised console headers (normalised once). */
const SEARCH_TERM_ALIAS_LIST: Record<AliasField, string[]> = Object.fromEntries(
  (Object.keys(SEARCH_TERM_ALIASES) as AliasField[]).map((f) => [
    f,
    [...new Set([...SEARCH_TERM_ALIASES[f], ...LOCALIZED_SEARCH_TERM_HEADERS[f].map(normalizeHeader)])],
  ]),
) as Record<AliasField, string[]>;

const LOCALIZED_PLAIN = {
  sales: ["Umsatz", "Ventes", "Vendite", "Ventas", "売上", "売上高"].map(normalizeHeader),
  orders: ["Bestellungen", "Commandes", "Ordini", "Pedidos", "注文", "注文数"].map(normalizeHeader),
  units: ["Einheiten", "Unités", "Unità", "Unidades", "販売数", "ユニット数"].map(normalizeHeader),
};
const LOCALIZED_METRIC_KEYS = {
  sales: LOCALIZED_METRIC_WORDS.sales.map(normalizeHeader),
  orders: LOCALIZED_METRIC_WORDS.orders.map(normalizeHeader),
  units: LOCALIZED_METRIC_WORDS.units.map(normalizeHeader),
};
const LOCALIZED_TOTAL_KEYS = LOCALIZED_TOTAL_WORDS.map(normalizeHeader);
const LOCALIZED_RATE_KEYS = LOCALIZED_RATE_WORDS.map(normalizeHeader);

function mapSearchTermColumns(norms: string[]): { columns: Partial<Record<SearchTermField, number>>; attributionDays?: number } {
  const columns: Partial<Record<SearchTermField, number>> = {};
  const aliasFields = Object.keys(SEARCH_TERM_ALIAS_LIST) as AliasField[];
  for (const field of aliasFields) {
    for (const alias of SEARCH_TERM_ALIAS_LIST[field]) {
      const idx = norms.indexOf(alias);
      if (idx !== -1) {
        columns[field] = idx;
        break;
      }
    }
  }
  // Windowed metrics: collect every (N, column) candidate, pick the preferred N.
  const choose = (found: Map<number, number>): { idx?: number; days?: number } | undefined => {
    for (const d of ATTRIBUTION_PREFERENCE) if (found.has(d)) return { idx: found.get(d), days: d };
    if (found.size) {
      const [d, idx] = [...found.entries()].sort((a, b) => a[0] - b[0])[0];
      return { idx, days: d };
    }
    return undefined;
  };
  const pick = (patterns: RegExp[], plain: string[], metric: keyof typeof LOCALIZED_METRIC_KEYS): { idx?: number; days?: number } => {
    const found = new Map<number, number>();
    norms.forEach((h, idx) => {
      for (const re of patterns) {
        const m = re.exec(h);
        if (m && !found.has(+m[1])) found.set(+m[1], idx);
      }
    });
    const english = choose(found);
    if (english) return english;
    for (const p of plain) {
      const idx = norms.indexOf(p);
      if (idx !== -1) return { idx };
    }
    // Localised console headers: "<word> … N <days>", total columns preferred.
    const totals = new Map<number, number>();
    const others = new Map<number, number>();
    norms.forEach((h, idx) => {
      if (!LOCALIZED_METRIC_KEYS[metric].some((w) => h.includes(w))) return;
      if (LOCALIZED_RATE_KEYS.some((w) => h.includes(w))) return;
      const n = /(\d+)/.exec(h);
      if (!n) return;
      const target = LOCALIZED_TOTAL_KEYS.some((w) => h.includes(w)) ? totals : others;
      if (!target.has(+n[1])) target.set(+n[1], idx);
    });
    const local = choose(totals) ?? choose(others);
    if (local) return local;
    for (const p of LOCALIZED_PLAIN[metric]) {
      const idx = norms.indexOf(p);
      if (idx !== -1) return { idx };
    }
    return {};
  };
  const sales = pick(SALES_PATTERNS, SALES_PLAIN, "sales");
  const orders = pick(ORDERS_PATTERNS, ORDERS_PLAIN, "orders");
  const units = pick(UNITS_PATTERNS, UNITS_PLAIN, "units");
  if (sales.idx !== undefined) columns.sales = sales.idx;
  if (orders.idx !== undefined) columns.orders = orders.idx;
  if (units.idx !== undefined) columns.units = units.idx;
  // Ads API v3 names targeting "targeting" and keyword text "keyword"; if both
  // exist the alias order above already prefers "targeting".
  return { columns, attributionDays: sales.days ?? orders.days };
}

function mapBulkColumns(norms: string[]): Partial<Record<BulkField, number>> {
  const columns: Partial<Record<BulkField, number>> = {};
  for (const field of Object.keys(BULK_ALIASES) as BulkField[]) {
    for (const alias of BULK_ALIASES[field]) {
      const idx = norms.indexOf(alias);
      if (idx !== -1) {
        columns[field] = idx;
        break;
      }
    }
  }
  return columns;
}

function scoreSearchTerm(columns: Partial<Record<SearchTermField, number>>): number {
  let s = 0;
  for (const f of Object.keys(columns)) if (columns[f as SearchTermField] !== undefined) s++;
  return s;
}

/**
 * Detect report kind, header row and column mapping. Scans the first 15 rows
 * for the best header candidate so title / filter rows above it are ignored.
 */
export function detectReport(rows: string[][]): Detection | DetectionError {
  if (!rows.length) return { error: "The file is empty." };
  const scan = Math.min(rows.length, 15);
  let best: { row: number; kind: ReportKind; score: number } | null = null;

  for (let r = 0; r < scan; r++) {
    const norms = rows[r].map((h) => normalizeHeader(h ?? ""));
    const bulk = mapBulkColumns(norms);
    const isBulk = bulk.entity !== undefined && bulk.campaignId !== undefined && (bulk.operation !== undefined || bulk.product !== undefined);
    if (isBulk) {
      const score = 100 + Object.keys(bulk).length;
      if (!best || score > best.score) best = { row: r, kind: "bulk", score };
      continue;
    }
    const st = mapSearchTermColumns(norms);
    if (st.columns.searchTerm === undefined) continue;
    const score = scoreSearchTerm(st.columns);
    if (score >= 3 && (!best || score > best.score)) best = { row: r, kind: "search-term", score };
  }

  if (!best) {
    return {
      error:
        "Could not find a Search Term Report or bulk file header in the first 15 rows. " +
        "Expected columns like “Customer Search Term”, “Clicks”, “Spend” — or “Entity”, “Operation”, “Campaign ID” for a bulk file.",
    };
  }

  const headers = rows[best.row].map((h) => (h ?? "").trim());
  const norms = headers.map(normalizeHeader);
  const body = rows.slice(best.row + 1);

  if (best.kind === "bulk") {
    const columns = mapBulkColumns(norms);
    const missing = BULK_REQUIRED.filter((f) => columns[f] === undefined);
    const numberCols = (["bid", "defaultBid", "dailyBudget"] as BulkField[]).map((f) => columns[f]).filter((i): i is number => i !== undefined);
    return {
      kind: "bulk",
      headerRow: best.row,
      columns,
      missing,
      missingOptional: (["keywordText", "matchType", "bid", "adGroupId"] as BulkField[]).filter((f) => columns[f] === undefined),
      numberStyle: detectNumberStyle(columnValues(body, numberCols)),
      headers,
    };
  }

  const { columns, attributionDays } = mapSearchTermColumns(norms);
  const missing: string[] = SEARCH_TERM_REQUIRED.filter((f) => columns[f] === undefined);
  if (columns.date === undefined && columns.startDate === undefined) missing.unshift("date");
  const missingOptional = SEARCH_TERM_OPTIONAL.filter((f) => columns[f] === undefined);

  const dateCols = [columns.date, columns.startDate, columns.endDate].filter((i): i is number => i !== undefined);
  const hint = {
    currency: columns.currency !== undefined ? firstNonEmpty(body, columns.currency) : undefined,
    country: columns.country !== undefined ? firstNonEmpty(body, columns.country) : undefined,
  };
  const dateOrder = detectDateOrder(columnValues(body, dateCols), hint);
  const numberCols = (["spend", "sales", "impressions", "clicks"] as SearchTermField[])
    .map((f) => columns[f])
    .filter((i): i is number => i !== undefined);

  return {
    kind: "search-term",
    headerRow: best.row,
    columns,
    missing,
    missingOptional,
    attributionDays,
    dateOrder,
    numberStyle: detectNumberStyle(columnValues(body, numberCols)),
    headers,
  };
}

function* columnValues(rows: string[][], cols: number[]): Generator<string> {
  for (const row of rows) for (const c of cols) {
    const v = row[c];
    if (v) yield v;
  }
}

function firstNonEmpty(rows: string[][], col: number): string | undefined {
  for (const row of rows) {
    const v = (row[col] ?? "").trim();
    if (v) return v;
  }
  return undefined;
}

/* ------------------------------------------------------ search-term rows */

export interface ConvertContext {
  storeId: string;
  batchId: string;
}

const MAX_ERRORS = 200;

function pushError(errors: ImportError[], row: number, message: string) {
  if (errors.length < MAX_ERRORS) errors.push({ row, message });
}

/**
 * Convert a detected Search Term Report table into rows. Duplicate natural keys
 * inside one file are merged by summing their counters. Blank lines and
 * "Total" footer rows are skipped silently. Error row numbers are 1-based data
 * rows (the first row under the header is 1).
 */
export function toSearchTermRows(
  table: string[][],
  detection: Detection,
  ctx: ConvertContext,
): { rows: SearchTermRow[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  if (detection.kind !== "search-term") {
    return { rows: [], errors: [{ row: 0, message: "This file is a bulk file, not a Search Term Report." }] };
  }
  if (detection.missing.length) {
    return { rows: [], errors: [{ row: 0, message: `Missing required column(s): ${detection.missing.join(", ")}.` }] };
  }
  const c = detection.columns;
  const style = detection.numberStyle;
  const order = detection.dateOrder ?? "MDY";
  const byKey = new Map<string, SearchTermRow>();
  const cell = (row: string[], idx: number | undefined) => (idx === undefined ? "" : (row[idx] ?? "").trim());
  const num = (row: string[], idx: number | undefined, dataRow: number, label: string): number => {
    if (idx === undefined) return 0;
    const n = parseNumber(row[idx] ?? "", style);
    if (Number.isNaN(n)) {
      pushError(errors, dataRow, `${label}: “${row[idx]}” is not a number (counted as 0).`);
      return 0;
    }
    return n;
  };

  for (let i = detection.headerRow + 1; i < table.length; i++) {
    const row = table[i];
    const dataRow = i - detection.headerRow;
    const campaign = cell(row, c.campaign);
    const adGroup = cell(row, c.adGroup);
    const searchTerm = cell(row, c.searchTerm);
    if (!campaign && !adGroup && !searchTerm) continue; // blank or footer
    if (/^(grand )?totals?:?$/i.test(campaign) || /^(grand )?totals?:?$/i.test(searchTerm)) continue;

    const rawDate = cell(row, c.date ?? c.startDate);
    const date = parseDate(rawDate, order);
    if (!date) {
      pushError(errors, dataRow, rawDate ? `Unrecognised date “${rawDate}”.` : "Missing date.");
      continue;
    }
    let endDate: string | undefined;
    if (c.date === undefined && c.endDate !== undefined) {
      const rawEnd = cell(row, c.endDate);
      const e = parseDate(rawEnd, order);
      if (rawEnd && !e) {
        pushError(errors, dataRow, `Unrecognised end date “${rawEnd}”.`);
        continue;
      }
      if (e && e < date) {
        pushError(errors, dataRow, `End date ${e} is before start date ${date}.`);
        continue;
      }
      if (e && e !== date) endDate = e;
    }
    if (!searchTerm) {
      pushError(errors, dataRow, "Missing search term.");
      continue;
    }
    if (!campaign) {
      pushError(errors, dataRow, "Missing campaign name.");
      continue;
    }
    const targeting = cell(row, c.targeting);
    const matchType = c.matchType === undefined && !targeting ? "unknown" : normalizeMatchType(cell(row, c.matchType), targeting);
    const impressions = num(row, c.impressions, dataRow, "Impressions");
    const clicks = num(row, c.clicks, dataRow, "Clicks");
    const spend = num(row, c.spend, dataRow, "Spend");
    const sales = num(row, c.sales, dataRow, "Sales");
    const orders = num(row, c.orders, dataRow, "Orders");
    const units = c.units === undefined ? orders : num(row, c.units, dataRow, "Units");
    const portfolio = cell(row, c.portfolio) || undefined;
    const currency = cell(row, c.currency) || undefined;

    const rec: SearchTermRow = {
      key: "",
      storeId: ctx.storeId,
      batchId: ctx.batchId,
      date,
      ...(endDate ? { endDate } : {}),
      ...(portfolio && portfolio !== "-" ? { portfolio } : {}),
      campaign,
      adGroup,
      targeting,
      matchType,
      searchTerm,
      ...(currency ? { currency: currency.toUpperCase() } : {}),
      impressions,
      clicks,
      spend,
      sales,
      orders,
      units,
    };
    rec.key = searchTermKey(rec);
    const existing = byKey.get(rec.key);
    if (existing) {
      existing.impressions += impressions;
      existing.clicks += clicks;
      existing.spend += spend;
      existing.sales += sales;
      existing.orders += orders;
      existing.units += units;
    } else {
      byKey.set(rec.key, rec);
    }
  }
  const rows = [...byKey.values()];
  for (const r of rows) {
    r.spend = round6(r.spend);
    r.sales = round6(r.sales);
  }
  return { rows, errors };
}

function round6(n: number): number {
  return Math.round(n * 1e6) / 1e6;
}

/* --------------------------------------------------------------- bulk rows */

const ENTITY_MAP: Record<string, BulkEntityType> = {
  campaign: "Campaign",
  adgroup: "Ad Group",
  productad: "Product Ad",
  keyword: "Keyword",
  negativekeyword: "Negative Keyword",
  campaignnegativekeyword: "Campaign Negative Keyword",
  producttargeting: "Product Targeting",
  negativeproducttargeting: "Negative Product Targeting",
  campaignnegativeproducttargeting: "Negative Product Targeting",
  biddingadjustment: "Bidding Adjustment",
};

export function normalizeEntity(raw: string): BulkEntityType {
  return ENTITY_MAP[normalizeHeader(raw)] ?? "Other";
}

/**
 * True for a scientific-notation ID whose digits were lost: a CSV re-saved
 * from Excel writes 15-digit IDs the way General format displays them
 * ("1.44383E+14", 6 significant digits). Full-precision forms such as
 * "1.44382946392851E+14" (xlsx XML) are not lossy.
 */
export function isLossyId(raw: string): boolean {
  const m = /^(\d+)(?:\.(\d+))?e\+?(\d+)$/i.exec(raw.trim());
  if (!m) return false;
  const intPart = m[1].replace(/^0+/, "");
  const significant = (intPart + (m[2] ?? "")).replace(/^0+/, "").length;
  const totalDigits = (intPart.length || 1) + Number(m[3]);
  // ≥ 12 written digits means the writer printed at full precision (trailing zeros are real).
  return significant < totalDigits && significant <= 11;
}

/** IDs sometimes arrive as numbers in scientific notation from xlsx; restore the digits (only when lossless). */
export function cleanId(raw: string): string {
  const s = raw.trim();
  if (/^\d+(\.\d+)?e\+?\d+$/i.test(s) && !isLossyId(s)) {
    const n = Number(s);
    if (Number.isSafeInteger(n)) return String(n);
  }
  if (/^\d+\.0+$/.test(s)) return s.replace(/\.0+$/, "");
  return s;
}

/**
 * Convert a detected bulk sheet into entities. Only Sponsored Products rows are
 * kept (blank Product counts as SP). Campaign / ad group names prefer the
 * "(Informational only)" columns, which Amazon fills on every child row.
 */
export function toBulkEntities(
  table: string[][],
  detection: Detection,
  ctx: ConvertContext,
): { entities: BulkEntity[]; errors: ImportError[] } {
  const errors: ImportError[] = [];
  if (detection.kind !== "bulk") {
    return { entities: [], errors: [{ row: 0, message: "This file is a Search Term Report, not a bulk file." }] };
  }
  if (detection.missing.length) {
    return { entities: [], errors: [{ row: 0, message: `Missing required column(s): ${detection.missing.join(", ")}.` }] };
  }
  const c = detection.columns as Partial<Record<BulkField, number>>;
  const style = detection.numberStyle;
  const cell = (row: string[], idx: number | undefined) => (idx === undefined ? "" : (row[idx] ?? "").trim());
  const optNum = (row: string[], idx: number | undefined): number | undefined => {
    const v = cell(row, idx);
    if (!v) return undefined;
    const n = parseNumber(v, style);
    return Number.isFinite(n) ? n : undefined;
  };
  const out: BulkEntity[] = [];
  const seen = new Set<string>();
  const lostDigits = (label: string, raw: string) =>
    `${label} “${raw}” lost digits (Excel scientific notation) — download the bulk file again as .xlsx and import it without re-saving it in Excel.`;
  /** A cleaned ID, or "" (with an import error) when Excel truncated it. */
  const idCell = (row: string[], idx: number | undefined, label: string, dataRow: number): string => {
    const raw = cell(row, idx);
    if (raw && isLossyId(raw)) {
      pushError(errors, dataRow, lostDigits(label, raw));
      return "";
    }
    return cleanId(raw);
  };

  for (let i = detection.headerRow + 1; i < table.length; i++) {
    const row = table[i];
    const dataRow = i - detection.headerRow;
    const product = cell(row, c.product);
    if (product && !/sponsored\s*products/i.test(product)) continue;
    const entityRaw = cell(row, c.entity);
    if (!entityRaw) continue;
    const entity = normalizeEntity(entityRaw);
    const rawCampaignId = cell(row, c.campaignId);
    if (rawCampaignId && isLossyId(rawCampaignId)) {
      pushError(errors, dataRow, `${entityRaw} row skipped: ${lostDigits("Campaign ID", rawCampaignId)}`);
      continue;
    }
    const campaignId = cleanId(rawCampaignId);
    if (!campaignId) {
      pushError(errors, dataRow, `${entityRaw} row has no Campaign ID.`);
      continue;
    }
    const campaignName = cell(row, c.campaignNameInfo) || cell(row, c.campaignName);
    const adGroupName = cell(row, c.adGroupNameInfo) || cell(row, c.adGroupName);
    const e: BulkEntity = {
      key: "",
      storeId: ctx.storeId,
      batchId: ctx.batchId,
      entity,
      campaignId,
      campaignName,
    };
    const set = <K extends keyof BulkEntity>(k: K, v: BulkEntity[K] | "" | undefined) => {
      if (v !== undefined && v !== "") e[k] = v as BulkEntity[K];
    };
    set("adGroupId", idCell(row, c.adGroupId, "Ad Group ID", dataRow));
    set("adId", idCell(row, c.adId, "Ad ID", dataRow));
    set("keywordId", idCell(row, c.keywordId, "Keyword ID", dataRow));
    set("productTargetingId", idCell(row, c.productTargetingId, "Product Targeting ID", dataRow));
    set("portfolioId", idCell(row, c.portfolioId, "Portfolio ID", dataRow));
    set("adGroupName", adGroupName);
    set("state", cell(row, c.state).toLowerCase());
    set("targetingType", cell(row, c.targetingType));
    set("dailyBudget", optNum(row, c.dailyBudget));
    set("defaultBid", optNum(row, c.defaultBid) ?? optNum(row, c.defaultBidInfo));
    set("bid", optNum(row, c.bid));
    set("keywordText", cell(row, c.keywordText));
    set("matchType", cell(row, c.matchType));
    set("expression", cell(row, c.expression) || cell(row, c.resolvedExpression));
    set("sku", cell(row, c.sku));
    set("asin", cell(row, c.asin) || cell(row, c.asinInfo));
    set("placement", cell(row, c.placement));
    set("percentage", optNum(row, c.percentage));
    set("biddingStrategy", cell(row, c.biddingStrategy));
    let key = bulkEntityKey(e);
    if (seen.has(key)) key = `${key}#${dataRow}`;
    seen.add(key);
    e.key = key;
    out.push(e);
  }
  return { entities: out, errors };
}

/* ------------------------------------------------------------- file routing */

export interface ParsedTable {
  /** Sheet name for xlsx input. */
  sheet?: string;
  rows: string[][];
  detection: Detection | DetectionError;
}

export interface ParsedFile {
  name: string;
  format: "csv" | "xlsx";
  tables: ParsedTable[];
  /** Fatal problem with the file as a whole (no tables). */
  error?: string;
}

type TextEncoding = "utf-16le" | "utf-16be" | "utf-8" | "shift_jis" | "windows-1252";

/** Strict Shift_JIS (cp932) decode; null when the bytes are not valid Shift_JIS or the runtime lacks the codec. */
function decodeShiftJis(bytes: Uint8Array): string | null {
  try {
    return new TextDecoder("shift_jis", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** Two full-width kana in a row: never produced by Latin-1 text read as Shift_JIS. */
const KANA_RUN_RE = /[ぁ-ヿ]{2}/;

/**
 * BOM'd UTF-16, else strict UTF-8, else Shift_JIS when it decodes cleanly and
 * yields Japanese kana (a JP report re-saved from Japanese Excel as "CSV"),
 * else Windows-1252. Shift_JIS is never tried blindly: many Latin-1 byte
 * sequences are also valid Shift_JIS, so EU files would be corrupted.
 */
function decodeText(bytes: Uint8Array): { text: string; encoding: TextEncoding } {
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return { text: new TextDecoder("utf-16le").decode(bytes.subarray(2)), encoding: "utf-16le" };
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return { text: new TextDecoder("utf-16be").decode(bytes.subarray(2)), encoding: "utf-16be" };
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(bytes), encoding: "utf-8" };
  } catch {
    const sjis = decodeShiftJis(bytes);
    if (sjis !== null && KANA_RUN_RE.test(sjis)) return { text: sjis, encoding: "shift_jis" };
    try {
      return { text: new TextDecoder("windows-1252").decode(bytes), encoding: "windows-1252" };
    } catch {
      return { text: new TextDecoder("utf-8").decode(bytes), encoding: "utf-8" };
    }
  }
}

/** A detected Search Term Report whose Currency / Country column says Japan. */
function japaneseReport(rows: string[][], d: Detection | DetectionError): boolean {
  if (isDetectionError(d) || d.kind !== "search-term") return false;
  const body = rows.slice(d.headerRow + 1);
  const cols = d.columns as Partial<Record<SearchTermField, number>>;
  const currency = cols.currency !== undefined ? firstNonEmpty(body, cols.currency) : undefined;
  const country = cols.country !== undefined ? firstNonEmpty(body, cols.country) : undefined;
  return (currency ?? "").toUpperCase() === "JPY" || countryCode(country) === "JP";
}

const SP_SHEET_RE = /^sponsored\s*products\s*campaigns?$/i;

/**
 * Parse an uploaded file. Content is sniffed: `PK\x03\x04` → xlsx, OLE2 → a
 * helpful error for legacy .xls, anything else → delimited text.
 *
 * For workbooks the "Sponsored Products Campaigns" sheet is used when present;
 * otherwise every sheet is detected and the first bulk-looking sheet (one with
 * an Entity column) or search-term sheet is returned first.
 */
export async function parseFile(name: string, bytes: Uint8Array): Promise<ParsedFile> {
  if (bytes.length >= 4 && bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0) {
    return { name, format: "xlsx", tables: [], error: "Legacy .xls files are not supported — open it in Excel and save as .xlsx or .csv." };
  }
  if (isZip(bytes)) {
    let sheets: { name: string; rows: string[][] }[];
    try {
      sheets = (await readXlsx(bytes, { include: (n) => SP_SHEET_RE.test(n.trim()) })).sheets;
      if (!sheets.length) sheets = (await readXlsx(bytes)).sheets;
    } catch (err) {
      return { name, format: "xlsx", tables: [], error: `Could not read the workbook: ${(err as Error).message}` };
    }
    const tables: ParsedTable[] = sheets.map((s) => ({ sheet: s.name, rows: s.rows, detection: detectReport(s.rows) }));
    // Order: detected bulk sheets, then search-term sheets, then failures.
    const rank = (t: ParsedTable) => (isDetectionError(t.detection) ? 2 : t.detection.kind === "bulk" ? 0 : 1);
    tables.sort((a, b) => rank(a) - rank(b));
    return { name, format: "xlsx", tables };
  }
  const decoded = decodeText(bytes);
  let rows = parseCsv(decoded.text);
  let detection = detectReport(rows);
  // Kanji-only Japanese text has no kana to recognise: a JPY / JP report read as
  // Windows-1252 is re-read as Shift_JIS when the bytes are valid Shift_JIS.
  if (decoded.encoding === "windows-1252" && japaneseReport(rows, detection)) {
    const sjis = decodeShiftJis(bytes);
    if (sjis !== null) {
      rows = parseCsv(sjis);
      detection = detectReport(rows);
    }
  }
  return { name, format: "csv", tables: [{ rows, detection }] };
}

/* ----------------------------------------------------------- store hints */

const CURRENCY_COUNTRY: Record<string, string> = {
  USD: "US",
  GBP: "UK",
  CAD: "CA",
  MXN: "MX",
  INR: "IN",
  JPY: "JP",
  AUD: "AU",
  BRL: "BR",
  AED: "AE",
  SAR: "SA",
  SEK: "SE",
  PLN: "PL",
  TRY: "TR",
  SGD: "SG",
  EGP: "EG",
};

export interface StoreSuggestion {
  currency?: string;
  country?: string;
  /** True when the country was inferred from the currency rather than read from a column. */
  countryInferred?: boolean;
}

function mostCommon(rows: string[][], col: number | undefined, start: number): string | undefined {
  if (col === undefined) return undefined;
  const counts = new Map<string, number>();
  for (let i = start; i < rows.length; i++) {
    const v = (rows[i][col] ?? "").trim();
    if (!v) continue;
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  let best: string | undefined;
  let n = 0;
  for (const [v, k] of counts) if (k > n) {
    best = v;
    n = k;
  }
  return best;
}

/**
 * Suggest a store (currency / country) from a report's Currency / Country
 * columns, or from parsed rows' `currency` field. The UI pre-selects a store
 * with that currency + marketplace.
 */
export function suggestStore(input: { table: string[][]; detection: Detection } | SearchTermRow[]): StoreSuggestion {
  let currency: string | undefined;
  let country: string | undefined;
  if (Array.isArray(input)) {
    const counts = new Map<string, number>();
    for (const r of input) if (r.currency) counts.set(r.currency, (counts.get(r.currency) ?? 0) + 1);
    currency = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  } else {
    const { table, detection } = input;
    const cols = detection.columns as Partial<Record<SearchTermField, number>>;
    currency = mostCommon(table, cols.currency, detection.headerRow + 1);
    country = mostCommon(table, cols.country, detection.headerRow + 1);
  }
  const out: StoreSuggestion = {};
  if (currency) out.currency = currency.toUpperCase();
  // Country names / domains map to marketplace codes ("United States" → US,
  // "France" → FR); an unrecognised value is ignored in favour of the currency.
  const code = countryCode(country);
  if (code) {
    out.country = code;
  } else if (out.currency && CURRENCY_COUNTRY[out.currency]) {
    out.country = CURRENCY_COUNTRY[out.currency];
    out.countryInferred = true;
  }
  return out;
}

/** Convenience: detect + convert a table in one step. */
export function convertTable(
  table: string[][],
  ctx: ConvertContext,
): { detection: Detection | DetectionError; rows: SearchTermRow[]; entities: BulkEntity[]; errors: ImportError[] } {
  const detection = detectReport(table);
  if (isDetectionError(detection)) return { detection, rows: [], entities: [], errors: [{ row: 0, message: detection.error }] };
  if (detection.kind === "bulk") {
    const { entities, errors } = toBulkEntities(table, detection, ctx);
    return { detection, rows: [], entities, errors };
  }
  const { rows, errors } = toSearchTermRows(table, detection, ctx);
  return { detection, rows, entities: [], errors };
}

/** Date span of parsed rows (endDate-aware). */
export function rowsDateSpan(rows: SearchTermRow[]): { from?: string; to?: string } {
  let from: string | undefined;
  let to: string | undefined;
  for (const r of rows) {
    const end = r.endDate ?? r.date;
    if (!from || r.date < from) from = r.date;
    if (!to || end > to) to = end;
  }
  return { from, to };
}

