/**
 * Bids page calculator (Bid-Calculator.xlsx parity) and store economics
 * helpers. Pure; relative imports only.
 *
 * Workbook: max CPC = target ACoS × AOV × CVR; conservative / recommended /
 * aggressive = 60% / 80% / 100% of max CPC; per match type = recommended ×
 * multiplier (exact 1, phrase 0.85, broad 0.70, auto 0.60). With the
 * workbook defaults (30%, $29.99, 10%): max CPC 0.8997 → 0.54 / 0.72 / 0.90,
 * phrase 0.72 × 0.85 = 0.61.
 */

import { bidLadder, breakEvenFromUnits, maxCpc as maxCpcOf, targetForGoal } from "../../../lib/ppc/bidding";
import { round2, totals, filterByWindow, type DateWindow } from "../../../lib/ppc/metrics";
import type { BiddableMatch, Economics, GoalMode, SearchTermRow } from "../../../lib/ppc/types";

export const WORKBOOK_DEFAULTS = { targetAcos: 0.3, aov: 29.99, cvr: 0.1, currentCpc: 0.85 } as const;

export const DEFAULT_MULTIPLIERS: Record<BiddableMatch, number> = { exact: 1, phrase: 0.85, broad: 0.7, auto: 0.6 };

/** CVRs the sensitivity table sweeps. */
export const CVR_STEPS = [0.05, 0.08, 0.1, 0.12, 0.15, 0.2] as const;

export interface CalcInput {
  targetAcos: number;
  aov: number;
  cvr: number;
  currentCpc: number;
  multipliers?: Record<BiddableMatch, number>;
}

export interface SensitivityRow {
  cvr: number;
  maxCpc: number;
  recommended: number;
  /** ACoS you would run at if clicks cost the current CPC at this CVR. */
  acosAtCurrent: number;
  /** Current CPC ≤ max CPC: the click pays for itself at target. */
  affordable: boolean;
  /** This row's CVR equals the input CVR. */
  current: boolean;
}

export interface CalcResult {
  valid: boolean;
  maxCpc: number;
  conservative: number;
  recommended: number;
  aggressive: number;
  perMatch: { match: BiddableMatch; factor: number; bid: number }[];
  sensitivity: SensitivityRow[];
  /** ACoS at the current CPC with the input CVR. */
  acosAtCurrent: number;
  /** Current CPC vs recommended bid, as a ratio − 1 (NaN without a CPC). */
  cpcGap: number;
}

export function bidCalc(i: CalcInput): CalcResult {
  const mult = i.multipliers ?? DEFAULT_MULTIPLIERS;
  const mc = maxCpcOf(i.targetAcos, i.aov, i.cvr);
  const ladder = bidLadder(mc);
  const valid = Number.isFinite(mc);
  const perMatch = (["exact", "phrase", "broad", "auto"] as BiddableMatch[]).map((m) => ({
    match: m,
    factor: mult[m],
    bid: valid ? round2(ladder.recommended * mult[m]) : NaN,
  }));
  const steps = [...CVR_STEPS] as number[];
  if (Number.isFinite(i.cvr) && i.cvr > 0 && !steps.some((c) => Math.abs(c - i.cvr) < 1e-9)) {
    steps.push(i.cvr);
    steps.sort((a, b) => a - b);
  }
  const sensitivity = steps.map((c) => {
    const m = maxCpcOf(i.targetAcos, i.aov, c);
    const acosAtCurrent = i.currentCpc > 0 && i.aov > 0 ? i.currentCpc / (i.aov * c) : NaN;
    return {
      cvr: c,
      maxCpc: m,
      recommended: Number.isFinite(m) ? round2(m * 0.8) : NaN,
      acosAtCurrent,
      affordable: Number.isFinite(m) && i.currentCpc > 0 && i.currentCpc <= m + 1e-9,
      current: Math.abs(c - i.cvr) < 1e-9,
    };
  });
  return {
    valid,
    maxCpc: mc,
    conservative: ladder.conservative,
    recommended: ladder.recommended,
    aggressive: ladder.aggressive,
    perMatch,
    sensitivity,
    acosAtCurrent: i.currentCpc > 0 && i.aov > 0 && i.cvr > 0 ? i.currentCpc / (i.aov * i.cvr) : NaN,
    cpcGap: i.currentCpc > 0 && Number.isFinite(ladder.recommended) ? i.currentCpc / ladder.recommended - 1 : NaN,
  };
}

/** Calculator inputs from a store's own data in a window: AOV, CVR and CPC from the totals. */
export function storeCalcInputs(rows: readonly SearchTermRow[], window: DateWindow, storeId?: string): {
  aov: number;
  cvr: number;
  cpc: number;
  clicks: number;
  orders: number;
} {
  if (!window.from || !window.to) return { aov: NaN, cvr: NaN, cpc: NaN, clicks: 0, orders: 0 };
  const inScope = storeId ? rows.filter((r) => r.storeId === storeId) : rows;
  const t = totals(filterByWindow(inScope, window));
  return {
    aov: t.orders > 0 ? t.sales / t.orders : NaN,
    cvr: t.clicks > 0 ? t.orders / t.clicks : NaN,
    cpc: t.clicks > 0 ? t.spend / t.clicks : NaN,
    clicks: t.clicks,
    orders: t.orders,
  };
}

/* --------------------------------------------------------------- economics */

export interface UnitEconomics {
  price?: number;
  cogs?: number;
  fbaFee?: number;
  /** Ratio, e.g. 0.15. */
  referralPct?: number;
  otherCosts?: number;
}

export interface UnitResult {
  breakEven: number;
  /** Per-unit profit before ads. */
  margin: number;
  suggestedTarget: number;
}

export function fromUnits(u: UnitEconomics, goal: GoalMode): UnitResult {
  const be = breakEvenFromUnits(u);
  const price = u.price ?? 0;
  return {
    breakEven: be,
    margin: Number.isFinite(be) ? be * price : NaN,
    suggestedTarget: targetForGoal(be, goal),
  };
}

export interface EconomicsCheck {
  errors: { breakEven?: string; target?: string };
  /** Non-blocking notes (target above break-even on a profit goal…). */
  warnings: string[];
}

/** Validate edited economics (ratios). Break-even and target must be 1–100%. */
export function checkEconomics(e: Pick<Economics, "breakEvenAcos" | "targetAcos" | "goal">): EconomicsCheck {
  const errors: EconomicsCheck["errors"] = {};
  const warnings: string[] = [];
  if (!Number.isFinite(e.breakEvenAcos) || e.breakEvenAcos < 0.01 || e.breakEvenAcos > 1) errors.breakEven = "Enter a break-even between 1% and 100%.";
  if (!Number.isFinite(e.targetAcos) || e.targetAcos < 0.01 || e.targetAcos > 1) errors.target = "Enter a target between 1% and 100%.";
  if (!errors.breakEven && !errors.target && e.targetAcos > e.breakEvenAcos + 1e-9) {
    if (e.goal === "launch" || e.goal === "liquidate") {
      warnings.push(
        `Target is above break-even — fine for ${e.goal === "launch" ? "a launch" : "clearing stock"}, where each ad sale is allowed to lose money.`,
      );
    } else {
      warnings.push("Target is above break-even: every sale at target ACoS loses money. Lower the target, or pick the Launch or Liquidate goal if that is the plan.");
    }
  }
  return { errors, warnings };
}

/** Parse a percent field ("30", "30%", "0,3" is read as 0.3%) into a ratio. */
export function parsePercent(text: string): number {
  const t = text.trim().replace("%", "").replace(",", ".");
  if (!t) return NaN;
  const n = Number(t);
  return Number.isFinite(n) ? n / 100 : NaN;
}

/**
 * Normalise a typed amount to "1234.5" form. Separators are read the way a
 * person means them: with both "," and ".", the last one is the decimal point
 * ("1,299.00", "1.299,00"); several of the same are thousands ("1,29,999",
 * "1.299.000"); a lone "," is a decimal comma ("0,72", "12,5") unless exactly
 * three digits follow a non-zero whole part ("1,299", "₹2,500").
 */
export function normalizeAmountText(text: string): string {
  const t = text.trim().replace(/[^\d.,-]/g, "");
  const commas = (t.match(/,/g) ?? []).length;
  const dots = (t.match(/\./g) ?? []).length;
  if (commas && dots) {
    return t.lastIndexOf(",") > t.lastIndexOf(".") ? t.replace(/\./g, "").replace(",", ".") : t.replace(/,/g, "");
  }
  if (commas > 1) return t.replace(/,/g, "");
  if (dots > 1) return t.replace(/\./g, "");
  if (commas === 1) {
    const [whole, frac] = t.split(",");
    const thousands = frac.length === 3 && /[1-9]/.test(whole);
    return thousands ? whole + frac : `${whole}.${frac}`;
  }
  return t;
}

/** Parse a money / number field; blank → undefined, invalid → NaN. */
export function parseAmount(text: string): number | undefined {
  const t = normalizeAmountText(text);
  if (!t) return undefined;
  const n = Number(t);
  return Number.isFinite(n) ? n : NaN;
}

/** Ratio → percent text for inputs: 0.3 → "30", 0.2857 → "28.57". */
export function percentText(r: number | undefined): string {
  if (r === undefined || !Number.isFinite(r)) return "";
  return String(Number((r * 100).toFixed(2)));
}

/** Number → input text with at most 2 decimals. */
export function amountText(n: number | undefined): string {
  if (n === undefined || !Number.isFinite(n)) return "";
  return String(Number(n.toFixed(2)));
}
