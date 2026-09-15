/**
 * Heading slugs, table-of-contents extraction and plain-text projection for
 * the long-form markdown bodies carried by `DocResource`.
 *
 * `createSlugger()` is a faithful port of `github-slugger`, which is what
 * `rehype-slug` uses at render time. Porting it (rather than importing a
 * transitive dependency) keeps the dependency list untouched while
 * guaranteeing the ids in the contents list are byte-for-byte the ids
 * `rehype-slug` puts on the rendered headings.
 */

export interface TocItem {
  /** Anchor id, matching the rendered heading. */
  id: string;
  /** Heading text with inline markdown stripped. */
  text: string;
  /** 2 for `##`, 3 for `###`. */
  depth: 2 | 3;
}

/** Strip inline markdown so a heading reads as plain text. */
export function stripInline(input: string): string {
  return input
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1") // images
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") // links
    .replace(/`([^`]*)`/g, "$1") // code spans
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/~~([^~]+)~~/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Lowercase, drop every symbol and punctuation mark except `-` and `_`, then
 * turn spaces into hyphens. Consecutive hyphens are deliberately *not*
 * collapsed and leading/trailing hyphens are deliberately *not* trimmed —
 * that is what `github-slugger` does, and matching it is the whole point.
 */
export function baseSlug(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .replace(/ /g, "-");
}

/**
 * A stateful slugger: repeated heading text gets `-1`, `-2`, … exactly the
 * way `github-slugger` does it, so anchors stay unique inside one document.
 */
export function createSlugger(): (text: string) => string {
  const occurrences = new Map<string, number>();

  return function slug(text: string): string {
    let result = baseSlug(text);
    const original = result;

    while (occurrences.has(result)) {
      const next = (occurrences.get(original) ?? 0) + 1;
      occurrences.set(original, next);
      result = `${original}-${next}`;
    }

    occurrences.set(result, 0);
    return result;
  };
}

/** True for lines that open or close a fenced code block. */
function isFence(line: string): boolean {
  return /^\s{0,3}(`{3,}|~{3,})/.test(line);
}

/**
 * Pull `##` and `###` headings out of a markdown body, in document order,
 * with the ids they will be rendered with.
 */
export function extractToc(markdown: string): TocItem[] {
  const slug = createSlugger();
  const items: TocItem[] = [];
  let inFence = false;

  for (const line of markdown.split("\n")) {
    if (isFence(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line);
    if (!match) continue;

    const level = match[1].length;
    const text = stripInline(match[2]);
    // Every heading is slugged so the counter stays in step with rendering,
    // but only h2/h3 make it into the visible contents list.
    const id = slug(text);
    if (level === 2 || level === 3) {
      items.push({ id, text, depth: level as 2 | 3 });
    }
  }

  return items;
}

/**
 * Markdown -> plain text, for the search index. Keeps table cell text and
 * list content, drops syntax noise and fenced code blocks.
 */
export function toPlainText(markdown: string): string {
  const out: string[] = [];
  let inFence = false;

  for (const raw of markdown.split("\n")) {
    if (isFence(raw)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    let line = raw.trim();
    if (!line) continue;
    if (/^\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-")) continue; // table rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line)) continue; // thematic break

    line = line
      .replace(/^#{1,6}\s+/, "")
      .replace(/^>\s?/, "")
      .replace(/^\s*[-*+]\s+/, "")
      .replace(/^\s*\d+\.\s+/, "")
      .replace(/^\s*\[[ x]\]\s*/i, "")
      .replace(/\|/g, " ");

    const text = stripInline(line);
    if (text) out.push(text);
  }

  return out.join(" ").replace(/\s{2,}/g, " ").trim();
}

/** Rough reading time in whole minutes at ~220 words per minute. */
export function readingMinutes(markdown: string): number {
  const words = toPlainText(markdown).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
