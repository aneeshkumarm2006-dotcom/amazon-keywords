import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge conditional class names, resolving Tailwind conflicts. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/** 1234567 -> "1,234,567". Non-finite input renders as an em dash. */
export function formatNumber(value: number, maximumFractionDigits = 0): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
    minimumFractionDigits: 0,
  }).format(value);
}

/** 1234.5 -> "$1,235" (or "$1,234.50" with decimals: 2). */
export function formatCurrency(value: number, decimals = 0, currency = "USD"): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

/**
 * 24.5 -> "24.5%". Pass `asRatio` when the input is 0-1 rather than 0-100.
 */
export function formatPercent(value: number, decimals = 1, asRatio = false): string {
  if (!Number.isFinite(value)) return "—";
  const pct = asRatio ? value * 100 : value;
  return `${pct.toFixed(decimals).replace(/\.0+$/, "")}%`;
}

/** 4.0 -> "4.0x" — the conventional ROAS rendering. */
export function formatMultiple(value: number, decimals = 1): string {
  if (!Number.isFinite(value)) return "—";
  return `${value.toFixed(decimals)}x`;
}

/** "Search Term Report (weekly)" -> "search-term-report-weekly" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/** Constrain `value` to the inclusive range [min, max]. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  return Math.min(Math.max(value, min), max);
}

/** "15" -> "15 min", "90" -> "1 hr 30 min". */
export function formatMinutes(minutes: number): string {
  if (!Number.isFinite(minutes) || minutes <= 0) return "—";
  if (minutes < 60) return `${Math.round(minutes)} min`;
  const hrs = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest === 0 ? `${hrs} hr` : `${hrs} hr ${rest} min`;
}

/** Trim prose to a whole word near `max` characters. */
export function truncate(input: string, max = 160): string {
  const text = input.trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  return `${cut.slice(0, lastSpace > 40 ? lastSpace : max).trimEnd()}…`;
}

/** "2026-06-29" -> "29 Jun 2026". Invalid dates return the raw string. */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

/** Stable de-duplication that preserves first-seen order. */
export function unique<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

/** Group a list by a derived string key. */
export function groupBy<T, K extends string>(
  items: readonly T[],
  keyOf: (item: T) => K,
): Record<K, T[]> {
  const out = {} as Record<K, T[]>;
  for (const item of items) {
    const key = keyOf(item);
    (out[key] ??= []).push(item);
  }
  return out;
}

/** Sentence-case a kebab or snake token: "case-study" -> "Case study". */
export function humanize(token: string): string {
  const spaced = token.replace(/[-_]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Percentage change from `before` to `after`, guarding divide-by-zero. */
export function percentChange(before: number, after: number): number {
  if (!Number.isFinite(before) || before === 0) return Number.NaN;
  return ((after - before) / Math.abs(before)) * 100;
}
