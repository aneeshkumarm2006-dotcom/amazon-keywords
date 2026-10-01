/**
 * XLSX reader / writer built on `zip.ts` and `xml.ts` (no dependencies, no DOMParser).
 *
 * Reader
 * - Resolves the workbook through `_rels/.rels` (falls back to `xl/workbook.xml`),
 *   sheet names + relationship ids from the workbook, targets from its rels.
 * - Shared strings: plain `<t>` and rich-text `<r><t>` runs are concatenated;
 *   phonetic runs (`<rPh>`) are ignored; entities and `_xHHHH_` escapes decoded.
 * - Cells are placed by their reference (`AB12` → column 27), so sparse rows keep
 *   positions. Types: `s`, `inlineStr`, `str`, `b` (→ "TRUE"/"FALSE"), `n`/none
 *   (raw numeric text), `e` (error text), `d` (ISO text).
 * - Numbers are returned as the stored text: Excel date serials stay numeric
 *   strings (detect.ts converts them). Rows end at their last non-blank cell and
 *   rows with no cells at all are dropped (mirrors the CSV reader's default).
 *
 * Writer
 * - Minimal valid package: content types, rels, workbook, styles, one worksheet
 *   per sheet. Strings are inline (`t="inlineStr"`), finite numbers are `n`,
 *   null / undefined / "" / non-finite numbers are omitted.
 */

import { getAttr, decodeXml, escapeXml, scanTags } from "./xml";
import { listZip, readZipEntry, readZipEntryChunks, zip, type ZipEntry } from "./zip";

export interface XlsxSheet {
  name: string;
  rows: string[][];
}

export interface ReadXlsxOptions {
  /** Only parse sheets for which this returns true (all sheets when omitted). */
  include?: (name: string, index: number) => boolean;
}

export type XlsxCell = string | number | null | undefined;

export interface XlsxSheetInput {
  name: string;
  rows: XlsxCell[][];
}

/* ---------------------------------------------------------- cell references */

/** 0-based column index → Excel letters (0 → "A", 26 → "AA"). */
export function columnName(index: number): string {
  let n = index + 1;
  let s = "";
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

/** Column letters at the start of a cell reference → 0-based index ("AB12" → 27). -1 if none. */
export function columnIndex(ref: string): number {
  let n = 0;
  let i = 0;
  for (; i < ref.length; i++) {
    const c = ref.charCodeAt(i);
    if (c >= 65 && c <= 90) n = n * 26 + (c - 64);
    else if (c >= 97 && c <= 122) n = n * 26 + (c - 96);
    else break;
  }
  return i === 0 ? -1 : n - 1;
}

function rowNumber(ref: string): number {
  let i = 0;
  while (i < ref.length) {
    const c = ref.charCodeAt(i);
    if (c >= 48 && c <= 57) break;
    i++;
  }
  const n = parseInt(ref.slice(i), 10);
  return Number.isFinite(n) ? n : -1;
}

/* ------------------------------------------------------------------ reader */

const decoder = { current: null as TextDecoder | null };

function utf8(bytes: Uint8Array): string {
  if (!decoder.current) decoder.current = new TextDecoder("utf-8");
  return decoder.current.decode(bytes);
}

/** Resolve a relationship target against the directory of the part that owns the rels. */
function resolveTarget(baseDir: string, target: string): string {
  if (target.startsWith("/")) return target.slice(1);
  const parts = (baseDir ? baseDir.split("/") : []).filter(Boolean);
  for (const seg of target.split("/")) {
    if (seg === "..") parts.pop();
    else if (seg !== "." && seg !== "") parts.push(seg);
  }
  return parts.join("/");
}

function dirOf(path: string): string {
  const i = path.lastIndexOf("/");
  return i === -1 ? "" : path.slice(0, i);
}

function relsPathFor(part: string): string {
  const dir = dirOf(part);
  const file = part.slice(dir ? dir.length + 1 : 0);
  return (dir ? dir + "/" : "") + "_rels/" + file + ".rels";
}

interface Relationship {
  id: string;
  type: string;
  target: string;
}

function parseRels(xml: string): Relationship[] {
  const out: Relationship[] = [];
  scanTags(xml, (tag) => {
    if (!tag.closing && tag.name === "Relationship") {
      out.push({
        id: getAttr(tag.attrs, "Id") ?? "",
        type: getAttr(tag.attrs, "Type") ?? "",
        target: getAttr(tag.attrs, "Target") ?? "",
      });
    }
  });
  return out;
}

/** Concatenate `<t>` text inside a region, skipping phonetic `<rPh>` runs. */
function collectText(xml: string, from: number, to: number): string {
  let out = "";
  let inRph = false;
  let textStart = -1;
  scanTags(
    xml,
    (tag) => {
      if (tag.name === "rPh") {
        if (!tag.closing && !tag.selfClosing) inRph = true;
        else if (tag.closing) inRph = false;
        return;
      }
      if (tag.name !== "t" || inRph) return;
      if (tag.closing) {
        if (textStart >= 0) out += xml.slice(textStart, tag.start);
        textStart = -1;
      } else if (!tag.selfClosing) {
        textStart = tag.end;
      }
    },
    from,
    to,
  );
  return decodeXml(out);
}

/** Parse `xl/sharedStrings.xml` into an array of strings. */
export function parseSharedStrings(xml: string): string[] {
  const out: string[] = [];
  let siStart = -1;
  let inRph = false;
  let textStart = -1;
  let current = "";
  scanTags(xml, (tag) => {
    switch (tag.name) {
      case "si":
        if (tag.closing) {
          out.push(decodeXml(current));
          siStart = -1;
        } else if (tag.selfClosing) {
          out.push("");
        } else {
          siStart = tag.end;
          current = "";
        }
        return;
      case "rPh":
        if (!tag.closing && !tag.selfClosing) inRph = true;
        else if (tag.closing) inRph = false;
        return;
      case "t":
        if (siStart < 0 || inRph) return;
        if (tag.closing) {
          if (textStart >= 0) current += xml.slice(textStart, tag.start);
          textStart = -1;
        } else if (!tag.selfClosing) {
          textStart = tag.end;
        }
        return;
    }
  });
  return out;
}

/** Parse a worksheet's `<sheetData>` into rows of strings. */
export function parseWorksheet(xml: string, shared: string[]): string[][] {
  const rows: string[][] = [];
  let sdStart = xml.indexOf("sheetData");
  if (sdStart === -1) return rows;
  sdStart = xml.lastIndexOf("<", sdStart);

  let row: string[] | null = null;
  let nextRowNum = 1;
  let lastRowNum = 0;
  let nextCol = 0;

  // Cell state
  let cellCol = -1;
  let cellType = "";
  let vStart = -1;
  let vText: string | null = null;
  let isStart = -1;
  let isText: string | null = null;

  const finishRow = () => {
    if (!row) return;
    let end = row.length;
    while (end > 0 && row[end - 1] === "") end--;
    if (end > 0) {
      if (end < row.length) row.length = end;
      rows.push(row);
    }
    row = null;
  };

  scanTags(
    xml,
    (tag) => {
      const name = tag.name;
      if (name === "row") {
        if (tag.closing) {
          finishRow();
          return;
        }
        finishRow();
        const r = getAttr(tag.attrs, "r");
        const num = r ? parseInt(r, 10) : NaN;
        lastRowNum = Number.isFinite(num) ? num : nextRowNum;
        nextRowNum = lastRowNum + 1;
        nextCol = 0;
        row = [];
        if (tag.selfClosing) finishRow();
        return;
      }
      if (name === "c") {
        if (tag.closing) {
          if (row && cellCol >= 0) {
            let value = "";
            if (cellType === "s") {
              const idx = vText === null ? NaN : parseInt(vText, 10);
              value = Number.isFinite(idx) && shared[idx] !== undefined ? shared[idx] : "";
            } else if (cellType === "inlineStr") {
              value = isText ?? (vText === null ? "" : decodeXml(vText));
            } else if (cellType === "b") {
              value = vText === null ? "" : vText.trim() === "1" ? "TRUE" : "FALSE";
            } else if (vText !== null) {
              value = decodeXml(vText);
            }
            while (row.length < cellCol) row.push("");
            row[cellCol] = value;
          }
          cellCol = -1;
          return;
        }
        if (!row) {
          // Cell outside a <row> (malformed) — start an implicit row.
          row = [];
          nextCol = 0;
        }
        const ref = getAttr(tag.attrs, "r");
        let col = ref ? columnIndex(ref) : -1;
        if (col < 0) col = nextCol;
        if (ref && lastRowNum === 0) {
          const rn = rowNumber(ref);
          if (rn > 0) lastRowNum = rn;
        }
        nextCol = col + 1;
        cellType = getAttr(tag.attrs, "t") ?? "n";
        vText = null;
        isText = null;
        vStart = -1;
        isStart = -1;
        cellCol = tag.selfClosing ? -1 : col;
        return;
      }
      if (cellCol < 0) return;
      if (name === "v") {
        if (tag.closing) {
          if (vStart >= 0) vText = xml.slice(vStart, tag.start);
          vStart = -1;
        } else if (tag.selfClosing) {
          vText = "";
        } else {
          vStart = tag.end;
        }
        return;
      }
      if (name === "is") {
        if (tag.closing) {
          if (isStart >= 0) isText = collectText(xml, isStart, tag.start);
          isStart = -1;
        } else if (tag.selfClosing) {
          isText = "";
        } else {
          isStart = tag.end;
        }
      }
    },
    sdStart,
  );
  finishRow();
  return rows;
}

/**
 * Parse a worksheet delivered as byte chunks (e.g. straight from the inflater)
 * without ever holding the whole sheet as one string: V8 caps strings at ~512
 * MiB (Chromium's TextDecoder silently returns "" past it), and a 500k-row
 * sheet is larger than that. Text is decoded incrementally and cut after the
 * last complete `</row>`; each cut is parsed with `parseWorksheet`. Output is
 * identical to `parseWorksheet` on the whole text.
 */
export async function parseWorksheetChunks(chunks: AsyncIterable<Uint8Array> | Iterable<Uint8Array>, shared: string[]): Promise<string[][]> {
  const decoder = new TextDecoder("utf-8");
  const rows: string[][] = [];
  let buf = "";
  let rowClose: string | null = null; // "</row>" or "</x:row>" once <sheetData> is seen
  let first = true;
  const flush = (text: string) => {
    // Later cuts start mid-<sheetData>; give parseWorksheet the anchor it looks for.
    const part = parseWorksheet(first ? text : `<sheetData>${text}`, shared);
    first = false;
    for (const r of part) rows.push(r);
  };
  const take = () => {
    if (rowClose === null) {
      const at = buf.indexOf("sheetData");
      if (at === -1) return;
      const lt = buf.lastIndexOf("<", at);
      // Namespace prefix of <sheetData> (e.g. "x:") applies to <row> too.
      rowClose = `</${lt === -1 ? "" : buf.slice(lt + 1, at)}row>`;
    }
    const cut = buf.lastIndexOf(rowClose);
    if (cut === -1) return;
    const end = cut + rowClose.length;
    flush(buf.slice(0, end));
    buf = buf.slice(end);
  };
  for await (const chunk of chunks) {
    buf += decoder.decode(chunk, { stream: true });
    take();
  }
  buf += decoder.decode();
  if (buf || first) flush(buf);
  return rows;
}

interface WorkbookSheetRef {
  name: string;
  path: string;
}

async function workbookSheets(
  bytes: Uint8Array,
  entries: Map<string, ZipEntry>,
): Promise<{ sheets: WorkbookSheetRef[]; sharedPath: string | null }> {
  const read = async (path: string): Promise<string | null> => {
    const e = entries.get(path);
    return e ? utf8(await readZipEntry(bytes, e)) : null;
  };

  let workbookPath = "xl/workbook.xml";
  const rootRels = await read("_rels/.rels");
  if (rootRels) {
    const office = parseRels(rootRels).find((r) => /\/officeDocument$/.test(r.type));
    if (office) workbookPath = resolveTarget("", office.target);
  }
  const workbookXml = await read(workbookPath);
  if (!workbookXml) throw new Error("Not an Excel workbook (no xl/workbook.xml).");

  const relsXml = await read(relsPathFor(workbookPath));
  const rels = relsXml ? parseRels(relsXml) : [];
  const baseDir = dirOf(workbookPath);
  const relById = new Map(rels.map((r) => [r.id, r] as const));

  const sheets: WorkbookSheetRef[] = [];
  let ordinal = 0;
  scanTags(workbookXml, (tag) => {
    if (tag.closing || tag.name !== "sheet") return;
    ordinal++;
    const name = getAttr(tag.attrs, "name") ?? `Sheet${ordinal}`;
    const rid = getAttr(tag.attrs, "id", true);
    const rel = rid ? relById.get(rid) : undefined;
    let path = rel ? resolveTarget(baseDir, rel.target) : `${baseDir ? baseDir + "/" : ""}worksheets/sheet${ordinal}.xml`;
    if (!entries.has(path)) {
      // Some writers use a different case or leading slash — try a lenient match.
      const lower = path.toLowerCase();
      for (const key of entries.keys()) {
        if (key.toLowerCase() === lower) {
          path = key;
          break;
        }
      }
    }
    sheets.push({ name, path });
  });

  const sharedRel = rels.find((r) => /\/sharedStrings$/.test(r.type));
  let sharedPath: string | null = sharedRel ? resolveTarget(baseDir, sharedRel.target) : null;
  if (!sharedPath || !entries.has(sharedPath)) {
    const fallback = `${baseDir ? baseDir + "/" : ""}sharedStrings.xml`;
    sharedPath = entries.has(fallback) ? fallback : null;
  }
  return { sheets, sharedPath };
}

/** List sheet names without parsing any worksheet. */
export async function xlsxSheetNames(bytes: Uint8Array): Promise<string[]> {
  const entries = new Map(listZip(bytes).map((e) => [e.name, e] as const));
  const { sheets } = await workbookSheets(bytes, entries);
  return sheets.map((s) => s.name);
}

/** Read an .xlsx workbook into sheets of string rows. */
export async function readXlsx(
  bytes: Uint8Array,
  options: ReadXlsxOptions = {},
): Promise<{ sheets: XlsxSheet[] }> {
  const entries = new Map(listZip(bytes).map((e) => [e.name, e] as const));
  const { sheets, sharedPath } = await workbookSheets(bytes, entries);
  const wanted = sheets.filter((s, i) => (options.include ? options.include(s.name, i) : true));
  if (wanted.length === 0) return { sheets: [] };

  let shared: string[] = [];
  if (sharedPath) {
    const e = entries.get(sharedPath);
    if (e) shared = parseSharedStrings(utf8(await readZipEntry(bytes, e)));
  }

  const out: XlsxSheet[] = [];
  for (const s of wanted) {
    const e = entries.get(s.path);
    if (!e) {
      out.push({ name: s.name, rows: [] });
      continue;
    }
    // Streamed: a worksheet can be far larger than the biggest string a JS engine allows.
    out.push({ name: s.name, rows: await parseWorksheetChunks(readZipEntryChunks(bytes, e), shared) });
  }
  return { sheets: out };
}

/* ------------------------------------------------------------------ writer */

const INVALID_SHEET_CHARS = /[\[\]:*?/\\]/g;

/** Make a sheet name Excel accepts: ≤ 31 chars, no []:*?/\, unique, not blank. */
function safeSheetName(name: string, used: Set<string>): string {
  let base = name.replace(INVALID_SHEET_CHARS, " ").replace(/^'+|'+$/g, "").trim() || "Sheet";
  base = base.slice(0, 31);
  let candidate = base;
  let n = 2;
  while (used.has(candidate.toLowerCase())) {
    const suffix = ` (${n++})`;
    candidate = base.slice(0, 31 - suffix.length) + suffix;
  }
  used.add(candidate.toLowerCase());
  return candidate;
}

function formatNumber(n: number): string {
  // Excel keeps 15 significant digits; String() gives the shortest round-trip form.
  return String(n);
}

function worksheetXml(rows: XlsxCell[][]): string {
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ',
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
  ];
  let maxCol = 0;
  for (const row of rows) if (row.length > maxCol) maxCol = row.length;
  if (rows.length > 0 && maxCol > 0) {
    parts.push(`<dimension ref="A1:${columnName(maxCol - 1)}${rows.length}"/>`);
  }
  parts.push("<sheetData>");
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    const rn = r + 1;
    const cells: string[] = [];
    for (let c = 0; c < row.length; c++) {
      const v = row[c];
      if (v === null || v === undefined) continue;
      const ref = columnName(c) + rn;
      if (typeof v === "number") {
        if (!Number.isFinite(v)) continue;
        cells.push(`<c r="${ref}"><v>${formatNumber(v)}</v></c>`);
      } else {
        const s = String(v);
        if (s === "") continue;
        const preserve = /^\s|\s$|\n/.test(s) ? ' xml:space="preserve"' : "";
        cells.push(`<c r="${ref}" t="inlineStr"><is><t${preserve}>${escapeXml(s)}</t></is></c>`);
      }
    }
    parts.push(cells.length ? `<row r="${rn}">${cells.join("")}</row>` : `<row r="${rn}"/>`);
  }
  parts.push("</sheetData></worksheet>");
  return parts.join("");
}

const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="1"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font></fonts>' +
  '<fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills>' +
  '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>' +
  '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
  '<cellXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/></cellXfs>' +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

/** Build a minimal .xlsx workbook. */
export function writeXlsx(sheets: XlsxSheetInput[]): Uint8Array {
  const list = sheets.length ? sheets : [{ name: "Sheet1", rows: [] }];
  const used = new Set<string>();
  const names = list.map((s) => safeSheetName(s.name, used));

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
    list
      .map(
        (_s, i) =>
          `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
      )
      .join("") +
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
    "</Types>";

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ' +
    'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<sheets>" +
    names.map((n, i) => `<sheet name="${escapeXml(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("") +
    "</sheets></workbook>";

  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    list
      .map(
        (_s, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${list.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>";

  const files = [
    { name: "[Content_Types].xml", data: contentTypes },
    { name: "_rels/.rels", data: rootRels },
    { name: "xl/workbook.xml", data: workbook },
    { name: "xl/_rels/workbook.xml.rels", data: workbookRels },
    { name: "xl/styles.xml", data: STYLES_XML },
    ...list.map((s, i) => ({ name: `xl/worksheets/sheet${i + 1}.xml`, data: worksheetXml(s.rows) })),
  ];
  return zip(files);
}
