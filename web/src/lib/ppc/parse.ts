/**
 * Cell value parsing: numbers, dates and match types as they appear in Amazon
 * reports exported from different marketplaces, spreadsheet apps and the Ads API.
 */

import { excelSerialToIso, isIsoDate, makeIsoDate } from "./dates";
import type { MatchType } from "./types";

/* ----------------------------------------------------------------- numbers */

/** "us" = 1,234.56 ; "eu" = 1.234,56 */
export type NumberStyle = "us" | "eu";

const BLANK_NUMBER = new Set(["", "-", "--", "—", "–", "n/a", "na", "null", "none", "nan", "#n/a"]);

/**
 * Decide whether a column set uses European decimal commas. Looks for
 * unambiguous evidence in either direction; ties and no evidence → "us".
 */
export function detectNumberStyle(values: Iterable<string>): NumberStyle {
  let eu = 0;
  let us = 0;
  let seen = 0;
  for (const raw of values) {
    const v = cleanNumericText(raw);
    if (!v) continue;
    if (++seen > 5000) break;
    if (/\d\.\d{3},\d/.test(v) || /^-?\d+,\d{1,2}$/.test(v) || /,\d{4,}$/.test(v)) eu++;
    else if (/\d,\d{3}\.\d/.test(v) || /^-?\d+\.\d{1,2}$/.test(v) || /\.\d{4,}$/.test(v)) us++;
  }
  return eu > us ? "eu" : "us";
}

/** Strip currency symbols/codes, spaces and the % sign, keeping digits, separators, sign and exponent. */
function cleanNumericText(raw: string): string {
  return raw
    .trim()
    .replace(/[\s']/g, "")
    .replace(/^\((.*)\)$/, "-$1")
    .replace(/[^0-9.,\-+eE%]/g, "")
    .replace(/%$/, "");
}

/**
 * Parse a report number robustly: currency symbols and codes, thousands
 * separators, European decimals (`1.234,56` with style "eu", or detected when
 * unambiguous), `%` (returned as a ratio), accounting negatives `(12.50)`,
 * blanks / "--" / "N/A" → 0. Unparseable text → NaN.
 */
export function parseNumber(raw: string | number | null | undefined, style?: NumberStyle): number {
  if (typeof raw === "number") return raw;
  if (raw === null || raw === undefined) return 0;
  const trimmed = raw.trim();
  if (BLANK_NUMBER.has(trimmed.toLowerCase())) return 0;
  const percent = /%\s*$/.test(trimmed);
  // JS \s already covers NBSP (U+00A0) and narrow NBSP (U+202F) thousands separators.
  let s = trimmed.replace(/[\s']/g, "");
  let negative = false;
  if (/^\(.*\)$/.test(s)) {
    negative = true;
    s = s.slice(1, -1);
  }
  // Keep only numeric characters; currency symbols / codes fall away.
  s = s.replace(/[^0-9.,\-+eE]/g, "");
  // An "e" that is not an exponent (e.g. from "USD" leftovers) is removed above
  // only if it is not between digits.
  if (!/\d[eE][+-]?\d/.test(s)) s = s.replace(/[eE]/g, "");
  if (s === "" || s === "-" || s === "+") return percent || trimmed === "" ? 0 : NaN;

  const hasComma = s.indexOf(",") !== -1;
  const hasDot = s.indexOf(".") !== -1;
  let effective = style;
  if (hasComma && hasDot) {
    effective = s.lastIndexOf(",") > s.lastIndexOf(".") ? "eu" : "us";
  } else if (hasComma && !effective) {
    // "1,234" / "12,345,678" → thousands; "12,5" / "0,25" → decimal comma.
    effective = /^[-+]?\d{1,3}(,\d{3})+$/.test(s) ? "us" : "eu";
  } else if (!effective) {
    effective = "us";
  }
  if (effective === "eu") {
    // Dots are thousands separators unless there is exactly one dot and no comma
    // followed by a non-3-digit group, e.g. "0.25" in an otherwise EU file.
    if (!hasComma && hasDot && !/^[-+]?\d{1,3}(\.\d{3})+$/.test(s)) {
      // Plain "12.5" — treat the dot as decimal.
    } else {
      s = s.replace(/\./g, "").replace(",", ".");
    }
  } else {
    s = s.replace(/,/g, "");
  }
  let n = Number(s);
  if (!Number.isFinite(n)) return NaN;
  if (negative) n = -n;
  return percent ? n / 100 : n;
}

/* ------------------------------------------------------------------- dates */

/** Order of day and month in numeric dates such as 01/09/2026. */
export type DateOrder = "MDY" | "DMY";

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3, apr: 4, april: 4, may: 5,
  jun: 6, june: 6, jul: 7, july: 7, aug: 8, august: 8, sep: 9, sept: 9, september: 9,
  oct: 10, october: 10, nov: 11, november: 11, dec: 12, december: 12,
  // Common non-English abbreviations seen in EU marketplace exports.
  mär: 3, mrz: 3, mai: 5, okt: 10, dez: 12, ene: 1, abr: 4, ago: 8, dic: 12,
  janv: 1, févr: 2, fevr: 2, avr: 4, juin: 6, juil: 7, août: 8, aout: 8, déc: 12,
  gen: 1, mag: 5, giu: 6, lug: 7, set: 9, ott: 10,
};

function monthFromName(name: string): number | undefined {
  const k = name.toLowerCase().replace(/\.$/, "");
  return MONTHS[k] ?? MONTHS[k.slice(0, 3)];
}

function expandYear(y: string): number {
  const n = parseInt(y, 10);
  if (y.length <= 2) return n + 2000;
  return n;
}

const NUMERIC_DATE_RE = /^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2}|\d{4})$/;

/* --------------------------------------------------------------- countries */

/** Country names / codes / Amazon domains (normalised: lower-case, letters only) → marketplace code. */
const COUNTRY_ALIASES: Record<string, string> = {};
(
  [
    ["US", "us", "usa", "unitedstates", "unitedstatesofamerica", "america", "amazoncom"],
    ["UK", "uk", "gb", "gbr", "unitedkingdom", "greatbritain", "britain", "england", "amazoncouk"],
    ["DE", "de", "deu", "germany", "deutschland", "allemagne", "germania", "alemania", "amazonde"],
    ["FR", "fr", "fra", "france", "frankreich", "francia", "amazonfr"],
    ["IT", "it", "ita", "italy", "italia", "italien", "italie", "amazonit"],
    ["ES", "es", "esp", "spain", "espana", "spanien", "espagne", "spagna", "amazones"],
    ["CA", "ca", "can", "canada", "kanada", "amazonca"],
    ["MX", "mx", "mex", "mexico", "mexiko", "mexique", "messico", "amazoncommx"],
    ["IN", "in", "ind", "india", "indien", "inde", "amazonin"],
    ["JP", "jp", "jpn", "japan", "nippon", "japon", "giappone", "日本", "amazoncojp"],
    ["AU", "au", "aus", "australia", "australien", "australie", "amazoncomau"],
    ["AE", "ae", "are", "uae", "unitedarabemirates", "emirates", "amazonae"],
    ["SA", "sa", "sau", "saudiarabia", "ksa", "amazonsa"],
    ["BR", "br", "bra", "brazil", "brasil", "amazoncombr"],
    ["NL", "nl", "nld", "netherlands", "nederland", "holland", "amazonnl"],
    ["SE", "se", "swe", "sweden", "sverige", "amazonse"],
    ["PL", "pl", "pol", "poland", "polska", "amazonpl"],
    ["TR", "tr", "tur", "turkey", "turkiye", "amazoncomtr"],
    ["SG", "sg", "sgp", "singapore", "amazonsg"],
    ["BE", "be", "bel", "belgium", "belgique", "belgie", "amazoncombe"],
    ["EG", "eg", "egy", "egypt", "amazoneg"],
    ["IE", "ie", "irl", "ireland", "amazonie"],
    ["ZA", "za", "zaf", "southafrica", "amazoncoza"],
  ] as const
).forEach(([code, ...names]) => {
  for (const n of names) COUNTRY_ALIASES[n] = code;
});

/**
 * Marketplace code ("US", "UK", "DE", …) for a Country / Marketplace cell:
 * ISO codes, English and local country names and Amazon domains are accepted
 * ("United States", "GB", "Deutschland", "amazon.co.jp"). Undefined when the
 * value is not a recognised country.
 */
export function countryCode(raw: string | null | undefined): string | undefined {
  if (!raw) return undefined;
  const k = raw
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/^(https?:\/\/)?(www\.)?/, "")
    .replace(/[^\p{L}]/gu, "");
  return k ? COUNTRY_ALIASES[k] : undefined;
}

/** Marketplaces whose reports and spreadsheet locales write numeric dates month-first. */
const MONTH_FIRST_COUNTRIES = new Set(["US", "CA"]);
const MONTH_FIRST_CURRENCIES = new Set(["USD", "CAD"]);

/**
 * Scan numeric date values (a/b/yyyy) to decide day/month order for the whole
 * file. Any first part > 12 ⇒ DMY; any second part > 12 ⇒ MDY; otherwise the
 * hint decides: a recognised country (name, code or Amazon domain) first — US /
 * CA ⇒ MDY, anything else ⇒ DMY — then the currency (USD / CAD ⇒ MDY, other ⇒
 * DMY); an unrecognised country is ignored. No hint ⇒ MDY. Mexico writes dates
 * day-first, so MX / MXN ⇒ DMY.
 */
export function detectDateOrder(
  values: Iterable<string>,
  hint?: { currency?: string; country?: string },
): DateOrder | undefined {
  let firstOver12 = false;
  let secondOver12 = false;
  let numeric = 0;
  let dotted = 0;
  for (const raw of values) {
    const v = raw.trim().split(/[ T]/)[0];
    const m = NUMERIC_DATE_RE.exec(v);
    if (!m) continue;
    numeric++;
    if (v.indexOf(".") !== -1) dotted++;
    if (+m[1] > 12) firstOver12 = true;
    if (+m[2] > 12) secondOver12 = true;
  }
  if (numeric === 0) return undefined;
  if (firstOver12 && !secondOver12) return "DMY";
  if (secondOver12 && !firstOver12) return "MDY";
  // Dotted dates (01.09.2026) are day-first everywhere they are used.
  if (dotted > numeric / 2) return "DMY";
  const country = countryCode(hint?.country);
  if (country) return MONTH_FIRST_COUNTRIES.has(country) ? "MDY" : "DMY";
  const currency = (hint?.currency ?? "").trim().toUpperCase();
  if (/^[A-Z]{3}$/.test(currency)) return MONTH_FIRST_CURRENCIES.has(currency) ? "MDY" : "DMY";
  return "MDY";
}

/**
 * Parse a report date to ISO "YYYY-MM-DD". Accepts ISO (with optional time),
 * "2026/09/01", "Sep 01, 2026", "September 1 2026", "01 Sep 2026", "1-Sep-26",
 * numeric "9/1/2026" / "01/09/2026" (per `order`), "20260901", and Excel serials
 * (when `allowSerial`). Returns null when the text is not a date.
 */
export function parseDate(raw: string | null | undefined, order: DateOrder = "MDY", allowSerial = true): string | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;

  // ISO / year-first.
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?:[T ].*)?$/.exec(s);
  if (m) return makeIsoDate(+m[1], +m[2], +m[3]);

  // Compact YYYYMMDD.
  m = /^(19|20)(\d{2})(\d{2})(\d{2})$/.exec(s);
  if (m) return makeIsoDate(+(m[1] + m[2]), +m[3], +m[4]);

  // Excel serial (xlsx cells).
  if (allowSerial && /^\d{4,6}(\.\d+)?$/.test(s)) {
    const n = Number(s);
    if (n >= 20000 && n <= 80000) return excelSerialToIso(n);
    return null;
  }

  // Month name first: "Sep 01, 2026", "September 1 2026", "Sep-01-2026".
  m = /^([A-Za-zÀ-ÿ]{3,10})\.?[\s\-/]+(\d{1,2})(?:st|nd|rd|th)?,?[\s\-/]+(\d{2}|\d{4})(?:[T ,].*)?$/.exec(s);
  if (m) {
    const mo = monthFromName(m[1]);
    if (mo) return makeIsoDate(expandYear(m[3]), mo, +m[2]);
  }

  // Day first with month name: "01 Sep 2026", "1-Sep-26", "1. Sep. 2026".
  m = /^(\d{1,2})\.?[\s\-/]+([A-Za-zÀ-ÿ]{3,10})\.?,?[\s\-/]+(\d{2}|\d{4})(?:[T ,].*)?$/.exec(s);
  if (m) {
    const mo = monthFromName(m[2]);
    if (mo) return makeIsoDate(expandYear(m[3]), mo, +m[1]);
  }

  // Numeric a/b/yyyy (optionally followed by a time).
  const datePart = s.split(/[ T]/)[0];
  m = NUMERIC_DATE_RE.exec(datePart);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = expandYear(m[3]);
    // An impossible value for the chosen order flips it for this cell.
    if (order === "MDY") return makeIsoDate(y, a, b) ?? makeIsoDate(y, b, a);
    return makeIsoDate(y, b, a) ?? makeIsoDate(y, a, b);
  }

  return isIsoDate(s) ? s : null;
}

/* ------------------------------------------------------------- match types */

const AUTO_TARGETS = new Set(["close-match", "loose-match", "substitutes", "complements", "*"]);

/** Lower-case, drop spaces / dashes / underscores and accents (NFKD + strip combining marks). */
function matchTypeKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[\s_-]+/g, "").normalize("NFKD").replace(/\p{M}/gu, "");
}

/** Match-type words of the localised consoles (DE / FR / IT / ES / JP), keyed by `matchTypeKey`. */
const LOCAL_MATCH_TYPES: Record<string, MatchType> = Object.fromEntries(
  (
    [
      ["exact", ["Exakt", "Genau", "Exacte", "Esatta", "Esatto", "Exacta", "Exacto", "完全一致"]],
      ["phrase", ["Wortgruppe", "Expression", "Frase", "フレーズ一致", "フレーズ"]],
      ["broad", ["Weitgehend", "Allgemein", "Large", "Requête large", "Generica", "Generico", "Amplia", "Amplio", "Concordancia amplia", "部分一致"]],
    ] as const
  ).flatMap(([type, words]) => words.map((w) => [matchTypeKey(w), type as MatchType] as const)),
);

/** True when a targeting value is a product / category expression. */
export function isProductExpression(targeting: string): boolean {
  const t = targeting.trim().toLowerCase();
  return /^(asin|asin-expanded|category|brand|price|rating|asin-same-as|asin-category-same-as|asin-brand-same-as|similar-product|exact-product|related|views)\s*[=<>(]/.test(t) || /\basin(-expanded)?\s*=/.test(t);
}

/**
 * Normalise a report match type (with the targeting text for context):
 * exact / phrase / broad; "-", "", auto sub-targets (close-match, loose-match,
 * substitutes, complements) → "auto"; asin= / asin-expanded= / category= →
 * "product"; anything else → "unknown".
 */
export function normalizeMatchType(raw: string | null | undefined, targeting = ""): MatchType {
  const m = (raw ?? "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (m === "exact" || m === "negativeexact") return "exact";
  if (m === "phrase" || m === "negativephrase") return "phrase";
  if (m === "broad") return "broad";
  // Localised console reports (DE / FR / IT / ES / JP) write the match type in the console language.
  const local = LOCAL_MATCH_TYPES[matchTypeKey(m)];
  if (local) return local;
  const t = targeting.trim().toLowerCase();
  if (t && isProductExpression(t)) return "product";
  if (AUTO_TARGETS.has(t)) return "auto";
  if (m === "" || m === "auto" || m === "targetingexpressionpredefined") return "auto";
  if (m === "targetingexpression" || m === "product" || m === "producttargeting") return "product";
  return "unknown";
}
