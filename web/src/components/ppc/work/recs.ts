/**
 * Keywords page list model: which view a recommendation belongs to, rows with
 * their companions attached, filters, sorting, counts, the store picker
 * summary and skipped-term categories. Pure; relative imports only.
 */

import { norm } from "../../../lib/ppc/keys";
import { acos as acosOf, cvr as cvrOf } from "../../../lib/ppc/metrics";
import type { ActionType, Decision, Priority, Recommendation, SkippedTerm } from "../../../lib/ppc/types";
import { compareValues, type SortDir } from "../overview/compute";
import { buildFamilies, decisionMap, statusOf, type FamilyIndex, type RecStatus } from "./decisions";

/* ------------------------------------------------------------------- views */

export type WorkView = "harvest" | "negatives" | "bids" | "flags";
export type ViewId = WorkView | "skipped" | "approved";

export const VIEW_IDS: readonly ViewId[] = ["harvest", "negatives", "bids", "flags", "skipped", "approved"];

export const VIEW_META: Record<ViewId, { label: string; short: string; description: string }> = {
  harvest: {
    label: "Harvest",
    short: "Harvest",
    description:
      "Search terms that already sell under target. Add each as an exact keyword (or product target for an ASIN) and block it in the ad group it came from, so the two do not bid against each other.",
  },
  negatives: {
    label: "Negatives",
    short: "Negatives",
    description: "Searches that spend and do not sell, or sell at a loss. A negative stops the ad showing for them.",
  },
  bids: {
    label: "Bids",
    short: "Bids",
    description: "Keywords and targets whose bid should go up, down, or be paused, based on ACoS against your target.",
  },
  flags: {
    label: "Flags",
    short: "Flags",
    description: "Targets with lots of impressions but almost no clicks. Nothing to upload — check whether the listing matches the search.",
  },
  skipped: {
    label: "Skipped",
    short: "Skipped",
    description: "Terms the rules looked at and deliberately left alone, with the reason. Nothing is dropped silently.",
  },
  approved: {
    label: "Approved",
    short: "Approved",
    description: "Your approved changes, waiting to be exported as an Amazon bulk sheet.",
  },
};

export function parseView(value: string | null | undefined): ViewId {
  return (VIEW_IDS as readonly string[]).includes(value ?? "") ? (value as ViewId) : "harvest";
}

export function viewForAction(action: ActionType): WorkView {
  if (action.startsWith("harvest")) return "harvest";
  if (action.startsWith("negate")) return "negatives";
  if (action === "relevance") return "flags";
  return "bids";
}

export const ACTION_LABEL: Record<ActionType, string> = {
  "harvest-exact": "Harvest → exact",
  "harvest-phrase": "Harvest → phrase",
  "harvest-product": "Harvest → product target",
  "negate-exact": "Negative exact",
  "negate-phrase": "Negative phrase",
  "negate-product": "Negative product",
  "bid-up": "Raise bid",
  "bid-down": "Lower bid",
  pause: "Pause",
  relevance: "Check relevance",
};

export const ACTION_TONE: Record<ActionType, "good" | "bad" | "info" | "warn" | "neutral"> = {
  "harvest-exact": "good",
  "harvest-phrase": "good",
  "harvest-product": "good",
  "negate-exact": "bad",
  "negate-phrase": "bad",
  "negate-product": "bad",
  "bid-up": "info",
  "bid-down": "warn",
  pause: "bad",
  relevance: "neutral",
};

/* ------------------------------------------------------------------- items */

export interface RecItem {
  rec: Recommendation;
  /** Paired negative / phrase companion (harvest rows only). */
  companions: Recommendation[];
  /** Each companion's own status (e.g. a rejected negative next to an approved harvest = "skip the negative"). */
  companionStatus: RecStatus[];
  decision?: Decision;
  status: RecStatus;
  view: WorkView;
  /** Position in the engine's order (priority, then impact). */
  order: number;
  acos: number;
  cvr: number;
  /** Lower-cased subject + campaign + ad group for text search. */
  haystack: string;
}

export interface RecModel {
  items: RecItem[];
  byId: Map<string, RecItem>;
  families: FamilyIndex;
  /** Decisions that belong to the current recs (outdated ones left out) — what plans work on. */
  decisions: Map<string, Decision>;
  /** Every stored decision, outdated ones included — for exact undo snapshots and Applied history. */
  stored: Map<string, Decision>;
}

/** Rows for the list: companions ride on their harvest instead of getting their own row. */
export function buildRecModel(recs: readonly Recommendation[], decisions: readonly Decision[], today: string): RecModel {
  const families = buildFamilies(recs);
  const stored = decisionMap(decisions);
  const dmap = decisionMap(decisions, recs);
  const items: RecItem[] = [];
  const byId = new Map<string, RecItem>();
  recs.forEach((rec, order) => {
    if (families.rootOf.has(rec.id)) return;
    const decision = dmap.get(rec.id);
    const companions = families.companions.get(rec.id) ?? [];
    const item: RecItem = {
      rec,
      companions,
      companionStatus: companions.map((c) => statusOf(dmap.get(c.id), today)),
      decision,
      status: statusOf(decision, today),
      view: viewForAction(rec.action),
      order,
      acos: acosOf(rec.counters),
      cvr: cvrOf(rec.counters),
      haystack: `${norm(rec.subject)}\u0000${norm(rec.campaign)}\u0000${norm(rec.adGroup)}`,
    };
    items.push(item);
    byId.set(rec.id, item);
  });
  return { items, byId, families, decisions: dmap, stored };
}

/**
 * Rows for a view. Work views show open rows, plus decided ones (approved,
 * rejected, snoozed, applied) when `showDecided`. "approved" shows approved,
 * not-yet-applied rows except relevance checks (nothing to upload).
 */
export function itemsInView(items: readonly RecItem[], view: ViewId, showDecided = false): RecItem[] {
  if (view === "skipped") return [];
  if (view === "approved") return items.filter((i) => i.status === "approved" && i.view !== "flags");
  return items.filter((i) => i.view === view && (showDecided || i.status === "open"));
}

export interface ViewCounts {
  open: Record<WorkView, number>;
  /** Decided rows per work view (shown behind "Show decided"). */
  decided: Record<WorkView, number>;
  approved: number;
  applied: number;
  skipped: number;
  /** Open high-priority rows per view. */
  high: Record<WorkView, number>;
}

export function viewCounts(items: readonly RecItem[], skipped: number): ViewCounts {
  const zero = (): Record<WorkView, number> => ({ harvest: 0, negatives: 0, bids: 0, flags: 0 });
  const out: ViewCounts = { open: zero(), decided: zero(), high: zero(), approved: 0, applied: 0, skipped };
  for (const i of items) {
    if (i.status === "open") {
      out.open[i.view]++;
      if (i.rec.priority === "high") out.high[i.view]++;
    } else {
      out.decided[i.view]++;
    }
    if (i.status === "approved" && i.view !== "flags") out.approved++;
    if (i.status === "applied") out.applied++;
  }
  return out;
}

/* ---------------------------------------------------------------- filters */

export interface RecFilter {
  text: string;
  /** norm(campaign) or "" for all. */
  campaign: string;
  priority: Priority | "";
  /** Minimum impact per month, store currency; null = no minimum. */
  minImpact: number | null;
}

export const DEFAULT_REC_FILTER: RecFilter = { text: "", campaign: "", priority: "", minImpact: null };

export function isFiltered(f: RecFilter): boolean {
  return !!(f.text.trim() || f.campaign || f.priority || (f.minImpact !== null && f.minImpact > 0));
}

export function filterItems(items: readonly RecItem[], f: RecFilter): RecItem[] {
  const q = norm(f.text);
  const min = f.minImpact ?? 0;
  if (!q && !f.campaign && !f.priority && !(min > 0)) return items.slice();
  return items.filter((i) => {
    if (f.campaign && norm(i.rec.campaign) !== f.campaign) return false;
    if (f.priority && i.rec.priority !== f.priority) return false;
    if (min > 0 && (i.rec.impact ?? 0) < min) return false;
    if (q && !i.haystack.includes(q)) return false;
    return true;
  });
}

export type RecSortKey = "priority" | "impact" | "spend" | "clicks" | "acos";

export const REC_SORTS: { value: RecSortKey; label: string }[] = [
  { value: "priority", label: "Recommended order" },
  { value: "impact", label: "Impact / month" },
  { value: "spend", label: "Spend" },
  { value: "clicks", label: "Clicks" },
  { value: "acos", label: "ACoS" },
];

export function sortItems(items: readonly RecItem[], key: RecSortKey, dir: SortDir = "desc"): RecItem[] {
  if (key === "priority") {
    const out = [...items].sort((a, b) => a.order - b.order);
    return dir === "asc" ? out.reverse() : out;
  }
  const value = (i: RecItem): number => {
    switch (key) {
      case "impact":
        return i.rec.impact ?? 0;
      case "spend":
        return i.rec.counters.spend;
      case "clicks":
        return i.rec.counters.clicks;
      case "acos":
        return i.acos;
    }
  };
  return [...items].sort((a, b) => compareValues(value(a), value(b), dir) || a.order - b.order);
}

/** Campaigns present in a list, for the campaign filter. */
export function campaignOptions(items: readonly RecItem[]): { value: string; label: string; count: number }[] {
  const m = new Map<string, { label: string; count: number }>();
  for (const i of items) {
    const k = norm(i.rec.campaign);
    const cur = m.get(k);
    if (cur) cur.count++;
    else m.set(k, { label: i.rec.campaign, count: 1 });
  }
  return [...m.entries()]
    .map(([value, v]) => ({ value, label: v.label, count: v.count }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** Sum of monthly impact over open rows. */
export function openImpact(items: readonly RecItem[]): number {
  let s = 0;
  for (const i of items) if (i.status === "open") s += i.rec.impact ?? 0;
  return s;
}

/* ------------------------------------------------------------ store picker */

export interface StoreRecSummary {
  harvest: number;
  negatives: number;
  bids: number;
  flags: number;
  open: number;
  high: number;
  /** Open monthly impact, store currency. */
  impact: number;
  /** Approved, not yet exported. */
  approved: number;
}

export function storeRecSummary(recs: readonly Recommendation[], decisions: readonly Decision[], today: string): StoreRecSummary {
  const { items } = buildRecModel(recs, decisions, today);
  const c = viewCounts(items, 0);
  return {
    harvest: c.open.harvest,
    negatives: c.open.negatives,
    bids: c.open.bids,
    flags: c.open.flags,
    open: c.open.harvest + c.open.negatives + c.open.bids + c.open.flags,
    high: c.high.harvest + c.high.negatives + c.high.bids + c.high.flags,
    impact: openImpact(items),
    approved: c.approved,
  };
}

/* ----------------------------------------------------------------- skipped */

export type SkipCategory = "targeted" | "protected" | "converting" | "learning" | "data" | "held" | "negated" | "bulk" | "other";

export const SKIP_CATEGORY_LABEL: Record<SkipCategory, string> = {
  targeted: "Already targeted",
  protected: "Brand or competitor",
  converting: "Converts elsewhere",
  learning: "Still learning",
  data: "Not enough data",
  held: "Held by guardrails",
  negated: "Already negated",
  bulk: "Needs a bulk file / not live",
  other: "Other",
};

export function skipCategory(s: SkippedTerm): SkipCategory {
  const r = s.reason.toLowerCase();
  if (r.startsWith("already an exact") || r.startsWith("already a product target")) return "targeted";
  if (r.startsWith("already negated") || r.startsWith("already a negative")) return "negated";
  if (r.includes("never negated") || r.startsWith("brand keyword")) return "protected";
  if (r.includes("converting term") || r.includes("would block the keyword")) return "converting";
  if (r.startsWith("learning")) return "learning";
  if (r.startsWith("not enough data") || r.startsWith("raise needs")) return "data";
  if (r.startsWith("held at")) return "held";
  if (r.includes("bulk file") || r.includes("no current bid")) return "bulk";
  return "other";
}

/** A friendlier sentence for a skip reason (the engine's own text stays visible as detail). */
export function skipExplanation(s: SkippedTerm): string {
  switch (skipCategory(s)) {
    case "targeted":
      return "It already has its own keyword or product target, so harvesting it again would make you compete with yourself.";
    case "negated":
      return "It is already blocked here — nothing to add.";
    case "protected":
      return "It matches one of your brand or competitor terms, which the rules never block or cut.";
    case "converting":
      return "Blocking it would also block searches that are selling, so the rules leave it alone.";
    case "learning":
      return "The keyword is too new to judge. It is re-checked automatically once it has enough history.";
    case "data":
      return "Too few clicks or orders to act on safely yet. Wait for more data.";
    case "held":
      return "The rule wanted to move the bid, but the safety limits (max CPC, floor, ceiling) leave it where it is.";
    case "bulk":
      return "There is no bid to change here — import a bulk file, or the target is paused or archived.";
    default:
      return "Left alone by the rules.";
  }
}
