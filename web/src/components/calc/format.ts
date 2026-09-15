import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Tone } from "@/types/content";

/**
 * Number rendering for the calculators.
 *
 * `@/lib/utils` deliberately trims trailing zeros so prose reads well. A
 * calculator wants the opposite: a column of results has to keep the same
 * number of decimal places or the eye cannot compare two rows. These helpers
 * are the fixed-precision variants, plus the divide-by-zero guard every
 * formula on these pages runs through.
 */

/** Division that yields NaN instead of Infinity, so formatters render an em dash. */
export function div(numerator: number, denominator: number): number {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) {
    return Number.NaN;
  }
  return numerator / denominator;
}

/** 1234.5 -> "$1,234.50" */
export function money(value: number, decimals = 2): string {
  return formatCurrency(value, decimals);
}

/** 24.53 -> "24.5%" — the input is already a percentage, not a ratio. */
export function pct(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}%`;
}

/** 0.2453 -> "24.5%" — for values held as ratios. */
export function ratioPct(value: number, decimals = 1): string {
  return pct(value * 100, decimals);
}

/** 4 -> "4.00x" */
export function mult(value: number, decimals = 2): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}x`;
}

/** 1234.5 -> "1,235" (or "1,234.5" with decimals: 1). */
export function num(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  return formatNumber(value, decimals);
}

/** "+12.4 pts" / "-3.0 pts" — signed point deltas for percentage metrics. */
export function points(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)} pts`;
}

/** "+25%" / "−10%" — signed relative change. */
export function signedPct(value: number, decimals = 0): string {
  if (!Number.isFinite(value)) return "—";
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(decimals)}%`;
}

/**
 * The three-band ACoS verdict used across the site: at or under break-even is
 * profitable, up to 20% over is the warning band, beyond that the ad costs
 * more than the margin on the units it sells.
 */
export function acosTone(acos: number, breakEven: number): Tone {
  if (!Number.isFinite(acos)) return "bad";
  if (!Number.isFinite(breakEven) || breakEven <= 0) return "neutral";
  if (acos <= breakEven) return "good";
  if (acos <= breakEven * 1.2) return "warn";
  return "bad";
}

export function acosVerdict(acos: number, breakEven: number): string {
  const tone = acosTone(acos, breakEven);
  if (tone === "good") return "Profitable — ACoS is at or below break-even";
  if (tone === "warn") return "Warning — ACoS is within 20% of break-even";
  if (tone === "neutral") return "Enter a price and costs to get a verdict";
  return "Losing money — ACoS is above break-even";
}

/** Design-token CSS variables, for SVG fills and recharts props. */
export const TONE_VAR: Record<Tone, string> = {
  neutral: "var(--hairline-strong)",
  brand: "var(--brand)",
  ember: "var(--ember)",
  good: "var(--good)",
  warn: "var(--warn)",
  bad: "var(--bad)",
  info: "var(--info)",
};

/** Soft token fills, for chart bands and gauge tracks. */
export const TONE_SOFT_VAR: Record<Tone, string> = {
  neutral: "var(--surface-2)",
  brand: "var(--brand-soft)",
  ember: "var(--ember-soft)",
  good: "var(--good-soft)",
  warn: "var(--warn-soft)",
  bad: "var(--bad-soft)",
  info: "var(--info-soft)",
};
