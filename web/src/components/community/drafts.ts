import { storageGet, storageRemove, storageSet } from "@/lib/storage";

import type { FormValues, VariantId } from "./form-spec";

/**
 * Half-written submissions, kept on the contributor's own device.
 *
 * A case study takes twenty minutes to write properly. Losing it to a
 * refresh, a dead battery or a mis-click is the single most likely reason
 * someone never contributes twice — so every form can stash its values under
 * `ppc-academy:contribute:draft:<variant>` and offer them back on return.
 *
 * One draft per variant. Drafts never leave the browser.
 */

export const DRAFT_PREFIX = "contribute:draft:";

export interface StoredDraft {
  version: 1;
  variant: VariantId;
  values: FormValues;
  /** Step the contributor was on, so "Resume" lands where they left off. */
  step: number;
  savedAt: number;
}

export function draftKey(variant: VariantId): string {
  return `${DRAFT_PREFIX}${variant}`;
}

export function saveDraft(variant: VariantId, values: FormValues, step: number): StoredDraft {
  const draft: StoredDraft = {
    version: 1,
    variant,
    values,
    step,
    savedAt: Date.now(),
  };
  storageSet(draftKey(variant), draft);
  return draft;
}

export function loadDraft(variant: VariantId): StoredDraft | null {
  const draft = storageGet<StoredDraft | null>(draftKey(variant), null);
  if (!draft || typeof draft !== "object") return null;
  if (draft.variant !== variant || typeof draft.values !== "object" || draft.values === null) {
    return null;
  }
  return draft;
}

export function clearDraft(variant: VariantId): void {
  storageRemove(draftKey(variant));
}

/** "just now", "4 min ago", "yesterday" — for the draft banner. */
export function relativeTime(timestamp: number, now = Date.now()): string {
  const seconds = Math.max(0, Math.round((now - timestamp) / 1000));
  if (seconds < 45) return "just now";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(timestamp).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
