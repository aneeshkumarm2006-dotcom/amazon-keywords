/**
 * ISO calendar-day helpers ("YYYY-MM-DD"). All arithmetic is done in UTC so a
 * day is always 24 h regardless of the machine's timezone / DST.
 */

const DAY_MS = 86_400_000;

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isIsoDate(value: string): boolean {
  const m = ISO_RE.exec(value);
  if (!m) return false;
  const y = +m[1];
  const mo = +m[2];
  const d = +m[3];
  if (mo < 1 || mo > 12 || d < 1) return false;
  return d <= daysInMonth(y, mo);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Build an ISO date from parts; returns null when the parts are not a real day. */
export function makeIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null;
  if (year < 1900 || year > 2200 || month < 1 || month > 12 || day < 1) return null;
  if (day > daysInMonth(year, month)) return null;
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function toUtcMs(iso: string): number {
  return Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
}

function fromUtcMs(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** `iso` shifted by `days` (may be negative). */
export function addDays(iso: string, days: number): string {
  return fromUtcMs(toUtcMs(iso) + days * DAY_MS);
}

/** Whole days from `a` to `b` (b − a). */
export function daysBetween(a: string, b: string): number {
  return Math.round((toUtcMs(b) - toUtcMs(a)) / DAY_MS);
}

/** Inclusive list of days from `from` to `to`. */
export function dayRange(from: string, to: string): string[] {
  const out: string[] = [];
  const n = daysBetween(from, to);
  for (let i = 0; i <= n; i++) out.push(addDays(from, i));
  return out;
}

export function minDate(a: string, b: string): string {
  return a <= b ? a : b;
}

export function maxDate(a: string, b: string): string {
  return a >= b ? a : b;
}

/** Excel serial day number → ISO date (1900 date system, with the 1900 leap-year bug). */
export function excelSerialToIso(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2958465) return null;
  const whole = Math.floor(serial);
  // Serial 60 is the fictitious 1900-02-29; serials after it are offset by one.
  const base = Date.UTC(1899, 11, 30);
  const adjusted = whole < 60 ? whole + 1 : whole;
  return fromUtcMs(base + adjusted * DAY_MS);
}

/** ISO date → Excel serial day number. */
export function isoToExcelSerial(iso: string): number {
  const days = Math.round((toUtcMs(iso) - Date.UTC(1899, 11, 30)) / DAY_MS);
  return days < 61 ? days - 1 : days;
}

/** "2026-09-30" → "20260930" (bulk sheet Start Date format). */
export function compactDate(iso: string): string {
  return iso.replace(/-/g, "");
}

/** Today's date as ISO in the local timezone (call-time only; never at module load). */
export function todayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
