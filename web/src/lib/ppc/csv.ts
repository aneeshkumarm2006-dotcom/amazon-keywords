/**
 * RFC-4180 CSV reader / writer.
 *
 * - Quoted fields, `""` escapes, embedded delimiters and newlines inside quotes.
 * - CRLF, LF and lone CR line endings.
 * - UTF-8 BOM stripped.
 * - Delimiter sniffed from the first lines (comma, tab or semicolon) unless given.
 *
 * Single pass over the string with `charCodeAt` — no regex per character — so a
 * 100k-row Search Term Report parses in well under a second.
 */

export type CsvDelimiter = "," | "\t" | ";";

export interface ParseCsvOptions {
  /** Force a delimiter; sniffed when omitted. */
  delimiter?: CsvDelimiter;
  /** Drop rows whose every field is blank (default true). */
  skipEmptyRows?: boolean;
}

const QUOTE = 34; // "
const CR = 13;
const LF = 10;

/** Remove a leading UTF-8 byte-order mark. */
export function stripBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/**
 * Guess the delimiter by counting unquoted comma / tab / semicolon characters on
 * the first few non-empty lines. The candidate with the highest consistent count
 * wins; ties fall back to comma > tab > semicolon.
 */
export function sniffDelimiter(text: string): CsvDelimiter {
  const candidates: CsvDelimiter[] = [",", "\t", ";"];
  const sample = text.slice(0, 64 * 1024);
  // Count per line, respecting quotes.
  const perLine: Record<string, number[]> = { ",": [], "\t": [], ";": [] };
  let counts: Record<string, number> = { ",": 0, "\t": 0, ";": 0 };
  let inQuotes = false;
  let lines = 0;
  let lineHasContent = false;
  for (let i = 0; i < sample.length && lines < 20; i++) {
    const c = sample[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      lineHasContent = true;
    } else if (!inQuotes && (c === "\n" || c === "\r")) {
      if (lineHasContent) {
        for (const d of candidates) perLine[d].push(counts[d]);
        lines++;
      }
      counts = { ",": 0, "\t": 0, ";": 0 };
      lineHasContent = false;
    } else {
      if (!inQuotes && (c === "," || c === "\t" || c === ";")) counts[c]++;
      lineHasContent = true;
    }
  }
  if (lineHasContent) for (const d of candidates) perLine[d].push(counts[d]);

  let best: CsvDelimiter = ",";
  let bestScore = -1;
  for (const d of candidates) {
    const arr = perLine[d];
    if (arr.length === 0) continue;
    // Score: the max count seen on the most common "wide" line. Title rows above
    // the header often have zero delimiters, so use the maximum and the number of
    // lines that reach at least half of it.
    const max = Math.max(...arr);
    if (max === 0) continue;
    const consistent = arr.filter((n) => n >= Math.max(1, Math.floor(max / 2))).length;
    const score = consistent * 1000 + max;
    if (score > bestScore) {
      bestScore = score;
      best = d;
    }
  }
  return best;
}

/** Parse CSV text into rows of string fields. */
export function parseCsv(input: string, options: ParseCsvOptions = {}): string[][] {
  const text = stripBom(input);
  const delimiter = options.delimiter ?? sniffDelimiter(text);
  const skipEmpty = options.skipEmptyRows !== false;
  const delim = delimiter.charCodeAt(0);
  const rows: string[][] = [];
  const n = text.length;

  let row: string[] = [];
  let i = 0;
  let fieldStart = 0;

  const pushRow = () => {
    if (skipEmpty) {
      let blank = true;
      for (let k = 0; k < row.length; k++) {
        if (row[k] !== "") {
          blank = false;
          break;
        }
      }
      if (!blank) rows.push(row);
    } else {
      rows.push(row);
    }
    row = [];
  };

  while (i < n) {
    const c = text.charCodeAt(i);
    if (c === QUOTE && i === fieldStart) {
      // Quoted field: scan to the closing quote, un-escaping "".
      let value = "";
      let segStart = i + 1;
      let j = i + 1;
      for (;;) {
        const q = text.indexOf('"', j);
        if (q === -1) {
          // Unterminated quote: take the rest of the input.
          value += text.slice(segStart);
          j = n;
          break;
        }
        if (text.charCodeAt(q + 1) === QUOTE) {
          value += text.slice(segStart, q) + '"';
          j = q + 2;
          segStart = j;
          continue;
        }
        value += text.slice(segStart, q);
        j = q + 1;
        break;
      }
      // Anything between the closing quote and the next delimiter / newline is
      // appended verbatim (lenient, as Excel does).
      let k = j;
      while (k < n) {
        const d = text.charCodeAt(k);
        if (d === delim || d === CR || d === LF) break;
        k++;
      }
      if (k > j) value += text.slice(j, k);
      row.push(value);
      i = k;
      if (i >= n) {
        pushRow();
        return rows;
      }
      const d = text.charCodeAt(i);
      if (d === delim) {
        i++;
        fieldStart = i;
        if (i >= n) {
          row.push("");
          pushRow();
          return rows;
        }
      } else {
        // newline
        i += d === CR && text.charCodeAt(i + 1) === LF ? 2 : 1;
        fieldStart = i;
        pushRow();
      }
      continue;
    }

    // Unquoted field: scan to the next delimiter / newline.
    let k = i;
    while (k < n) {
      const d = text.charCodeAt(k);
      if (d === delim || d === CR || d === LF) break;
      k++;
    }
    row.push(text.slice(fieldStart, k));
    if (k >= n) {
      pushRow();
      return rows;
    }
    const d = text.charCodeAt(k);
    if (d === delim) {
      i = k + 1;
      fieldStart = i;
      if (i >= n) {
        row.push("");
        pushRow();
        return rows;
      }
    } else {
      i = k + (d === CR && text.charCodeAt(k + 1) === LF ? 2 : 1);
      fieldStart = i;
      pushRow();
    }
  }
  if (row.length > 0) pushRow();
  return rows;
}

function escapeField(value: unknown, delimiter: string): string {
  if (value === null || value === undefined) return "";
  let s: string;
  if (typeof value === "number") {
    s = Number.isFinite(value) ? String(value) : "";
  } else {
    s = String(value);
  }
  if (
    s.indexOf('"') !== -1 ||
    s.indexOf(delimiter) !== -1 ||
    s.indexOf("\n") !== -1 ||
    s.indexOf("\r") !== -1 ||
    (s.length > 0 && (s[0] === " " || s[s.length - 1] === " "))
  ) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Serialise rows to CSV (CRLF line endings per RFC-4180). Numbers are written
 * with `String(n)`; non-finite numbers, `null` and `undefined` become blank.
 */
export function toCsv(
  rows: ReadonlyArray<ReadonlyArray<string | number | null | undefined>>,
  delimiter: CsvDelimiter = ",",
): string {
  const out: string[] = [];
  for (const row of rows) {
    const cells: string[] = [];
    for (const cell of row) cells.push(escapeField(cell, delimiter));
    out.push(cells.join(delimiter));
  }
  return out.join("\r\n") + (out.length ? "\r\n" : "");
}
