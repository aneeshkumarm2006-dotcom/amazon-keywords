/**
 * Marketplaces the console knows about, their default currency, and the
 * store colour helpers. Plain data — safe on the server.
 */

export interface Marketplace {
  code: string;
  label: string;
  domain: string;
  currency: string;
}

export const MARKETPLACES: Marketplace[] = [
  { code: "US", label: "United States", domain: "amazon.com", currency: "USD" },
  { code: "UK", label: "United Kingdom", domain: "amazon.co.uk", currency: "GBP" },
  { code: "DE", label: "Germany", domain: "amazon.de", currency: "EUR" },
  { code: "FR", label: "France", domain: "amazon.fr", currency: "EUR" },
  { code: "IT", label: "Italy", domain: "amazon.it", currency: "EUR" },
  { code: "ES", label: "Spain", domain: "amazon.es", currency: "EUR" },
  { code: "CA", label: "Canada", domain: "amazon.ca", currency: "CAD" },
  { code: "MX", label: "Mexico", domain: "amazon.com.mx", currency: "MXN" },
  { code: "IN", label: "India", domain: "amazon.in", currency: "INR" },
  { code: "JP", label: "Japan", domain: "amazon.co.jp", currency: "JPY" },
  { code: "AU", label: "Australia", domain: "amazon.com.au", currency: "AUD" },
  { code: "AE", label: "United Arab Emirates", domain: "amazon.ae", currency: "AED" },
];

export const MARKETPLACE_OPTIONS = MARKETPLACES.map((m) => ({
  value: m.code,
  label: `${m.code} — ${m.domain}`,
}));

/** Every currency a marketplace above uses, in first-seen order. */
export const CURRENCIES: string[] = Array.from(new Set(MARKETPLACES.map((m) => m.currency)));

export function marketplaceByCode(code: string | undefined): Marketplace | undefined {
  const c = (code ?? "").toUpperCase();
  return MARKETPLACES.find((m) => m.code === (c === "GB" ? "UK" : c));
}

export function currencyForMarketplace(code: string | undefined): string | undefined {
  return marketplaceByCode(code)?.currency;
}

/** Literal class names so Tailwind generates them (never build these strings). */
const SERIES_BG = ["bg-series-1", "bg-series-2", "bg-series-3", "bg-series-4", "bg-series-5", "bg-series-6"] as const;
const SERIES_TEXT = ["text-series-1", "text-series-2", "text-series-3", "text-series-4", "text-series-5", "text-series-6"] as const;
const SERIES_BORDER = [
  "border-series-1",
  "border-series-2",
  "border-series-3",
  "border-series-4",
  "border-series-5",
  "border-series-6",
] as const;

export const SERIES_COUNT = SERIES_BG.length;

function seriesSlot(colorIndex: number): number {
  const n = Number.isFinite(colorIndex) ? Math.trunc(colorIndex) : 0;
  return ((n % SERIES_COUNT) + SERIES_COUNT) % SERIES_COUNT;
}

export function seriesBg(colorIndex: number): string {
  return SERIES_BG[seriesSlot(colorIndex)];
}

export function seriesText(colorIndex: number): string {
  return SERIES_TEXT[seriesSlot(colorIndex)];
}

export function seriesBorder(colorIndex: number): string {
  return SERIES_BORDER[seriesSlot(colorIndex)];
}

/** CSS variable for SVG fills / recharts props, e.g. `var(--series-2)`. */
export function seriesVar(colorIndex: number): string {
  return `var(--series-${seriesSlot(colorIndex) + 1})`;
}

/** Colour names for the picker (spoken and shown next to the swatch). */
export const SERIES_NAMES = ["Green", "Ember", "Blue", "Rose", "Gold", "Violet"] as const;

/** The lowest colour slot no existing store uses (wraps when all six are taken). */
export function nextColorIndex(used: number[]): number {
  const taken = new Set(used.map(seriesSlot));
  for (let i = 0; i < SERIES_COUNT; i++) if (!taken.has(i)) return i;
  return used.length % SERIES_COUNT;
}
