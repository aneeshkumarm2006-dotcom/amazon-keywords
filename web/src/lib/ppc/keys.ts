/**
 * Natural keys and text normalisation.
 *
 * Keys are lower-cased, trimmed and have internal whitespace collapsed, so the
 * same row imported twice (or from CSV and from XLSX) lands on the same record.
 * Formats follow the comments in `types.ts`.
 */

import type { ActionType, BulkEntity, SearchTermRow } from "./types";

/** Lower-case, trim and collapse runs of whitespace (incl. NBSP) to one space. */
export function norm(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/[\s\xa0]+/g, " ").trim().toLowerCase();
}

/** store|date|endDate|campaign|adGroup|targeting|matchType|searchTerm */
export function searchTermKey(
  row: Pick<SearchTermRow, "storeId" | "date" | "endDate" | "campaign" | "adGroup" | "targeting" | "matchType" | "searchTerm">,
): string {
  return [
    row.storeId,
    row.date,
    row.endDate ?? "",
    row.campaign,
    row.adGroup,
    row.targeting,
    row.matchType,
    row.searchTerm,
  ]
    .map(norm)
    .join("|");
}

/**
 * store|entity|campaignId|adGroupId|keywordId|productTargetingId|adId
 * Bidding Adjustment rows (one per placement) append `|placement`.
 */
export function bulkEntityKey(
  e: Pick<BulkEntity, "storeId" | "entity" | "campaignId" | "adGroupId" | "keywordId" | "productTargetingId" | "adId"> & {
    placement?: string;
  },
): string {
  const parts = [e.storeId, e.entity, e.campaignId, e.adGroupId ?? "", e.keywordId ?? "", e.productTargetingId ?? "", e.adId ?? ""];
  if (e.placement) parts.push(e.placement);
  return parts.map(norm).join("|");
}

/** storeId|action|campaign|adGroup|termOrTarget */
export function recommendationId(
  storeId: string,
  action: ActionType,
  campaign: string,
  adGroup: string,
  subject: string,
): string {
  return [storeId, action, campaign, adGroup, subject].map(norm).join("|");
}

/** campaign|adGroup|searchTerm — the search-term aggregation key. */
export function termKey(campaign: string, adGroup: string, searchTerm: string): string {
  return `${norm(campaign)}|${norm(adGroup)}|${norm(searchTerm)}`;
}

/** campaign|adGroup|targeting|matchType — the target aggregation key. */
export function targetKey(campaign: string, adGroup: string, targeting: string, matchType: string): string {
  return `${norm(campaign)}|${norm(adGroup)}|${normTargeting(targeting)}|${norm(matchType)}`;
}

/** campaign|adGroup */
export function adGroupKey(campaign: string, adGroup: string): string {
  return `${norm(campaign)}|${norm(adGroup)}`;
}

/**
 * Normalise a targeting expression so report text and bulk text compare equal:
 * `asin="B0ABC"`, `ASIN = "b0abc"` and `asin=B0ABC` all become `asin="b0abc"`.
 * Keyword text is only lower-cased / whitespace-collapsed.
 */
export function normTargeting(value: string | undefined | null): string {
  const s = norm(value);
  if (!s) return s;
  if (s.indexOf("=") === -1) return s;
  // Drop spaces around '=' and normalise quotes (straight / curly / none).
  return s
    .replace(CURLY_QUOTES, '"')
    .replace(/\s*=\s*/g, "=")
    .replace(/=([^"\s][^\s]*)/g, '="$1"')
    .replace(/"\s+/g, '" ')
    .trim();
}

/** Curly double quotes and the double-prime some spreadsheets substitute for '"'. */
const CURLY_QUOTES = new RegExp("[" + String.fromCharCode(0x201c, 0x201d, 0x2033) + "]", "g");

const ASIN_RE = /^b0[a-z0-9]{8}$/;

/** True for ASIN-shaped search terms (e.g. "b0c1xyz234"). */
export function isAsin(term: string): boolean {
  return ASIN_RE.test(norm(term));
}

/** Extract the ASIN from `asin="B0…"` / `asin-expanded="B0…"`, upper-cased. */
export function asinFromExpression(expression: string | undefined | null): string | null {
  const m = /asin(?:-expanded)?\s*=\s*["“]?([a-z0-9]{10})/i.exec(expression ?? "");
  return m ? m[1].toUpperCase() : null;
}
