"use client";

/**
 * Client-side CSV export.
 *
 * The site is a static export with no server, so "download" means building
 * the file in memory and handing the browser an object URL. The BOM is there
 * on purpose: without it Excel on Windows opens a UTF-8 CSV in the local
 * codepage and mangles any non-ASCII character in a keyword.
 */

/** Quote a field only when it needs it, and double any embedded quotes. */
export function csvCell(value: string | number): string {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** Trigger a download of `content` as `filename`. No-ops on the server. */
export function downloadFile(
  filename: string,
  content: string,
  mime = "text/plain;charset=utf-8",
): void {
  if (typeof window === "undefined") return;
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Revoke on the next tick: Safari needs the URL to still resolve when the
  // synthetic click is processed.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadCsv(filename: string, rows: (string | number)[][]): void {
  downloadFile(filename, `\uFEFF${toCsv(rows)}`, "text/csv;charset=utf-8");
}

/** "2026-09-15" — used to stamp exported filenames. */
export function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}
