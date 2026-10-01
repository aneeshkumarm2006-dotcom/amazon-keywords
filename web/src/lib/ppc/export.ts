/**
 * Exports: a human action list (Template 2 style) and an Amazon bulk upload
 * sheet ("Sponsored Products Campaigns", bulksheets 2.0 column names).
 *
 * Bulk sheet rules
 * - Only approved recommendations are exported; `decision.editedBid` overrides
 *   the suggested bid. Relevance checks are informational and never exported.
 * - Row order: new campaigns (Campaign → Ad Group → Product Ads → targets), then
 *   creates in existing ad groups, then negatives, then bid / state updates —
 *   parents always precede children.
 * - Harvest destination = decision.destination ?? store.harvestDestination:
 *   "existing" → that ad group's IDs; "source" → the source ad group's IDs;
 *   "new-campaign" → Campaign/Create (temp Campaign ID = name, Manual, enabled,
 *   daily budget, "Dynamic bids - down only", Start Date YYYYMMDD) + Ad Group /
 *   Create (temp ID, default bid = median harvest bid) + a Product Ad per SKU
 *   of the source ad group. Naming (Template 1): `${label}_Exact_Harvest` /
 *   `Exact_Harvest` (Phrase / Prod for phrase and product harvests).
 * - New harvest campaigns get one ad group per advertised-SKU set, so a
 *   keyword only serves the product it was harvested from (the second set's
 *   ad group is `Exact_Harvest_<first SKU>`).
 * - A harvest campaign that already exists in the bulk file (an earlier
 *   round, re-imported) is reused: its live ad group advertising the same SKUs
 *   takes the keyword with real IDs, else a new ad group is created under the
 *   real Campaign ID. It is never re-created — campaign names are unique per
 *   account, and a failed Campaign create takes every child row with it while
 *   the paired negatives still go through. An archived namesake gets a dated
 *   name instead.
 * - Placement check (when the bulk file knows the destination): keywords and
 *   product targets cannot go into an auto-targeting campaign, and an ad group
 *   holds keywords or product targets, never both. Such a harvest is re-routed
 *   to a new harvest campaign (label = the store's harvest label or the source
 *   campaign's first word; budget = the store's harvest budget or the source
 *   campaign's), or skipped with a warning when there is no budget to use.
 * - A paired negative is dropped (with a warning) when its harvest lands in the
 *   same ad group — a negative exact there would block the new keyword — or
 *   when its harvest could not be placed at all.
 * - Keyword text over Amazon's limits (10 words / 80 characters; negative
 *   phrase 4 words) is dropped with a warning; Amazon would reject the row.
 * - Rows that lack required IDs are still emitted with blank IDs and listed in
 *   `warnings` as "needs IDs — import a bulk file".
 */

import { bidDecimals, roundBid } from "./bidding";
import { buildBulkIndex, idsFor, type BulkIndex } from "./bulk-index";
import { compactDate, todayIso } from "./dates";
import { adGroupKey, norm } from "./keys";
import { acos as acosOf, ctr as ctrOf, cvr as cvrOf, median, round2 } from "./metrics";
import { formatMoney, formatPct, keywordLengthProblem } from "./rules";
import type { BulkEntity, Decision, HarvestDestination, Recommendation, Store } from "./types";
import { writeXlsx } from "./xlsx";

export const SP_SHEET_NAME = "Sponsored Products Campaigns";

export const BULK_HEADERS = [
  "Product",
  "Entity",
  "Operation",
  "Campaign ID",
  "Ad Group ID",
  "Portfolio ID",
  "Ad ID",
  "Keyword ID",
  "Product Targeting ID",
  "Campaign Name",
  "Ad Group Name",
  "Start Date",
  "End Date",
  "Targeting Type",
  "State",
  "Daily Budget",
  "SKU",
  "ASIN",
  "Ad Group Default Bid",
  "Bid",
  "Keyword Text",
  "Match Type",
  "Bidding Strategy",
  "Placement",
  "Percentage",
  "Product Targeting Expression",
] as const;

export type BulkHeader = (typeof BULK_HEADERS)[number];
export type BulkCell = string | number | null;

const ACTION_LABEL: Record<Recommendation["action"], string> = {
  "harvest-exact": "HARVEST -> Exact",
  "harvest-phrase": "HARVEST -> Phrase",
  "harvest-product": "HARVEST -> Product target",
  "negate-exact": "NEGATE Exact",
  "negate-phrase": "NEGATE Phrase",
  "negate-product": "NEGATE Product",
  "bid-up": "BID UP",
  "bid-down": "BID DOWN",
  pause: "PAUSE",
  relevance: "CHECK RELEVANCE",
};

function money(n: number | undefined): string {
  return n === undefined || !Number.isFinite(n) ? "" : n.toFixed(2);
}

/**
 * Human action list: Template 2 columns (Search Term … Revenue, Action) plus
 * Ad Group, Priority, Current Bid, Suggested Bid, Reason. Header row first.
 */
export function recommendationsCsv(recs: Recommendation[], store: Pick<Store, "currency" | "name">): string[][] {
  const out: string[][] = [
    [
      "Search Term / Target",
      "Campaign",
      "Ad Group",
      "Match Type",
      "Impressions",
      "Clicks",
      "CTR",
      "Orders",
      "CVR",
      "ACoS",
      `Spend (${store.currency})`,
      `Revenue (${store.currency})`,
      "Action",
      "Priority",
      "Current Bid",
      "Suggested Bid",
      "Reason",
    ],
  ];
  for (const r of recs) {
    const c = r.counters;
    let action = ACTION_LABEL[r.action];
    if ((r.action === "bid-up" || r.action === "bid-down") && r.currentBid && r.suggestedBid) {
      const ch = r.suggestedBid / r.currentBid - 1;
      action += ` ${ch > 0 ? "+" : "-"}${formatPct(Math.abs(ch))}`;
    }
    const acosV = acosOf(c);
    out.push([
      r.subject,
      r.campaign,
      r.adGroup,
      r.matchType,
      String(c.impressions),
      String(c.clicks),
      formatPct(ctrOf(c)),
      String(c.orders),
      formatPct(cvrOf(c)),
      Number.isFinite(acosV) ? formatPct(acosV) : c.spend > 0 ? "no sales" : "",
      money(c.spend),
      money(c.sales),
      action,
      r.priority.toUpperCase(),
      money(r.currentBid),
      money(r.suggestedBid),
      r.reason,
    ]);
  }
  return out;
}

/* -------------------------------------------------------------- bulk sheet */

export interface BuildBulkSheetInput {
  store: Store;
  recs: Recommendation[];
  decisions: Decision[] | Record<string, Decision> | Map<string, Decision>;
  bulk: BulkEntity[];
  /** ISO date used for new campaigns' Start Date (default: today). */
  today?: string;
}

export interface BulkSheetResult {
  /** Header row first. */
  rows: BulkCell[][];
  warnings: string[];
  /** Number of data rows (excluding the header). */
  count: number;
}

function decisionMap(d: BuildBulkSheetInput["decisions"]): Map<string, Decision> {
  if (d instanceof Map) return d;
  if (Array.isArray(d)) return new Map(d.map((x) => [x.recId, x] as const));
  return new Map(Object.entries(d));
}

function makeRow(fields: Partial<Record<BulkHeader, BulkCell | undefined>>): BulkCell[] {
  return BULK_HEADERS.map((h) => {
    const v = fields[h];
    return v === undefined || v === "" ? null : v;
  });
}

interface NewAdGroup {
  name: string;
  tempId: string;
  bids: number[];
  /** SKU / ASIN (upper-case) → the source Product Ad to copy. */
  skus: Map<string, BulkEntity>;
  targets: BulkCell[][];
}

interface NewCampaign {
  name: string;
  /** Temp ID (= name) for a campaign this sheet creates; the real ID of an existing one. */
  campaignId: string;
  /** False: the campaign exists already and only new ad groups are created under it. */
  create: boolean;
  dailyBudget: number;
  /** Advertised-SKU set key → ad group. */
  adGroups: Map<string, NewAdGroup>;
}

interface Placement {
  campaignId: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
  isNew: boolean;
  /** The new ad group the target row goes into, and its campaign (isNew only). */
  group?: NewAdGroup;
  campaign?: NewCampaign;
}

const SUFFIX: Record<string, { campaign: string; adGroup: string }> = {
  "harvest-exact": { campaign: "Exact_Harvest", adGroup: "Exact_Harvest" },
  "harvest-phrase": { campaign: "Phrase_Harvest", adGroup: "Phrase_Harvest" },
  "harvest-product": { campaign: "Prod_Harvest", adGroup: "Prod_Harvest" },
};

function asinExpression(subject: string): string {
  return `asin="${subject.trim().toUpperCase()}"`;
}

function describe(r: Recommendation): string {
  return `“${r.subject}” (${r.campaign} / ${r.adGroup})`;
}

const stateOf = (e: BulkEntity | undefined) => (e?.state ?? "").toLowerCase();

/** "Garlic Press" → "Garlic_Press" (campaign-name label). */
function cleanLabel(label: string): string {
  return label.trim().replace(/\s+/g, "_");
}

/** Build the "Sponsored Products Campaigns" sheet rows for approved recommendations. */
export function buildBulkSheet(input: BuildBulkSheetInput): BulkSheetResult {
  const { store } = input;
  const decisions = decisionMap(input.decisions);
  const idx: BulkIndex = buildBulkIndex(input.bulk.filter((b) => b.storeId === store.id));
  const today = input.today ?? todayIso();
  const warnings: string[] = [];
  const needsIds: string[] = [];
  const byId = new Map(input.recs.map((r) => [r.id, r] as const));
  const decimals = bidDecimals(store.currency);
  const money = (n: number) => formatMoney(n, store.currency);

  const approved = input.recs.filter((r) => decisions.get(r.id)?.status === "approved");
  const relevance = approved.filter((r) => r.action === "relevance").length;
  if (relevance) warnings.push(`${relevance} relevance check${relevance === 1 ? " is" : "s are"} informational and not exported.`);

  const bidOf = (r: Recommendation): number | undefined => {
    const d = decisions.get(r.id);
    const b = d?.editedBid ?? r.suggestedBid;
    return b !== undefined && Number.isFinite(b) && b > 0 ? roundBid(b, decimals) : undefined;
  };

  const newCampaigns = new Map<string, NewCampaign>();
  const usedAdGroupTempIds = new Set<string>();

  // A phrase companion has no destination control of its own: it follows its
  // harvest (decisions saved before companions carried one included).
  const destinationOf = (r: Recommendation): HarvestDestination =>
    decisions.get(r.id)?.destination ?? (r.action === "harvest-phrase" && r.pairedWith ? decisions.get(r.pairedWith)?.destination : undefined) ?? store.harvestDestination;

  const sourceIds = (r: Recommendation) => {
    const ids = { ...r.ids };
    if (!ids.campaignId || !ids.adGroupId) {
      const found = idsFor(idx, r.campaign, r.adGroup);
      ids.campaignId = ids.campaignId ?? found.campaignId;
      ids.adGroupId = ids.adGroupId ?? found.adGroupId;
    }
    return ids;
  };

  /** Live Product Ads of an ad group, keyed by SKU (or ASIN), upper-case. */
  const skusOf = (adGroupId: string | undefined): Map<string, BulkEntity> => {
    const out = new Map<string, BulkEntity>();
    for (const ad of (adGroupId ? idx.productAdsByAdGroup.get(adGroupId) : undefined) ?? []) {
      const k = (ad.sku || ad.asin || "").toUpperCase();
      if (k && !out.has(k)) out.set(k, ad);
    }
    return out;
  };
  const skuKey = (skus: Map<string, BulkEntity>) => [...skus.keys()].sort().join(",");

  /** Why a keyword / product target cannot be created in that ad group (null = fine, or unknown without a bulk file). */
  const placementProblem = (p: Pick<Placement, "campaignId" | "adGroupId" | "campaignName" | "adGroupName">, isProduct: boolean): string | null => {
    const what = isProduct ? "product targets" : "keywords";
    const camp = idx.campaignById.get(p.campaignId) ?? idx.campaignByName.get(norm(p.campaignName));
    if ((camp?.targetingType ?? "").toLowerCase() === "auto") {
      return `${camp?.campaignName || p.campaignName} is an auto-targeting campaign, which cannot hold ${what}`;
    }
    const group = idx.adGroupById.get(p.adGroupId) ?? idx.adGroupByName.get(adGroupKey(p.campaignName, p.adGroupName));
    const kinds = group?.adGroupId ? idx.targetKindsByAdGroup.get(group.adGroupId) : undefined;
    if (kinds?.has(isProduct ? "keyword" : "product")) {
      return `${p.campaignName} / ${p.adGroupName} holds ${isProduct ? "keywords" : "product targets"}, and an ad group cannot mix keywords with product targets`;
    }
    return null;
  };

  /** A live ad group in an existing harvest campaign that advertises exactly these SKUs and holds the right kind of target. */
  const reusableAdGroup = (campaignId: string, key: string, defaultName: string, isProduct: boolean): BulkEntity | undefined => {
    for (const g of idx.adGroupById.values()) {
      if (g.campaignId !== campaignId || !g.adGroupId || stateOf(g) === "archived" || stateOf(g) === "paused") continue;
      if (idx.targetKindsByAdGroup.get(g.adGroupId)?.has(isProduct ? "keyword" : "product")) continue;
      if (key ? skuKey(skusOf(g.adGroupId)) === key : norm(g.adGroupName) === norm(defaultName)) return g;
    }
    return undefined;
  };

  const newCampaignPlacement = (r: Recommendation, label: string, dailyBudget: number): Placement => {
    const suffix = SUFFIX[r.action] ?? SUFFIX["harvest-exact"];
    const isProduct = r.action === "harvest-product";
    const baseName = `${cleanLabel(label || store.name || "Harvest")}_${suffix.campaign}`;
    let nc = newCampaigns.get(norm(baseName));
    if (!nc) {
      const existing = idx.campaignByName.get(norm(baseName));
      const usable = existing && stateOf(existing) !== "archived" && (existing.targetingType ?? "").toLowerCase() !== "auto";
      if (existing && usable) {
        nc = { name: existing.campaignName || baseName, campaignId: existing.campaignId, create: false, dailyBudget: 0, adGroups: new Map() };
      } else {
        // An archived namesake still owns the name: create under a dated one.
        const name = existing ? `${baseName}_${compactDate(today)}` : baseName;
        nc = { name, campaignId: name, create: true, dailyBudget, adGroups: new Map() };
      }
      newCampaigns.set(norm(baseName), nc);
    }
    const skus = skusOf(sourceIds(r).adGroupId);
    const key = skuKey(skus);
    if (!nc.create) {
      const reuse = reusableAdGroup(nc.campaignId, key, suffix.adGroup, isProduct);
      if (reuse) {
        return { campaignId: nc.campaignId, adGroupId: reuse.adGroupId ?? "", campaignName: nc.name, adGroupName: reuse.adGroupName ?? suffix.adGroup, isNew: false };
      }
    }
    let g = nc.adGroups.get(key);
    if (!g) {
      const taken = new Set([...nc.adGroups.values()].map((x) => norm(x.name)));
      if (!nc.create) {
        for (const e of idx.adGroupById.values()) if (e.campaignId === nc.campaignId) taken.add(norm(e.adGroupName));
      }
      const firstSku = [...skus.keys()].sort()[0];
      const candidates = [suffix.adGroup, ...(firstSku ? [`${suffix.adGroup}_${firstSku}`] : [])];
      let name = candidates.find((c) => !taken.has(norm(c)));
      for (let n = 2; !name; n++) if (!taken.has(norm(`${suffix.adGroup}_${n}`))) name = `${suffix.adGroup}_${n}`;
      let tempId = name;
      if (usedAdGroupTempIds.has(tempId)) tempId = `${nc.name} ${name}`;
      usedAdGroupTempIds.add(tempId);
      g = { name, tempId, bids: [], skus, targets: [] };
      nc.adGroups.set(key, g);
    }
    return { campaignId: nc.campaignId, adGroupId: g.tempId, campaignName: nc.name, adGroupName: g.name, isNew: true, group: g, campaign: nc };
  };

  /** Re-routed harvests, one warning per (problem, destination). */
  const rerouted = new Map<string, { text: string; subjects: string[] }>();

  /** Where a harvest goes, or why it cannot go anywhere. */
  const placeHarvest = (r: Recommendation): Placement | { problem: string } => {
    const dest = destinationOf(r);
    if (dest.mode === "new-campaign") return newCampaignPlacement(r, dest.productLabel, dest.dailyBudget);
    const src = sourceIds(r);
    const intended: Placement =
      dest.mode === "existing"
        ? { campaignId: dest.campaignId, adGroupId: dest.adGroupId, campaignName: dest.campaignName, adGroupName: dest.adGroupName, isNew: false }
        : { campaignId: src.campaignId ?? "", adGroupId: src.adGroupId ?? "", campaignName: r.campaign, adGroupName: r.adGroup, isNew: false };
    const problem = placementProblem(intended, r.action === "harvest-product");
    if (!problem) return intended;
    // Re-route to a new harvest campaign for the source product.
    const def = store.harvestDestination;
    const defaultBudget = def.mode === "new-campaign" && def.dailyBudget > 0 ? def.dailyBudget : 0;
    const sourceCampaign = (src.campaignId ? idx.campaignById.get(src.campaignId) : undefined) ?? idx.campaignByName.get(norm(r.campaign));
    const label = def.mode === "new-campaign" && def.productLabel ? def.productLabel : r.campaign.split(/[_\s-]+/)[0] || store.name;
    const budget = defaultBudget || (sourceCampaign?.dailyBudget ?? 0);
    if (!(budget > 0)) return { problem: `${problem} — choose another destination for it on the Keywords page` };
    const p = newCampaignPlacement(r, label, budget);
    const budgetNote = p.campaign?.create && !defaultBudget ? ` (daily budget ${money(budget)}, copied from ${sourceCampaign?.campaignName || r.campaign})` : "";
    const k = `${problem}|${p.campaignName}|${p.adGroupName}`;
    const group = rerouted.get(k) ?? { text: `${problem} — placed in ${p.campaignName} / ${p.adGroupName} instead${budgetNote}`, subjects: [] };
    group.subjects.push(`“${r.subject}”`);
    rerouted.set(k, group);
    return p;
  };

  const harvestRows: BulkCell[][] = [];
  const negativeRows: BulkCell[][] = [];
  const updateRows: BulkCell[][] = [];
  const seen = new Set<string>();
  /** Harvest rec id → where it landed; null when it was not exported (skipped with a warning). */
  const placements = new Map<string, Placement | null>();

  const dedupe = (key: string, r: Recommendation): boolean => {
    const k = norm(key);
    if (seen.has(k)) {
      warnings.push(`Duplicate row skipped for ${describe(r)}.`);
      return false;
    }
    seen.add(k);
    return true;
  };

  // Harvests first so paired negatives can see where their harvest landed.
  for (const r of approved) {
    if (r.action !== "harvest-exact" && r.action !== "harvest-phrase" && r.action !== "harvest-product") continue;
    const isProduct = r.action === "harvest-product";
    const tooLong = isProduct ? null : keywordLengthProblem(r.subject, "keyword");
    if (tooLong) {
      warnings.push(`${ACTION_LABEL[r.action]} ${describe(r)} skipped: ${tooLong}.`);
      placements.set(r.id, null);
      continue;
    }
    const placed = placeHarvest(r);
    if ("problem" in placed) {
      warnings.push(`${ACTION_LABEL[r.action]} ${describe(r)} skipped: ${placed.problem}.`);
      placements.set(r.id, null);
      continue;
    }
    const p = placed;
    placements.set(r.id, p);
    const bid = bidOf(r);
    if (bid === undefined) warnings.push(`No bid for ${describe(r)} — set a bid before uploading.`);
    const matchType = r.action === "harvest-phrase" ? "phrase" : "exact";
    const key = `${isProduct ? "pt" : "kw"}|${p.campaignId || p.campaignName}|${p.adGroupId || p.adGroupName}|${isProduct ? asinExpression(r.subject) : r.subject}|${matchType}`;
    if (!dedupe(key, r)) continue;
    const row = makeRow({
      Product: "Sponsored Products",
      Entity: isProduct ? "Product Targeting" : "Keyword",
      Operation: "Create",
      "Campaign ID": p.campaignId,
      "Ad Group ID": p.adGroupId,
      State: "enabled",
      Bid: bid ?? null,
      "Keyword Text": isProduct ? null : r.subject,
      "Match Type": isProduct ? null : matchType,
      "Product Targeting Expression": isProduct ? asinExpression(r.subject) : null,
    });
    if (p.isNew && p.group) {
      if (bid !== undefined) p.group.bids.push(bid);
      p.group.targets.push(row);
    } else {
      if (!p.campaignId || !p.adGroupId) needsIds.push(`${ACTION_LABEL[r.action]} ${describe(r)}`);
      harvestRows.push(row);
    }
  }

  for (const r of approved) {
    if (r.action !== "negate-exact" && r.action !== "negate-phrase" && r.action !== "negate-product") continue;
    if (r.pairedWith) {
      const partner = byId.get(r.pairedWith);
      const partnerApproved = partner && decisions.get(partner.id)?.status === "approved";
      if (partner && partnerApproved) {
        const p = placements.get(partner.id);
        if (!p) {
          warnings.push(`Paired negative for ${describe(r)} skipped: its harvest was not exported, so the term keeps its traffic here.`);
          continue;
        }
        const src = sourceIds(r);
        const sameGroup =
          !p.isNew &&
          ((p.adGroupId && src.adGroupId && p.adGroupId === src.adGroupId) ||
            (norm(p.campaignName) === norm(r.campaign) && norm(p.adGroupName) === norm(r.adGroup)));
        if (sameGroup) {
          warnings.push(`Paired negative for ${describe(r)} skipped: its harvest goes into the same ad group.`);
          continue;
        }
      } else if (partner) {
        warnings.push(`Paired negative for ${describe(r)} is approved without its harvest — the term will lose that traffic.`);
      }
    }
    const ids = sourceIds(r);
    const isProduct = r.action === "negate-product";
    const matchType = r.action === "negate-phrase" ? "negativePhrase" : "negativeExact";
    const tooLong = isProduct ? null : keywordLengthProblem(r.subject, matchType);
    if (tooLong) {
      warnings.push(`${ACTION_LABEL[r.action]} ${describe(r)} skipped: ${tooLong}.`);
      continue;
    }
    const key = `neg|${ids.campaignId || r.campaign}|${ids.adGroupId || r.adGroup}|${isProduct ? asinExpression(r.subject) : r.subject}|${matchType}`;
    if (!dedupe(key, r)) continue;
    if (!ids.campaignId || !ids.adGroupId) needsIds.push(`${ACTION_LABEL[r.action]} ${describe(r)}`);
    negativeRows.push(
      makeRow({
        Product: "Sponsored Products",
        Entity: isProduct ? "Negative Product Targeting" : "Negative Keyword",
        Operation: "Create",
        "Campaign ID": ids.campaignId ?? null,
        "Ad Group ID": ids.adGroupId ?? null,
        State: "enabled",
        "Keyword Text": isProduct ? null : r.subject,
        "Match Type": isProduct ? null : matchType,
        "Product Targeting Expression": isProduct ? asinExpression(r.subject) : null,
      }),
    );
  }

  for (const r of approved) {
    if (r.action !== "bid-up" && r.action !== "bid-down" && r.action !== "pause") continue;
    const ids = sourceIds(r);
    const isTarget = r.matchType === "product" || r.matchType === "auto";
    const idField = isTarget ? ids.productTargetingId : ids.keywordId;
    const key = `upd|${isTarget ? "pt" : "kw"}|${idField || `${r.campaign}|${r.adGroup}|${r.subject}|${r.matchType}`}|${r.action === "pause" ? "state" : "bid"}`;
    if (!dedupe(key, r)) continue;
    if (!ids.campaignId || !ids.adGroupId || !idField) needsIds.push(`${ACTION_LABEL[r.action]} ${describe(r)}`);
    const fields: Partial<Record<BulkHeader, BulkCell>> = {
      Product: "Sponsored Products",
      Entity: isTarget ? "Product Targeting" : "Keyword",
      Operation: "Update",
      "Campaign ID": ids.campaignId ?? null,
      "Ad Group ID": ids.adGroupId ?? null,
      "Keyword ID": isTarget ? null : ids.keywordId ?? null,
      "Product Targeting ID": isTarget ? ids.productTargetingId ?? null : null,
    };
    if (r.action === "pause") {
      fields.State = "paused";
    } else {
      const bid = bidOf(r);
      if (bid === undefined) {
        warnings.push(`No bid for ${describe(r)} — skipped.`);
        continue;
      }
      fields.Bid = bid;
    }
    updateRows.push(makeRow(fields));
  }

  // New campaigns / ad groups: Campaign → Ad Group → Product Ads → targets.
  const newRows: BulkCell[][] = [];
  for (const nc of newCampaigns.values()) {
    if (!nc.adGroups.size) continue; // every harvest went into an existing ad group
    if (nc.create) {
      newRows.push(
        makeRow({
          Product: "Sponsored Products",
          Entity: "Campaign",
          Operation: "Create",
          "Campaign ID": nc.campaignId,
          "Campaign Name": nc.name,
          "Start Date": compactDate(today),
          "Targeting Type": "Manual",
          State: "enabled",
          "Daily Budget": nc.dailyBudget > 0 ? round2(nc.dailyBudget) : null,
          "Bidding Strategy": "Dynamic bids - down only",
        }),
      );
      if (!(nc.dailyBudget > 0)) warnings.push(`New campaign ${nc.name} has no daily budget — set one before uploading.`);
    }
    for (const g of nc.adGroups.values()) {
      const defaultBid = g.bids.length ? roundBid(median(g.bids), decimals) : store.rules.bidFloor;
      newRows.push(
        makeRow({
          Product: "Sponsored Products",
          Entity: "Ad Group",
          Operation: "Create",
          "Campaign ID": nc.campaignId,
          "Ad Group ID": g.tempId,
          "Ad Group Name": g.name,
          State: "enabled",
          "Ad Group Default Bid": defaultBid,
        }),
      );
      const where = nc.create ? `new campaign ${nc.name}` : `new ad group ${nc.name} / ${g.name}`;
      if (!g.skus.size) warnings.push(`No Product Ad SKUs found for ${where} — import a bulk file or add a Product Ad row before uploading.`);
      for (const ad of g.skus.values()) {
        newRows.push(
          makeRow({
            Product: "Sponsored Products",
            Entity: "Product Ad",
            Operation: "Create",
            "Campaign ID": nc.campaignId,
            "Ad Group ID": g.tempId,
            State: "enabled",
            SKU: ad.sku ?? null,
            ASIN: ad.sku ? null : ad.asin ?? null,
          }),
        );
      }
      newRows.push(...g.targets);
    }
  }

  for (const g of rerouted.values()) {
    const n = g.subjects.length;
    warnings.push(`${n} harvest${n === 1 ? "" : "s"} re-routed: ${g.text}: ${g.subjects.slice(0, 10).join(", ")}${n > 10 ? ", …" : ""}.`);
  }

  if (needsIds.length) {
    warnings.push(`${needsIds.length} row${needsIds.length === 1 ? "" : "s"} need IDs — import a bulk file: ${needsIds.slice(0, 20).join("; ")}${needsIds.length > 20 ? "; …" : ""}`);
  }

  const data = [...newRows, ...harvestRows, ...negativeRows, ...updateRows];
  return { rows: [[...BULK_HEADERS], ...data], warnings, count: data.length };
}

/** Bulk upload workbook (.xlsx) with the sheet named exactly "Sponsored Products Campaigns". */
export function bulkSheetXlsx(input: BuildBulkSheetInput | { rows: BulkCell[][] }): Uint8Array {
  const rows = "rows" in input ? input.rows : buildBulkSheet(input).rows;
  return writeXlsx([{ name: SP_SHEET_NAME, rows }]);
}
