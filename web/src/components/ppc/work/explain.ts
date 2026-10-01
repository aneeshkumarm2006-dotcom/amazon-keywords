/**
 * "Why" panels: every recommendation explained in plain English with the
 * numbers behind it. Pure; relative imports only.
 *
 * The engine returns results (a suggested bid, a max CPC, a reason); the
 * intermediate numbers — AOV, the CVR prior and where it came from, the
 * smoothed CVR, the ladder rung, which guardrail bit — are rebuilt here from
 * the same rows with the engine's own helpers (see `model.ts`), so the maths
 * shown adds up to exactly the engine's figure.
 */

import { applyGuardrails, bidDecimals, ladderChange, maxCpc as maxCpcOf, roundBid, smoothedCvr, type GuardrailResult } from "../../../lib/ppc/bidding";
import { acos as acosOf, aov as aovOf, ctr as ctrOf, cvr as cvrOf } from "../../../lib/ppc/metrics";
import type { Recommendation, Store } from "../../../lib/ppc/types";
import { count, money } from "../format";
import { aovSourceLabel, aovWithFallback, priorCvr, type PriorIndex, type PriorSource } from "./model";

export interface MathLine {
  /** Short label, e.g. "Max CPC". */
  label: string;
  /** The calculation, e.g. "30% target × $19.99 AOV × 21.57% smoothed CVR = $1.29". */
  formula: string;
  /** Plain-English gloss. */
  note?: string;
}

export interface Explanation {
  /** Why, in one or two sentences a seller can act on. */
  headline: string;
  /** What uploading it changes in Amazon. */
  what: string;
  lines: MathLine[];
  /** One-line version of the maths, e.g. "Max CPC = … = $0.72 → bid $0.58 (80%)". */
  summary?: string;
  impact: string;
  cautions: string[];
  /** Figures other parts of the UI reuse (e.g. the capped-by note on the bid input). */
  figures: {
    aov?: number;
    smoothedCvr?: number;
    priorCvr?: number;
    priorSource?: PriorSource;
    maxCpc?: number;
    ratio?: number;
    change?: number;
    guard?: GuardrailResult;
    /** The bid the maths lands on (should equal rec.suggestedBid). */
    bid?: number;
    cappedByMaxCpc?: boolean;
  };
}

export interface ExplainContext {
  store: Store;
  priors: PriorIndex;
  /** Days in the engine window (impact is scaled to 30 days). */
  windowDays: number;
  /** Where an approved harvest will be created, e.g. "new campaign GarlicPress_Exact_Harvest". */
  destinationLabel?: string;
  /** Bid the user typed (replaces the engine's bid in "If you approve"). */
  bidOverride?: number;
}

/* -------------------------------------------------------------- formatting */

/** 0.3 → "30%", 0.2157 → "21.57%" (trailing zeros trimmed). */
export function rate(r: number, digits = 1): string {
  if (!Number.isFinite(r)) return "—";
  return `${(r * 100).toFixed(digits).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1")}%`;
}

function signedRate(r: number): string {
  if (!Number.isFinite(r) || Math.abs(r) < 1e-9) return "±0%";
  return `${r > 0 ? "+" : "−"}${rate(Math.abs(r))}`;
}

function x2(r: number): string {
  return Number.isFinite(r) ? `${r.toFixed(2)}×` : "—";
}

function s(n: number, one: string, many = `${one}s`): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

function quote(t: string): string {
  return `“${t}”`;
}

function where(rec: Pick<Recommendation, "campaign" | "adGroup">): string {
  return `${rec.campaign} / ${rec.adGroup}`;
}

const PRIOR_WORD: Record<PriorSource, string> = { "ad group": "ad group", campaign: "campaign", store: "store", none: "" };

/* -------------------------------------------------------------- dispatcher */

export function explainRecommendation(rec: Recommendation, ctx: ExplainContext): Explanation {
  switch (rec.action) {
    case "harvest-exact":
    case "harvest-phrase":
    case "harvest-product":
      return explainHarvest(rec, ctx);
    case "negate-exact":
    case "negate-product":
      return explainNegate(rec, ctx);
    case "negate-phrase":
      return explainNegatePhrase(rec, ctx);
    case "bid-up":
    case "bid-down":
      return explainBid(rec, ctx);
    case "pause":
      return explainPause(rec, ctx);
    case "relevance":
      return explainRelevance(rec, ctx);
  }
}

/* ----------------------------------------------------------------- harvest */

/** The harvest bid maths, shared by the Why panel and the self-test. */
export function harvestMaths(rec: Recommendation, ctx: Pick<ExplainContext, "store" | "priors">) {
  const R = ctx.store.rules;
  const E = ctx.store.economics;
  const c = rec.counters;
  const aov = aovOf(c);
  const prior = priorCvr(ctx.priors, rec.campaign, rec.adGroup);
  const sCvr = smoothedCvr(c.orders, c.clicks, prior.cvr, R.cvrPriorWeight);
  const mc = maxCpcOf(E.targetAcos, aov, sCvr);
  const mult = rec.action === "harvest-phrase" ? R.matchMultipliers.phrase : R.matchMultipliers.exact;
  const raw = E.targetAcos * aov * sCvr * R.harvestBidFactor * mult;
  const clamped = Math.min(R.bidCeiling, Math.max(R.bidFloor, raw));
  const bid = Number.isFinite(raw) && raw > 0 ? roundBid(clamped, bidDecimals(ctx.store.currency)) : NaN;
  return { aov, prior, sCvr, mc, mult, factor: R.harvestBidFactor, raw, bid, floored: raw < R.bidFloor, ceilinged: raw > R.bidCeiling };
}

function explainHarvest(rec: Recommendation, ctx: ExplainContext): Explanation {
  const { store } = ctx;
  const cur = store.currency;
  const R = store.rules;
  const E = store.economics;
  const c = rec.counters;
  const m = harvestMaths(rec, ctx);
  const product = rec.action === "harvest-product";
  const phrase = rec.action === "harvest-phrase";
  const a = acosOf(c);
  const finalBid = rec.suggestedBid ?? m.bid;
  const lines: MathLine[] = [
    {
      label: "Average order value",
      formula: `${money(c.sales, cur)} sales ÷ ${s(c.orders, "order")} = ${money(m.aov, cur)}`,
    },
  ];
  if (m.prior.source !== "none") {
    lines.push({
      label: "Smoothed conversion rate",
      formula: `(${c.orders} orders + ${R.cvrPriorWeight} × ${rate(m.prior.cvr, 2)} ${PRIOR_WORD[m.prior.source]} CVR) ÷ (${c.clicks} clicks + ${R.cvrPriorWeight}) = ${rate(m.sCvr, 2)}`,
      note: `Its own rate is ${rate(cvrOf(c))} on ${s(c.clicks, "click")}. Blending in the ${PRIOR_WORD[m.prior.source]}'s ${rate(m.prior.cvr, 2)} keeps a short lucky streak from inflating the bid.`,
    });
  } else {
    lines.push({ label: "Conversion rate", formula: `${c.orders} orders ÷ ${c.clicks} clicks = ${rate(m.sCvr, 2)}` });
  }
  lines.push({
    label: "Max CPC",
    formula: `${rate(E.targetAcos)} target × ${money(m.aov, cur)} AOV × ${rate(m.sCvr, 2)} CVR = ${money(m.mc, cur)}`,
    note: "The most a click can cost and still land exactly on your target ACoS.",
  });
  const pctOfMax = m.factor * m.mult;
  lines.push({
    label: "Starting bid",
    formula:
      m.mult === 1
        ? `${money(m.mc, cur)} × ${rate(m.factor, 0)} = ${money(finalBid, cur)}`
        : `${money(m.mc, cur)} × ${rate(m.factor, 0)} × ${m.mult} (${phrase ? "phrase" : "match"}) = ${money(finalBid, cur)}`,
    note: `A new ${product ? "product target" : phrase ? "phrase keyword" : "exact keyword"} starts at ${rate(pctOfMax, 0)} of max CPC, leaving room for its conversion rate to settle.${
      m.floored ? ` Raised to your ${money(R.bidFloor, cur)} bid floor.` : m.ceilinged ? ` Limited to your ${money(R.bidCeiling, cur)} bid ceiling.` : ""
    }`,
  });
  const cautions: string[] = [];
  if (rec.suggestedBid !== undefined && Number.isFinite(m.bid) && Math.abs(m.bid - rec.suggestedBid) >= 0.01) {
    cautions.push(`The engine's bid (${money(rec.suggestedBid, cur)}) differs slightly from this rebuild (${money(m.bid, cur)}) because of rounding.`);
  }
  const others = rec.evidence.filter((e) => e.startsWith("also qualifies in"));
  if (others.length) cautions.push(`Also sells in ${s(others.length, "other ad group")} — the source with the most orders was used.`);
  const kind = product ? "product target" : phrase ? "phrase keyword" : "exact keyword";
  const dest = ctx.destinationLabel ? ` in ${ctx.destinationLabel}` : "";
  const typed = ctx.bidOverride !== undefined && Math.abs(ctx.bidOverride - finalBid) >= 0.005;
  const useBid = typed ? ctx.bidOverride! : finalBid;
  if (typed) cautions.push(`You set the bid to ${money(useBid, cur)} instead of the engine's ${money(finalBid, cur)}.`);
  return {
    headline: `${quote(rec.subject)} sold ${s(c.orders, "time")} at ${rate(a)} ACoS — under your ${rate(E.targetAcos)} target. Give it its own ${kind} so you control its bid directly.`,
    what: phrase
      ? `Adds ${quote(rec.subject)} as a phrase keyword at ${money(useBid, cur)}${dest}.`
      : product
        ? `Adds a product target on ${rec.subject.toUpperCase()} at ${money(useBid, cur)}${dest}.`
        : `Adds ${quote(rec.subject)} as an exact keyword at ${money(useBid, cur)}${dest}.`,
    lines,
    summary: `Max CPC = ${rate(E.targetAcos)} target × ${money(m.aov, cur)} AOV × ${rate(m.sCvr, 2)} smoothed CVR = ${money(m.mc, cur)} → bid ${money(finalBid, cur)} (${rate(pctOfMax, 0)})`,
    impact:
      (rec.impact ?? 0) > 0
        ? `About ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month of sales runs through this search term. Harvesting keeps those sales and puts them on a bid you set.`
        : "Moves existing traffic onto its own keyword.",
    cautions,
    figures: { aov: m.aov, smoothedCvr: m.sCvr, priorCvr: m.prior.cvr, priorSource: m.prior.source, maxCpc: m.mc, bid: m.bid },
  };
}

/* --------------------------------------------------------------- negatives */

function explainNegate(rec: Recommendation, ctx: ExplainContext): Explanation {
  const { store } = ctx;
  const cur = store.currency;
  const R = store.rules;
  const E = store.economics;
  const c = rec.counters;
  const product = rec.action === "negate-product";
  const label = product ? `the product ${rec.subject.toUpperCase()}` : quote(rec.subject);
  const paired = rec.evidence.some((e) => e.startsWith("paired negative for"));
  const expensive = rec.evidence.some((e) => e.startsWith("rule: expensive"));
  const what = product
    ? `Adds ${rec.subject.toUpperCase()} as a negative product target in ${where(rec)}: the ad stops showing on that product page there.`
    : `Adds ${quote(rec.subject)} as a negative exact in ${where(rec)}. Only this exact search (and close variants like plurals) is blocked; longer searches still show.`;

  if (paired) {
    return {
      headline: `Companion to the harvest: once ${label} has its own ${product ? "product target" : "exact keyword"}, this stops ${where(rec)} from bidding against it.`,
      what,
      lines: [
        {
          label: "Why block it here",
          formula: `${s(c.clicks, "click")}, ${s(c.orders, "order")} in ${where(rec)}`,
          note: "Without the negative, the old ad group and the new keyword compete in the same auction and split the data. The sales move to the new keyword; they are not lost.",
        },
      ],
      impact: "Saves nothing by itself — the traffic moves to the new keyword.",
      cautions: [],
      figures: {},
    };
  }

  const prior = priorCvr(ctx.priors, rec.campaign, rec.adGroup);
  if (expensive) {
    const a = acosOf(c);
    const x = a / E.breakEvenAcos;
    return {
      headline: `${label} does sell, but at ${rate(a)} ACoS — ${x2(x)} your ${rate(E.breakEvenAcos)} break-even. Every sale from it loses money.`,
      what,
      lines: [
        { label: "ACoS", formula: `${money(c.spend, cur)} spend ÷ ${money(c.sales, cur)} sales = ${rate(a)}` },
        {
          label: "Against break-even",
          formula: `${rate(a)} ÷ ${rate(E.breakEvenAcos)} break-even = ${x2(x)}`,
          note: `The rule blocks converting searches above ${R.expensiveNegateMultiple}× break-even once they have ${R.expensiveNegateMinClicks}+ clicks (this one has ${c.clicks}).`,
        },
      ],
      impact: `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month of spend that sells at a loss.`,
      cautions: [],
      figures: { priorCvr: prior.cvr, priorSource: prior.source },
    };
  }

  const lines: MathLine[] = [
    {
      label: "The rule",
      formula: `0 orders after ${s(c.clicks, "click")} (blocks at ${R.negateClicks}+ clicks with no orders)`,
    },
  ];
  if (prior.source !== "none" && Number.isFinite(prior.cvr)) {
    const expected = c.clicks * prior.cvr;
    lines.push({
      label: "Orders you would expect",
      formula: `${c.clicks} clicks × ${rate(prior.cvr, 2)} ${PRIOR_WORD[prior.source]} CVR ≈ ${expected.toFixed(1)} orders — it got 0`,
    });
  }
  const storeAov = aovOf(ctx.priors.store);
  if (Number.isFinite(storeAov) && storeAov > 0) {
    lines.push({
      label: "Even one sale would not rescue it",
      formula: `${money(c.spend, cur)} spend ÷ ${money(storeAov, cur)} (one average order) = ${rate(c.spend / storeAov)} ACoS`,
      note: c.spend / storeAov > E.targetAcos ? `Still above your ${rate(E.targetAcos)} target.` : "That one sale would bring it under target — negating is a judgement call.",
    });
  }
  return {
    headline: `${s(c.clicks, "click")} on ${label} cost ${money(c.spend, cur)} and brought no sales.`,
    what,
    lines,
    impact: `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month that currently buys no sales.`,
    cautions: [],
    figures: { priorCvr: prior.cvr, priorSource: prior.source },
  };
}

function explainNegatePhrase(rec: Recommendation, ctx: ExplainContext): Explanation {
  const cur = ctx.store.currency;
  const c = rec.counters;
  const terms = rec.evidence.filter((e) => e.startsWith("term “"));
  const more = rec.evidence.find((e) => e.startsWith("…and "));
  const covers = rec.evidence.filter((e) => e.startsWith("covers negate-exact"));
  const lines: MathLine[] = [
    {
      label: "Matching searches",
      formula: `${s(c.clicks, "click")}, ${money(c.spend, cur)} spend, ${s(c.orders, "order")}`,
      note: `${quote(rec.subject)} is on this store's irrelevant-words list. Whole-word match only: “free” never matches “freezer”.`,
    },
    ...terms.map((t) => ({ label: "Search", formula: t.replace(/^term /, "") })),
  ];
  if (more) lines.push({ label: "More", formula: more });
  const cautions = covers.length ? [`Also covers ${s(covers.length, "negative exact")} for the same searches, so those are not listed separately.`] : [];
  return {
    headline: `Searches containing ${quote(rec.subject)} keep getting clicks in ${where(rec)} and never sell.`,
    what: `Adds ${quote(rec.subject)} as a negative phrase in ${where(rec)}: any search containing it stops showing the ad there.`,
    lines,
    impact: `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month that currently buys no sales.`,
    cautions,
    figures: {},
  };
}

/* -------------------------------------------------------------------- bids */

/** The target-level bid maths, shared by the Why panel and the self-test. */
export function bidMaths(rec: Recommendation, ctx: Pick<ExplainContext, "store" | "priors">) {
  const R = ctx.store.rules;
  const E = ctx.store.economics;
  const c = rec.counters;
  const a = acosOf(c);
  const lad = ladderChange(a, E.targetAcos, R.ladder);
  let change = lad?.change ?? 0;
  if (change > 0 && c.orders < R.minOrdersToRaise) change = 0;
  const cvrV = cvrOf(c);
  const medianImpr = ctx.priors.medianTargetImpressions;
  const starved =
    cvrV >= R.starvedMinCvr && c.orders >= R.starvedMinOrders && a < E.targetAcos && Number.isFinite(medianImpr) && c.impressions < medianImpr;
  const starvedApplied = starved && R.starvedRaise > change;
  if (starvedApplied) change = R.starvedRaise;
  const prior = priorCvr(ctx.priors, rec.campaign, rec.adGroup);
  const sCvr = smoothedCvr(c.orders, c.clicks, prior.cvr, R.cvrPriorWeight);
  const aov = aovWithFallback(ctx.priors, c, rec.campaign, rec.adGroup, E.price);
  const mc = maxCpcOf(E.targetAcos, aov.aov, sCvr);
  const current = rec.currentBid;
  const guard =
    current !== undefined
      ? applyGuardrails(current, current * (1 + change), { maxMove: R.maxMove, floor: R.bidFloor, ceiling: R.bidCeiling, maxCpc: mc, decimals: bidDecimals(ctx.store.currency) })
      : undefined;
  return { a, lad, change, starved: starvedApplied, medianImpr, prior, sCvr, aov, mc, current, guard };
}

function capNotes(guard: GuardrailResult | undefined, ctx: ExplainContext, mc: number): string[] {
  if (!guard) return [];
  const cur = ctx.store.currency;
  const R = ctx.store.rules;
  return guard.capped.map((k) =>
    k === "max-cpc"
      ? `capped at max CPC ${money(mc, cur)}`
      : k === "max-move"
        ? `limited to ±${rate(R.maxMove, 0)} per change`
        : k === "floor"
          ? `raised to the ${money(R.bidFloor, cur)} floor`
          : `limited to the ${money(R.bidCeiling, cur)} ceiling`,
  );
}

function explainBid(rec: Recommendation, ctx: ExplainContext): Explanation {
  const { store } = ctx;
  const cur = store.currency;
  const R = store.rules;
  const E = store.economics;
  const c = rec.counters;
  const m = bidMaths(rec, ctx);
  const up = rec.action === "bid-up";
  const lines: MathLine[] = [];
  const ratio = m.lad?.ratio ?? NaN;
  lines.push({
    label: "ACoS against target",
    formula: `${money(c.spend, cur)} ÷ ${money(c.sales, cur)} = ${rate(m.a)} ACoS; ${rate(m.a)} ÷ ${rate(E.targetAcos)} target = ${x2(ratio)}`,
    note: m.lad ? `The bid ladder says ${signedRate(m.lad.change)} at ${x2(ratio)} target.` : undefined,
  });
  if (m.starved) {
    lines.push({
      label: "Starved winner",
      formula: `CVR ${rate(cvrOf(c))} on only ${count(c.impressions)} impressions (store median ${count(Math.round(m.medianImpr))}) → at least ${signedRate(R.starvedRaise)}`,
      note: "It converts well but barely gets shown — a higher bid should buy more impressions.",
    });
  }
  lines.push({
    label: "Max CPC",
    formula: `${rate(E.targetAcos)} target × ${money(m.aov.aov, cur)} AOV × ${rate(m.sCvr, 2)} smoothed CVR = ${money(m.mc, cur)}`,
    note: `AOV from ${aovSourceLabel(m.aov.source)}; smoothed CVR = (${c.orders} orders + ${R.cvrPriorWeight} × ${rate(m.prior.cvr, 2)} ${PRIOR_WORD[m.prior.source] || "prior"} CVR) ÷ (${c.clicks} clicks + ${R.cvrPriorWeight}).`,
  });
  const caps = capNotes(m.guard, ctx, m.mc);
  const finalBid = rec.suggestedBid ?? m.guard?.bid;
  if (m.current !== undefined && finalBid !== undefined) {
    const proposed = m.current * (1 + m.change);
    lines.push({
      label: "New bid",
      formula:
        caps.length || Math.abs(proposed - finalBid) >= 0.005
          ? `${money(m.current, cur)} × (1 ${m.change >= 0 ? "+" : "−"} ${rate(Math.abs(m.change))}) = ${money(proposed, cur)}${
              caps.length ? `, ${caps.join(", ")}` : ""
            } → ${money(finalBid, cur)} (${signedRate(finalBid / m.current - 1)})`
          : `${money(m.current, cur)} × (1 ${m.change >= 0 ? "+" : "−"} ${rate(Math.abs(m.change))}) = ${money(finalBid, cur)} (${signedRate(finalBid / m.current - 1)} after rounding to cents)`,
      note: `Current bid ${money(m.current, cur)} ${rec.currentBidSource === "avg-cpc" ? "is estimated from the average CPC (no bulk file with this keyword)" : "comes from your bulk file"}.`,
    });
  }
  const cautions: string[] = [];
  if (rec.currentBidSource === "avg-cpc") cautions.push("No bulk file bid for this keyword — the current bid is the average CPC. Import a bulk file for exact bids and IDs.");
  if (caps.some((x) => x.startsWith("capped at max CPC"))) cautions.push(`Capped by max CPC: bidding above ${money(m.mc, cur)} would push ACoS past your target.`);
  const monthlySpend = c.spend * (30 / Math.max(1, ctx.windowDays));
  const typed = ctx.bidOverride !== undefined && finalBid !== undefined && Math.abs(ctx.bidOverride - finalBid) >= 0.005;
  if (typed) cautions.push(`You set the bid to ${money(ctx.bidOverride!, cur)} instead of the engine's ${money(finalBid!, cur)}.`);
  return {
    headline: up
      ? `ACoS ${rate(m.a)} is ${x2(ratio)} your ${rate(E.targetAcos)} target with ${s(c.orders, "order")}: there is room to bid more and win more of these sales.`
      : `ACoS ${rate(m.a)} is ${x2(ratio)} your ${rate(E.targetAcos)} target: a lower bid brings the cost per sale back toward target.`,
    what: `Changes the ${rec.matchType === "product" || rec.matchType === "auto" ? "target" : "keyword"} bid ${money(m.current ?? NaN, cur)} → ${money((typed ? ctx.bidOverride : finalBid) ?? NaN, cur)} in ${where(rec)}.`,
    lines,
    summary: `ACoS ${rate(m.a)} ÷ ${rate(E.targetAcos)} target = ${x2(ratio)} → ${signedRate(m.change)}${m.starved ? " (starved winner)" : ""} → ${money(m.current ?? NaN, cur)} → ${money(finalBid ?? NaN, cur)}${caps.length ? ` (${caps.join(", ")})` : ""}`,
    impact: up
      ? `Could add about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month in sales if volume grows with the bid.`
      : `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month (${rate(Math.abs((finalBid ?? 0) / (m.current ?? 1) - 1))} of ${money(monthlySpend, cur, { decimals: 0 })} monthly spend).`,
    cautions,
    figures: {
      aov: m.aov.aov,
      smoothedCvr: m.sCvr,
      priorCvr: m.prior.cvr,
      priorSource: m.prior.source,
      maxCpc: m.mc,
      ratio,
      change: m.change,
      guard: m.guard,
      bid: m.guard?.bid,
      cappedByMaxCpc: !!m.guard?.capped.includes("max-cpc"),
    },
  };
}

function explainPause(rec: Recommendation, ctx: ExplainContext): Explanation {
  const { store } = ctx;
  const cur = store.currency;
  const R = store.rules;
  const E = store.economics;
  const c = rec.counters;
  const what = `Pauses the ${rec.matchType === "product" || rec.matchType === "auto" ? "target" : "keyword"} ${quote(rec.subject)} in ${where(rec)}. You can re-enable it any time in Amazon.`;
  if (c.orders === 0) {
    const prior = priorCvr(ctx.priors, rec.campaign, rec.adGroup);
    const lines: MathLine[] = [{ label: "The rule", formula: `0 orders after ${s(c.clicks, "click")} (pauses at ${R.negateClicks}+ clicks with no orders)` }];
    if (Number.isFinite(prior.cvr)) {
      lines.push({
        label: "Orders you would expect",
        formula: `${c.clicks} clicks × ${rate(prior.cvr, 2)} ${PRIOR_WORD[prior.source]} CVR ≈ ${(c.clicks * prior.cvr).toFixed(1)} — it got 0`,
      });
    }
    return {
      headline: `${s(c.clicks, "click")} cost ${money(c.spend, cur)} with no sales. Pausing stops the spend.`,
      what,
      lines,
      impact: `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month that currently buys no sales.`,
      cautions: [],
      figures: { priorCvr: prior.cvr, priorSource: prior.source },
    };
  }
  const m = bidMaths(rec, ctx);
  const ratio = m.lad?.ratio ?? NaN;
  const bound = R.ladder.length > 1 ? R.ladder[R.ladder.length - 2].upTo : 2;
  const alt = m.current !== undefined ? applyGuardrails(m.current, m.current * (1 + (m.lad?.change ?? -R.maxMove)), { maxMove: R.maxMove, floor: R.bidFloor, ceiling: R.bidCeiling, maxCpc: m.mc, decimals: bidDecimals(cur) }) : undefined;
  const lines: MathLine[] = [
    {
      label: "ACoS against target",
      formula: `${money(c.spend, cur)} ÷ ${money(c.sales, cur)} = ${rate(m.a)} ACoS; ${rate(m.a)} ÷ ${rate(E.targetAcos)} = ${x2(ratio)} target`,
      note: `Above ${x2(Number.isFinite(bound) ? bound : 2)} target the ladder pauses instead of trimming the bid.`,
    },
  ];
  if (alt && !alt.hold && m.current !== undefined) {
    lines.push({
      label: "Softer alternative",
      formula: `Lower the bid ${money(m.current, cur)} → ${money(alt.bid, cur)} (${signedRate(alt.change)}) instead`,
      note: "Reject this pause and edit the keyword's bid in Amazon if you would rather keep it running.",
    });
  }
  return {
    headline: `ACoS ${rate(m.a)} is ${x2(ratio)} your ${rate(E.targetAcos)} target — each sale costs far more than it earns.`,
    what,
    lines,
    impact: `Saves about ${money(rec.impact ?? 0, cur, { decimals: 0 })} a month of spend (its ${s(c.orders, "order")} go with it).`,
    cautions: [],
    figures: { ratio, maxCpc: m.mc },
  };
}

function explainRelevance(rec: Recommendation, ctx: ExplainContext): Explanation {
  const R = ctx.store.rules;
  const c = rec.counters;
  const ctrV = ctrOf(c);
  return {
    headline: `${count(c.impressions)} shoppers saw the ad for ${quote(rec.subject)} and only ${rate(ctrV, 2)} clicked. Usually the main image, title, price or star rating does not match what they searched for.`,
    what: "Nothing to upload. Check the listing against this search, or pause the keyword if it is not really your product.",
    lines: [
      {
        label: "Click-through rate",
        formula: `${count(c.clicks)} clicks ÷ ${count(c.impressions)} impressions = ${rate(ctrV, 2)}`,
        note: `Flagged at ${count(R.relevanceMinImpressions)}+ impressions with CTR under ${rate(R.relevanceMaxCtr, 2)}.`,
      },
    ],
    impact: "Informational — no money moves until you change the listing or the keyword.",
    cautions: [],
    figures: {},
  };
}

/* ------------------------------------------------------------------ helpers */

/** Short phrase for the bid cell: "capped by max CPC $0.67" when the engine hit that guardrail. */
export function bidCapNote(rec: Recommendation): "max-cpc" | "max-move" | null {
  const g = rec.evidence.find((e) => e.startsWith("guardrails:"));
  if (!g) return null;
  if (g.includes("max-cpc")) return "max-cpc";
  if (g.includes("max-move")) return "max-move";
  return null;
}
