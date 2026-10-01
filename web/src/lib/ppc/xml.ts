/**
 * Tiny XML helpers for OOXML (xlsx) — string scanning only, no DOMParser, so the
 * engine runs unchanged in the browser and under Node.
 *
 * This is not a general XML parser. It understands elements, attributes, text,
 * comments and processing instructions — everything Excel, Google Sheets,
 * LibreOffice and Amazon's bulk generator write — and ignores namespace prefixes.
 */

export interface XmlTag {
  /** Local name without namespace prefix, e.g. "c" for "<x:c>". */
  name: string;
  /** Raw attribute text after the tag name (may end with "/" for self-closing). */
  attrs: string;
  closing: boolean;
  selfClosing: boolean;
  /** Index of "<". */
  start: number;
  /** Index just past ">". */
  end: number;
}

/**
 * Visit every tag between `from` and `to`. The callback may return `false` to stop.
 * Text between tags is available to callers as `xml.slice(prevTag.end, tag.start)`.
 */
export function scanTags(
  xml: string,
  onTag: (tag: XmlTag) => boolean | void,
  from = 0,
  to = xml.length,
): void {
  let p = from;
  while (p < to) {
    const lt = xml.indexOf("<", p);
    if (lt === -1 || lt >= to) return;
    const next = xml.charCodeAt(lt + 1);
    // Comments, CDATA, doctype, processing instructions.
    if (next === 33 /* ! */) {
      if (xml.startsWith("<!--", lt)) {
        const e = xml.indexOf("-->", lt + 4);
        p = e === -1 ? to : e + 3;
        continue;
      }
      if (xml.startsWith("<![CDATA[", lt)) {
        const e = xml.indexOf("]]>", lt + 9);
        p = e === -1 ? to : e + 3;
        continue;
      }
      const e = xml.indexOf(">", lt + 2);
      p = e === -1 ? to : e + 1;
      continue;
    }
    if (next === 63 /* ? */) {
      const e = xml.indexOf("?>", lt + 2);
      p = e === -1 ? to : e + 2;
      continue;
    }
    const gt = xml.indexOf(">", lt + 1);
    if (gt === -1) return;
    const closing = next === 47; /* / */
    let i = lt + (closing ? 2 : 1);
    const nameStart = i;
    let colon = -1;
    while (i < gt) {
      const ch = xml.charCodeAt(i);
      if (ch === 32 || ch === 9 || ch === 10 || ch === 13 || ch === 47) break;
      if (ch === 58 /* : */) colon = i;
      i++;
    }
    const name = xml.slice(colon === -1 ? nameStart : colon + 1, i);
    const attrs = xml.slice(i, gt);
    const selfClosing = !closing && xml.charCodeAt(gt - 1) === 47;
    const res = onTag({ name, attrs, closing, selfClosing, start: lt, end: gt + 1 });
    if (res === false) return;
    p = gt + 1;
  }
}

/**
 * Read one attribute from raw attribute text. `name` is matched exactly
 * (including any prefix, e.g. "r:id"); pass `anyPrefix: true` to match
 * `<prefix>:<name>` for any prefix.
 */
export function getAttr(attrs: string, name: string, anyPrefix = false): string | undefined {
  let from = 0;
  for (;;) {
    const idx = attrs.indexOf(name, from);
    if (idx === -1) return undefined;
    from = idx + name.length;
    const before = idx === 0 ? 32 : attrs.charCodeAt(idx - 1);
    const boundaryOk =
      before === 32 || before === 9 || before === 10 || before === 13 || (anyPrefix && before === 58);
    if (!boundaryOk) continue;
    let j = idx + name.length;
    while (attrs.charCodeAt(j) === 32) j++;
    if (attrs.charCodeAt(j) !== 61 /* = */) continue;
    j++;
    while (attrs.charCodeAt(j) === 32) j++;
    const quote = attrs[j];
    if (quote !== '"' && quote !== "'") continue;
    const end = attrs.indexOf(quote, j + 1);
    if (end === -1) return undefined;
    return decodeXml(attrs.slice(j + 1, end));
  }
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
};

/**
 * Decode XML entities (named + numeric `&#123;` / `&#x1F600;`) and the OOXML
 * `_xHHHH_` escape used for control characters (`_x005F_` escapes "_").
 */
export function decodeXml(text: string): string {
  let s = text;
  if (s.indexOf("&") !== -1) {
    s = s.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z]+);/g, (whole, body: string) => {
      if (body.charCodeAt(0) === 35 /* # */) {
        const code =
          body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
        if (!Number.isFinite(code) || code < 0 || code > 0x10ffff) return whole;
        return String.fromCodePoint(code);
      }
      const named = NAMED_ENTITIES[body];
      return named === undefined ? whole : named;
    });
  }
  if (s.indexOf("_x") !== -1) {
    s = s.replace(/_x([0-9A-Fa-f]{4})_/g, (_w, hex: string) => String.fromCharCode(parseInt(hex, 16)));
  }
  return s;
}

/** Escape text for use in XML element content or a double-quoted attribute. */
export function escapeXml(text: string): string {
  let s = "";
  let last = 0;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    let rep: string | null = null;
    if (c === 38) rep = "&amp;";
    else if (c === 60) rep = "&lt;";
    else if (c === 62) rep = "&gt;";
    else if (c === 34) rep = "&quot;";
    else if (c < 32 && c !== 9 && c !== 10 && c !== 13) rep = ""; // invalid in XML 1.0
    else if (c === 0xfffe || c === 0xffff) rep = "";
    if (rep !== null) {
      s += text.slice(last, i) + rep;
      last = i + 1;
    }
  }
  return last === 0 ? text : s + text.slice(last);
}
