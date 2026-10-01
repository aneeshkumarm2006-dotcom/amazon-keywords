"use client";

import { CheckCheck, ChevronDown, Download, FileSpreadsheet, FileText, History, RotateCcw, TriangleAlert, Upload } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useState, type Ref } from "react";

import { downloadCsv } from "@/components/calc/csv";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import {
  buildBulkSheet,
  bulkSheetXlsx,
  recommendationsCsv,
  todayIso,
  type BulkEntity,
  type Decision,
  type Recommendation,
  type Store,
} from "@/lib/ppc";
import { cn, slugify } from "@/lib/utils";

import { count, localStamp, money, plural, stamp } from "../format";
import { TEXT_LINK } from "../overview/shared";
import { appliedHistory, exportSelection, parseRecId, REVIEW_AFTER_DAYS } from "../work/decisions";
import { ACTION_LABEL } from "../work/recs";
import { Jargon, XLSX_MIME, downloadBytes } from "./common";

export interface ExportPanelProps {
  store: Store;
  recs: Recommendation[];
  decisions: Decision[];
  bulk: BulkEntity[];
  busy: boolean;
  onMarkApplied: (recIds: string[]) => Promise<void>;
  onUnapply: (recIds: string[]) => Promise<void>;
  /** Approved, not applied decisions no current rec matches (work/decisions.ts `orphanedApprovals`). */
  orphans?: Decision[];
  onDiscardOrphans?: (recIds: string[]) => Promise<void>;
  headingRef?: Ref<HTMLHeadingElement>;
}

interface Downloaded {
  kind: "xlsx" | "csv";
  file: string;
  ids: string[];
}

function fileSlug(store: Store): string {
  return slugify(store.name) || "store";
}

/**
 * The Approved view's export card: what will be uploaded, warnings from the
 * bulk-sheet builder, the two downloads, how to upload, and "Mark as applied"
 * (so the same changes are never exported twice), plus the applied history.
 */
export function ExportPanel({ store, recs, decisions, bulk, busy, onMarkApplied, onUnapply, orphans = [], onDiscardOrphans, headingRef }: ExportPanelProps) {
  const uid = useId();
  const [downloaded, setDownloaded] = useState<Downloaded | null>(null);
  const selection = useMemo(() => exportSelection(recs, decisions), [recs, decisions]);
  // Relevance checks are informational: never handed to the bulk-sheet builder.
  const exportable = useMemo(() => recs.filter((r) => r.action !== "relevance"), [recs]);
  const sheet = useMemo(
    () => (selection.recs.length ? buildBulkSheet({ store, recs: exportable, decisions: selection.decisions, bulk, today: todayIso() }) : null),
    [selection, store, exportable, bulk],
  );
  const breakdown = useMemo(() => {
    const out = { harvest: 0, pairedNeg: 0, negatives: 0, bids: 0, pauses: 0 };
    for (const r of selection.recs) {
      if (r.action.startsWith("harvest")) out.harvest++;
      else if (r.action.startsWith("negate")) {
        if (r.pairedWith && (r.impact ?? 0) === 0) out.pairedNeg++;
        else out.negatives++;
      } else if (r.action === "pause") out.pauses++;
      else out.bids++;
    }
    return out;
  }, [selection]);
  const needsIds = sheet?.warnings.some((w) => /need IDs/i.test(w)) ?? false;
  const noBulk = bulk.length === 0;
  const slug = fileSlug(store);
  const n = selection.recs.length;
  const stillCurrent = downloaded && downloaded.ids.length === n && downloaded.ids.every((id) => selection.decisions.get(id)?.status === "approved");

  const downloadXlsx = () => {
    if (!sheet) return;
    const file = `bulk-${slug}-${localStamp()}.xlsx`;
    downloadBytes(file, bulkSheetXlsx({ rows: sheet.rows }), XLSX_MIME);
    setDownloaded({ kind: "xlsx", file, ids: selection.recs.map((r) => r.id) });
  };
  const downloadActions = () => {
    const file = `actions-${slug}-${localStamp()}.csv`;
    // The action list shows the bid that will be uploaded: the typed one when the row was edited.
    const withBids = selection.recs.map((r) => {
      const edited = selection.decisions.get(r.id)?.editedBid;
      return edited !== undefined ? { ...r, suggestedBid: edited } : r;
    });
    downloadCsv(file, recommendationsCsv(withBids, store));
    setDownloaded({ kind: "csv", file, ids: selection.recs.map((r) => r.id) });
  };
  const markApplied = async () => {
    const ids = downloaded?.ids ?? selection.recs.map((r) => r.id);
    await onMarkApplied(ids);
    setDownloaded(null);
  };

  return (
    <div className="space-y-4">
      <section aria-labelledby={`${uid}-title`} className="rounded-xl border border-hairline bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
          <div className="min-w-0 flex-[1_1_18rem]">
            <h2 id={`${uid}-title`} ref={headingRef} tabIndex={-1} className="font-display text-base font-semibold text-ink focus:outline-none">
              Export for Amazon
            </h2>
            <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
              {n ? (
                <>
                  {plural(n, "approved change")} ready:{" "}
                  {[
                    breakdown.harvest && plural(breakdown.harvest, "new keyword"),
                    breakdown.pairedNeg && plural(breakdown.pairedNeg, "paired negative"),
                    breakdown.negatives && plural(breakdown.negatives, "negative"),
                    breakdown.bids && plural(breakdown.bids, "bid change"),
                    breakdown.pauses && plural(breakdown.pauses, "pause"),
                  ]
                    .filter(Boolean)
                    .join(", ")}
                  . The <Jargon k="bulkSheet">bulk sheet</Jargon> has {plural(sheet?.count ?? 0, "row")}.
                </>
              ) : (
                "Nothing approved yet. Approve rows in Harvest, Negatives or Bids and they collect here."
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button icon={FileSpreadsheet} onClick={downloadXlsx} disabled={!n || busy}>
              Download bulk sheet (.xlsx)
            </Button>
            <Button variant="secondary" icon={FileText} onClick={downloadActions} disabled={!n || busy}>
              Action list (.csv)
            </Button>
          </div>
        </header>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          {orphans.length ? (
            <Callout variant="warn" title={`${plural(orphans.length, "earlier approval")} no longer recommended`}>
              <p>
                Since you approved {orphans.length === 1 ? "this" : "these"}, a newer import changed the numbers: the rules no longer suggest{" "}
                {orphans.length === 1 ? "it" : "them"}, or the target&apos;s bid has changed. {orphans.length === 1 ? "It is" : "They are"} left out
                of the bulk sheet.
              </p>
              <ul className="mt-1.5 space-y-0.5">
                {orphans.slice(0, 20).map((d) => {
                  const p = parseRecId(d.recId);
                  const action = p.action as Recommendation["action"];
                  return (
                    <li key={d.recId} className="flex min-w-0 flex-wrap gap-x-2 text-xs">
                      <span className="font-medium text-ink">{ACTION_LABEL[action] ?? action}</span>
                      <span className="min-w-0 break-words text-ink">{p.subject}</span>
                      <span className="min-w-0 truncate text-muted">
                        {p.campaign} / {p.adGroup}
                      </span>
                    </li>
                  );
                })}
                {orphans.length > 20 ? <li className="text-xs text-muted">…and {count(orphans.length - 20)} more</li> : null}
              </ul>
              {onDiscardOrphans ? (
                <div className="mt-2">
                  <Button size="sm" variant="secondary" disabled={busy} onClick={() => void onDiscardOrphans(orphans.map((d) => d.recId))}>
                    Discard {orphans.length === 1 ? "it" : `all ${count(orphans.length)}`}
                  </Button>
                </div>
              ) : null}
            </Callout>
          ) : null}

          {sheet?.warnings.length ? (
            <Callout variant="warn" title={needsIds ? "Some rows are missing Amazon IDs" : "Check before uploading"}>
              <ul className="list-disc space-y-1 pl-5">
                {sheet.warnings.map((w, i) => (
                  <li key={i} className="break-words">
                    {w}
                  </li>
                ))}
              </ul>
              {needsIds || noBulk ? (
                <p>
                  Amazon needs campaign and ad group IDs to place each row.{" "}
                  <Link href="/dashboard/import">Import a bulk file for {store.name}</Link> (Amazon Ads → Bulk operations → Create spreadsheet
                  for download), then come back — the IDs fill in automatically.
                </p>
              ) : null}
            </Callout>
          ) : n ? (
            <p className="flex items-center gap-1.5 text-[0.8125rem] text-good">
              <CheckCheck className="size-4" aria-hidden="true" />
              Every row has the IDs Amazon needs.
            </p>
          ) : null}

          {downloaded && stillCurrent ? (
            <div role="status" className="flex flex-wrap items-center gap-3 rounded-lg border border-brand/30 bg-brand-soft px-3 py-2.5">
              <Download className="size-4 shrink-0 text-brand" aria-hidden="true" />
              <p className="min-w-0 flex-[1_1_16rem] text-[0.8125rem] leading-relaxed text-ink">
                Downloaded <span className="font-medium break-all">{downloaded.file}</span>. Once Amazon has processed the upload, mark these{" "}
                {count(downloaded.ids.length)} as applied so they are not exported again.
              </p>
              <Button size="sm" icon={CheckCheck} onClick={() => void markApplied()} disabled={busy}>
                Mark {count(downloaded.ids.length)} as applied
              </Button>
            </div>
          ) : n ? (
            <p className="text-xs text-muted">
              Already uploaded these another way?{" "}
              <button type="button" className={cn(TEXT_LINK, "inline-flex min-h-8 items-center [@media(pointer:coarse)]:min-h-11")} onClick={() => void markApplied()} disabled={busy}>
                Mark all {count(n)} as applied
              </button>
            </p>
          ) : null}

          <div>
            <h3 className="flex items-center gap-1.5 text-[0.8125rem] font-semibold text-ink">
              <Upload className="size-3.5 text-muted" aria-hidden="true" />
              How to upload
            </h3>
            <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-[0.8125rem] leading-relaxed text-muted">
              <li>
                In Amazon Ads open <span className="font-medium text-ink">Sponsored ads → Bulk operations</span>.
              </li>
              <li>
                Under <span className="font-medium text-ink">Upload</span>, choose the .xlsx you downloaded (keep the sheet name “Sponsored
                Products Campaigns”).
              </li>
              <li>It usually processes in a few minutes. Refresh the page to see the status.</li>
              <li>
                Download the <span className="font-medium text-ink">results file</span> and check the Status / Errors columns — fix any row
                that failed and upload it again.
              </li>
              <li>Come back and mark the changes as applied, then import a fresh bulk file so new keywords get their IDs.</li>
            </ol>
          </div>
        </div>
      </section>

      <AppliedHistory store={store} recs={recs} decisions={decisions} busy={busy} onUnapply={onUnapply} />
    </div>
  );
}

function AppliedHistory({
  store,
  recs,
  decisions,
  busy,
  onUnapply,
}: {
  store: Store;
  recs: Recommendation[];
  decisions: Decision[];
  busy: boolean;
  onUnapply: (recIds: string[]) => Promise<void>;
}) {
  const uid = useId();
  const [open, setOpen] = useState(false);
  const groups = useMemo(() => appliedHistory(decisions), [decisions]);
  const byId = useMemo(() => new Map(recs.map((r) => [r.id, r] as const)), [recs]);
  if (!groups.length) return null;
  const total = groups.reduce((s, g) => s + g.decisions.length, 0);
  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-xl border border-hairline bg-surface">
      <h2 id={`${uid}-h`} className="m-0">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-body`}
          onClick={() => setOpen((o) => !o)}
          className="flex min-h-12 w-full items-center gap-2 px-4 py-3 text-left focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-5"
        >
          <History className="size-4 shrink-0 text-muted" aria-hidden="true" />
          <span className="font-display text-[0.9375rem] font-semibold text-ink">Applied history</span>
          <span className="text-xs text-muted">
            {plural(total, "change")} in {plural(groups.length, "upload")}
          </span>
          <ChevronDown className={cn("ml-auto size-4 text-muted transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
      </h2>
      <div id={`${uid}-body`} hidden={!open} className="border-t border-hairline">
        <ul className="divide-y divide-hairline">
          {groups.map((g) => (
            <li key={g.appliedAt} className="px-4 py-3 sm:px-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[0.8125rem] font-medium text-ink">
                  Marked applied {stamp(g.appliedAt)} · {plural(g.decisions.length, "change")}
                </p>
                <Button variant="ghost" size="sm" icon={RotateCcw} disabled={busy} onClick={() => void onUnapply(g.decisions.map((d) => d.recId))}>
                  Move back to Approved
                </Button>
              </div>
              <ul className="mt-1.5 space-y-0.5">
                {g.decisions.slice(0, 50).map((d) => {
                  const r = byId.get(d.recId);
                  const p = parseRecId(d.recId);
                  const action = (r?.action ?? p.action) as Recommendation["action"];
                  return (
                    <li key={d.recId} className="flex min-w-0 flex-wrap gap-x-2 text-xs text-muted">
                      <span className="font-medium text-ink">{ACTION_LABEL[action] ?? action}</span>
                      <span className="min-w-0 break-words text-ink">{r?.subject ?? p.subject}</span>
                      <span className="min-w-0 truncate">
                        {r ? `${r.campaign} / ${r.adGroup}` : `${p.campaign} / ${p.adGroup}`}
                        {d.editedBid !== undefined ? ` · bid ${money(d.editedBid, store.currency)}` : ""}
                      </span>
                    </li>
                  );
                })}
                {g.decisions.length > 50 ? <li className="text-xs text-muted">…and {count(g.decisions.length - 50)} more</li> : null}
              </ul>
            </li>
          ))}
        </ul>
        <p className="flex items-start gap-1.5 border-t border-hairline px-4 py-3 text-xs leading-relaxed text-muted sm:px-5">
          <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-warn" aria-hidden="true" />
          Applied changes stay out of future exports while the suggestion is the same one. A bid or pause change comes back for review once a
          fresh bulk file shows a different bid, or after {REVIEW_AFTER_DAYS} more days of data. Import a fresh bulk file after each upload so
          the new keywords and negatives are recognised.
        </p>
      </div>
    </section>
  );
}
