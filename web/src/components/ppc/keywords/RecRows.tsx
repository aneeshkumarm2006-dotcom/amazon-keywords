"use client";

import { AlarmClock, Check, ChevronDown, CornerDownRight, RotateCcw, X } from "lucide-react";
import { Fragment, memo, useId, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import type { Recommendation, Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, day, money, pct } from "../format";
import { bidError, type DecisionDraft, type RecStatus } from "../work/decisions";
import { describeDestination, landsInSource, routedDestination, type AdGroupOption, type DestinationValue } from "../work/destinations";
import { bidCapNote } from "../work/explain";
import type { PriorIndex } from "../work/model";
import { ACTION_LABEL, type RecItem, type ViewId } from "../work/recs";
import { AcosText, ActionBadge, Figure, Jargon, PriorityTag, StatusBadge } from "./common";
import { WhyPanel, effectiveDestination } from "./WhyPanel";

export type RowAction = "approve" | "reject" | "snooze" | "undo";

export interface RowHandlers {
  onAction: (id: string, action: RowAction) => void;
  onSelect: (id: string, checked: boolean, shift: boolean) => void;
  onToggle: (id: string) => void;
  onDraft: (id: string, patch: Partial<DecisionDraft>) => void;
  /** Approved rows: persist the typed bid (or `text` when given). */
  onBidCommit: (id: string, text?: string) => void;
  onDestination: (id: string, value: DestinationValue) => void;
  onSkipNegative: (id: string, skip: boolean) => void;
  registerFocus: (id: string, el: HTMLElement | null) => void;
}

export interface RowContext {
  store: Store;
  priors: PriorIndex | null;
  windowDays: number;
  adGroupOptions: AdGroupOption[];
  view: ViewId;
  busy: boolean;
}

export interface RecListProps {
  items: RecItem[];
  ctx: RowContext;
  handlers: RowHandlers;
  selected: ReadonlySet<string>;
  expanded: ReadonlySet<string>;
  drafts: Readonly<Record<string, DecisionDraft>>;
  /** Header checkbox. */
  allSelected: boolean;
  someSelected: boolean;
  onSelectAll: (checked: boolean) => void;
  caption: string;
}

/* ------------------------------------------------------------ bid display */

export function bidText(item: RecItem, draft?: DecisionDraft): string {
  if (draft?.bid !== undefined) return draft.bid;
  const b = item.decision?.editedBid ?? item.rec.suggestedBid;
  return b !== undefined ? b.toFixed(2) : "";
}

function hasBid(rec: Recommendation): boolean {
  return rec.suggestedBid !== undefined && (rec.action.startsWith("harvest") || rec.action === "bid-up" || rec.action === "bid-down");
}

function isEditable(status: RecStatus): boolean {
  return status === "open" || status === "approved";
}

interface BidCellProps {
  item: RecItem;
  store: Store;
  draft?: DecisionDraft;
  onDraft: RowHandlers["onDraft"];
  onBidCommit: RowHandlers["onBidCommit"];
  compact?: boolean;
}

/** Current bid → suggested bid (editable before approving, and while approved). */
function BidCell({ item, store, draft, onDraft, onBidCommit, compact }: BidCellProps) {
  const uid = useId();
  const rec = item.rec;
  const cur = store.currency;
  const current =
    rec.action.startsWith("harvest") ? (
      <span className="text-xs text-muted">new</span>
    ) : rec.currentBid !== undefined ? (
      <span className="tabular text-[0.8125rem] text-ink">
        {money(rec.currentBid, cur)}
        {rec.currentBidSource === "avg-cpc" ? (
          <span className="ml-1 text-[0.6875rem] text-muted" title="No bulk-file bid: this is the average cost per click">
            avg CPC
          </span>
        ) : null}
      </span>
    ) : (
      <span className="text-faint">—</span>
    );

  if (rec.action === "pause") {
    return (
      <div className="flex flex-wrap items-center gap-1.5">
        {current}
        <span aria-hidden="true" className="text-faint">→</span>
        <Badge tone="bad" size="sm">
          Pause
        </Badge>
      </div>
    );
  }
  if (!hasBid(rec)) return <span className="text-faint">—</span>;

  const value = bidText(item, draft);
  const error = draft?.bid !== undefined ? bidError(draft.bid) : null;
  const typed = Number(value.replace(",", "."));
  const edited = draft?.bid !== undefined ? Math.abs(typed - (rec.suggestedBid ?? NaN)) >= 0.005 : item.decision?.editedBid !== undefined;
  // Only the user's own bid gets the warning: a cut the engine limited to one ±20% step can sit above max CPC on purpose.
  const overMax = !error && edited && rec.maxCpc !== undefined && Number.isFinite(typed) && typed > rec.maxCpc + 1e-9;
  const cap = bidCapNote(rec);
  const editable = isEditable(item.status);
  const noteId = `${uid}-note`;
  // "$", "£" — or "CA$", "SGD": longer symbols need more room in the input.
  const symbol = money(0, cur).replace(/[\d.,\s]/g, "");
  const wideSymbol = symbol.length > 1;
  const note = error ? (
    <span className="text-bad">{error}</span>
  ) : overMax ? (
    <span className="text-warn">Above max CPC {money(rec.maxCpc!, cur)} — clicks would cost more than target allows</span>
  ) : edited ? (
    <span>
      Edited · engine said {money(rec.suggestedBid ?? NaN, cur)}{" "}
      {editable ? (
        <button
          type="button"
          className="font-medium text-brand underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-brand [@media(pointer:coarse)]:inline-flex [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:items-center [@media(pointer:coarse)]:px-1"
          onClick={() => {
            if (item.status === "approved") onBidCommit(rec.id, rec.suggestedBid?.toFixed(2));
            else onDraft(rec.id, { bid: undefined });
          }}
        >
          reset
        </button>
      ) : null}
    </span>
  ) : cap === "max-cpc" && rec.action === "bid-down" && rec.maxCpc !== undefined && (rec.suggestedBid ?? 0) > rec.maxCpc ? (
    <span>
      heading to max CPC {money(rec.maxCpc, cur)}, one ±{Math.round(store.rules.maxMove * 100)}% step at a time
    </span>
  ) : cap === "max-cpc" ? (
    <span>capped at max CPC</span>
  ) : cap === "max-move" ? (
    <span>limited to ±{Math.round(store.rules.maxMove * 100)}% this round</span>
  ) : rec.maxCpc !== undefined ? (
    <span>
      max CPC {money(rec.maxCpc, cur)}
    </span>
  ) : null;

  return (
    <div className={cn("min-w-0", compact ? "" : wideSymbol ? "w-[12rem]" : "w-[10.5rem]")}>
      <div className="flex items-center gap-1.5">
        {current}
        <span aria-hidden="true" className="text-faint">→</span>
        {editable ? (
          <span className="relative inline-flex items-center">
            <span className="pointer-events-none absolute left-2 text-xs text-faint" aria-hidden="true">
              {symbol}
            </span>
            <input
              id={`${uid}-bid`}
              data-bid-for={rec.id}
              type="text"
              inputMode="decimal"
              autoComplete="off"
              spellCheck={false}
              aria-label={`${rec.action.startsWith("harvest") ? "Starting bid" : "New bid"} for ${rec.subject}`}
              aria-invalid={error ? true : undefined}
              aria-describedby={note ? noteId : undefined}
              value={value}
              onChange={(e) => onDraft(rec.id, { bid: e.target.value })}
              onBlur={() => {
                if (item.status === "approved") onBidCommit(rec.id);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && item.status === "approved") onBidCommit(rec.id);
              }}
              style={wideSymbol ? { paddingLeft: `${0.75 + symbol.length * 0.45}rem` } : undefined}
              className={cn(
                "h-9 rounded-lg border bg-surface pr-2 pl-6 tabular text-[0.8125rem] text-ink",
                wideSymbol ? "w-[6.5rem]" : "w-[5.25rem]",
                "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand [@media(pointer:coarse)]:h-11",
                error ? "border-bad" : overMax ? "border-warn" : edited ? "border-brand" : "border-hairline hover:border-hairline-strong",
              )}
            />
          </span>
        ) : (
          <span className="tabular text-[0.8125rem] font-medium text-ink">{value ? money(Number(value), cur) : "—"}</span>
        )}
      </div>
      {note ? (
        <p id={noteId} className="mt-0.5 text-[0.6875rem] leading-snug text-muted">
          {note}
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- actions */

interface ActionsProps {
  item: RecItem;
  handlers: RowHandlers;
  busy: boolean;
  expanded: boolean;
  whyId: string;
  full?: boolean;
  /** Render the Why toggle here (cards); the table puts it under the subject. */
  withWhy?: boolean;
}

function snoozeLabel(item: RecItem): string | undefined {
  return item.decision?.snoozeUntil ? `until ${day(item.decision.snoozeUntil.slice(0, 10))}` : undefined;
}

export function WhyToggle({ item, handlers, expanded, whyId }: Pick<ActionsProps, "item" | "handlers" | "expanded" | "whyId">) {
  const rec = item.rec;
  return (
    <button
      type="button"
      aria-expanded={expanded}
      aria-controls={whyId}
      onClick={() => handlers.onToggle(rec.id)}
      className={cn(
        "inline-flex min-h-9 items-center gap-1 rounded-lg px-2 text-[0.8125rem] font-medium text-muted hover:bg-surface-2 hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11",
        expanded && "text-ink",
      )}
    >
      Why?
      <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
      <span className="sr-only"> for {rec.subject}</span>
    </button>
  );
}

function RowActions({ item, handlers, busy, expanded, whyId, full, withWhy }: ActionsProps) {
  const rec = item.rec;
  const subject = rec.subject;
  const open = item.status === "open";
  const flag = rec.action === "relevance";
  const ref = (el: HTMLElement | null) => handlers.registerFocus(rec.id, el);
  const why = withWhy ? <WhyToggle item={item} handlers={handlers} expanded={expanded} whyId={whyId} /> : null;
  if (!open) {
    return (
      <div className={cn("flex items-center gap-1.5", full ? "flex-wrap" : "justify-end")}>
        <StatusBadge status={item.status} detail={item.status === "snoozed" ? snoozeLabel(item) : undefined} />
        {item.status !== "applied" ? (
          full ? (
            <button ref={ref} type="button" disabled={busy} onClick={() => handlers.onAction(rec.id, "undo")} className={LABEL_BTN}>
              <RotateCcw className="size-4" aria-hidden="true" />
              Undo<span className="sr-only"> decision on {subject}</span>
            </button>
          ) : (
            <button
              ref={ref}
              type="button"
              disabled={busy}
              onClick={() => handlers.onAction(rec.id, "undo")}
              className={ICON_BTN}
              aria-label={`Undo decision on ${subject}`}
              title="Undo"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
            </button>
          )
        ) : null}
        {why}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-1.5", full ? "flex-wrap" : "justify-end")}>
      <button
        ref={ref}
        type="button"
        disabled={busy}
        onClick={() => handlers.onAction(rec.id, "approve")}
        className={cn(
          "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-transparent bg-brand px-2.5 text-[0.8125rem] font-medium text-on-brand hover:bg-brand-hover",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 [@media(pointer:coarse)]:min-h-11",
        )}
      >
        <Check className="size-3.5" aria-hidden="true" />
        {flag ? "Checked" : "Approve"}
        <span className="sr-only"> {subject}</span>
      </button>
      {/* Phone cards spell the actions out: a title tooltip never shows on touch. */}
      {!flag ? (
        full ? (
          <button type="button" disabled={busy} onClick={() => handlers.onAction(rec.id, "reject")} className={LABEL_BTN}>
            <X className="size-4" aria-hidden="true" />
            Reject<span className="sr-only"> {subject}</span>
          </button>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => handlers.onAction(rec.id, "reject")}
            className={ICON_BTN}
            aria-label={`Reject ${subject}`}
            title="Reject"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        )
      ) : null}
      {full ? (
        <button type="button" disabled={busy} onClick={() => handlers.onAction(rec.id, "snooze")} className={LABEL_BTN}>
          <AlarmClock className="size-4" aria-hidden="true" />
          Snooze 7 days<span className="sr-only">: {subject}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={() => handlers.onAction(rec.id, "snooze")}
          className={ICON_BTN}
          aria-label={`Snooze ${subject} for 7 days`}
          title="Snooze 7 days"
        >
          <AlarmClock className="size-4" aria-hidden="true" />
        </button>
      )}
      {why}
    </div>
  );
}

const ICON_BTN =
  "inline-flex size-9 items-center justify-center rounded-lg border border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 [@media(pointer:coarse)]:size-11";

/** ICON_BTN with its label written out (phone cards). */
const LABEL_BTN =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-surface px-2.5 text-[0.8125rem] font-medium text-muted hover:border-hairline-strong hover:text-ink " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-50 [@media(pointer:coarse)]:min-h-11";

/* ----------------------------------------------------------- companions */

function CompanionLines({ item, store, draft, options }: { item: RecItem; store: Store; draft?: DecisionDraft; options: readonly AdGroupOption[] }) {
  if (!item.companions.length) return null;
  const dest = routedDestination(effectiveDestination(item, store, draft), item.rec, store, options);
  const same = landsInSource(dest, item.rec);
  return (
    <ul className="mt-1 space-y-0.5">
      {item.companions.map((c, i) => {
        const neg = c.action.startsWith("negate");
        const st = item.companionStatus[i];
        const skipped = neg && (same || draft?.skipNegative || (st === "rejected" && item.status !== "open"));
        return (
          <li key={c.id} className={cn("flex items-start gap-1 text-xs leading-snug", skipped ? "text-faint line-through" : "text-muted")}>
            <CornerDownRight className="mt-px size-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 [overflow-wrap:anywhere]">
              + {neg ? (c.action === "negate-product" ? "negative product target" : "negative exact") : "phrase keyword"}
              {neg ? ` in ${c.campaign} / ${c.adGroup}` : c.suggestedBid !== undefined ? ` at ${money(c.suggestedBid, store.currency)}` : ""}
              {skipped ? <span className="sr-only"> (left out)</span> : null}
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function Subject({
  item,
  store,
  draft,
  showDestination,
  why,
  options,
}: {
  item: RecItem;
  store: Store;
  draft?: DecisionDraft;
  showDestination: boolean;
  why?: ReactNode;
  /** Bulk ad groups: auto sources are re-routed to a new campaign, as in the export. */
  options: readonly AdGroupOption[];
}) {
  const rec = item.rec;
  const asin = rec.matchType === "product" && /^b0[a-z0-9]{8}$/i.test(rec.subject);
  const dest = showDestination && rec.action.startsWith("harvest") ? routedDestination(effectiveDestination(item, store, draft), rec, store, options) : null;
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center gap-1.5">
        <ActionBadge action={rec.action} priority={rec.priority} />
        <PriorityTag priority={rec.priority} />
        {why ? <span className="-my-1.5 ml-auto">{why}</span> : null}
      </div>
      <p className="mt-1 text-sm font-medium break-words text-ink">{asin ? rec.subject.toUpperCase() : rec.subject}</p>
      <p className="truncate text-xs text-muted" title={`${rec.campaign} → ${rec.adGroup}`}>
        {rec.campaign} <span aria-hidden="true">→</span>
        <span className="sr-only">, ad group</span> {rec.adGroup}
        {rec.level === "target" ? <span> · {rec.matchType}</span> : null}
      </p>
      {dest ? (
        <p className="truncate text-xs text-muted" title={describeDestination(dest, rec, store, (n) => money(n, store.currency, { decimals: 0 }))}>
          <span className="text-faint">into </span>
          {describeDestination(dest, rec, store, (n) => money(n, store.currency, { decimals: 0 }))}
        </p>
      ) : null}
      <CompanionLines item={item} store={store} draft={draft} options={options} />
    </div>
  );
}

function impactText(rec: Recommendation, currency: string): ReactNode {
  const v = rec.impact ?? 0;
  if (!(v > 0)) return <span className="text-faint">—</span>;
  const amount = money(v, currency, { decimals: 0 });
  const gain = rec.action.startsWith("harvest") || rec.action === "bid-up";
  return (
    <span className={cn("tabular font-medium whitespace-nowrap", gain ? "text-good" : "text-ink")}>
      {gain ? "+" : ""}
      {amount}
      <span className="text-[0.6875rem] font-normal text-muted">/mo</span>
      <span className="sr-only">{gain ? " sales" : " saved"}</span>
    </span>
  );
}

/* ------------------------------------------------------------ desktop table */

interface RowProps {
  item: RecItem;
  ctx: RowContext;
  handlers: RowHandlers;
  selected: boolean;
  expanded: boolean;
  draft?: DecisionDraft;
  flags: boolean;
}

const TableRow = memo(function TableRow({ item, ctx, handlers, selected, expanded, draft, flags }: RowProps) {
  const rec = item.rec;
  const c = rec.counters;
  const E = ctx.store.economics;
  const whyId = `why-${cssId(rec.id)}`;
  const cols = flags ? 10 : 11;
  return (
    <Fragment>
      <TR className={cn(selected && "bg-brand-soft/40", expanded && "border-b-0")}>
        <TD className="w-10 px-3 align-top">
          {/* The label is the hit area: 16px box, 44px target on a touch screen (tablets get this table too). */}
          <label className="-m-2 inline-flex cursor-pointer p-2 [@media(pointer:coarse)]:-m-3.5 [@media(pointer:coarse)]:p-3.5">
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => handlers.onSelect(rec.id, e.target.checked, (e.nativeEvent as MouseEvent).shiftKey)}
              aria-label={`Select ${ACTION_LABEL[rec.action].toLowerCase()} ${rec.subject}`}
              className="mt-1 size-4 cursor-pointer accent-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </label>
        </TD>
        <TD className="min-w-[15rem] max-w-[22rem] px-2.5">
          <Subject
            item={item}
            store={ctx.store}
            draft={draft}
            showDestination={ctx.view === "approved" || item.status === "approved"}
            why={<WhyToggle item={item} handlers={handlers} expanded={expanded} whyId={whyId} />}
            options={ctx.adGroupOptions}
          />
        </TD>
        {flags ? (
          <>
            <TD numeric mono className="px-2.5">
              {count(c.impressions)}
            </TD>
            <TD numeric mono className="px-2.5">
              {count(c.clicks)}
            </TD>
            <TD numeric mono className="px-2.5">
              {pct(c.impressions > 0 ? c.clicks / c.impressions : NaN, 2)}
            </TD>
            <TD numeric mono className="px-2.5">
              {money(c.spend, ctx.store.currency)}
            </TD>
            <TD numeric mono className="px-2.5">
              {count(c.orders)}
            </TD>
          </>
        ) : (
          <>
            <TD numeric mono className="px-2.5">
              {count(c.clicks)}
            </TD>
            <TD numeric mono className="px-2.5">
              {count(c.orders)}
            </TD>
            <TD numeric mono className="px-2.5">
              {money(c.spend, ctx.store.currency)}
            </TD>
            <TD numeric mono className="px-2.5">
              {money(c.sales, ctx.store.currency)}
            </TD>
            <TD numeric className="px-2.5">
              <AcosText acos={item.acos} target={E.targetAcos} breakEven={E.breakEvenAcos} spend={c.spend} />
            </TD>
            <TD numeric mono className="px-2.5">
              {pct(item.cvr)}
            </TD>
          </>
        )}
        {!flags ? (
          <TD className="px-2.5">
            <BidCell item={item} store={ctx.store} draft={draft} onDraft={handlers.onDraft} onBidCommit={handlers.onBidCommit} />
          </TD>
        ) : null}
        <TD numeric className="px-2.5">
          {impactText(rec, ctx.store.currency)}
        </TD>
        <TD className="px-2.5">
          <RowActions item={item} handlers={handlers} busy={ctx.busy} expanded={expanded} whyId={whyId} />
        </TD>
      </TR>
      {expanded ? (
        <tr>
          <td colSpan={cols} className="border-b border-hairline p-0">
            <WhyPanel
              id={whyId}
              item={item}
              store={ctx.store}
              priors={ctx.priors}
              windowDays={ctx.windowDays}
              draft={draft}
              adGroupOptions={ctx.adGroupOptions}
              onDestination={handlers.onDestination}
              onSkipNegative={handlers.onSkipNegative}
            />
          </td>
        </tr>
      ) : null}
    </Fragment>
  );
});

function cssId(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return `${(h >>> 0).toString(36)}-${id.length}`;
}

export function RecTable({ items, ctx, handlers, selected, expanded, drafts, allSelected, someSelected, onSelectAll, caption }: RecListProps) {
  const flags = ctx.view === "flags";
  const headId = useId();
  return (
    <Table caption={caption} wrapperClassName="relative rounded-none border-0 bg-transparent" className="text-sm">
      <THead>
        <tr>
          <TH className="w-10 px-3">
            <input
              id={`${headId}-all`}
              type="checkbox"
              checked={allSelected}
              ref={(el) => {
                if (el) el.indeterminate = !allSelected && someSelected;
              }}
              onChange={(e) => onSelectAll(e.target.checked)}
              aria-label="Select all shown rows"
              className="size-4 cursor-pointer accent-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </TH>
          <TH className="px-2.5">{flags ? "Target" : "Search term / target"}</TH>
          {flags ? (
            <>
              <TH numeric className="px-2.5">
                Impr.
              </TH>
              <TH numeric className="px-2.5">
                Clicks
              </TH>
              <TH numeric className="px-2.5">
                <Jargon k="ctr" />
              </TH>
              <TH numeric className="px-2.5">
                Spend
              </TH>
              <TH numeric className="px-2.5">
                Orders
              </TH>
            </>
          ) : (
            <>
              <TH numeric className="px-2.5">
                Clicks
              </TH>
              <TH numeric className="px-2.5">
                Orders
              </TH>
              <TH numeric className="px-2.5">
                Spend
              </TH>
              <TH numeric className="px-2.5">
                Sales
              </TH>
              <TH numeric className="px-2.5">
                <Jargon k="acos" />
              </TH>
              <TH numeric className="px-2.5">
                <Jargon k="cvr" />
              </TH>
              <TH className="px-2.5">Bid now → new</TH>
            </>
          )}
          <TH numeric className="px-2.5">
            <Jargon k="impact">Impact</Jargon>
          </TH>
          <TH className="px-2.5 text-right">
            <span className="sr-only">Decision</span>
          </TH>
        </tr>
      </THead>
      <TBody>
        {items.map((item) => (
          <TableRow
            key={item.rec.id}
            item={item}
            ctx={ctx}
            handlers={handlers}
            selected={selected.has(item.rec.id)}
            expanded={expanded.has(item.rec.id)}
            draft={drafts[item.rec.id]}
            flags={flags}
          />
        ))}
      </TBody>
    </Table>
  );
}

/* -------------------------------------------------------------- phone cards */

const Card = memo(function Card({ item, ctx, handlers, selected, expanded, draft, flags }: RowProps) {
  const rec = item.rec;
  const c = rec.counters;
  const E = ctx.store.economics;
  const whyId = `why-m-${cssId(rec.id)}`;
  const cbId = `sel-m-${cssId(rec.id)}`;
  return (
    <li className={cn("border-b border-hairline last:border-b-0", selected && "bg-brand-soft/40")}>
      <div className="space-y-2.5 px-4 py-3">
        <div className="flex items-start gap-3">
          {/* 20px box inside a 44px hit area; the negative margin keeps the card layout unchanged. */}
          <label htmlFor={cbId} className="-m-3 flex shrink-0 cursor-pointer p-3">
            <input
              id={cbId}
              type="checkbox"
              checked={selected}
              onChange={(e) => handlers.onSelect(rec.id, e.target.checked, (e.nativeEvent as MouseEvent).shiftKey)}
              aria-label={`Select ${ACTION_LABEL[rec.action].toLowerCase()} ${rec.subject}`}
              className="mt-1 size-5 shrink-0 cursor-pointer accent-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </label>
          <div className="min-w-0 flex-1">
            <Subject item={item} store={ctx.store} draft={draft} showDestination={ctx.view === "approved" || item.status === "approved"} options={ctx.adGroupOptions} />
          </div>
          <div className="shrink-0 text-right text-[0.8125rem]">{impactText(rec, ctx.store.currency)}</div>
        </div>
        <dl className="grid grid-cols-3 gap-x-3 gap-y-1.5 pl-8">
          {flags ? (
            <>
              <Figure label="Impr.">{count(c.impressions)}</Figure>
              <Figure label="Clicks">{count(c.clicks)}</Figure>
              <Figure label="CTR">{pct(c.impressions > 0 ? c.clicks / c.impressions : NaN, 2)}</Figure>
            </>
          ) : (
            <>
              <Figure label="Clicks">{count(c.clicks)}</Figure>
              <Figure label="Orders">{count(c.orders)}</Figure>
              <Figure label="Spend">{money(c.spend, ctx.store.currency)}</Figure>
              <Figure label="Sales">{money(c.sales, ctx.store.currency)}</Figure>
              <Figure label="ACoS">
                <AcosText acos={item.acos} target={E.targetAcos} breakEven={E.breakEvenAcos} spend={c.spend} />
              </Figure>
              <Figure label="CVR">{pct(item.cvr)}</Figure>
            </>
          )}
        </dl>
        {!flags && (hasBid(rec) || rec.action === "pause") ? (
          <div className="pl-8">
            <p className="mb-1 text-[0.6875rem] tracking-wide text-muted uppercase">Bid now → new</p>
            <BidCell item={item} store={ctx.store} draft={draft} onDraft={handlers.onDraft} onBidCommit={handlers.onBidCommit} compact />
          </div>
        ) : null}
        <div className="pl-8">
          <RowActions item={item} handlers={handlers} busy={ctx.busy} expanded={expanded} whyId={whyId} full withWhy />
        </div>
      </div>
      {expanded ? (
        <WhyPanel
          id={whyId}
          item={item}
          store={ctx.store}
          priors={ctx.priors}
          windowDays={ctx.windowDays}
          draft={draft}
          adGroupOptions={ctx.adGroupOptions}
          onDestination={handlers.onDestination}
          onSkipNegative={handlers.onSkipNegative}
        />
      ) : null}
    </li>
  );
});

export function RecCards({ items, ctx, handlers, selected, expanded, drafts, allSelected, someSelected, onSelectAll, caption }: RecListProps) {
  const flags = ctx.view === "flags";
  const id = useId();
  return (
    <div>
      <div className="flex items-center gap-3 border-b border-hairline bg-surface-2 px-4 py-2">
        <input
          id={`${id}-all`}
          type="checkbox"
          checked={allSelected}
          ref={(el) => {
            if (el) el.indeterminate = !allSelected && someSelected;
          }}
          onChange={(e) => onSelectAll(e.target.checked)}
          className="size-5 cursor-pointer accent-[var(--brand)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        />
        <label htmlFor={`${id}-all`} className="text-xs font-medium text-muted">
          Select all shown
        </label>
      </div>
      <ul aria-label={caption}>
        {items.map((item) => (
          <Card
            key={item.rec.id}
            item={item}
            ctx={ctx}
            handlers={handlers}
            selected={selected.has(item.rec.id)}
            expanded={expanded.has(item.rec.id)}
            draft={drafts[item.rec.id]}
            flags={flags}
          />
        ))}
      </ul>
    </div>
  );
}
