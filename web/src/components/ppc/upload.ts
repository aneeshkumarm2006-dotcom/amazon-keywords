/**
 * Upload analysis: bytes → detected report → typed rows, plus everything the
 * import screen shows before anything is written (kind, sheet, row counts,
 * date span, missing columns, errors, store suggestion).
 *
 * Pure and DOM-free so it runs inside `parse.worker.ts` (the normal path) or
 * on the main thread (fallback). Relative engine imports on purpose: the
 * worker bundle should not pull in db.ts or React.
 *
 * Rows are converted against a placeholder store/batch id; `importRows` /
 * `importBulk` re-key them onto the real store when the user imports.
 */

import {
  isDetectionError,
  parseFile,
  rowsDateSpan,
  suggestStore,
  toBulkEntities,
  toSearchTermRows,
  type Detection,
  type ParsedFile,
  type ParsedTable,
  type StoreSuggestion,
} from "../../lib/ppc/detect";
import type { DateOrder, NumberStyle } from "../../lib/ppc/parse";
import type { BulkEntity, BulkEntityType, ImportError, ReportKind, SearchTermRow } from "../../lib/ppc/types";

export const PENDING_STORE = "__pending__";
export const PENDING_BATCH = "__pending__";

export type UploadStage = "reading" | "parsing" | "converting";

export interface SheetInfo {
  name?: string;
  kind?: ReportKind;
  error?: string;
  used: boolean;
}

export interface UploadAnalysis {
  name: string;
  size: number;
  format?: "csv" | "xlsx";
  /** Detected kind, when a header row was found at all. */
  kind?: ReportKind;
  /** True when there is something to import. */
  importable: boolean;
  /** File-level problem (legacy .xls, unreadable workbook, no header found, no data). */
  fatal?: string;
  /** Sheet the data came from (xlsx). */
  sheet?: string;
  sheets: SheetInfo[];
  /** Required columns that are missing (kind detected but not importable). */
  missing: string[];
  missingOptional: string[];
  /** Field → the header text it was read from. */
  columnMap: { field: string; header: string }[];
  /** Non-blank lines under the header. */
  dataRows: number;
  rows: SearchTermRow[];
  entities: BulkEntity[];
  /** Lengths of `rows` / `entities` before they were trimmed to a preview (set after import). */
  fullCounts?: { rows: number; entities: number };
  /** Row-level problems (capped at 200 by the engine). */
  errors: ImportError[];
  dateFrom?: string;
  dateTo?: string;
  /** Rows that cover a period (summary report) rather than one day. */
  summaryRows: number;
  attributionDays?: number;
  dateOrder?: DateOrder;
  numberStyle?: NumberStyle;
  suggestion: StoreSuggestion;
  /** Distinct currencies in the rows. */
  currencies: string[];
  entityCounts: Partial<Record<BulkEntityType, number>>;
  /** Distinct campaign IDs / lower-cased names (up to 500 each) — used to match the file to a store. */
  campaigns: { ids: string[]; names: string[] };
  parseMs: number;
}

const FIELD_LABELS: Record<string, string> = {
  date: "Date",
  startDate: "Start date",
  endDate: "End date",
  portfolio: "Portfolio",
  currency: "Currency",
  country: "Country",
  campaign: "Campaign",
  adGroup: "Ad group",
  targeting: "Targeting",
  matchType: "Match type",
  searchTerm: "Search term",
  impressions: "Impressions",
  clicks: "Clicks",
  spend: "Spend",
  sales: "Sales",
  orders: "Orders",
  units: "Units",
  product: "Product",
  entity: "Entity",
  operation: "Operation",
  campaignId: "Campaign ID",
  adGroupId: "Ad group ID",
  portfolioId: "Portfolio ID",
  adId: "Ad ID",
  keywordId: "Keyword ID",
  productTargetingId: "Product targeting ID",
  campaignName: "Campaign name",
  campaignNameInfo: "Campaign name (info)",
  adGroupName: "Ad group name",
  adGroupNameInfo: "Ad group name (info)",
  state: "State",
  targetingType: "Targeting type",
  dailyBudget: "Daily budget",
  defaultBid: "Ad group default bid",
  defaultBidInfo: "Ad group default bid (info)",
  bid: "Bid",
  keywordText: "Keyword text",
  expression: "Product targeting expression",
  resolvedExpression: "Resolved expression",
  sku: "SKU",
  asin: "ASIN",
  asinInfo: "ASIN (info)",
  placement: "Placement",
  percentage: "Percentage",
  biddingStrategy: "Bidding strategy",
};

export function fieldLabel(field: string): string {
  return FIELD_LABELS[field] ?? field;
}

function countDataRows(rows: string[][], headerRow: number): number {
  let n = 0;
  for (let i = headerRow + 1; i < rows.length; i++) {
    const r = rows[i];
    for (const c of r) {
      if (c && c.trim()) {
        n++;
        break;
      }
    }
  }
  return n;
}

const CAMPAIGN_SAMPLE = 500;

function distinctCampaigns(list: { id?: string; name?: string }[]): { ids: string[]; names: string[] } {
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const c of list) {
    if (c.id && ids.size < CAMPAIGN_SAMPLE) ids.add(c.id);
    const n = (c.name ?? "").replace(/\s+/g, " ").trim().toLowerCase();
    if (n && names.size < CAMPAIGN_SAMPLE) names.add(n);
    if (ids.size >= CAMPAIGN_SAMPLE && names.size >= CAMPAIGN_SAMPLE) break;
  }
  return { ids: [...ids], names: [...names] };
}

function importableScore(t: ParsedTable): number {
  if (isDetectionError(t.detection)) return 0;
  return t.detection.missing.length ? 1 : 2;
}

function now(): number {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function emptyAnalysis(name: string, size: number): UploadAnalysis {
  return {
    name,
    size,
    importable: false,
    sheets: [],
    missing: [],
    missingOptional: [],
    columnMap: [],
    dataRows: 0,
    rows: [],
    entities: [],
    errors: [],
    summaryRows: 0,
    suggestion: {},
    currencies: [],
    entityCounts: {},
    campaigns: { ids: [], names: [] },
    parseMs: 0,
  };
}

/** Parse, detect and convert one uploaded file. Never throws for bad input. */
export async function processUpload(
  name: string,
  size: number,
  bytes: Uint8Array,
  onStage?: (stage: UploadStage) => void,
): Promise<UploadAnalysis> {
  const t0 = now();
  const out = emptyAnalysis(name, size);
  onStage?.("parsing");
  let parsed: ParsedFile;
  try {
    parsed = await parseFile(name, bytes);
  } catch (err) {
    out.fatal = `Could not read this file: ${err instanceof Error ? err.message : String(err)}`;
    out.parseMs = now() - t0;
    return out;
  }
  out.format = parsed.format;
  if (parsed.error) {
    out.fatal = parsed.error;
    out.parseMs = now() - t0;
    return out;
  }
  if (!parsed.tables.length) {
    out.fatal = "The workbook has no sheets with data.";
    out.parseMs = now() - t0;
    return out;
  }

  // Best table: fully importable first, then detected-but-incomplete, then failures.
  let table = parsed.tables[0];
  for (const t of parsed.tables) if (importableScore(t) > importableScore(table)) table = t;
  out.sheet = table.sheet;
  out.sheets = parsed.tables.map((t) => ({
    name: t.sheet,
    kind: isDetectionError(t.detection) ? undefined : t.detection.kind,
    error: isDetectionError(t.detection) ? t.detection.error : undefined,
    used: t === table,
  }));

  if (isDetectionError(table.detection)) {
    out.fatal = table.detection.error;
    out.parseMs = now() - t0;
    return out;
  }
  const det: Detection = table.detection;
  out.kind = det.kind;
  out.missing = det.missing;
  out.missingOptional = det.missingOptional;
  out.attributionDays = det.attributionDays;
  out.dateOrder = det.dateOrder;
  out.numberStyle = det.numberStyle;
  out.dataRows = countDataRows(table.rows, det.headerRow);
  out.columnMap = Object.entries(det.columns)
    .filter((e): e is [string, number] => typeof e[1] === "number")
    .sort((a, b) => a[1] - b[1])
    .map(([field, idx]) => ({ field, header: det.headers[idx] ?? "" }));

  if (det.missing.length) {
    out.parseMs = now() - t0;
    return out;
  }

  onStage?.("converting");
  const ctx = { storeId: PENDING_STORE, batchId: PENDING_BATCH };
  if (det.kind === "search-term") {
    const { rows, errors } = toSearchTermRows(table.rows, det, ctx);
    out.rows = rows;
    out.errors = errors;
    const span = rowsDateSpan(rows);
    out.dateFrom = span.from;
    out.dateTo = span.to;
    let summary = 0;
    const cur = new Set<string>();
    for (const r of rows) {
      if (r.endDate) summary++;
      if (r.currency) cur.add(r.currency);
    }
    out.summaryRows = summary;
    out.currencies = [...cur].sort();
    const fromTable = suggestStore({ table: table.rows, detection: det });
    out.suggestion = fromTable.currency || fromTable.country ? fromTable : suggestStore(rows);
    out.campaigns = distinctCampaigns(rows.map((r) => ({ name: r.campaign })));
    out.importable = rows.length > 0;
    if (!rows.length) {
      out.fatal = errors.length
        ? "No row could be read — see the problems below."
        : "The header was found but there are no data rows under it.";
    }
  } else {
    const { entities, errors } = toBulkEntities(table.rows, det, ctx);
    out.entities = entities;
    out.errors = errors;
    const counts: Partial<Record<BulkEntityType, number>> = {};
    for (const e of entities) counts[e.entity] = (counts[e.entity] ?? 0) + 1;
    out.entityCounts = counts;
    out.campaigns = distinctCampaigns(entities.map((e) => ({ id: e.campaignId, name: e.campaignName })));
    out.importable = entities.length > 0;
    if (!entities.length) {
      out.fatal = errors.length
        ? "No Sponsored Products row could be read — see the problems below."
        : "No Sponsored Products rows were found. Download the bulk file with Sponsored Products data included.";
    }
  }
  out.parseMs = now() - t0;
  return out;
}
