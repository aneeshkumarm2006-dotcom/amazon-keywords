/**
 * Time a derived computation. Shows up as `ppc-work:<name>` in the browser's
 * Performance panel and in `performance.getEntriesByName("ppc-work:<name>")`;
 * only the latest measure per name is kept. A no-op outside the browser.
 */
export function measure<T>(name: string, fn: () => T): T {
  if (typeof performance === "undefined" || typeof performance.mark !== "function" || typeof performance.measure !== "function") return fn();
  const label = `ppc-work:${name}`;
  const start = `${label}:start`;
  performance.mark(start);
  const out = fn();
  try {
    performance.clearMeasures(label);
    performance.measure(label, start);
    performance.clearMarks(start);
  } catch {
    /* measuring is best-effort */
  }
  return out;
}
