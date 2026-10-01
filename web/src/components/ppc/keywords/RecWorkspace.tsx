"use client";

import {
  AlarmClock,
  ArrowDownWideNarrow,
  ArrowLeft,
  ArrowRight,
  ArrowUpNarrowWide,
  Check,
  CheckCheck,
  FileDown,
  ListChecks,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useDeferredValue,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
  type Ref,
} from "react";

import { downloadCsv } from "@/components/calc/csv";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { addDays, applyDecisionChanges, recommendationsCsv, todayIso, type Decision, type RuleConfig, type Store } from "@/lib/ppc";
import { cn, slugify } from "@/lib/utils";

import { ConsoleEmpty } from "../ConsoleEmpty";
import { count, dateSpan, day, localStamp, money, pct, plural } from "../format";
import { useBulk, useDecisions, useRecommendations, useScopedRows } from "../hooks";
import { StoreDot } from "../StoreDot";
import { TEXT_LINK } from "../overview/shared";
import type { SortDir } from "../overview/compute";
import { useToday } from "../overview/usePreferences";
import {
  orphanedApprovals,
  parseBid,
  planApprove,
  planEditBid,
  planEditDestination,
  planMarkApplied,
  planReject,
  planRestore,
  planSnooze,
  planUnapply,
  planUndo,
  snapshotFor,
  type DecisionDraft,
  type DecisionPlan,
  type PlanContext,
} from "../work/decisions";
import { parseAmount } from "../work/calculator";
import { adGroupOptions as buildAdGroupOptions, destinationFromValue, type DestinationValue } from "../work/destinations";
import { measure } from "../work/measure";
import { buildPriorIndex } from "../work/model";
import {
  DEFAULT_REC_FILTER,
  REC_SORTS,
  VIEW_IDS,
  VIEW_META,
  campaignOptions,
  buildRecModel,
  filterItems,
  isFiltered,
  itemsInView,
  openImpact,
  sortItems,
  viewCounts,
  type RecFilter,
  type RecSortKey,
  type ViewCounts,
  type ViewId,
  type WorkView,
} from "../work/recs";
import { Jargon, ShowMore, useMediaQuery } from "./common";
import { ExportPanel } from "./ExportPanel";
import { RecCards, RecTable, type RowAction, type RowHandlers } from "./RecRows";
import { SkippedList } from "./SkippedList";

const PAGE = 50;

interface Message {
  id: number;
  text: string;
  tone: "info" | "danger";
  snapshot?: Map<string, Decision | undefined>;
  focus?: boolean;
}

export interface RecWorkspaceProps {
  store: Store;
  storeCount: number;
  view: ViewId;
  onView: (view: ViewId) => void;
  initialQuery: string;
  /** Start with decided rows shown (a link to a rec that already has a decision). */
  initialShowDecided?: boolean;
  onAllStores: () => void;
  titleRef: Ref<HTMLHeadingElement>;
}

/**
 * One store's recommendations: header summary, the six views, filters,
 * row and bulk decisions, the Why panels, and the export flow.
 */
export function RecWorkspace({ store, storeCount, view, onView, initialQuery, initialShowDecided = false, onAllStores, titleRef }: RecWorkspaceProps) {
  const recsQ = useRecommendations(store.id);
  const decisionsQ = useDecisions(store.id);
  const bulkQ = useBulk(store.id);
  const rowsQ = useScopedRows(store.id);
  const todayLocal = useToday();
  const today = todayLocal || recsQ.window.to || "";
  const wide = useMediaQuery("(min-width: 1024px)");
  const uid = useId();

  const [filter, setFilter] = useState<RecFilter>(() => ({ ...DEFAULT_REC_FILTER, text: initialQuery }));
  const [minImpactText, setMinImpactText] = useState("");
  const [sort, setSort] = useState<{ key: RecSortKey; dir: SortDir }>({ key: "priority", dir: "desc" });
  const [showDecided, setShowDecided] = useState(initialShowDecided);
  const [limit, setLimit] = useState(PAGE);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [drafts, setDrafts] = useState<Record<string, DecisionDraft>>({});
  const [message, setMessage] = useState<Message | null>(null);
  const [busy, setBusy] = useState(false);

  const recs = recsQ.recommendations;
  const decisions = decisionsQ.decisions;
  const model = useMemo(() => measure("rec-model", () => buildRecModel(recs, decisions, today)), [recs, decisions, today]);
  // Approved changes the latest recompute no longer produces: listed in Approved instead of vanishing.
  const orphans = useMemo(() => orphanedApprovals(recs, decisions), [recs, decisions]);
  const counts = useMemo(() => viewCounts(model.items, recsQ.skipped.length), [model, recsQ.skipped.length]);
  const workView = view === "harvest" || view === "negatives" || view === "bids" || view === "flags" ? (view as WorkView) : null;
  const inView = useMemo(() => itemsInView(model.items, view, showDecided), [model, view, showDecided]);
  // Typing in the search box stays responsive on 1,000+ rows: the list catches up a frame later.
  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(() => filterItems(inView, deferredFilter), [inView, deferredFilter]);
  const sorted = useMemo(() => sortItems(filtered, sort.key, sort.dir), [filtered, sort]);
  const visible = useMemo(() => sorted.slice(0, limit), [sorted, limit]);
  const campaigns = useMemo(() => campaignOptions(inView), [inView]);
  const priors = useMemo(
    () => (recsQ.window.from && rowsQ.rows.length ? measure("priors", () => buildPriorIndex(rowsQ.rows, recsQ.window, store.id)) : null),
    [rowsQ.rows, recsQ.window, store.id],
  );
  const agOptions = useMemo(() => buildAdGroupOptions(bulkQ.bulk, store.id), [bulkQ.bulk, store.id]);
  const windowDays = recsQ.window.from ? Math.round((Date.parse(recsQ.window.to) - Date.parse(recsQ.window.from)) / 86_400_000) + 1 : 30;
  const impact = useMemo(() => openImpact(model.items), [model]);
  const highOpen = useMemo(() => filtered.filter((i) => i.status === "open" && i.rec.priority === "high"), [filtered]);
  const visibleSelected = useMemo(() => visible.filter((i) => selected.has(i.rec.id)), [visible, selected]);
  // Stable so memoised rows only re-render when their own props change.
  const rowCtx = useMemo(() => ({ store, priors, windowDays, adGroupOptions: agOptions, view, busy }), [store, priors, windowDays, agOptions, view, busy]);

  /* ------------------------------------------------ latest state for handlers */
  const latest = useRef({ model, drafts, visible, store, agOptions, today });
  useLayoutEffect(() => {
    latest.current = { model, drafts, visible, store, agOptions, today };
  });

  const focusEls = useRef(new Map<string, HTMLElement>());
  const pendingFocus = useRef<{ id: string; index: number } | null>(null);
  const messageRef = useRef<HTMLDivElement>(null);
  const exportHeadingRef = useRef<HTMLHeadingElement>(null);
  const listHeadingRef = useRef<HTMLHeadingElement>(null);
  const focusExportHeading = useRef(false);
  const lastSelected = useRef<number | null>(null);

  const planCtx = useCallback((): PlanContext => {
    const l = latest.current;
    return { decisions: l.model.decisions, families: l.model.families, now: new Date().toISOString(), today: todayIso(), drafts: l.drafts };
  }, []);

  const commit = useCallback(async (plan: DecisionPlan, text: string, opts: { focus?: boolean; undoable?: boolean } = {}) => {
    if (!plan.save.length && !plan.remove.length) {
      setMessage({ id: Date.now(), text: "Nothing to change.", tone: "info", focus: opts.focus });
      return false;
    }
    // From the stored decisions (outdated ones included), so Undo puts back exactly what was there.
    const snapshot = snapshotFor(plan, latest.current.model.stored);
    setBusy(true);
    try {
      // One transaction: a harvest and its paired negative change together or not at all.
      await applyDecisionChanges({ save: plan.save, remove: plan.remove });
      setMessage({ id: Date.now(), text, tone: "info", snapshot: opts.undoable === false ? undefined : snapshot, focus: opts.focus });
      return true;
    } catch (err) {
      setMessage({ id: Date.now(), text: `Could not save: ${err instanceof Error ? err.message : String(err)}`, tone: "danger", focus: true });
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const dropDrafts = useCallback((ids: readonly string[], field?: keyof DecisionDraft) => {
    setDrafts((d) => {
      let changed = false;
      const next = { ...d };
      for (const id of ids) {
        if (!next[id]) continue;
        changed = true;
        if (field) {
          const rest = { ...next[id] };
          delete rest[field];
          next[id] = rest;
        } else delete next[id];
      }
      return changed ? next : d;
    });
  }, []);

  const subjectOf = (id: string) => latest.current.model.families.byId.get(id)?.subject ?? "row";
  const companionWord = (plan: DecisionPlan) => (plan.companions ? ` and its paired ${plan.companions === 1 ? "negative" : "rows"}` : "");

  /* ---------------------------------------------------------- row actions */
  const onAction = useCallback(
    async (id: string, action: RowAction) => {
      const ctx = planCtx();
      const subject = subjectOf(id);
      const index = latest.current.visible.findIndex((i) => i.rec.id === id);
      let plan: DecisionPlan;
      let text: string;
      if (action === "approve") {
        plan = planApprove([id], ctx);
        if (plan.invalid.length) {
          setMessage({ id: Date.now(), text: `Fix the bid for “${subject}” first — it must be above 0.`, tone: "danger" });
          document.querySelector<HTMLInputElement>(`input[data-bid-for="${CSS.escape(id)}"]`)?.focus();
          return;
        }
        const rec = ctx.families.byId.get(id);
        text =
          rec?.action === "relevance"
            ? `Marked “${subject}” as checked.`
            : `Approved “${subject}”${companionWord(plan)}. It is in Approved, ready to export.`;
      } else if (action === "reject") {
        plan = planReject([id], ctx);
        text = `Rejected “${subject}”${companionWord(plan)}.`;
      } else if (action === "snooze") {
        plan = planSnooze([id], ctx);
        text = `Snoozed “${subject}” until ${day(addDays(todayIso(), 7))}.`;
      } else {
        plan = planUndo([id], ctx);
        text = plan.companions ? `“${subject}” and its paired negative are open again.` : `“${subject}” is open again.`;
      }
      pendingFocus.current = { id, index };
      const ok = await commit(plan, text);
      if (ok) {
        if (action === "approve") dropDrafts([id], "bid");
        setSelected((s) => {
          if (!s.has(id)) return s;
          const n = new Set(s);
          n.delete(id);
          return n;
        });
      }
    },
    [planCtx, commit, dropDrafts],
  );

  // After a row action the row usually leaves the list: move focus to the row that took its place.
  useEffect(() => {
    const p = pendingFocus.current;
    if (!p) return;
    const stillThere = visible.findIndex((i) => i.rec.id === p.id);
    if (stillThere >= 0) {
      const el = focusEls.current.get(p.id);
      if (el && document.activeElement !== el && !el.contains(document.activeElement)) el.focus();
      pendingFocus.current = null;
      return;
    }
    pendingFocus.current = null;
    const next = visible[Math.min(p.index, visible.length - 1)];
    const el = next ? focusEls.current.get(next.rec.id) : undefined;
    if (el) el.focus();
    else listHeadingRef.current?.focus();
  }, [visible]);

  useEffect(() => {
    if (message?.focus) messageRef.current?.focus();
  }, [message]);

  useEffect(() => {
    if (view === "approved" && focusExportHeading.current) {
      focusExportHeading.current = false;
      exportHeadingRef.current?.focus();
    }
  }, [view]);

  const onSelect = useCallback((id: string, checked: boolean, shift: boolean) => {
    const list = latest.current.visible;
    const index = list.findIndex((i) => i.rec.id === id);
    setSelected((s) => {
      const n = new Set(s);
      if (shift && lastSelected.current !== null && index >= 0) {
        const [a, b] = lastSelected.current < index ? [lastSelected.current, index] : [index, lastSelected.current];
        for (let k = a; k <= b; k++) {
          const rid = list[k]?.rec.id;
          if (!rid) continue;
          if (checked) n.add(rid);
          else n.delete(rid);
        }
      } else if (checked) n.add(id);
      else n.delete(id);
      return n;
    });
    lastSelected.current = index;
  }, []);

  const onToggle = useCallback((id: string) => {
    setExpanded((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const onDraft = useCallback((id: string, patch: Partial<DecisionDraft>) => {
    setDrafts((d) => {
      const cur = { ...(d[id] ?? {}), ...patch };
      for (const k of Object.keys(patch) as (keyof DecisionDraft)[]) if (patch[k] === undefined) delete cur[k];
      return { ...d, [id]: cur };
    });
  }, []);

  const onBidCommit = useCallback(
    async (id: string, text?: string) => {
      const typed = text ?? latest.current.drafts[id]?.bid;
      if (typed === undefined) return;
      const n = parseBid(typed);
      if (!Number.isFinite(n)) return;
      const ctx = planCtx();
      const d = ctx.decisions.get(id);
      if (d?.editedBid === n || (d && d.editedBid === undefined && ctx.families.byId.get(id)?.suggestedBid === n)) {
        dropDrafts([id], "bid");
        return;
      }
      const ok = await commit(planEditBid(id, n, ctx), `Bid for “${subjectOf(id)}” set to ${money(n, latest.current.store.currency)}.`);
      if (ok) dropDrafts([id], "bid");
    },
    [planCtx, commit, dropDrafts],
  );

  const onDestination = useCallback(
    async (id: string, value: DestinationValue) => {
      const l = latest.current;
      const item = l.model.byId.get(id);
      if (!item) return;
      const dest = destinationFromValue(value, { store: l.store, rec: item.rec, options: l.agOptions });
      if (item.status === "approved") {
        await commit(planEditDestination(id, dest, planCtx()), `Destination for “${item.rec.subject}” updated.`);
        dropDrafts([id], "destination");
      } else {
        onDraft(id, { destination: dest });
        if (!dest) dropDrafts([id], "destination");
      }
    },
    [commit, planCtx, dropDrafts, onDraft],
  );

  const onSkipNegative = useCallback((id: string, skip: boolean) => onDraft(id, { skipNegative: skip || undefined }), [onDraft]);

  const registerFocus = useCallback((id: string, el: HTMLElement | null) => {
    if (el) focusEls.current.set(id, el);
    else focusEls.current.delete(id);
  }, []);

  const handlers: RowHandlers = useMemo(
    () => ({
      onAction: (id, a) => void onAction(id, a),
      onSelect,
      onToggle,
      onDraft,
      onBidCommit: (id, t) => void onBidCommit(id, t),
      onDestination: (id, v) => void onDestination(id, v),
      onSkipNegative,
      registerFocus,
    }),
    [onAction, onSelect, onToggle, onDraft, onBidCommit, onDestination, onSkipNegative, registerFocus],
  );

  /* ---------------------------------------------------------- bulk actions */
  const bulk = async (kind: "approve" | "reject" | "snooze", ids: string[], label: string) => {
    if (!ids.length) return;
    const ctx = planCtx();
    const plan = kind === "approve" ? planApprove(ids, ctx) : kind === "reject" ? planReject(ids, ctx) : planSnooze(ids, ctx);
    const rows = ids.length - plan.invalid.length;
    const extra = plan.companions ? ` (+${plural(plan.companions, "paired row")})` : "";
    const verb = kind === "approve" ? "Approved" : kind === "reject" ? "Rejected" : "Snoozed";
    let text = `${verb} ${plural(rows, label)}${extra}.`;
    if (plan.invalid.length) text += ` ${plural(plan.invalid.length, "row")} skipped: fix the bid first.`;
    const ok = await commit(plan, text, { focus: true });
    if (ok) {
      setSelected(new Set());
      if (kind === "approve") dropDrafts(ids.filter((id) => !plan.invalid.includes(id)), "bid");
    }
  };

  const onSelectAll = (checked: boolean) => {
    setSelected((s) => {
      const n = new Set(s);
      for (const i of visible) {
        if (checked) n.add(i.rec.id);
        else n.delete(i.rec.id);
      }
      return n;
    });
  };

  const onMarkApplied = async (ids: string[]) => {
    const plan = planMarkApplied(ids, planCtx());
    await commit(plan, `Marked ${plural(plan.affected.length, "change")} as applied. They moved to Applied history and will not be exported again.`, {
      focus: true,
    });
  };
  const onUnapply = async (recIds: string[]) => {
    const l = latest.current;
    const plan = planUnapply(recIds, { decisions: l.model.stored, now: new Date().toISOString() });
    await commit(plan, `Moved ${plural(plan.affected.length, "change")} back to Approved.`, { focus: true });
  };
  const onDiscardOrphans = async (recIds: string[]) => {
    const plan: DecisionPlan = { save: [], remove: recIds, affected: recIds, companions: 0, invalid: [] };
    await commit(plan, `Discarded ${plural(recIds.length, "approved change")} that ${recIds.length === 1 ? "is" : "are"} no longer recommended.`, {
      focus: true,
    });
  };

  const changeView = (v: ViewId) => {
    onView(v);
    setLimit(PAGE);
    setSelected(new Set());
    lastSelected.current = null;
  };
  const updateFilter = (patch: Partial<RecFilter>) => {
    setFilter((f) => ({ ...f, ...patch }));
    setLimit(PAGE);
  };

  const exportViewCsv = () => {
    const rows = sorted.flatMap((i) => {
      const edited = i.decision?.editedBid;
      return [edited !== undefined ? { ...i.rec, suggestedBid: edited } : i.rec, ...i.companions];
    });
    downloadCsv(`recommendations-${view}-${slugify(store.name) || "store"}-${localStamp()}.csv`, recommendationsCsv(rows, store));
  };

  /* ---------------------------------------------------------------- render */
  const header = (
    <RecHeader
      titleRef={titleRef}
      store={store}
      storeCount={storeCount}
      onAllStores={onAllStores}
      window={recsQ.window}
      counts={counts}
      impact={impact}
      loading={recsQ.loading}
      refreshing={recsQ.refreshing}
    />
  );

  if (recsQ.loading || decisionsQ.loading) {
    return (
      <>
        {header}
        <WorkspaceSkeleton />
      </>
    );
  }
  if (recsQ.error) {
    return (
      <>
        {header}
        <Callout variant="danger" title="Could not work out recommendations">
          <p>{recsQ.error}</p>
        </Callout>
      </>
    );
  }
  if (!recsQ.window.from) {
    return (
      <>
        {header}
        <ConsoleEmpty
          reason="no-rows"
          description={`${store.name} has no search term data yet. Import a Search Term Report for it (daily, last 60 days works best), or load the demo stores to explore.`}
        />
      </>
    );
  }

  const tabpanelId = `${uid}-panel`;
  const listCaption = `${VIEW_META[view].label} recommendations for ${store.name}`;
  const listProps = {
    items: visible,
    ctx: rowCtx,
    handlers,
    selected,
    expanded,
    drafts,
    allSelected: visible.length > 0 && visibleSelected.length === visible.length,
    someSelected: visibleSelected.length > 0,
    onSelectAll,
    caption: listCaption,
  };

  // Sticky under the site header: after acting on a row deep in the list the
  // confirmation and its Undo stay on screen instead of 30 cards up.
  const messageBar = message ? (
    <div className="sticky top-16 z-20 bg-surface">
      <div
        ref={messageRef}
        tabIndex={-1}
        role={message.tone === "danger" ? "alert" : "status"}
        className={cn(
          "flex flex-wrap items-center gap-2 border-b px-4 py-2.5 text-[0.8125rem] focus:outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5",
          message.tone === "danger" ? "border-bad/30 bg-bad-soft text-ink" : "border-good/30 bg-good-soft text-ink",
        )}
      >
        {message.tone === "danger" ? <X className="size-4 shrink-0 text-bad" aria-hidden="true" /> : <Check className="size-4 shrink-0 text-good" aria-hidden="true" />}
        <span className="min-w-0 flex-1">{message.text}</span>
        {message.snapshot ? (
          <Button
            variant="secondary"
            size="sm"
            icon={RotateCcw}
            disabled={busy}
            onClick={() => {
              const snap = message.snapshot!;
              void commit(planRestore(snap), "Undone.", { focus: true, undoable: false });
            }}
          >
            Undo
          </Button>
        ) : null}
        <button
          type="button"
          onClick={() => setMessage(null)}
          className="inline-flex size-8 items-center justify-center rounded-md text-muted hover:text-ink focus-visible:outline-2 focus-visible:outline-brand [@media(pointer:coarse)]:size-11"
          aria-label="Dismiss message"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  ) : null;

  return (
    <>
      {header}
      <ViewTabs view={view} counts={counts} onChange={changeView} panelId={tabpanelId} idBase={uid} />
      <div id={tabpanelId} role="tabpanel" aria-labelledby={`${uid}-tab-${view}`} className="mt-4">
        <p className="mb-3 max-w-3xl text-[0.8125rem] leading-relaxed text-muted">{VIEW_META[view].description}</p>

        {view === "skipped" ? (
          <section aria-label="Skipped terms" className="rounded-xl border border-hairline bg-surface">
            <SkippedList skipped={recsQ.skipped} store={store} wide={wide} />
          </section>
        ) : (
          <div className="space-y-4">
            {view === "approved" ? (
              <ExportPanel
                store={store}
                recs={recs}
                decisions={decisions}
                bulk={bulkQ.bulk}
                busy={busy}
                onMarkApplied={onMarkApplied}
                onUnapply={onUnapply}
                orphans={orphans}
                onDiscardOrphans={onDiscardOrphans}
                headingRef={exportHeadingRef}
              />
            ) : null}

            <section aria-labelledby={`${uid}-list-h`} className="rounded-xl border border-hairline bg-surface">
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-hairline px-4 py-3 sm:px-5">
                <h2 id={`${uid}-list-h`} ref={listHeadingRef} tabIndex={-1} className="font-display text-[0.9375rem] font-semibold text-ink focus:outline-none">
                  {view === "approved" ? "Approved, not yet exported" : `${VIEW_META[view].label} to review`}
                  <span className="ml-2 text-xs font-normal text-muted">
                    {filtered.length === inView.length ? plural(inView.length, "row") : `${count(filtered.length)} of ${plural(inView.length, "row")}`}
                  </span>
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {workView && highOpen.length ? (
                    <Button size="sm" variant="secondary" icon={CheckCheck} disabled={busy} onClick={() => void bulk("approve", highOpen.map((i) => i.rec.id), "high-priority row")}>
                      Approve all {count(highOpen.length)} high priority
                    </Button>
                  ) : null}
                  <Button size="sm" variant="ghost" icon={FileDown} onClick={exportViewCsv} disabled={!sorted.length}>
                    Export view (.csv)
                  </Button>
                </div>
              </header>

              <Toolbar
                idBase={uid}
                filter={filter}
                onFilter={updateFilter}
                minImpactText={minImpactText}
                onMinImpact={(t) => {
                  setMinImpactText(t);
                  // "1,000" is a thousand, "12,5" twelve and a half (parseAmount).
                  const n = parseAmount(t) ?? NaN;
                  updateFilter({ minImpact: Number.isFinite(n) && n > 0 ? n : null });
                }}
                campaigns={campaigns}
                sort={sort}
                onSort={setSort}
                showDecided={showDecided}
                onShowDecided={
                  workView
                    ? (v) => {
                        setShowDecided(v);
                        setLimit(PAGE);
                      }
                    : undefined
                }
                decidedCount={workView ? counts.decided[workView] : 0}
                currency={store.currency}
              />

              {messageBar}

              {selected.size ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-brand-soft/50 px-4 py-2 sm:px-5" role="region" aria-label="Bulk actions">
                  <span className="text-[0.8125rem] font-medium text-ink">{count(selected.size)} selected</span>
                  {view !== "approved" ? (
                    <>
                      <Button size="sm" icon={Check} disabled={busy} onClick={() => void bulk("approve", [...selected], "row")}>
                        {view === "flags" ? "Mark checked" : "Approve selected"}
                      </Button>
                      {view !== "flags" ? (
                        <Button size="sm" variant="secondary" icon={X} disabled={busy} onClick={() => void bulk("reject", [...selected], "row")}>
                          Reject selected
                        </Button>
                      ) : null}
                      <Button size="sm" variant="secondary" icon={AlarmClock} disabled={busy} onClick={() => void bulk("snooze", [...selected], "row")}>
                        Snooze 7 days
                      </Button>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="secondary"
                      icon={RotateCcw}
                      disabled={busy}
                      onClick={() => {
                        const ids = [...selected];
                        void commit(planUndo(ids, planCtx()), `Moved ${plural(ids.length, "row")} back to open.`, { focus: true }).then((ok) => {
                          if (ok) setSelected(new Set());
                        });
                      }}
                    >
                      Undo selected
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
                    Clear
                  </Button>
                  {view !== "approved" ? (
                    <span className="text-xs text-muted">Approving a harvest also approves its paired negative.</span>
                  ) : null}
                </div>
              ) : null}

              {visible.length ? (
                wide ? (
                  <RecTable {...listProps} />
                ) : (
                  <RecCards {...listProps} />
                )
              ) : (
                <EmptyView
                  view={view}
                  rules={store.rules}
                  filtered={isFiltered(filter)}
                  onClear={() => updateFilter(DEFAULT_REC_FILTER)}
                  decided={workView && !showDecided ? counts.decided[workView] : 0}
                  onShowDecided={() => {
                    setShowDecided(true);
                    setLimit(PAGE);
                  }}
                  onChangeView={changeView}
                />
              )}
              <ShowMore
                shown={visible.length}
                total={sorted.length}
                step={PAGE}
                noun="rows"
                onMore={() => setLimit((l) => l + PAGE)}
                onAll={() => setLimit(sorted.length)}
                className="border-t border-hairline"
              />
            </section>
          </div>
        )}
      </div>

      {(counts.approved > 0 || orphans.length > 0) && view !== "approved" ? (
        <div className="sticky bottom-[var(--tab-bar-height,0px)] z-30 -mx-4 mt-6 border-t border-hairline bg-surface/95 px-4 py-3 backdrop-blur-sm sm:mx-0 sm:rounded-t-xl sm:border-x">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <ListChecks className="size-4 shrink-0 text-good" aria-hidden="true" />
            <p className="min-w-0 flex-1 text-[0.8125rem] text-ink">
              {counts.approved > 0 ? (
                <>
                  <strong className="font-semibold">{plural(counts.approved, "approved change")}</strong> not exported yet.{" "}
                </>
              ) : null}
              {orphans.length ? <span>{plural(orphans.length, "earlier approval")} no longer recommended — review them in Approved.</span> : null}
            </p>
            <Button
              size="sm"
              iconAfter={ArrowRight}
              onClick={() => {
                focusExportHeading.current = true;
                changeView("approved");
              }}
            >
              Review &amp; export
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}

/* ------------------------------------------------------------------ header */

function RecHeader({
  titleRef,
  store,
  storeCount,
  onAllStores,
  window: win,
  counts,
  impact,
  loading,
  refreshing,
}: {
  titleRef: Ref<HTMLHeadingElement>;
  store: Store;
  storeCount: number;
  onAllStores: () => void;
  window: { from: string; to: string };
  counts: ViewCounts;
  impact: number;
  loading: boolean;
  refreshing: boolean;
}) {
  const E = store.economics;
  const openTotal = counts.open.harvest + counts.open.negatives + counts.open.bids + counts.open.flags;
  return (
    <div className="mb-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 max-w-3xl">
          <h1 ref={titleRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink focus:outline-none sm:text-[1.75rem]">
            Keywords
          </h1>
          <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.9375rem] text-muted">
            <span className="inline-flex items-center gap-2 font-medium text-ink">
              <StoreDot colorIndex={store.colorIndex} size="md" />
              {store.name}
            </span>
            <span className="text-faint">·</span>
            <span>
              {store.marketplace} · {store.currency}
            </span>
            {storeCount > 1 ? (
              <>
                <span className="text-faint">·</span>
                <button type="button" onClick={onAllStores} className={`${TEXT_LINK} inline-flex min-h-8 items-center gap-1 [@media(pointer:coarse)]:min-h-11`}>
                  <ArrowLeft className="size-3.5" aria-hidden="true" />
                  All stores
                </button>
              </>
            ) : null}
          </p>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Turn search terms into decisions: <Jargon k="harvest">harvest</Jargon> the winners into exact keywords, block wasted searches, and
            tune bids. Every suggestion shows the numbers behind it.
          </p>
        </div>
      </div>

      <dl className="mt-4 grid gap-px overflow-hidden rounded-xl border border-hairline bg-hairline sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCell label="Data window">
          {loading ? (
            <Skeleton className="h-5 w-40" />
          ) : win.from ? (
            <>
              <span className="font-semibold text-ink">{dateSpan(win.from, win.to)}</span>
              <span className="mt-0.5 block text-xs text-muted">
                Last {plural(store.rules.lagDays, "day")} left out for <Jargon k="attributionLag">attribution lag</Jargon>
                {refreshing ? " · updating…" : ""}
              </span>
            </>
          ) : (
            <span className="text-muted">No data yet</span>
          )}
        </SummaryCell>
        <SummaryCell label="To review">
          {loading ? (
            <Skeleton className="h-5 w-48" />
          ) : (
            <>
              <span className="font-semibold text-ink">{plural(openTotal, "open recommendation")}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {count(counts.open.harvest)} harvest · {count(counts.open.negatives)} negatives · {count(counts.open.bids)} bids · {count(counts.open.flags)}{" "}
                flags
              </span>
            </>
          )}
        </SummaryCell>
        <SummaryCell label={<Jargon k="impact">Monthly impact</Jargon>}>
          {loading ? (
            <Skeleton className="h-5 w-24" />
          ) : (
            <>
              <span className="font-semibold text-ink">
                about <span className="tabular">{money(impact, store.currency, { decimals: 0 })}</span>
              </span>
              <span className="mt-0.5 block text-xs text-muted">sales carried + spend saved, open rows</span>
            </>
          )}
        </SummaryCell>
        <SummaryCell label="Store economics">
          <span className="font-semibold text-ink">
            <Jargon k="targetAcos">Target</Jargon> <span className="tabular">{pct(E.targetAcos)}</span> ·{" "}
            <Jargon k="breakEven">break-even</Jargon> <span className="tabular">{pct(E.breakEvenAcos)}</span>
          </span>
          <span className="mt-0.5 block text-xs">
            <Link href="/dashboard/bids" className={TEXT_LINK}>
              Work it out
            </Link>
            <span className="text-muted"> · </span>
            <Link href="/dashboard/stores" className={TEXT_LINK}>
              Edit in Stores
            </Link>
          </span>
        </SummaryCell>
      </dl>
    </div>
  );
}

function SummaryCell({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="min-w-0 bg-surface px-4 py-3">
      <dt className="text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">{label}</dt>
      <dd className="mt-1 text-sm">{children}</dd>
    </div>
  );
}

/* -------------------------------------------------------------------- tabs */

function ViewTabs({
  view,
  counts,
  onChange,
  panelId,
  idBase,
}: {
  view: ViewId;
  counts: ViewCounts;
  onChange: (v: ViewId) => void;
  panelId: string;
  idBase: string;
}) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});
  const index = VIEW_IDS.indexOf(view);
  const countFor = (v: ViewId): number =>
    v === "skipped" ? counts.skipped : v === "approved" ? counts.approved : counts.open[v as WorkView];
  const move = (i: number) => {
    const v = VIEW_IDS[(i + VIEW_IDS.length) % VIEW_IDS.length];
    onChange(v);
    refs.current[v]?.focus();
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    const map: Record<string, () => void> = {
      ArrowRight: () => move(index + 1),
      ArrowLeft: () => move(index - 1),
      Home: () => move(0),
      End: () => move(VIEW_IDS.length - 1),
    };
    const fn = map[e.key];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };
  return (
    <div role="tablist" aria-label="Recommendation views" className="scroll-well -mx-4 flex gap-1 overflow-x-auto overflow-y-hidden border-b border-hairline px-4 sm:mx-0 sm:px-0">
      {VIEW_IDS.map((v) => {
        const selected = v === view;
        const n = countFor(v);
        return (
          <button
            key={v}
            ref={(el) => {
              refs.current[v] = el;
            }}
            id={`${idBase}-tab-${v}`}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(v)}
            onKeyDown={onKeyDown}
            className={cn(
              "-mb-px inline-flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
              "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
              selected ? "border-brand text-ink" : "border-transparent text-muted hover:border-hairline-strong hover:text-ink",
            )}
          >
            {VIEW_META[v].label}
            <Badge tone={v === "approved" && n ? "good" : selected ? "brand" : "neutral"} size="sm">
              {count(n)}
            </Badge>
          </button>
        );
      })}
    </div>
  );
}

/* ----------------------------------------------------------------- toolbar */

interface ToolbarProps {
  idBase: string;
  filter: RecFilter;
  onFilter: (patch: Partial<RecFilter>) => void;
  minImpactText: string;
  onMinImpact: (text: string) => void;
  campaigns: { value: string; label: string; count: number }[];
  sort: { key: RecSortKey; dir: SortDir };
  onSort: (s: { key: RecSortKey; dir: SortDir }) => void;
  showDecided: boolean;
  onShowDecided?: (v: boolean) => void;
  decidedCount: number;
  currency: string;
}

function Toolbar({ idBase, filter, onFilter, minImpactText, onMinImpact, campaigns, sort, onSort, showDecided, onShowDecided, decidedCount, currency }: ToolbarProps) {
  const DirIcon = sort.dir === "desc" ? ArrowDownWideNarrow : ArrowUpNarrowWide;
  return (
    <div className="grid gap-3 border-b border-hairline px-4 py-3 sm:grid-cols-2 sm:px-5 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_9rem_8rem_minmax(0,1fr)]">
      <Input
        id={`${idBase}-q`}
        label="Search"
        icon={Search}
        placeholder="Term, campaign or ad group"
        value={filter.text}
        onChange={(e) => onFilter({ text: e.target.value })}
      />
      <Select
        id={`${idBase}-camp`}
        label="Campaign"
        value={filter.campaign}
        onChange={(e) => onFilter({ campaign: e.target.value })}
        options={[{ value: "", label: "All campaigns" }, ...campaigns.map((c) => ({ value: c.value, label: `${c.label} (${c.count})` }))]}
      />
      <Select
        id={`${idBase}-prio`}
        label="Priority"
        value={filter.priority}
        onChange={(e) => onFilter({ priority: e.target.value as RecFilter["priority"] })}
        options={[
          { value: "", label: "Any" },
          { value: "high", label: "High" },
          { value: "medium", label: "Medium" },
          { value: "low", label: "Low" },
        ]}
      />
      <Input
        id={`${idBase}-impact`}
        label="Min impact"
        inputMode="decimal"
        suffix={`${currency}/mo`}
        placeholder="0"
        value={minImpactText}
        onChange={(e) => onMinImpact(e.target.value)}
        className="tabular pr-20"
      />
      <div className="flex min-w-0 items-end gap-2">
        <Select
          id={`${idBase}-sort`}
          label="Sort by"
          value={sort.key}
          onChange={(e) => onSort({ key: e.target.value as RecSortKey, dir: e.target.value === "priority" ? "desc" : sort.dir })}
          options={REC_SORTS}
          fieldClassName="min-w-0 flex-1"
        />
        <button
          type="button"
          onClick={() => onSort({ ...sort, dir: sort.dir === "desc" ? "asc" : "desc" })}
          aria-label={sort.dir === "desc" ? "Sorted high to low; switch to low to high" : "Sorted low to high; switch to high to low"}
          className="inline-flex size-11 shrink-0 items-center justify-center rounded-lg border border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          <DirIcon className="size-4" aria-hidden="true" />
        </button>
      </div>
      {onShowDecided ? (
        <Checkbox
          id={`${idBase}-decided`}
          label={`Show decided rows (${count(decidedCount)})`}
          hint="Approved, rejected and snoozed rows, with Undo"
          checked={showDecided}
          onChange={(e) => onShowDecided(e.target.checked)}
          className="sm:col-span-2 lg:col-span-5"
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ empty */

/** 0.002 -> "0.2%", 0.0015 -> "0.15%". */
function ratioText(r: number): string {
  return `${Number((r * 100).toFixed(3))}%`;
}

function EmptyView({
  view,
  rules: R,
  filtered,
  onClear,
  decided,
  onShowDecided,
  onChangeView,
}: {
  view: ViewId;
  /** The store's own thresholds, so the copy matches what the engine checked. */
  rules: RuleConfig;
  filtered: boolean;
  onClear: () => void;
  /** Decided rows hidden in this view (0 when they are already shown). */
  decided: number;
  onShowDecided: () => void;
  onChangeView: (v: ViewId) => void;
}) {
  const copy: Record<ViewId, { title: string; body: string }> = {
    harvest: {
      title: "No harvest candidates right now",
      body: `A search term qualifies with ${count(R.harvestMinOrders)}+ orders at an ACoS under target and ${count(R.minClicksEvaluate)}+ clicks, and only if it is not already a keyword. Check Skipped for terms that were held back.`,
    },
    negatives: {
      title: "No wasted searches to block",
      body: `Nothing spent ${count(R.negateClicks)}+ clicks without an order, sold far above break-even, or matched your irrelevant-words list in this window.`,
    },
    bids: {
      title: "No bid changes needed",
      body: "Every keyword with enough history is within its ACoS band, or held by the guardrails. The Bids page shows every target's numbers.",
    },
    flags: {
      title: "No relevance flags",
      body: `No target has ${count(R.relevanceMinImpressions)}+ impressions with a click-through rate under ${ratioText(R.relevanceMaxCtr)}.`,
    },
    approved: { title: "Nothing approved yet", body: "Approve rows in Harvest, Negatives or Bids. They collect here, ready to download as one bulk sheet." },
    skipped: { title: "Nothing skipped", body: "" },
  };
  const c = copy[view];
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <ListChecks className="size-6 text-faint" aria-hidden="true" />
      <p className="font-display text-[0.9375rem] font-semibold text-ink">{filtered ? "No rows match these filters" : c.title}</p>
      <p className="max-w-md text-[0.8125rem] leading-relaxed text-muted">
        {filtered ? "Clear the filters to see every row in this view." : c.body}
        {decided
          ? ` ${plural(decided, "row")} in this view already ${decided === 1 ? "has a decision and is" : "have a decision and are"} hidden (approved, rejected, snoozed or applied).`
          : ""}
      </p>
      <div className="mt-1 flex flex-wrap justify-center gap-2">
        {filtered ? (
          <Button size="sm" variant="secondary" onClick={onClear}>
            Clear filters
          </Button>
        ) : null}
        {decided ? (
          <Button size="sm" variant="ghost" onClick={onShowDecided}>
            Show {plural(decided, "decided row")}
          </Button>
        ) : null}
        {view === "approved" ? (
          <Button size="sm" variant="secondary" onClick={() => onChangeView("harvest")}>
            Go to Harvest
          </Button>
        ) : null}
      </div>
    </div>
  );
}

function WorkspaceSkeleton() {
  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <div className="rounded-xl border border-hairline bg-surface p-4">
        <Skeleton className="mb-4 h-11 w-full" />
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 border-t border-hairline py-3">
            <Skeleton className="size-4" />
            <Skeleton className="h-10 flex-1" />
            <Skeleton className="h-9 w-40" />
          </div>
        ))}
      </div>
    </div>
  );
}
