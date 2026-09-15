import { createElement, type ReactNode } from "react";

/**
 * Match highlighting: ranges in, React nodes out.
 *
 * Kept apart from `src/lib/search.ts` because it depends on nothing — no Fuse,
 * no content registry. The command palette is mounted in the root layout and
 * needs to mark matches on its own static actions immediately, while the
 * index (and the ~140KB of document text behind it) is loaded lazily the
 * first time the palette opens. `@/lib/search` re-exports everything here, so
 * callers that already pull in the index keep one import.
 *
 * Nothing in this module produces HTML. `<mark>` elements are constructed as
 * React children, so a title containing `<script>` renders as text.
 */

/** An inclusive `[start, end]` character range, matching Fuse's indices. */
export type HighlightRange = readonly [start: number, end: number];

export interface HighlightSegment {
  text: string;
  match: boolean;
}

/** Matches shorter than this are noise rather than signal. */
export const MIN_MATCH_LENGTH = 2;

/** Ceiling on marks per field, so a one-letter term cannot paint a whole body. */
const MAX_RANGES = 60;

/** Sort, drop sub-minimum ranges, then merge overlapping and touching ones. */
export function normaliseRanges(
  ranges: readonly HighlightRange[],
  minLength = MIN_MATCH_LENGTH,
): HighlightRange[] {
  const usable = ranges.filter(([start, end]) => end >= start && end - start + 1 >= minLength);
  const source = usable.length > 0 ? usable : ranges;
  const sorted = [...source].sort((a, b) => a[0] - b[0] || a[1] - b[1]);

  const merged: HighlightRange[] = [];
  for (const [start, end] of sorted) {
    const last = merged[merged.length - 1];
    if (last && start <= last[1] + 1) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], end)];
    } else {
      merged.push([start, end]);
    }
    if (merged.length >= MAX_RANGES) break;
  }
  return merged;
}

/** Split a query into the words worth matching on. */
export function splitTerms(query: string): string[] {
  return query
    .toLowerCase()
    .split(/[^\p{L}\p{N}%$.+-]+/u)
    .map((term) => term.replace(/^[.+-]+|[.+-]+$/g, ""))
    .filter((term) => term.length > 0);
}

/**
 * Every literal occurrence of each term, case-insensitively. This is what
 * makes the marks in a result card land where a reader expects them.
 */
export function literalRanges(text: string, terms: readonly string[]): HighlightRange[] {
  if (!text || terms.length === 0) return [];
  const haystack = text.toLowerCase();
  const found: HighlightRange[] = [];

  for (const term of terms) {
    if (term.length < 2) continue;
    let from = 0;
    for (;;) {
      const at = haystack.indexOf(term, from);
      if (at === -1) break;
      found.push([at, at + term.length - 1]);
      from = at + term.length;
      if (found.length >= MAX_RANGES) break;
    }
    if (found.length >= MAX_RANGES) break;
  }

  return normaliseRanges(found, 1);
}

/**
 * Ranges for a subsequence match: the characters of `query` in order, but not
 * necessarily adjacent. Used by the command palette, where "tgl thm" should
 * still find "Toggle theme".
 */
export function subsequenceRanges(text: string, query: string): HighlightRange[] | null {
  const haystack = text.toLowerCase();
  const needle = query.toLowerCase().replace(/\s+/g, "");
  if (needle.length === 0) return [];

  const hits: number[] = [];
  let cursor = 0;
  for (const character of needle) {
    const at = haystack.indexOf(character, cursor);
    if (at === -1) return null;
    hits.push(at);
    cursor = at + 1;
  }

  return normaliseRanges(
    hits.map((at): HighlightRange => [at, at]),
    1,
  );
}

/** Turn text plus ranges into alternating plain and matched segments. */
export function splitHighlight(
  text: string,
  ranges: readonly HighlightRange[],
): HighlightSegment[] {
  if (ranges.length === 0) return text ? [{ text, match: false }] : [];

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const [start, end] of ranges) {
    const from = Math.max(0, Math.min(start, text.length));
    const to = Math.max(from, Math.min(end + 1, text.length));
    if (from > cursor) segments.push({ text: text.slice(cursor, from), match: false });
    if (to > from) segments.push({ text: text.slice(from, to), match: true });
    cursor = Math.max(cursor, to);
  }

  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false });
  return segments;
}

export const HIGHLIGHT_CLASS =
  "rounded-[0.2rem] bg-ember-soft px-[0.15em] py-[0.05em] font-semibold text-ember-ink";

/**
 * Matched text as React nodes — `<mark>` elements around the hits, plain
 * strings everywhere else. Nothing is ever injected as HTML.
 */
export function highlight(
  text: string,
  ranges: readonly HighlightRange[],
  options: { className?: string } = {},
): ReactNode {
  const className = options.className ?? HIGHLIGHT_CLASS;
  const segments = splitHighlight(text, ranges);

  return segments.map((segment, position) =>
    segment.match
      ? createElement("mark", { key: `m${position}`, className }, segment.text)
      : segment.text,
  );
}

/* ------------------------------------------------------------------ *
 * Windowing
 * ------------------------------------------------------------------ */

export interface TextWindow {
  /** The windowed text, already carrying its ellipses. */
  text: string;
  /** Ranges relative to `text`. */
  ranges: HighlightRange[];
  truncated: boolean;
}

const ELLIPSIS = "…";

/** Widen an index out to the nearest word boundary, up to `slack` chars. */
function snapStart(text: string, at: number, slack = 24): number {
  if (at <= 0) return 0;
  const floor = Math.max(0, at - slack);
  for (let i = at; i > floor; i -= 1) {
    if (/\s/.test(text[i - 1])) return i;
  }
  return at;
}

function snapEnd(text: string, at: number, slack = 24): number {
  if (at >= text.length) return text.length;
  const ceiling = Math.min(text.length, at + slack);
  for (let i = at; i < ceiling; i += 1) {
    if (/\s/.test(text[i])) return i;
  }
  return at;
}

/**
 * Cut a readable window around the strongest match in a long field.
 *
 * Newlines and tabs are swapped for spaces one character at a time so the
 * text stays exactly as long as the text the ranges were measured against —
 * collapsing whitespace here would silently slide every highlight.
 */
export function windowAround(
  text: string,
  ranges: readonly HighlightRange[],
  radius = 120,
  /**
   * Characters kept *before* the match. Deliberately much smaller than the
   * trailing radius: result cards clamp a snippet to two lines, and a match
   * centred in the window is the first thing that clamp cuts off.
   */
  lookBehind = 36,
): TextWindow {
  const flat = text.replace(/\s/g, " ");
  const usable = normaliseRanges(ranges, 1).filter(([start]) => start < flat.length);

  if (usable.length === 0) {
    const cut = flat.length > radius * 2;
    const head = cut ? flat.slice(0, snapEnd(flat, radius * 2)) : flat;
    return {
      text: cut ? `${head.trimEnd()}${ELLIPSIS}` : head.trim(),
      ranges: [],
      truncated: cut,
    };
  }

  // The longest match is the most informative place to open the window.
  const anchor = usable.reduce((best, range) =>
    range[1] - range[0] > best[1] - best[0] ? range : best,
  );

  const from = snapStart(flat, Math.max(0, anchor[0] - lookBehind));
  const to = snapEnd(flat, Math.min(flat.length, anchor[1] + 1 + radius));
  const hasPrefix = from > 0;
  const hasSuffix = to < flat.length;

  const slice = flat.slice(from, to);
  const leading = slice.length - slice.trimStart().length;
  const window = slice.trim();

  // Where index 0 of `window` sits inside `flat`, plus the ellipsis we prepend.
  const lead = hasPrefix ? ELLIPSIS.length : 0;
  const origin = from + leading;

  const shifted = usable
    .filter(([start, end]) => end >= origin && start < origin + window.length)
    .map(
      ([start, end]): HighlightRange => [
        Math.max(lead, start - origin + lead),
        Math.min(window.length - 1 + lead, end - origin + lead),
      ],
    )
    .filter(([start, end]) => end >= start);

  return {
    text: `${hasPrefix ? ELLIPSIS : ""}${window}${hasSuffix ? ELLIPSIS : ""}`,
    ranges: shifted,
    truncated: hasPrefix || hasSuffix,
  };
}
