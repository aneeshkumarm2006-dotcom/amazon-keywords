/**
 * Console formatting. Money is always shown in a store's own currency unless
 * a caller converts it first; rates are ratios (0.3 → "30%").
 */

const moneyFormatters = new Map<string, Intl.NumberFormat>();

function moneyFormatter(currency: string, decimals: number): Intl.NumberFormat {
  const key = `${currency}|${decimals}`;
  let f = moneyFormatters.get(key);
  if (!f) {
    try {
      // "symbol", not "narrowSymbol": several stores' currencies share "$"
      // (USD, CAD, AUD, MXN, SGD) and "¥" (JPY, CNY); en-US keeps "$" for
      // USD and shows CA$ / A$ / MX$ / SGD / CN¥ for the others.
      f = new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        currencyDisplay: "symbol",
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });
    } catch {
      // Unknown ISO code: fall back to a plain number with the code in front.
      f = new Intl.NumberFormat("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
    }
    moneyFormatters.set(key, f);
  }
  return f;
}

const ZERO_DECIMAL = new Set(["JPY", "KRW", "VND", "CLP", "ISK", "HUF"]);

/** 1234.5, "GBP" → "£1,234.50"; "CAD" → "CA$1,234.50". JPY has no minor unit. Non-finite → "—". */
export function money(value: number, currency: string, opts: { decimals?: number } = {}): string {
  if (!Number.isFinite(value)) return "—";
  const cur = (currency || "USD").toUpperCase();
  const decimals = opts.decimals ?? (ZERO_DECIMAL.has(cur) ? 0 : 2);
  const f = moneyFormatter(cur, decimals);
  const out = f.format(value);
  return f.resolvedOptions().style === "currency" ? out : `${cur} ${out}`;
}

/** Whole-unit money for tiles: "£12,340". */
export function moneyShort(value: number, currency: string): string {
  return money(value, currency, { decimals: 0 });
}

/** 0.2453 → "24.5%". Non-finite → "—". */
export function pct(ratio: number, decimals = 1): string {
  if (!Number.isFinite(ratio)) return "—";
  return `${(ratio * 100).toFixed(decimals)}%`;
}

/** 12345 → "12,345". */
export function count(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

/** "1 row" / "2 rows". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${count(n)} ${n === 1 ? one : many}`;
}

const DAY_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const DAY_MONTH_FMT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });

function parseIsoDay(iso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** "2026-09-28" → "28 Sep 2026". */
export function day(iso: string | undefined): string {
  if (!iso) return "—";
  const d = parseIsoDay(iso);
  return d ? DAY_FMT.format(d) : iso;
}

/** "1 Aug – 28 Sep 2026" (year shown once when both ends share it). */
export function dateSpan(from: string | undefined, to: string | undefined): string {
  if (!from && !to) return "—";
  if (!from || !to || from === to) return day(from ?? to);
  const a = parseIsoDay(from);
  const b = parseIsoDay(to);
  if (!a || !b) return `${from} – ${to}`;
  const sameYear = a.getUTCFullYear() === b.getUTCFullYear();
  return `${sameYear ? DAY_MONTH_FMT.format(a) : DAY_FMT.format(a)} – ${DAY_FMT.format(b)}`;
}

/** Inclusive day count between two ISO days. */
export function spanDays(from: string | undefined, to: string | undefined): number {
  if (!from || !to) return 0;
  const a = parseIsoDay(from);
  const b = parseIsoDay(to);
  if (!a || !b) return 0;
  return Math.round((b.getTime() - a.getTime()) / 86_400_000) + 1;
}

const STAMP_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

/** ISO timestamp → "1 Oct 2026, 14:05" in the viewer's timezone. */
export function stamp(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : STAMP_FMT.format(d);
}

/** 1536 → "1.5 KB". */
export function bytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Local-date "YYYY-MM-DD" for filenames (the calc helper stamps UTC). */
export function localStamp(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Random id for stores and batches (event handlers only — never in render). */
export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${rand}`;
}
