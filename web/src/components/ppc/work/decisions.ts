/**
 * Decision state for the Keywords page — pure functions, no React.
 *
 * Relative imports only: `scripts/ppc-test-work.ts` runs this under jiti.
 *
 * Model
 * - A recommendation with no decision is "open". Approve / reject / snooze
 *   write a `Decision` (db.ts `saveDecisions`); undo deletes it.
 * - A harvest and its companions (the paired negative in the source ad group,
 *   and the optional phrase companion) are one family: approving, rejecting,
 *   snoozing or undoing the harvest does the same to its companions, so the
 *   pair can never drift apart by accident. The one deliberate exception is
 *   the "also add the negative" switch: approving a harvest with
 *   `skipNegative` rejects just the paired negative.
 * - "Mark as applied" stamps `appliedAt` on approved decisions after the
 *   bulk sheet was uploaded. Applied decisions stay approved (the history
 *   shows them) but are not exported again while the rec is the same one.
 * - A decision belongs to the rec it was made for (`Decision.basis`). Rec ids
 *   are stable across recomputes, so a later, different suggestion under the
 *   same id would otherwise inherit an old decision (`isOutdated`):
 *   target-level decisions (bids, pauses) reopen once a bulk file shows a
 *   different current bid, and applied / rejected ones also once
 *   `REVIEW_AFTER_DAYS` more days of data are in; a companion that lost (or
 *   changed) its harvest reopens. `decisionMap(decisions, recs)` leaves such
 *   decisions out, which is what every status / export reader uses.
 * - Approved changes whose rec is gone after a re-import are listed by
 *   `orphanedApprovals`, so they never drop out of the export silently.
 */

import { addDays, isIsoDate } from "../../../lib/ppc/dates";
import type { ActionType, Decision, DecisionBasis, DecisionStatus, HarvestDestination, Recommendation } from "../../../lib/ppc/types";

export type RecStatus = "open" | "approved" | "applied" | "rejected" | "snoozed";

/** Days a snooze hides a recommendation. */
export const SNOOZE_DAYS = 7;

/**
 * Where a recommendation stands. A snooze that has run out (snoozeUntil ≤
 * today) is open again; a snooze without a date stays snoozed (matches the
 * overview's `isOpen`).
 */
export function statusOf(decision: Decision | undefined, today: string): RecStatus {
  if (!decision) return "open";
  if (decision.status === "approved") return decision.appliedAt ? "applied" : "approved";
  if (decision.status === "rejected") return "rejected";
  if (decision.snoozeUntil && decision.snoozeUntil.slice(0, 10) <= today) return "open";
  return "snoozed";
}

/**
 * Decisions by rec id. With `recs`, decisions made for an earlier instance of
 * a rec (`isOutdated`) are left out, so the rec reads as open again; the
 * stored record stays until a new decision on that rec replaces it.
 */
export function decisionMap(decisions: readonly Decision[], recs?: readonly Recommendation[]): Map<string, Decision> {
  const map = new Map(decisions.map((d) => [d.recId, d] as const));
  if (recs) {
    for (const r of recs) {
      const d = map.get(r.id);
      if (d && isOutdated(d, r)) map.delete(r.id);
    }
  }
  return map;
}

/* ------------------------------------------------------------ rec instance */

/**
 * Days of new data after which an applied or rejected bid / pause decision is
 * up for review again — the SOP-03 learning period (`minDaysHistory`), so a
 * repeat move sees two weeks of results of the last one.
 */
export const REVIEW_AFTER_DAYS = 14;

function isTargetLevel(rec: Recommendation): boolean {
  return rec.level === "target" || rec.action === "bid-up" || rec.action === "bid-down" || rec.action === "pause" || rec.action === "relevance";
}

/** What a decision remembers about the rec it was made for. */
export function basisOf(rec: Recommendation): DecisionBasis {
  const b: DecisionBasis = { pairedWith: rec.pairedWith ?? "" };
  if (rec.currentBid !== undefined) b.currentBid = rec.currentBid;
  if (rec.currentBidSource) b.currentBidSource = rec.currentBidSource;
  if (rec.suggestedBid !== undefined) b.suggestedBid = rec.suggestedBid;
  if (rec.windowTo) b.windowTo = rec.windowTo;
  return b;
}

/**
 * True when `decision` was made for an earlier, different instance of `rec`
 * (same id, new suggestion). Snoozes run out on their own and never count.
 * - Not applied: a companion whose harvest link changed (e.g. a paired
 *   negative that now stands alone because its harvest dropped out).
 * - Target level (bids / pauses): the bulk file shows a different current bid
 *   than the one decided on (estimates from average CPC alone never count —
 *   they drift with every import); applied decisions also once the window
 *   ends `REVIEW_AFTER_DAYS` after the upload, rejected ones once it ends
 *   that many days after the data they were rejected on.
 * Decisions saved before `basis` existed only use the dates.
 */
export function isOutdated(decision: Decision, rec: Recommendation): boolean {
  if (decision.status === "snoozed") return false;
  const b = decision.basis;
  const applied = !!decision.appliedAt;
  if (!applied && b?.pairedWith !== undefined && b.pairedWith !== (rec.pairedWith ?? "")) return true;
  if (!isTargetLevel(rec)) return false;
  if (b && b.currentBid !== undefined && rec.currentBid !== undefined && (b.currentBidSource === "bulk" || rec.currentBidSource === "bulk")) {
    if (Math.abs(b.currentBid - rec.currentBid) >= 0.005) return true;
  }
  if (!rec.windowTo || (!applied && decision.status !== "rejected")) return false;
  const since = applied ? (decision.appliedAt as string).slice(0, 10) : (b?.windowTo ?? decision.decidedAt.slice(0, 10));
  return isIsoDate(since) && rec.windowTo >= addDays(since, REVIEW_AFTER_DAYS);
}

/**
 * Approved, not-yet-applied decisions no current rec matches: the rec is no
 * longer produced (a re-import moved the window and the term stopped
 * qualifying) or it changed under the same id (`isOutdated`). They are never
 * exported, so the Keywords page lists them for review / discard instead of
 * letting them drop out of the export silently. Relevance checks are left
 * out (nothing to export).
 */
export function orphanedApprovals(recs: readonly Recommendation[], decisions: readonly Decision[]): Decision[] {
  const byId = new Map(recs.map((r) => [r.id, r] as const));
  return decisions.filter((d) => {
    if (d.status !== "approved" || d.appliedAt) return false;
    const r = byId.get(d.recId);
    if (r) return isOutdated(d, r);
    return parseRecId(d.recId).action !== "relevance";
  });
}

/* ---------------------------------------------------------------- families */

export function isHarvestRoot(action: ActionType): boolean {
  return action === "harvest-exact" || action === "harvest-product";
}

export function isNegative(action: ActionType): boolean {
  return action === "negate-exact" || action === "negate-phrase" || action === "negate-product";
}

export interface FamilyIndex {
  byId: Map<string, Recommendation>;
  /** Harvest id → its companions (paired negative first, then the phrase companion). */
  companions: Map<string, Recommendation[]>;
  /** Companion id → the harvest it belongs to. */
  rootOf: Map<string, string>;
}

/**
 * Link harvests to their companions through `pairedWith`. A companion is any
 * non-harvest rec whose `pairedWith` names a harvest that is present; a
 * companion whose harvest was dropped is treated as a standalone rec.
 */
export function buildFamilies(recs: readonly Recommendation[]): FamilyIndex {
  const byId = new Map(recs.map((r) => [r.id, r] as const));
  const companions = new Map<string, Recommendation[]>();
  const rootOf = new Map<string, string>();
  for (const r of recs) {
    if (isHarvestRoot(r.action) || !r.pairedWith) continue;
    const root = byId.get(r.pairedWith);
    if (!root || !isHarvestRoot(root.action)) continue;
    rootOf.set(r.id, root.id);
    const list = companions.get(root.id);
    if (list) list.push(r);
    else companions.set(root.id, [r]);
  }
  for (const list of companions.values()) list.sort((a, b) => Number(!isNegative(a.action)) - Number(!isNegative(b.action)));
  return { byId, companions, rootOf };
}

/** The whole family of a rec: the harvest first, then its companions. Unknown ids yield []. */
export function familyOf(id: string, fam: FamilyIndex): Recommendation[] {
  const rootId = fam.rootOf.get(id) ?? id;
  const root = fam.byId.get(rootId);
  if (!root) return [];
  return [root, ...(fam.companions.get(rootId) ?? [])];
}

/** The paired negative of a harvest, when there is one. */
export function pairedNegative(harvestId: string, fam: FamilyIndex): Recommendation | undefined {
  return (fam.companions.get(harvestId) ?? []).find((r) => isNegative(r.action));
}

/* ------------------------------------------------------------------ drafts */

/** What the user typed on a row before deciding. */
export interface DecisionDraft {
  /** Bid as typed (validated by `parseBid`). */
  bid?: string;
  destination?: HarvestDestination;
  /** Approve the harvest but keep the source ad group running (rejects the paired negative). */
  skipNegative?: boolean;
}

export type DraftMap = ReadonlyMap<string, DecisionDraft> | Readonly<Record<string, DecisionDraft>>;

function draftOf(drafts: DraftMap | undefined, id: string): DecisionDraft | undefined {
  if (!drafts) return undefined;
  return drafts instanceof Map ? drafts.get(id) : (drafts as Record<string, DecisionDraft>)[id];
}

/**
 * Parse a typed bid: "0.72", "0,72", "$0.72". Returns NaN for anything that
 * is not a positive amount (0, negatives, text). Rounded to cents.
 */
export function parseBid(text: string | undefined): number {
  if (text === undefined) return NaN;
  const cleaned = text.trim().replace(/[^\d.,-]/g, "").replace(",", ".");
  if (!cleaned || !/^-?\d*\.?\d*$/.test(cleaned)) return NaN;
  const n = Number(cleaned);
  if (!Number.isFinite(n) || n <= 0) return NaN;
  return Math.round(n * 100) / 100;
}

/** Error message for a typed bid, or null when it is fine (or untouched). */
export function bidError(text: string | undefined): string | null {
  if (text === undefined || text.trim() === "") return null;
  const n = parseBid(text);
  if (!Number.isFinite(n)) return "Enter a bid above 0, e.g. 0.75";
  if (n < 0.02) return "Amazon's minimum bid is 0.02";
  return null;
}

/** The bid a decision should carry: the typed one when it differs from the suggestion. */
function editedBidFor(rec: Recommendation, draft: DecisionDraft | undefined, existing: Decision | undefined): number | undefined {
  if (draft?.bid !== undefined && draft.bid.trim() !== "") {
    const n = parseBid(draft.bid);
    if (Number.isFinite(n) && (rec.suggestedBid === undefined || Math.abs(n - rec.suggestedBid) >= 0.005)) return n;
    return undefined;
  }
  return existing?.editedBid;
}

/* ------------------------------------------------------------------- plans */

export interface PlanContext {
  decisions: ReadonlyMap<string, Decision>;
  families: FamilyIndex;
  /** ISO timestamp (decidedAt / appliedAt). */
  now: string;
  /** Local ISO day (snoozeUntil). */
  today: string;
  drafts?: DraftMap;
}

export interface DecisionPlan {
  save: Decision[];
  /** recIds whose decision is deleted. */
  remove: string[];
  /** Every rec the plan touches, companions included. */
  affected: string[];
  /** How many of `affected` are companions pulled in by their harvest. */
  companions: number;
  /** Rows left out because their typed bid is invalid. */
  invalid: string[];
}

function emptyPlan(): DecisionPlan {
  return { save: [], remove: [], affected: [], companions: 0, invalid: [] };
}

/** Distinct family roots for a set of ids, in the given order. */
function roots(ids: readonly string[], fam: FamilyIndex): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    const r = fam.rootOf.get(id) ?? id;
    if (!fam.byId.has(r) || seen.has(r)) continue;
    seen.add(r);
    out.push(r);
  }
  return out;
}

function make(rec: Recommendation, status: DecisionStatus, ctx: PlanContext, extra: Partial<Decision> = {}): Decision {
  const d: Decision = { recId: rec.id, storeId: rec.storeId, status, decidedAt: ctx.now, basis: basisOf(rec) };
  return { ...d, ...extra };
}

/**
 * Approve rows. Each id pulls in its whole family: the harvest carries the
 * typed bid / destination; companions are approved alongside (the paired
 * negative is rejected instead when the harvest's draft says `skipNegative`).
 * The phrase companion has no destination control of its own, so it goes
 * where its harvest goes. A companion id on its own approves its whole family
 * too. Applied recs are left alone. Rows with an invalid typed bid are
 * skipped and listed.
 */
export function planApprove(ids: readonly string[], ctx: PlanContext): DecisionPlan {
  const plan = emptyPlan();
  for (const rootId of roots(ids, ctx.families)) {
    const family = familyOf(rootId, ctx.families);
    const root = family[0];
    const rootDraft = draftOf(ctx.drafts, root.id);
    const rootDestination = rootDraft?.destination ?? ctx.decisions.get(root.id)?.destination;
    if (rootDraft?.bid !== undefined && rootDraft.bid.trim() !== "" && !Number.isFinite(parseBid(rootDraft.bid))) {
      plan.invalid.push(root.id);
      continue;
    }
    for (const rec of family) {
      const existing = ctx.decisions.get(rec.id);
      if (existing?.appliedAt) continue;
      const draft = draftOf(ctx.drafts, rec.id);
      const isRoot = rec.id === root.id;
      if (!isRoot && isNegative(rec.action) && rootDraft?.skipNegative) {
        plan.save.push(make(rec, "rejected", ctx));
      } else {
        const extra: Partial<Decision> = {};
        const bid = editedBidFor(rec, draft, existing);
        if (bid !== undefined) extra.editedBid = bid;
        const destination = draft?.destination ?? (isRoot ? existing?.destination : (rootDestination ?? existing?.destination));
        if (destination && rec.action.startsWith("harvest")) extra.destination = destination;
        plan.save.push(make(rec, "approved", ctx, extra));
      }
      plan.affected.push(rec.id);
      if (!isRoot) plan.companions++;
    }
  }
  return plan;
}

/** Reject rows (families included). Applied recs are left alone. */
export function planReject(ids: readonly string[], ctx: PlanContext): DecisionPlan {
  return planStatus(ids, ctx, "rejected");
}

/** Snooze rows for `SNOOZE_DAYS` (families included). */
export function planSnooze(ids: readonly string[], ctx: PlanContext, days = SNOOZE_DAYS): DecisionPlan {
  return planStatus(ids, ctx, "snoozed", { snoozeUntil: addDays(ctx.today, days) });
}

function planStatus(ids: readonly string[], ctx: PlanContext, status: DecisionStatus, extra: Partial<Decision> = {}): DecisionPlan {
  const plan = emptyPlan();
  for (const rootId of roots(ids, ctx.families)) {
    const family = familyOf(rootId, ctx.families);
    family.forEach((rec, i) => {
      if (ctx.decisions.get(rec.id)?.appliedAt) return;
      plan.save.push(make(rec, status, ctx, extra));
      plan.affected.push(rec.id);
      if (i > 0) plan.companions++;
    });
  }
  return plan;
}

/** Undo decisions (families included): the rows become open again. Applied decisions are kept. */
export function planUndo(ids: readonly string[], ctx: PlanContext): DecisionPlan {
  const plan = emptyPlan();
  for (const rootId of roots(ids, ctx.families)) {
    familyOf(rootId, ctx.families).forEach((rec, i) => {
      const d = ctx.decisions.get(rec.id);
      if (!d || d.appliedAt) return;
      plan.remove.push(rec.id);
      plan.affected.push(rec.id);
      if (i > 0) plan.companions++;
    });
  }
  return plan;
}

/** Change the bid of an approved (not applied) rec in place. */
export function planEditBid(id: string, bid: number, ctx: PlanContext): DecisionPlan {
  const plan = emptyPlan();
  const rec = ctx.families.byId.get(id);
  const d = ctx.decisions.get(id);
  if (!rec || !d || d.status !== "approved" || d.appliedAt || !(bid > 0)) return plan;
  const next: Decision = { ...d, decidedAt: ctx.now };
  if (rec.suggestedBid !== undefined && Math.abs(bid - rec.suggestedBid) < 0.005) delete next.editedBid;
  else next.editedBid = Math.round(bid * 100) / 100;
  plan.save.push(next);
  plan.affected.push(id);
  return plan;
}

/**
 * Change the destination of an approved (not applied) harvest in place. Its
 * approved harvest companions (the phrase keyword) move with it.
 */
export function planEditDestination(id: string, destination: HarvestDestination | undefined, ctx: PlanContext): DecisionPlan {
  const plan = emptyPlan();
  const ids = isHarvestRoot(ctx.families.byId.get(id)?.action ?? "relevance")
    ? [id, ...(ctx.families.companions.get(id) ?? []).filter((c) => c.action.startsWith("harvest")).map((c) => c.id)]
    : [id];
  ids.forEach((recId, i) => {
    const d = ctx.decisions.get(recId);
    if (!d || d.status !== "approved" || d.appliedAt) return;
    const next: Decision = { ...d, decidedAt: ctx.now };
    if (destination) next.destination = destination;
    else delete next.destination;
    plan.save.push(next);
    plan.affected.push(recId);
    if (i > 0) plan.companions++;
  });
  return plan;
}

/**
 * Stamp `appliedAt` on the approved, not-yet-applied decisions of these recs
 * (families included). Rejected companions are left as they are.
 */
export function planMarkApplied(ids: readonly string[], ctx: PlanContext): DecisionPlan {
  const plan = emptyPlan();
  for (const rootId of roots(ids, ctx.families)) {
    familyOf(rootId, ctx.families).forEach((rec, i) => {
      const d = ctx.decisions.get(rec.id);
      if (!d || d.status !== "approved" || d.appliedAt) return;
      plan.save.push({ ...d, appliedAt: ctx.now });
      plan.affected.push(rec.id);
      if (i > 0) plan.companions++;
    });
  }
  return plan;
}

/**
 * Move applied decisions back to "approved, not exported". Works on raw
 * decisions (the rec may no longer exist), so it takes recIds directly.
 */
export function planUnapply(recIds: readonly string[], ctx: Pick<PlanContext, "decisions" | "now">): DecisionPlan {
  const plan = emptyPlan();
  for (const id of recIds) {
    const d = ctx.decisions.get(id);
    if (!d || !d.appliedAt) continue;
    const next: Decision = { ...d, decidedAt: ctx.now };
    delete next.appliedAt;
    plan.save.push(next);
    plan.affected.push(id);
  }
  return plan;
}

/** The decisions a plan will overwrite, for an "Undo" of the whole action. */
export function snapshotFor(plan: DecisionPlan, decisions: ReadonlyMap<string, Decision>): Map<string, Decision | undefined> {
  const snap = new Map<string, Decision | undefined>();
  for (const d of plan.save) snap.set(d.recId, decisions.get(d.recId));
  for (const id of plan.remove) snap.set(id, decisions.get(id));
  return snap;
}

/** Plan that puts a snapshot back exactly as it was. */
export function planRestore(snapshot: ReadonlyMap<string, Decision | undefined>): DecisionPlan {
  const plan = emptyPlan();
  for (const [id, d] of snapshot) {
    if (d) plan.save.push(d);
    else plan.remove.push(id);
    plan.affected.push(id);
  }
  return plan;
}

/* ------------------------------------------------------------------ export */

export interface ExportSelection {
  /** Approved, not applied, exportable recs (relevance checks are informational and left out). */
  recs: Recommendation[];
  /** Decisions for the bulk-sheet builder: applied decisions are dropped so they never export twice. */
  decisions: Map<string, Decision>;
}

export function exportSelection(recs: readonly Recommendation[], decisions: readonly Decision[] | ReadonlyMap<string, Decision>): ExportSelection {
  const all = decisions instanceof Map ? decisions : decisionMap(decisions as readonly Decision[]);
  const byId = new Map(recs.map((r) => [r.id, r] as const));
  const live = new Map<string, Decision>();
  for (const [id, d] of all) {
    if (d.appliedAt) continue;
    // An approval made for an earlier instance of the rec is not this rec's approval.
    const r = byId.get(id);
    if (r && isOutdated(d, r)) continue;
    live.set(id, d);
  }
  const out = recs.filter((r) => r.action !== "relevance" && live.get(r.id)?.status === "approved");
  return { recs: out, decisions: live };
}

/* ----------------------------------------------------------------- history */

export interface ParsedRecId {
  storeId: string;
  action: ActionType | string;
  campaign: string;
  adGroup: string;
  subject: string;
  matchType?: string;
}

/**
 * Split a recommendation id (`storeId|action|campaign|adGroup|subject[|matchType]`,
 * lower-cased) for history rows whose rec is no longer produced. Subjects that
 * contain "|" cannot be split reliably; the remainder is joined back.
 */
export function parseRecId(id: string): ParsedRecId {
  const parts = id.split("|");
  const [storeId = "", action = "", campaign = "", adGroup = "", ...rest] = parts;
  const targetLevel = action === "bid-up" || action === "bid-down" || action === "pause" || action === "relevance";
  let matchType: string | undefined;
  if (targetLevel && rest.length > 1) matchType = rest.pop();
  return { storeId, action, campaign, adGroup, subject: rest.join("|"), matchType };
}

export interface AppliedGroup {
  /** Local calendar day of `appliedAt` (YYYY-MM-DD, from the ISO timestamp's date part). */
  day: string;
  appliedAt: string;
  decisions: Decision[];
}

/** Applied decisions grouped by the upload they belong to (same appliedAt), newest first. */
export function appliedHistory(decisions: readonly Decision[]): AppliedGroup[] {
  const groups = new Map<string, AppliedGroup>();
  for (const d of decisions) {
    if (!d.appliedAt || d.status !== "approved") continue;
    const g = groups.get(d.appliedAt) ?? { day: d.appliedAt.slice(0, 10), appliedAt: d.appliedAt, decisions: [] };
    g.decisions.push(d);
    groups.set(d.appliedAt, g);
  }
  return [...groups.values()].sort((a, b) => (a.appliedAt < b.appliedAt ? 1 : a.appliedAt > b.appliedAt ? -1 : 0));
}
