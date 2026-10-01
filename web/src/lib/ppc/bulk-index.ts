/**
 * Lookup tables over a store's bulk entities, shared by `rules.ts` (current
 * bids, "already targeted", existing negatives, IDs) and `export.ts` (IDs,
 * Product Ad SKUs). Names are matched case-insensitively.
 */

import { adGroupKey, asinFromExpression, norm, normTargeting } from "./keys";
import { normalizeMatchType } from "./parse";
import type { BulkEntity, EntityIds } from "./types";

export interface BulkIndex {
  campaignByName: Map<string, BulkEntity>;
  /** campaign|adGroup → Ad Group entity */
  adGroupByName: Map<string, BulkEntity>;
  /** campaignId → Campaign entity */
  campaignById: Map<string, BulkEntity>;
  /** adGroupId → Ad Group entity */
  adGroupById: Map<string, BulkEntity>;
  /** campaign|adGroup|keywordText|exact/phrase/broad → Keyword entity */
  keywordByKey: Map<string, BulkEntity>;
  /** campaign|adGroup|normalised expression → Product Targeting entity (incl. auto sub-targets) */
  targetByKey: Map<string, BulkEntity>;
  /** keyword text → live (not archived) exact keywords */
  exactKeywords: Map<string, BulkEntity[]>;
  /** keyword text → live phrase keywords */
  phraseKeywords: Map<string, BulkEntity[]>;
  /** ASIN (upper-case) → live product targets */
  productTargetAsins: Map<string, BulkEntity[]>;
  /** campaign|adGroup|text (adGroup blank for campaign-level) → negative keyword entity */
  negativeExact: Map<string, BulkEntity>;
  negativePhrase: Map<string, BulkEntity>;
  /** campaign|adGroup|ASIN → negative product target */
  negativeProduct: Map<string, BulkEntity>;
  /** adGroupId → Product Ad entities */
  productAdsByAdGroup: Map<string, BulkEntity[]>;
  /** campaign|adGroup → live keyword texts in that ad group (for phrase-negative safety) */
  keywordTextsByAdGroup: Map<string, string[]>;
  /**
   * adGroupId → what the ad group holds: "keyword" (Keyword rows), "product"
   * (manual Product Targeting rows) and / or "auto" (auto sub-targets). An SP
   * ad group holds keywords or product targets, never both.
   */
  targetKindsByAdGroup: Map<string, Set<"keyword" | "product" | "auto">>;
  size: number;
}

function push<K, V>(map: Map<K, V[]>, key: K, value: V) {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
}

function isArchived(state: string | undefined): boolean {
  return (state ?? "").toLowerCase() === "archived";
}

export function buildBulkIndex(entities: BulkEntity[]): BulkIndex {
  const idx: BulkIndex = {
    campaignByName: new Map(),
    adGroupByName: new Map(),
    campaignById: new Map(),
    adGroupById: new Map(),
    keywordByKey: new Map(),
    targetByKey: new Map(),
    exactKeywords: new Map(),
    phraseKeywords: new Map(),
    productTargetAsins: new Map(),
    negativeExact: new Map(),
    negativePhrase: new Map(),
    negativeProduct: new Map(),
    productAdsByAdGroup: new Map(),
    keywordTextsByAdGroup: new Map(),
    targetKindsByAdGroup: new Map(),
    size: entities.length,
  };

  // Pass 1: campaigns and ad groups (names for children that lack them).
  for (const e of entities) {
    if (e.entity === "Campaign") {
      idx.campaignById.set(e.campaignId, e);
      if (e.campaignName) idx.campaignByName.set(norm(e.campaignName), e);
    } else if (e.entity === "Ad Group" && e.adGroupId) {
      idx.adGroupById.set(e.adGroupId, e);
    }
  }
  const campaignName = (e: BulkEntity) => e.campaignName || idx.campaignById.get(e.campaignId)?.campaignName || "";
  const adGroupName = (e: BulkEntity) =>
    e.adGroupName || (e.adGroupId ? idx.adGroupById.get(e.adGroupId)?.adGroupName : "") || "";
  for (const e of idx.adGroupById.values()) {
    const cn = campaignName(e);
    if (cn && e.adGroupName) idx.adGroupByName.set(adGroupKey(cn, e.adGroupName), e);
  }

  const parentArchived = (e: BulkEntity) =>
    isArchived(idx.campaignById.get(e.campaignId)?.state) ||
    (e.adGroupId ? isArchived(idx.adGroupById.get(e.adGroupId)?.state) : false);

  const addKind = (e: BulkEntity, kind: "keyword" | "product" | "auto") => {
    if (!e.adGroupId) return;
    const set = idx.targetKindsByAdGroup.get(e.adGroupId);
    if (set) set.add(kind);
    else idx.targetKindsByAdGroup.set(e.adGroupId, new Set([kind]));
  };

  for (const e of entities) {
    const cn = campaignName(e);
    const an = adGroupName(e);
    const live = !isArchived(e.state) && !parentArchived(e);
    if (e.entity === "Keyword") addKind(e, "keyword");
    else if (e.entity === "Product Targeting") addKind(e, normalizeMatchType("", e.expression ?? "") === "auto" ? "auto" : "product");
    switch (e.entity) {
      case "Keyword": {
        const text = norm(e.keywordText);
        if (!text) break;
        const mt = normalizeMatchType(e.matchType);
        idx.keywordByKey.set(`${norm(cn)}|${norm(an)}|${text}|${mt}`, e);
        if (live) {
          if (mt === "exact") push(idx.exactKeywords, text, e);
          if (mt === "phrase") push(idx.phraseKeywords, text, e);
          push(idx.keywordTextsByAdGroup, adGroupKey(cn, an), text);
        }
        break;
      }
      case "Product Targeting": {
        const expr = normTargeting(e.expression);
        if (!expr) break;
        idx.targetByKey.set(`${norm(cn)}|${norm(an)}|${expr}`, e);
        const asin = asinFromExpression(e.expression);
        if (asin && live && !/expanded/i.test(e.expression ?? "")) push(idx.productTargetAsins, asin, e);
        break;
      }
      case "Negative Keyword":
      case "Campaign Negative Keyword": {
        const text = norm(e.keywordText);
        if (!text || isArchived(e.state)) break;
        const mt = (e.matchType ?? "").toLowerCase().replace(/[\s_-]/g, "");
        const key = `${norm(cn)}|${e.entity === "Campaign Negative Keyword" ? "" : norm(an)}|${text}`;
        if (mt.includes("phrase")) idx.negativePhrase.set(key, e);
        else idx.negativeExact.set(key, e);
        break;
      }
      case "Negative Product Targeting": {
        const asin = asinFromExpression(e.expression);
        if (!asin || isArchived(e.state)) break;
        idx.negativeProduct.set(`${norm(cn)}|${e.adGroupId ? norm(an) : ""}|${asin}`, e);
        break;
      }
      case "Product Ad": {
        if (e.adGroupId && !isArchived(e.state)) push(idx.productAdsByAdGroup, e.adGroupId, e);
        break;
      }
      default:
        break;
    }
  }
  return idx;
}

/** Campaign / ad group IDs for names from a report. */
export function idsFor(idx: BulkIndex, campaign: string, adGroup?: string): EntityIds {
  const ids: EntityIds = {};
  const c = idx.campaignByName.get(norm(campaign));
  if (c) ids.campaignId = c.campaignId;
  if (adGroup !== undefined) {
    const g = idx.adGroupByName.get(adGroupKey(campaign, adGroup));
    if (g) {
      ids.adGroupId = g.adGroupId;
      ids.campaignId = g.campaignId;
    }
  }
  return ids;
}

/** Keyword entity for a report target. */
export function findKeyword(idx: BulkIndex, campaign: string, adGroup: string, text: string, matchType: string): BulkEntity | undefined {
  return idx.keywordByKey.get(`${norm(campaign)}|${norm(adGroup)}|${norm(text)}|${norm(matchType)}`);
}

/** Product Targeting entity (product or auto sub-target) for a report target. */
export function findTarget(idx: BulkIndex, campaign: string, adGroup: string, expression: string): BulkEntity | undefined {
  return idx.targetByKey.get(`${norm(campaign)}|${norm(adGroup)}|${normTargeting(expression)}`);
}

/** Effective bid of a keyword / target: its own bid, else the ad group default bid. */
export function effectiveBid(idx: BulkIndex, e: BulkEntity): number | undefined {
  if (typeof e.bid === "number" && e.bid > 0) return e.bid;
  const g = e.adGroupId ? idx.adGroupById.get(e.adGroupId) : undefined;
  if (g && typeof g.defaultBid === "number" && g.defaultBid > 0) return g.defaultBid;
  return undefined;
}

/** True when the entity, its ad group or its campaign is archived (can never serve again). */
export function archivedInBulk(idx: BulkIndex, e: BulkEntity): boolean {
  if (isArchived(e.state)) return true;
  if (isArchived(idx.campaignById.get(e.campaignId)?.state)) return true;
  return e.adGroupId ? isArchived(idx.adGroupById.get(e.adGroupId)?.state) : false;
}

/** True when the bulk file has this campaign (or this ad group in it) by name and it is archived. */
export function archivedByName(idx: BulkIndex, campaign: string, adGroup?: string): boolean {
  if (isArchived(idx.campaignByName.get(norm(campaign))?.state)) return true;
  return adGroup !== undefined && isArchived(idx.adGroupByName.get(adGroupKey(campaign, adGroup))?.state);
}

/** First non-enabled state among the entity and its parents ("paused" / "archived"), if any. */
export function inactiveState(idx: BulkIndex, e: BulkEntity): string | undefined {
  const check = (s: string | undefined) => {
    const v = (s ?? "").toLowerCase();
    return v === "paused" || v === "archived" ? v : undefined;
  };
  const own = check(e.state);
  if (own) return `${e.entity.toLowerCase()} ${own}`;
  const g = e.adGroupId ? idx.adGroupById.get(e.adGroupId) : undefined;
  const gs = check(g?.state);
  if (gs) return `ad group ${gs}`;
  const cs = check(idx.campaignById.get(e.campaignId)?.state);
  if (cs) return `campaign ${cs}`;
  return undefined;
}
