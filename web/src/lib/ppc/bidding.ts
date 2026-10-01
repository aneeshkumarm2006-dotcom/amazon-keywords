/**
 * Bid maths (SOP-03, Workflow 2, Bid-Calculator.xlsx).
 *
 * - Break-even ACoS = (price − COGS − FBA fee − referral% × price − other) ÷ price.
 * - Max CPC = target ACoS × AOV × CVR — the click price that lands exactly on target.
 * - Smoothed CVR = (orders + w × prior) ÷ (clicks + w): a Bayesian shrink toward the
 *   ad-group rate so 2 orders on 5 clicks does not read as a 40% CVR.
 * - Harvest bid = target ACoS × AOV × smoothed CVR × harvest factor × match multiplier.
 * - Guardrails: ±maxMove per change, never above max CPC, floor / ceiling, 2 dp.
 */

import type { Economics, GoalMode, LadderRung } from "./types";
import { round2 } from "./metrics";

/** Break-even ACoS from unit economics; NaN without a positive price. */
export function breakEvenFromUnits(
  e: Pick<Economics, "price" | "cogs" | "fbaFee" | "referralPct" | "otherCosts">,
): number {
  const price = e.price ?? 0;
  if (!(price > 0)) return NaN;
  const costs = (e.cogs ?? 0) + (e.fbaFee ?? 0) + (e.referralPct ?? 0) * price + (e.otherCosts ?? 0);
  return (price - costs) / price;
}

/**
 * Suggested target ACoS for a goal, as a multiple of break-even:
 * profit 0.75×, growth 1.0×, launch 1.3× (capped at 0.80), liquidate 1.5×.
 * Launch / liquidate deliberately exceed break-even (buying rank / clearing stock).
 * A suggestion only — rules always use `store.economics.targetAcos`.
 */
export const GOAL_MULTIPLIERS: Record<GoalMode, number> = {
  profit: 0.75,
  growth: 1.0,
  launch: 1.3,
  liquidate: 1.5,
};

export function targetForGoal(breakEven: number, goal: GoalMode): number {
  if (!Number.isFinite(breakEven) || breakEven <= 0) return NaN;
  const t = breakEven * GOAL_MULTIPLIERS[goal];
  const capped = goal === "launch" ? Math.min(t, 0.8) : t;
  return Math.round(capped * 10000) / 10000;
}

/**
 * (orders + weight × prior) ÷ (clicks + weight). With no usable prior the raw
 * CVR is returned (NaN with zero clicks).
 */
export function smoothedCvr(orders: number, clicks: number, priorCvr: number, weight: number): number {
  if (!Number.isFinite(priorCvr) || priorCvr < 0 || !(weight > 0)) {
    return clicks > 0 ? orders / clicks : NaN;
  }
  const den = clicks + weight;
  return den > 0 ? (orders + weight * priorCvr) / den : NaN;
}

/** Target ACoS × AOV × CVR; NaN when any input is missing. */
export function maxCpc(targetAcos: number, aov: number, cvr: number): number {
  const v = targetAcos * aov * cvr;
  return Number.isFinite(v) && v > 0 ? v : NaN;
}

/** Decimal places Amazon accepts for bids in a currency: whole yen for JPY, cents elsewhere. */
export function bidDecimals(currency: string | undefined): number {
  return (currency ?? "").toUpperCase() === "JPY" ? 0 : 2;
}

/** Round a bid to `decimals` places (2 = cents, 0 = whole units). */
export function roundBid(n: number, decimals = 2): number {
  if (decimals === 2) return round2(n);
  const f = 10 ** decimals;
  return Math.round((n + Number.EPSILON) * f) / f;
}

export interface HarvestBidInput {
  targetAcos: number;
  aov: number;
  /** Smoothed CVR (see `smoothedCvr`). */
  cvr: number;
  harvestBidFactor: number;
  matchMultiplier: number;
  floor: number;
  ceiling: number;
  /** Bid decimals (see `bidDecimals`); default 2. */
  decimals?: number;
}

/** Harvest bid, clamped to [floor, ceiling] and rounded to cents (whole yen for JPY). NaN when inputs are missing. */
export function harvestBid(i: HarvestBidInput): number {
  const raw = i.targetAcos * i.aov * i.cvr * i.harvestBidFactor * i.matchMultiplier;
  if (!Number.isFinite(raw) || raw <= 0) return NaN;
  return roundBid(clamp(raw, i.floor, i.ceiling), i.decimals ?? 2);
}

export interface LadderResult {
  /** ACoS ÷ target. */
  ratio: number;
  index: number;
  rung: LadderRung;
  change: number;
  flagPause: boolean;
}

/** Tolerance for ladder bounds: 0.525 ÷ 0.35 is 1.5000000000000002 in floating point. */
const LADDER_EPS = 1e-9;

/**
 * Find the ladder rung for an ACoS; undefined when ACoS or target is not usable.
 * The first rung is strict ("below half target": ratio < upTo); every later rung
 * applies when ratio ≤ upTo. Bounds compare with a 1e-9 tolerance so a ratio
 * that is exactly on a bound mathematically lands on that bound's rung.
 */
export function ladderChange(acosValue: number, target: number, ladder: LadderRung[]): LadderResult | undefined {
  if (!Number.isFinite(acosValue) || !(target > 0) || !ladder.length) return undefined;
  const r = acosValue / target;
  for (let i = 0; i < ladder.length; i++) {
    const rung = ladder[i];
    // JSON backups turn Infinity into null — treat a missing bound as open-ended.
    const upTo = typeof rung.upTo === "number" && !Number.isNaN(rung.upTo) ? rung.upTo : Infinity;
    const within = i === 0 && ladder.length > 1 ? r < upTo - LADDER_EPS : r <= upTo + LADDER_EPS;
    if (within) return { ratio: r, index: i, rung, change: rung.change, flagPause: !!rung.flagPause };
  }
  const last = ladder[ladder.length - 1];
  return { ratio: r, index: ladder.length - 1, rung: last, change: last.change, flagPause: !!last.flagPause };
}

export interface GuardrailOptions {
  maxMove: number;
  floor: number;
  ceiling: number;
  /** NaN / undefined = no max-CPC cap. */
  maxCpc?: number;
  /** Bid decimals (see `bidDecimals`); default 2 (cents). */
  decimals?: number;
}

export interface GuardrailResult {
  /** Final bid (equals current when held). */
  bid: number;
  /** Relative change actually applied (bid ÷ current − 1). */
  change: number;
  /** True when the final move is below one cent. */
  hold: boolean;
  /** Which guardrails bit: "max-move", "max-cpc", "floor", "ceiling". */
  capped: string[];
}

/**
 * Apply SOP-03 guardrails to a proposed bid:
 * 1. limit the move to ±maxMove of the current bid;
 * 2. never above max CPC — a raise stops at max(current, maxCpc) (so it can become
 *    a hold, never a cut); a cut may go down to max CPC but still no further than
 *    one maxMove step;
 * 3. clamp to [floor, ceiling] — but never past steps 1–2: a raise stays
 *    within [current, min(current × (1 + maxMove), max(current, maxCpc))] and a
 *    cut within [current × (1 − maxMove), current]. So a bid below the floor
 *    moves toward it by at most one step (never above max CPC), a cut never
 *    turns into a raise, and a bid above the ceiling is cut by at most one step;
 * 4. round to cents (whole units with `decimals: 0`); a move under one unit is a hold.
 */
export function applyGuardrails(current: number, proposed: number, o: GuardrailOptions): GuardrailResult {
  const capped: string[] = [];
  if (!(current > 0) || !Number.isFinite(proposed)) {
    return { bid: current, change: 0, hold: true, capped };
  }
  const decimals = o.decimals ?? 2;
  const unit = 10 ** -decimals;
  const lo = current * (1 - o.maxMove);
  const hi = current * (1 + o.maxMove);
  const raising = proposed > current;
  let p = proposed;
  if (p > hi) {
    p = hi;
    capped.push("max-move");
  } else if (p < lo) {
    p = lo;
    capped.push("max-move");
  }
  const cap = o.maxCpc;
  const hasCap = cap !== undefined && Number.isFinite(cap) && cap > 0;
  if (hasCap && p > cap) {
    p = raising ? Math.max(current, cap) : Math.max(cap, lo);
    capped.push("max-cpc");
  }
  // The band steps 1–2 allow; floor / ceiling may only move the bid inside it.
  const capBound = hasCap ? Math.max(current, cap) : Infinity;
  const bandLo = raising ? current : lo;
  const bandHi = raising ? Math.min(hi, capBound) : current;
  let q = p;
  if (q < o.floor) {
    q = o.floor;
    capped.push("floor");
  }
  if (q > o.ceiling) {
    q = o.ceiling;
    capped.push("ceiling");
  }
  if (q > bandHi) {
    q = bandHi;
    if (raising) capped.push(hasCap && capBound < hi ? "max-cpc" : "max-move");
  } else if (q < bandLo) {
    q = bandLo;
    if (!raising) capped.push("max-move");
  }
  p = roundBid(q, decimals);
  if (Math.abs(p - current) < unit - 1e-9) {
    return { bid: current, change: 0, hold: true, capped: [...new Set(capped)] };
  }
  return { bid: p, change: p / current - 1, hold: false, capped: [...new Set(capped)] };
}

/** Bid-Calculator.xlsx: conservative 60%, recommended 80%, aggressive 100% of max CPC. */
export function bidLadder(maxCpcValue: number): { conservative: number; recommended: number; aggressive: number } {
  if (!Number.isFinite(maxCpcValue) || maxCpcValue <= 0) return { conservative: NaN, recommended: NaN, aggressive: NaN };
  return {
    conservative: round2(maxCpcValue * 0.6),
    recommended: round2(maxCpcValue * 0.8),
    aggressive: round2(maxCpcValue),
  };
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
