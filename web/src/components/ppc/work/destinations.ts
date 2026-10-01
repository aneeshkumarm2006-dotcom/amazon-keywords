/**
 * Harvest destinations: where an approved harvest is created in the bulk
 * sheet, the options the Keywords page offers per row, and plain-English
 * descriptions. Pure; relative imports only. Naming and placement follow
 * `export.ts` (`${label}_Exact_Harvest` for new campaigns).
 */

import { adGroupKey, norm } from "../../../lib/ppc/keys";
import { normalizeMatchType } from "../../../lib/ppc/parse";
import type { BulkEntity, HarvestDestination, Recommendation, Store } from "../../../lib/ppc/types";

export interface AdGroupOption {
  campaignId: string;
  adGroupId: string;
  campaignName: string;
  adGroupName: string;
  /** Manual targeting (a good home for exact keywords). Auto ad groups cannot hold keywords or product targets. */
  manual: boolean;
  /** The campaign's daily budget, when the bulk file has it. */
  dailyBudget?: number;
  /** What the ad group already holds: keywords or (manual) product targets. An ad group never mixes the two. */
  holds?: "keyword" | "product";
}

/** Live ad groups in the bulk file, manual campaigns first, then by name. */
export function adGroupOptions(bulk: readonly BulkEntity[], storeId: string): AdGroupOption[] {
  const campaigns = new Map<string, BulkEntity>();
  const holds = new Map<string, "keyword" | "product">();
  for (const e of bulk) {
    if (e.storeId !== storeId) continue;
    if (e.entity === "Campaign") campaigns.set(e.campaignId, e);
    else if (e.adGroupId && !holds.has(e.adGroupId)) {
      if (e.entity === "Keyword") holds.set(e.adGroupId, "keyword");
      else if (e.entity === "Product Targeting" && normalizeMatchType("", e.expression ?? "") === "product") holds.set(e.adGroupId, "product");
    }
  }
  const out: AdGroupOption[] = [];
  const seen = new Set<string>();
  for (const e of bulk) {
    if (e.storeId !== storeId || e.entity !== "Ad Group" || !e.adGroupId || seen.has(e.adGroupId)) continue;
    const camp = campaigns.get(e.campaignId);
    const archived = (s?: string) => (s ?? "").toLowerCase() === "archived";
    if (archived(e.state) || archived(camp?.state)) continue;
    seen.add(e.adGroupId);
    out.push({
      campaignId: e.campaignId,
      adGroupId: e.adGroupId,
      campaignName: e.campaignName || camp?.campaignName || e.campaignId,
      adGroupName: e.adGroupName || e.adGroupId,
      manual: (camp?.targetingType ?? "").toLowerCase() !== "auto",
      ...(camp?.dailyBudget !== undefined ? { dailyBudget: camp.dailyBudget } : {}),
      ...(holds.has(e.adGroupId) ? { holds: holds.get(e.adGroupId) } : {}),
    });
  }
  return out.sort(
    (a, b) => Number(b.manual) - Number(a.manual) || a.campaignName.localeCompare(b.campaignName) || a.adGroupName.localeCompare(b.adGroupName),
  );
}

/** Select value for a destination: "default" | "source" | "new" | "ag:<adGroupId>". */
export type DestinationValue = string;

export function destinationValue(d: HarvestDestination | undefined): DestinationValue {
  if (!d) return "default";
  if (d.mode === "source") return "source";
  if (d.mode === "new-campaign") return "new";
  return `ag:${d.adGroupId}`;
}

/** A sensible product label for a new harvest campaign: the store default's, else the source campaign's first word. */
export function defaultProductLabel(store: Pick<Store, "harvestDestination" | "name">, rec: Pick<Recommendation, "campaign">): string {
  if (store.harvestDestination.mode === "new-campaign" && store.harvestDestination.productLabel) return store.harvestDestination.productLabel;
  const first = rec.campaign.split(/[_\s-]+/)[0];
  return first || store.name.replace(/\s+/g, "");
}

export function defaultBudget(store: Pick<Store, "harvestDestination">): number {
  return store.harvestDestination.mode === "new-campaign" && store.harvestDestination.dailyBudget > 0 ? store.harvestDestination.dailyBudget : 10;
}

/** Destination for a select value (undefined = store default). */
export function destinationFromValue(
  value: DestinationValue,
  ctx: { store: Pick<Store, "harvestDestination" | "name">; rec: Pick<Recommendation, "campaign">; options: readonly AdGroupOption[] },
): HarvestDestination | undefined {
  if (value === "default") return undefined;
  if (value === "source") return { mode: "source" };
  if (value === "new") return { mode: "new-campaign", productLabel: defaultProductLabel(ctx.store, ctx.rec), dailyBudget: defaultBudget(ctx.store) };
  const id = value.startsWith("ag:") ? value.slice(3) : value;
  const o = ctx.options.find((x) => x.adGroupId === id);
  if (!o) return undefined;
  return { mode: "existing", campaignId: o.campaignId, adGroupId: o.adGroupId, campaignName: o.campaignName, adGroupName: o.adGroupName };
}

/**
 * Where `export.ts` actually creates the harvest. A source / existing
 * destination that cannot take it (an auto campaign holds no keywords or
 * product targets; a keyword ad group holds no product targets and vice versa)
 * is re-routed to a new harvest campaign: the store's harvest label and budget
 * when the store default is a new campaign, else the source campaign's first
 * word and daily budget. Without a budget the export skips the harvest, and
 * the destination is returned unchanged.
 */
export function routedDestination(
  d: HarvestDestination,
  rec: Pick<Recommendation, "campaign" | "ids" | "action">,
  store: Pick<Store, "harvestDestination" | "name">,
  options: readonly AdGroupOption[],
): HarvestDestination {
  if (d.mode === "new-campaign") return d;
  const targetId = d.mode === "existing" ? d.adGroupId : rec.ids.adGroupId;
  const target = targetId ? options.find((o) => o.adGroupId === targetId) : undefined;
  if (!target) return d;
  const wrongKind = target.holds === (rec.action === "harvest-product" ? "keyword" : "product");
  if (target.manual && !wrongKind) return d;
  const def = store.harvestDestination;
  const source = rec.ids.adGroupId ? options.find((o) => o.adGroupId === rec.ids.adGroupId) : undefined;
  const budget = def.mode === "new-campaign" && def.dailyBudget > 0 ? def.dailyBudget : (source?.dailyBudget ?? 0);
  if (!(budget > 0)) return d;
  return { mode: "new-campaign", productLabel: defaultProductLabel(store, rec), dailyBudget: budget };
}

/** Campaign name `export.ts` gives a new harvest campaign. */
export function newCampaignName(label: string, action: Recommendation["action"], storeName: string): string {
  const suffix = action === "harvest-phrase" ? "Phrase_Harvest" : action === "harvest-product" ? "Prod_Harvest" : "Exact_Harvest";
  const l = (label || storeName || "Harvest").trim().replace(/\s+/g, "_");
  return `${l}_${suffix}`;
}

/** "GarlicPress_Exact_Harvest (new campaign, $25/day)" etc. `money` formats the budget. */
export function describeDestination(
  d: HarvestDestination,
  rec: Pick<Recommendation, "campaign" | "adGroup" | "action">,
  store: Pick<Store, "name">,
  money: (n: number) => string,
): string {
  if (d.mode === "existing") return `${d.campaignName} / ${d.adGroupName}`;
  if (d.mode === "new-campaign") return `a new campaign ${newCampaignName(d.productLabel, rec.action, store.name)} (${money(d.dailyBudget)}/day budget)`;
  return `${rec.campaign} / ${rec.adGroup} (the ad group it came from)`;
}

/**
 * True when the harvest lands in the same ad group as its source — the
 * bulk sheet then drops the paired negative (it would block the new keyword).
 */
export function landsInSource(d: HarvestDestination, rec: Pick<Recommendation, "campaign" | "adGroup" | "ids">): boolean {
  if (d.mode === "source") return true;
  if (d.mode === "new-campaign") return false;
  if (rec.ids.adGroupId && d.adGroupId === rec.ids.adGroupId) return true;
  return adGroupKey(d.campaignName, d.adGroupName) === adGroupKey(rec.campaign, rec.adGroup) && norm(d.campaignName) !== "";
}
