/**
 * Plain-English definitions for the words the console cannot avoid. Shown as
 * tooltips (the `Jargon` component) wherever the term first appears on a
 * page. Written for a seller, not a PPC specialist.
 *
 * Rule numbers here are the toolkit defaults and say so; a page that shows
 * one store passes that store's numbers (`ladderText`, `guardrailsText`),
 * since every store can change them in Stores.
 *
 * Relative imports only: `scripts/ppc-test-ui.ts` runs this under jiti.
 */

import type { LadderRung, RuleConfig } from "../../../lib/ppc/types";

export type GlossaryKey =
  | "acos"
  | "targetAcos"
  | "breakEven"
  | "cvr"
  | "smoothedCvr"
  | "ctr"
  | "cpc"
  | "maxCpc"
  | "aov"
  | "harvest"
  | "negativeExact"
  | "negativePhrase"
  | "negativeProduct"
  | "impact"
  | "ladder"
  | "guardrails"
  | "bulkSheet"
  | "attributionLag"
  | "matchType"
  | "productTarget"
  | "learning";

export const GLOSSARY: Record<GlossaryKey, { term: string; text: string }> = {
  acos: {
    term: "ACoS",
    text: "Advertising cost of sales: ad spend ÷ ad sales. 25% means every $1 of ad sales cost 25¢ in clicks. Lower is cheaper.",
  },
  targetAcos: {
    term: "Target ACoS",
    text: "The ACoS you want to run at. The rules keep what beats it, cut what misses it, and size bids so a click pays for itself at this level.",
  },
  breakEven: {
    term: "Break-even ACoS",
    text: "The ACoS where an ad sale makes exactly zero profit: your margin before ads. Above it, each ad sale loses money.",
  },
  cvr: {
    term: "CVR",
    text: "Conversion rate: orders ÷ clicks. 10% means one order for every ten clicks.",
  },
  smoothedCvr: {
    term: "Smoothed CVR",
    text: "The conversion rate blended with the ad group's rate, weighted like 15 extra clicks by default. Stops 2 lucky orders on 5 clicks from reading as 40%.",
  },
  ctr: {
    term: "CTR",
    text: "Click-through rate: clicks ÷ impressions. How often shoppers who see the ad click it.",
  },
  cpc: {
    term: "CPC",
    text: "Cost per click: what you actually paid per click on average (spend ÷ clicks). Usually a little below your bid.",
  },
  maxCpc: {
    term: "Max CPC",
    text: "The most a click can cost while still landing on your target ACoS: target ACoS × average order value × conversion rate. Bids stay at or below it.",
  },
  aov: {
    term: "AOV",
    text: "Average order value: ad sales ÷ orders.",
  },
  harvest: {
    term: "Harvest",
    text: "Take a search term that already sells (usually found by an auto or broad campaign) and add it as its own exact keyword, so you control its bid directly.",
  },
  negativeExact: {
    term: "Negative exact",
    text: "Blocks the ad from showing for exactly this search (and close variants like plurals). Longer searches that contain it still show.",
  },
  negativePhrase: {
    term: "Negative phrase",
    text: "Blocks the ad for any search that contains this word or phrase, e.g. negative phrase “free” blocks “free garlic press” and “garlic press free shipping”.",
  },
  negativeProduct: {
    term: "Negative product target",
    text: "Stops the ad from showing on that product's page (the ASIN).",
  },
  impact: {
    term: "Impact / month",
    text: "Rough monthly money at stake, from the evaluated window (the last 30 days by default): spend saved for negatives and pauses, sales carried for harvests, the bid change's share for bid moves.",
  },
  ladder: {
    term: "Bid ladder",
    text: "How far to move a bid based on ACoS ÷ target. By default: under 0.5× +15%, up to 0.8× +8%, up to 1.2× hold, up to 1.5× −12%, up to 2× −20%, above 2× −20% and flag for pausing. Each store can change its ladder in Stores.",
  },
  guardrails: {
    term: "Guardrails",
    text: "Safety limits on every bid change. By default: at most ±20% per change, never above max CPC, never below the floor or above the ceiling. Each store sets its own in Stores.",
  },
  bulkSheet: {
    term: "Bulk sheet",
    text: "An Excel file Amazon Ads accepts under Bulk operations. It applies many keyword, negative and bid changes in one upload.",
  },
  attributionLag: {
    term: "Attribution lag",
    text: "Amazon keeps adding orders to a click for up to 7 days, so the newest days look worse than they are. The rules leave them out.",
  },
  matchType: {
    term: "Match type",
    text: "How closely a search must match the keyword: exact (that search), phrase (contains it in order), broad (related words, any order). Auto and product targets are picked by Amazon or by ASIN.",
  },
  productTarget: {
    term: "Product target",
    text: "Targeting a specific product page (ASIN) instead of a search term.",
  },
  learning: {
    term: "Learning",
    text: "Targets younger than the minimum history (14 days by default) are left alone — too early to judge.",
  },
};

/* ------------------------------------------------------ per-store wording */

function times(x: number): string {
  return `${Number(x.toFixed(2))}×`;
}

function move(change: number): string {
  if (!Number.isFinite(change) || Math.abs(change) < 1e-9) return "hold";
  const n = Number((Math.abs(change) * 100).toFixed(1));
  return `${change > 0 ? "+" : "−"}${n}%`;
}

/**
 * The bid-ladder definition for a store's own rungs (same reading as
 * `ladderChange`: the first rung is strict, a missing bound is open-ended).
 */
export function ladderText(ladder: readonly LadderRung[]): string {
  if (!ladder.length) return GLOSSARY.ladder.text;
  const parts: string[] = [];
  let prev: number | undefined;
  ladder.forEach((rung, i) => {
    const upTo = typeof rung.upTo === "number" && !Number.isNaN(rung.upTo) ? rung.upTo : Infinity;
    const step = rung.flagPause ? (move(rung.change) === "hold" ? "flag for pausing" : `${move(rung.change)} and flag for pausing`) : move(rung.change);
    if (Number.isFinite(upTo)) parts.push(`${i === 0 && ladder.length > 1 ? "under" : "up to"} ${times(upTo)} ${step}`);
    else parts.push(prev !== undefined ? `above ${times(prev)} ${step}` : `any ACoS ${step}`);
    prev = upTo;
  });
  return `How far to move a bid based on ACoS ÷ target, for this store: ${parts.join(", ")}.`;
}

/** The guardrails definition with a store's own limits; `money` formats in the store's currency. */
export function guardrailsText(rules: Pick<RuleConfig, "maxMove" | "bidFloor" | "bidCeiling">, money: (n: number) => string): string {
  return `Safety limits on every bid change, for this store: at most ±${Number((rules.maxMove * 100).toFixed(1))}% per change, never above max CPC, never below the ${money(rules.bidFloor)} floor or above the ${money(rules.bidCeiling)} ceiling.`;
}
