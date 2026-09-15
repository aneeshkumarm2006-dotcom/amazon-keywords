import { useCallback, useMemo } from "react";

import { storageGet, storageRemove, storageSet, useLocalStorage } from "./storage";

/**
 * Per-resource feedback, stored locally.
 *
 * The site is a static export with no backend, so "leaving feedback" means
 * two things: a private record on this device that the reader can see, edit
 * and export, and a one-click hand-off to a prefilled GitHub issue when the
 * reader wants the maintainers to actually act on it.
 *
 * Everything lives under one namespaced key (`ppc-academy:feedback:resources`)
 * as a map from resource id to record, so a page mounting the widget reads a
 * single entry and the dashboard can list every entry without scanning keys.
 *
 * Like `storage.ts`, this module deliberately has no `"use client"`
 * directive: the plain functions no-op during SSR and are safe to import from
 * a server module, while `useResourceFeedback` / `useFeedbackList` compile
 * into whichever client bundle imports them.
 */

export const FEEDBACK_KEY = "feedback:resources";

/** Bumped only if the record shape changes incompatibly. */
export const FEEDBACK_VERSION = 1;

/** Longest note we will keep. Comfortably inside the localStorage quota. */
export const MAX_NOTE_LENGTH = 600;

export type HelpfulVote = "yes" | "no";

export interface FeedbackContext {
  /** Human-readable name, kept so an export reads without the site. */
  title?: string;
  /** Route the widget was mounted on, e.g. "/sops/daily-health-check". */
  route?: string;
  /** Resource kind label, e.g. "SOP". Purely for grouping an export. */
  kind?: string;
}

export interface FeedbackRecord extends FeedbackContext {
  version: number;
  resourceId: string;
  /** 1-5. Zero means "not rated". */
  stars: number;
  helpful: HelpfulVote | null;
  note: string;
  createdAt: number;
  updatedAt: number;
}

export type FeedbackMap = Record<string, FeedbackRecord>;

const EMPTY_MAP: FeedbackMap = {};

/* ------------------------------------------------------------------ *
 * Reads
 * ------------------------------------------------------------------ */

function isRecord(value: unknown): value is FeedbackRecord {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FeedbackRecord>;
  return typeof candidate.resourceId === "string" && typeof candidate.stars === "number";
}

/** Every stored record, keyed by resource id. Always a fresh object. */
export function getFeedbackMap(): FeedbackMap {
  const raw = storageGet<FeedbackMap>(FEEDBACK_KEY, EMPTY_MAP);
  if (!raw || typeof raw !== "object") return {};
  const out: FeedbackMap = {};
  for (const [id, value] of Object.entries(raw)) {
    if (isRecord(value)) out[id] = value;
  }
  return out;
}

/** One record, or null when the reader has not touched this resource. */
export function getFeedback(resourceId: string): FeedbackRecord | null {
  return getFeedbackMap()[resourceId] ?? null;
}

/** Star rating for a resource: 1-5, or 0 when unrated. */
export function getRating(resourceId: string): number {
  return getFeedback(resourceId)?.stars ?? 0;
}

/** Every record, newest touch first. */
export function getAllFeedback(): FeedbackRecord[] {
  return Object.values(getFeedbackMap()).sort((a, b) => b.updatedAt - a.updatedAt);
}

export interface FeedbackSummary {
  /** Resources with any record at all. */
  total: number;
  /** Resources carrying a star rating. */
  rated: number;
  /** Mean of the star ratings, or 0 when nothing is rated. */
  average: number;
  helpfulYes: number;
  helpfulNo: number;
  /** Records with a written note. */
  noted: number;
}

export function feedbackSummary(records: readonly FeedbackRecord[] = getAllFeedback()): FeedbackSummary {
  const rated = records.filter((entry) => entry.stars > 0);
  const total = rated.reduce((sum, entry) => sum + entry.stars, 0);

  return {
    total: records.length,
    rated: rated.length,
    average: rated.length > 0 ? Math.round((total / rated.length) * 10) / 10 : 0,
    helpfulYes: records.filter((entry) => entry.helpful === "yes").length,
    helpfulNo: records.filter((entry) => entry.helpful === "no").length,
    noted: records.filter((entry) => entry.note.trim().length > 0).length,
  };
}

/* ------------------------------------------------------------------ *
 * Writes
 * ------------------------------------------------------------------ */

function clampStars(stars: number): number {
  if (!Number.isFinite(stars)) return 0;
  return Math.min(5, Math.max(0, Math.round(stars)));
}

/** Create-or-merge. Every mutation funnels through here. */
function upsert(
  resourceId: string,
  patch: Partial<Omit<FeedbackRecord, "resourceId" | "version" | "createdAt">>,
  context: FeedbackContext = {},
): FeedbackRecord | null {
  if (typeof window === "undefined" || !resourceId) return null;

  const map = getFeedbackMap();
  const now = Date.now();
  const existing = map[resourceId];

  const next: FeedbackRecord = {
    version: FEEDBACK_VERSION,
    resourceId,
    stars: existing?.stars ?? 0,
    helpful: existing?.helpful ?? null,
    note: existing?.note ?? "",
    title: context.title ?? existing?.title,
    route: context.route ?? existing?.route,
    kind: context.kind ?? existing?.kind,
    createdAt: existing?.createdAt ?? now,
    ...patch,
    updatedAt: now,
  };

  // Nothing left to remember — drop the key rather than store an empty shell.
  if (next.stars === 0 && next.helpful === null && next.note.trim() === "") {
    delete map[resourceId];
    storageSet(FEEDBACK_KEY, map);
    return null;
  }

  map[resourceId] = next;
  storageSet(FEEDBACK_KEY, map);
  return next;
}

/** Set the star rating. Passing 0, or the current rating, clears it. */
export function rate(
  resourceId: string,
  stars: number,
  context?: FeedbackContext,
): FeedbackRecord | null {
  return upsert(resourceId, { stars: clampStars(stars) }, context);
}

/** Record the yes/no answer. Passing null clears it. */
export function markHelpful(
  resourceId: string,
  helpful: HelpfulVote | null,
  context?: FeedbackContext,
): FeedbackRecord | null {
  return upsert(resourceId, { helpful }, context);
}

/** Save the free-text note, trimmed to `MAX_NOTE_LENGTH`. */
export function setNote(
  resourceId: string,
  note: string,
  context?: FeedbackContext,
): FeedbackRecord | null {
  return upsert(resourceId, { note: note.slice(0, MAX_NOTE_LENGTH) }, context);
}

/** Forget one resource. */
export function clearFeedback(resourceId: string): void {
  if (typeof window === "undefined") return;
  const map = getFeedbackMap();
  if (!(resourceId in map)) return;
  delete map[resourceId];
  storageSet(FEEDBACK_KEY, map);
}

/** Forget everything this store holds. Leaves other app keys alone. */
export function clearAllFeedback(): void {
  storageRemove(FEEDBACK_KEY);
}

/* ------------------------------------------------------------------ *
 * Export
 * ------------------------------------------------------------------ */

export interface FeedbackExport {
  app: "ppc-academy";
  kind: "resource-feedback";
  version: number;
  exportedAt: string;
  summary: FeedbackSummary;
  records: FeedbackRecord[];
}

/** The export payload, as a plain object. Useful for tests and previews. */
export function feedbackPayload(): FeedbackExport {
  const records = getAllFeedback();
  return {
    app: "ppc-academy",
    kind: "resource-feedback",
    version: FEEDBACK_VERSION,
    exportedAt: new Date().toISOString(),
    summary: feedbackSummary(records),
    records,
  };
}

/** Pretty-printed JSON of everything stored. */
export function feedbackJson(): string {
  return JSON.stringify(feedbackPayload(), null, 2);
}

/**
 * Build a JSON blob of every stored record and hand it to the browser as a
 * download. Returns the blob so a caller can do something else with it, or
 * null when there is no window (SSR) or nothing to export.
 */
export function exportFeedback(filename?: string): Blob | null {
  if (typeof window === "undefined") return null;

  const payload = feedbackPayload();
  if (payload.records.length === 0) return null;

  const blob = new Blob([JSON.stringify(payload, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename ?? `ppc-academy-feedback-${payload.exportedAt.slice(0, 10)}.json`;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  // Safari needs the object URL to still resolve while the click is processed.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return blob;
}

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

export interface ResourceFeedbackApi {
  record: FeedbackRecord | null;
  stars: number;
  helpful: HelpfulVote | null;
  note: string;
  /** False until hydration finishes, so nothing flashes on the server markup. */
  ready: boolean;
  /** Click the same star twice to clear the rating. */
  setStars: (stars: number) => void;
  setHelpful: (helpful: HelpfulVote | null) => void;
  saveNote: (note: string) => void;
  clear: () => void;
}

/** Live view of one resource's record, re-rendering on any change. */
export function useResourceFeedback(
  resourceId: string,
  context?: FeedbackContext,
): ResourceFeedbackApi {
  const [map, , meta] = useLocalStorage<FeedbackMap>(FEEDBACK_KEY, EMPTY_MAP);

  const record = useMemo(() => {
    const value = map?.[resourceId];
    return isRecord(value) ? value : null;
  }, [map, resourceId]);

  const title = context?.title;
  const route = context?.route;
  const kind = context?.kind;
  const ctx = useMemo<FeedbackContext>(() => ({ title, route, kind }), [title, route, kind]);

  const setStars = useCallback(
    (stars: number) => {
      const current = getRating(resourceId);
      rate(resourceId, stars === current ? 0 : stars, ctx);
    },
    [resourceId, ctx],
  );

  const setHelpful = useCallback(
    (helpful: HelpfulVote | null) => {
      const current = getFeedback(resourceId)?.helpful ?? null;
      markHelpful(resourceId, helpful === current ? null : helpful, ctx);
    },
    [resourceId, ctx],
  );

  const saveNote = useCallback(
    (note: string) => {
      setNote(resourceId, note, ctx);
    },
    [resourceId, ctx],
  );

  const clear = useCallback(() => {
    clearFeedback(resourceId);
  }, [resourceId]);

  return {
    record,
    stars: record?.stars ?? 0,
    helpful: record?.helpful ?? null,
    note: record?.note ?? "",
    ready: meta.ready,
    setStars,
    setHelpful,
    saveNote,
    clear,
  };
}

/** Live list of every record, newest first, plus the rolled-up summary. */
export function useFeedbackList(): {
  records: FeedbackRecord[];
  summary: FeedbackSummary;
  ready: boolean;
} {
  const [map, , meta] = useLocalStorage<FeedbackMap>(FEEDBACK_KEY, EMPTY_MAP);

  const records = useMemo(() => {
    if (!map || typeof map !== "object") return [];
    return Object.values(map)
      .filter(isRecord)
      .sort((a, b) => b.updatedAt - a.updatedAt);
  }, [map]);

  const summary = useMemo(() => feedbackSummary(records), [records]);

  return { records, summary, ready: meta.ready };
}
