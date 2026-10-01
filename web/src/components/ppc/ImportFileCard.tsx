"use client";

import {
  ArrowRight,
  CircleCheck,
  Download,
  FileSpreadsheet,
  FileText,
  FileX,
  LoaderCircle,
  Sprout,
  X,
} from "lucide-react";
import { useEffect, useRef } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Progress } from "@/components/ui/Progress";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { downloadCsv } from "@/components/calc/csv";
import { DEFAULT_RULES, type BulkEntity, type ReportKind, type SearchTermRow, type Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { bytes, count, dateSpan, localStamp, money, plural, spanDays } from "./format";
import { NewStoreFields, type NewStoreDraft } from "./NewStoreFields";
import { StoreDot } from "./StoreDot";
import { fieldLabel, type UploadAnalysis, type UploadStage } from "./upload";

export const NEW_STORE = "__new__";

export type FilePhase = "analyzing" | "ready" | "invalid" | "importing" | "done" | "failed";

export interface ImportOutcome {
  storeId: string;
  storeName: string;
  kind: ReportKind;
  inserted: number;
  updated: number;
  skipped: number;
  replaced?: number;
  dateFrom?: string;
  dateTo?: string;
  createdStore: boolean;
}

export interface FileItem {
  id: string;
  file: File;
  phase: FilePhase;
  stage?: UploadStage;
  analysis?: UploadAnalysis;
  /** Store id or NEW_STORE; undefined = the suggested default. */
  target?: string;
  draft?: NewStoreDraft;
  draftErrors?: { name?: string; currency?: string };
  targetError?: string;
  progress?: { done: number; total: number };
  outcome?: ImportOutcome;
  error?: string;
}

const KIND_LABEL: Record<ReportKind, string> = {
  "search-term": "Search Term Report",
  bulk: "Bulk file",
};

const STAGE_LABEL: Record<UploadStage, string> = {
  reading: "Reading the file…",
  parsing: "Parsing rows…",
  converting: "Mapping columns and checking rows…",
};

export interface ImportFileCardProps {
  item: FileItem;
  stores: Store[];
  storesReady: boolean;
  target: string;
  draft: NewStoreDraft;
  /** Bulk entities currently stored for the selected store (bulk files only). */
  currentBulk?: number;
  onTargetChange: (target: string) => void;
  onDraftChange: (draft: NewStoreDraft) => void;
  onImport: () => void;
  onRemove: () => void;
  onOpenStore: (storeId: string) => void;
  /** "Import all" is running and will reach this file: its own Import button waits. */
  queued?: boolean;
}

export function ImportFileCard({
  item,
  stores,
  storesReady,
  target,
  draft,
  currentBulk,
  onTargetChange,
  onDraftChange,
  onImport,
  onRemove,
  onOpenStore,
  queued = false,
}: ImportFileCardProps) {
  const a = item.analysis;
  const headingId = `file-${item.id}-name`;
  const isXlsx = a?.format === "xlsx" || /\.xlsx$/i.test(item.file.name);
  const FileIcon = item.phase === "invalid" ? FileX : isXlsx ? FileSpreadsheet : FileText;
  const selectedStore = stores.find((s) => s.id === target);
  const busy = item.phase === "analyzing" || item.phase === "importing";

  // The Import button turns into a progress bar, then into the outcome: keep
  // keyboard / screen-reader focus on this card instead of losing it to <body>.
  const articleRef = useRef<HTMLElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const active = document.activeElement;
    const lost = !active || active === document.body;
    const ours = !!active && !!articleRef.current?.contains(active);
    if (item.phase === "importing" && lost) headingRef.current?.focus();
    else if (item.phase === "done" && (lost || ours)) outcomeRef.current?.focus();
  }, [item.phase]);

  return (
    <article
      ref={articleRef}
      aria-labelledby={headingId}
      aria-busy={busy || undefined}
      className={cn(
        "min-w-0 rounded-xl border bg-surface",
        item.phase === "invalid" || item.phase === "failed" ? "border-bad/30" : item.phase === "done" ? "border-good/30" : "border-hairline",
      )}
    >
      {/* ------------------------------------------------------------ header */}
      <header className="flex items-start gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <span
          className={cn(
            "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg",
            item.phase === "invalid" || item.phase === "failed" ? "bg-bad-soft text-bad" : "bg-surface-2 text-muted",
          )}
        >
          {busy ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          ) : (
            <FileIcon className="size-4" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <h3
            id={headingId}
            ref={headingRef}
            tabIndex={-1}
            className="truncate font-display text-[0.9375rem] font-semibold text-ink focus:outline-none"
            title={item.file.name}
          >
            {item.file.name}
          </h3>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="tabular text-xs text-faint">
              {bytes(item.file.size)}
              {a?.format ? ` · ${a.format.toUpperCase()}` : ""}
            </span>
            {a?.kind ? (
              <Badge tone={a.importable ? "brand" : "warn"} size="sm">
                {KIND_LABEL[a.kind]}
              </Badge>
            ) : item.phase === "invalid" ? (
              <Badge tone="bad" size="sm">
                Unrecognised
              </Badge>
            ) : null}
            {a?.kind === "search-term" && a.attributionDays ? (
              <Badge tone="neutral" variant="outline" size="sm">
                {a.attributionDays}-day attribution{a.attributionDays === 7 ? " (SP)" : a.attributionDays === 14 ? " (SB)" : ""}
              </Badge>
            ) : null}
            {a?.kind === "search-term" && a.importable ? (
              <Badge tone={a.summaryRows ? "warn" : "neutral"} variant="outline" size="sm">
                {a.summaryRows ? "Summary rows" : "Daily"}
              </Badge>
            ) : null}
            {a?.sheet ? (
              <Badge tone="neutral" variant="outline" size="sm" title={`Sheet: ${a.sheet}`}>
                Sheet: {a.sheet}
              </Badge>
            ) : null}
          </div>
        </div>
        {item.phase !== "importing" ? (
          <Button
            variant="ghost"
            size="sm"
            icon={X}
            onClick={onRemove}
            aria-label={`Remove ${item.file.name} from the list`}
            className="-mr-2 min-w-9 shrink-0 px-2 [@media(pointer:coarse)]:min-w-11"
          >
            <span className="sr-only">Remove</span>
          </Button>
        ) : null}
      </header>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {item.phase === "analyzing" ? (
          <div className="space-y-3" role="status">
            <p className="text-sm text-muted">{STAGE_LABEL[item.stage ?? "reading"]}</p>
            <Skeleton className="h-16 w-full" />
          </div>
        ) : null}

        {item.phase === "failed" && !a ? (
          <Callout variant="danger" title="Could not read this file">
            <p>{item.error}</p>
          </Callout>
        ) : null}

        {a ? <AnalysisBody a={a} storeCurrency={selectedStore?.currency} /> : null}

        {/* -------------------------------------------------------- outcome */}
        {item.phase === "done" && item.outcome ? (
          <div ref={outcomeRef} tabIndex={-1} className="rounded-lg focus:outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand">
            <Outcome outcome={item.outcome} stores={stores} onOpenStore={onOpenStore} />
          </div>
        ) : null}

        {item.phase === "failed" && a ? (
          <Callout variant="danger" title="Import failed">
            <p>{item.error}</p>
            <p>Rows written before the failure are listed in the import history and can be deleted there.</p>
          </Callout>
        ) : null}
      </div>

      {/* ------------------------------------------------------ store + import */}
      {a?.importable && (item.phase === "ready" || item.phase === "importing" || item.phase === "failed") ? (
        <footer className="space-y-4 border-t border-hairline bg-canvas px-4 py-4 sm:px-5">
          {!storesReady ? (
            <Skeleton className="h-11 w-full max-w-sm" />
          ) : (
            <>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <Select
                  id={`file-${item.id}-store`}
                  label="Import into"
                  value={target}
                  placeholder="Choose a store…"
                  disabled={item.phase === "importing"}
                  error={item.targetError}
                  options={[
                    ...stores.map((s) => ({ value: s.id, label: `${s.name} (${s.marketplace} · ${s.currency})` })),
                    { value: NEW_STORE, label: "+ New store…" },
                  ]}
                  onChange={(e) => onTargetChange(e.target.value)}
                  fieldClassName="min-w-0 sm:max-w-sm sm:flex-1"
                />
                {selectedStore ? (
                  <p className="flex items-center gap-2 pb-3 text-xs text-muted">
                    <StoreDot colorIndex={selectedStore.colorIndex} />
                    <span className="truncate">
                      {selectedStore.marketplace} · {selectedStore.currency}
                      {selectedStore.demo ? " · demo store" : ""}
                    </span>
                  </p>
                ) : null}
              </div>

              {target === NEW_STORE ? (
                <div className="rounded-lg border border-hairline bg-surface p-4">
                  <p className="mb-3 text-[0.8125rem] font-medium text-ink">New store</p>
                  <NewStoreFields
                    idPrefix={`file-${item.id}-new`}
                    draft={draft}
                    onChange={onDraftChange}
                    errors={item.draftErrors}
                    extraCurrency={a.suggestion.currency}
                  />
                  <p className="mt-3 text-xs text-faint">
                    Rules start from the toolkit defaults (30% target ACoS, 32% break-even). Tune them in Stores.
                  </p>
                </div>
              ) : null}

              <Warnings a={a} store={target === NEW_STORE ? undefined : selectedStore} draft={target === NEW_STORE ? draft : undefined} currentBulk={currentBulk} />

              {item.phase === "importing" && item.progress ? (
                <Progress
                  value={item.progress.done}
                  max={Math.max(1, item.progress.total)}
                  label={a.kind === "bulk" ? "Writing bulk entities" : "Writing rows"}
                  readout={`${count(item.progress.done)} / ${count(item.progress.total)}`}
                />
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <Button onClick={onImport} disabled={item.phase === "importing" || (queued && item.phase === "ready")}>
                    {queued && item.phase === "ready" ? "Queued…" : importLabel(a)}
                  </Button>
                  {a.errors.length ? (
                    <p className="text-xs text-muted">{plural(a.errors.length, "row")} with problems will be skipped.</p>
                  ) : null}
                </div>
              )}
            </>
          )}
        </footer>
      ) : null}
    </article>
  );
}

function importLabel(a: UploadAnalysis): string {
  if (a.kind === "bulk") return `Import ${plural(a.entities.length, "bulk entity", "bulk entities")}`;
  return `Import ${plural(a.rows.length, "row")}`;
}

/* -------------------------------------------------------------- analysis */

function AnalysisBody({ a, storeCurrency }: { a: UploadAnalysis; storeCurrency?: string }) {
  if (!a.kind || (a.fatal && !a.missing.length && !a.importable && !a.errors.length)) {
    return (
      <div className="space-y-3">
        <Callout variant="danger" title={a.kind ? "Nothing to import" : "Not a Search Term Report or bulk file"}>
          <p>{a.fatal}</p>
        </Callout>
        {a.sheets.length > 1 ? <SheetList a={a} /> : null}
      </div>
    );
  }

  if (a.missing.length) {
    return (
      <div className="space-y-3">
        <Callout variant="danger" title={`Looks like a ${KIND_LABEL[a.kind].toLowerCase()}, but required columns are missing`}>
          <p>Missing: {a.missing.map(fieldLabel).join(", ")}.</p>
          <p>
            Re-download the report from Amazon without removing columns. Found {plural(a.columnMap.length, "recognised column")}
            {a.columnMap.length ? `: ${a.columnMap.map((c) => c.header).join(", ")}` : ""}.
          </p>
        </Callout>
        {a.sheets.length > 1 ? <SheetList a={a} /> : null}
      </div>
    );
  }

  const rowTotal = a.fullCounts?.rows ?? a.rows.length;
  const unique = a.kind === "bulk" ? (a.fullCounts?.entities ?? a.entities.length) : rowTotal;
  const merged = a.kind === "search-term" ? Math.max(0, a.dataRows - rowTotal - a.errors.length) : 0;
  const days = spanDays(a.dateFrom, a.dateTo);

  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
        <Stat label="Data lines" value={count(a.dataRows)} />
        <Stat
          label={a.kind === "bulk" ? "SP entities" : "Rows to import"}
          value={count(unique)}
          hint={merged > 0 ? `${count(merged)} duplicate lines merged` : undefined}
        />
        {a.kind === "search-term" ? (
          <>
            <Stat label="Date span" value={dateSpan(a.dateFrom, a.dateTo)} hint={days ? plural(days, "day") : undefined} />
            <Stat
              label="Currency"
              value={a.currencies.length ? a.currencies.join(", ") : (a.suggestion.currency ?? "Not in file")}
              hint={a.suggestion.country ? `Marketplace ${a.suggestion.country}${a.suggestion.countryInferred ? " (from currency)" : ""}` : undefined}
            />
          </>
        ) : (
          <>
            <Stat label="Keywords" value={count((a.entityCounts.Keyword ?? 0) + (a.entityCounts["Product Targeting"] ?? 0))} hint="Keywords + product targets" />
            <Stat label="Campaigns" value={count(a.entityCounts.Campaign ?? 0)} hint={`${count(a.entityCounts["Ad Group"] ?? 0)} ad groups`} />
          </>
        )}
      </dl>

      {a.kind === "search-term" && a.rows.length ? <SearchTermPreview rows={a.rows.slice(0, 5)} fallbackCurrency={storeCurrency} /> : null}
      {a.kind === "bulk" && a.entities.length ? <BulkPreview entities={a.entities.slice(0, 5)} /> : null}

      {a.errors.length ? <ErrorList a={a} /> : null}

      <details className="group rounded-lg border border-hairline bg-canvas">
        <summary className="flex min-h-11 cursor-pointer list-none items-center px-3 text-[0.8125rem] font-medium text-muted hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
          <span className="mr-2 text-faint transition-transform group-open:rotate-90" aria-hidden="true">
            ›
          </span>
          How the columns were read
        </summary>
        <div className="space-y-2 border-t border-hairline px-3 py-3 text-xs text-muted">
          <ul className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {a.columnMap.map((c) => (
              <li key={c.field} className="flex min-w-0 gap-2">
                <span className="w-32 shrink-0 text-faint">{fieldLabel(c.field)}</span>
                <span className="truncate text-ink" title={c.header}>
                  {c.header}
                </span>
              </li>
            ))}
          </ul>
          <p>
            {a.dateOrder ? `Dates read as ${a.dateOrder === "DMY" ? "day/month/year" : "month/day/year"}. ` : ""}
            {a.numberStyle === "eu" ? "Numbers use a decimal comma. " : ""}
            {a.missingOptional.length ? `Not in the file (treated as blank or 0): ${a.missingOptional.map(fieldLabel).join(", ")}. ` : ""}
            Parsed in {Math.max(1, Math.round(a.parseMs))} ms.
          </p>
          {a.sheets.length > 1 ? <SheetList a={a} /> : null}
        </div>
      </details>
    </div>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">{label}</dt>
      <dd className="tabular mt-0.5 text-sm font-semibold break-words text-ink">
        {value}
      </dd>
      {hint ? <dd className="text-xs text-faint">{hint}</dd> : null}
    </div>
  );
}

function SheetList({ a }: { a: UploadAnalysis }) {
  return (
    <ul className="space-y-1 text-xs text-muted">
      {a.sheets.map((s, i) => (
        <li key={`${s.name}-${i}`}>
          <span className="font-medium text-ink">{s.name ?? "Sheet"}</span>
          {" — "}
          {s.used ? "used" : s.kind ? `${KIND_LABEL[s.kind]} (not used)` : "not a report"}
        </li>
      ))}
    </ul>
  );
}

function SearchTermPreview({ rows, fallbackCurrency }: { rows: SearchTermRow[]; fallbackCurrency?: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">First {rows.length} rows, as the console will store them</p>
      <Table caption="Preview of mapped search term rows" wrapperClassName="relative text-xs">
        <THead>
          <tr>
            <TH>Date</TH>
            <TH>Campaign</TH>
            <TH>Ad group</TH>
            <TH>Targeting</TH>
            <TH>Match</TH>
            <TH>Search term</TH>
            <TH numeric>Impr.</TH>
            <TH numeric>Clicks</TH>
            <TH numeric>Spend</TH>
            <TH numeric>Orders</TH>
            <TH numeric>Sales</TH>
          </tr>
        </THead>
        <TBody>
          {rows.map((r) => {
            const cur = r.currency ?? fallbackCurrency ?? "USD";
            return (
              <TR key={r.key}>
                <TD mono className="whitespace-nowrap">
                  {r.date}
                  {r.endDate ? ` → ${r.endDate}` : ""}
                </TD>
                <TD className="max-w-[12rem] truncate" title={r.campaign}>
                  {r.campaign}
                </TD>
                <TD className="max-w-[10rem] truncate" title={r.adGroup}>
                  {r.adGroup}
                </TD>
                <TD className="max-w-[10rem] truncate" title={r.targeting}>
                  {r.targeting || "—"}
                </TD>
                <TD className="whitespace-nowrap">{r.matchType}</TD>
                <TD className="max-w-[14rem] truncate font-medium" title={r.searchTerm}>
                  {r.searchTerm}
                </TD>
                <TD numeric mono>
                  {count(r.impressions)}
                </TD>
                <TD numeric mono>
                  {count(r.clicks)}
                </TD>
                <TD numeric mono className="whitespace-nowrap">
                  {money(r.spend, cur)}
                </TD>
                <TD numeric mono>
                  {count(r.orders)}
                </TD>
                <TD numeric mono className="whitespace-nowrap">
                  {money(r.sales, cur)}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>
    </div>
  );
}

function BulkPreview({ entities }: { entities: BulkEntity[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">First {entities.length} Sponsored Products rows</p>
      <Table caption="Preview of mapped bulk entities" wrapperClassName="relative text-xs">
        <THead>
          <tr>
            <TH>Entity</TH>
            <TH>Campaign</TH>
            <TH>Ad group</TH>
            <TH>Keyword / target</TH>
            <TH>Match</TH>
            <TH>State</TH>
            <TH numeric>Bid / budget</TH>
            <TH>ID</TH>
          </tr>
        </THead>
        <TBody>
          {entities.map((e) => (
            <TR key={e.key}>
              <TD className="whitespace-nowrap">{e.entity}</TD>
              <TD className="max-w-[12rem] truncate" title={e.campaignName}>
                {e.campaignName || "—"}
              </TD>
              <TD className="max-w-[10rem] truncate" title={e.adGroupName}>
                {e.adGroupName || "—"}
              </TD>
              <TD className="max-w-[12rem] truncate" title={e.keywordText ?? e.expression ?? e.asin}>
                {e.keywordText ?? e.expression ?? e.asin ?? e.sku ?? "—"}
              </TD>
              <TD className="whitespace-nowrap">{e.matchType ?? "—"}</TD>
              <TD className="whitespace-nowrap">{e.state ?? "—"}</TD>
              <TD numeric mono>
                {e.bid ?? e.defaultBid ?? e.dailyBudget ?? "—"}
              </TD>
              <TD mono className="whitespace-nowrap text-faint">
                {e.keywordId ?? e.productTargetingId ?? e.adId ?? e.adGroupId ?? e.campaignId}
              </TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}

function ErrorList({ a }: { a: UploadAnalysis }) {
  const shown = a.errors.slice(0, 20);
  const capped = a.errors.length >= 200;
  return (
    <div className="rounded-lg border border-warn/35 bg-warn-soft p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[0.8125rem] font-semibold text-ink">
          {plural(a.errors.length, "row")} could not be read{capped ? " (first 200 kept)" : ""}
        </p>
        <Button
          variant="secondary"
          size="sm"
          icon={Download}
          onClick={() =>
            downloadCsv(`${a.name.replace(/\.[^.]+$/, "")}-problems-${localStamp()}.csv`, [
              ["Row", "Problem"],
              ...a.errors.map((e) => [e.row, e.message]),
            ])
          }
        >
          Download all as CSV
        </Button>
      </div>
      <ul className="mt-2 max-h-48 space-y-1 overflow-y-auto text-xs text-ink">
        {shown.map((e, i) => (
          <li key={`${e.row}-${i}`} className="flex gap-2">
            <span className="tabular w-14 shrink-0 text-muted">{e.row > 0 ? `Row ${e.row}` : "File"}</span>
            <span className="min-w-0">{e.message}</span>
          </li>
        ))}
      </ul>
      {a.errors.length > shown.length ? (
        <p className="mt-2 text-xs text-muted">Showing the first 20. The CSV has all of them.</p>
      ) : null}
    </div>
  );
}

function Warnings({
  a,
  store,
  draft,
  currentBulk,
}: {
  a: UploadAnalysis;
  store?: Store;
  draft?: NewStoreDraft;
  currentBulk?: number;
}) {
  const notes: { tone: "warn" | "info"; text: string }[] = [];
  if (store?.demo) {
    notes.push({
      tone: "warn",
      text: `${store.name} is a demo store. Your rows would be mixed with made-up demo data, and Reload demo or Remove demo deletes everything in it, this import included. Pick one of your own stores or + New store.`,
    });
  }
  const targetCurrency = store?.currency ?? draft?.currency;
  const fileCurrency = a.currencies[0] ?? a.suggestion.currency;
  if (a.kind === "search-term" && fileCurrency && targetCurrency && fileCurrency !== targetCurrency) {
    notes.push({
      tone: "warn",
      text: `This report is in ${fileCurrency} but the store uses ${targetCurrency}. Amounts are stored as they are, not converted — pick the matching store.`,
    });
  }
  if (a.kind === "search-term" && a.summaryRows) {
    notes.push({
      tone: "warn",
      text: `${plural(a.summaryRows, "row")} cover a period rather than one day (a Summary report). They count in full whenever the period overlaps a window. Days already covered by daily rows, or by a newer overlapping summary, are not counted twice. Re-download with the Daily time unit for sharper windows.`,
    });
  }
  const days = spanDays(a.dateFrom, a.dateTo);
  // New stores start from the defaults; existing ones use their own window.
  const { lookbackDays, lagDays } = store?.rules ?? DEFAULT_RULES;
  const needed = lookbackDays + lagDays;
  if (a.kind === "search-term" && days > 0 && days < needed) {
    notes.push({
      tone: "info",
      text: `Only ${plural(days, "day")} of data. Recommendations for this store use the last ${plural(lookbackDays, "day")}${
        lagDays ? ` after skipping the newest ${lagDays}` : ""
      }, so ${needed}+ days (${lookbackDays * 2} is ideal) gives complete results.`,
    });
  }
  if (a.kind === "bulk" && store && (currentBulk ?? 0) > 0) {
    notes.push({
      tone: "info",
      text: `Latest bulk file wins: this replaces the ${count(currentBulk ?? 0)} bulk entities currently stored for ${store.name}.`,
    });
  }
  if (!notes.length) return null;
  return (
    <div className="space-y-2">
      {notes.map((n) => (
        <Callout key={n.text} variant={n.tone}>
          <p>{n.text}</p>
        </Callout>
      ))}
    </div>
  );
}

function Outcome({
  outcome,
  stores,
  onOpenStore,
}: {
  outcome: ImportOutcome;
  stores: Store[];
  onOpenStore: (storeId: string) => void;
}) {
  const store = stores.find((s) => s.id === outcome.storeId);
  const nothingNew = outcome.inserted === 0 && outcome.updated === 0;
  return (
    <div className="rounded-lg border border-good/30 bg-good-soft p-4">
      <p className="flex items-start gap-2 text-sm font-semibold text-ink">
        <CircleCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden="true" />
        <span className="min-w-0">
          {outcome.kind === "bulk"
            ? `Bulk file stored for ${outcome.storeName}${outcome.createdStore ? " (new store)" : ""}.`
            : nothingNew
              ? `Already up to date in ${outcome.storeName}: nothing new in this file.`
              : `Imported into ${outcome.storeName}${outcome.createdStore ? " (new store)" : ""}.`}
        </span>
      </p>
      <p className="tabular mt-2 text-sm text-ink">
        {outcome.kind === "bulk" ? (
          <>
            {count(outcome.inserted)} entities saved
            {outcome.replaced ? ` · ${count(outcome.replaced)} from the previous bulk file replaced` : ""}
          </>
        ) : (
          <>
            <strong>{count(outcome.inserted)}</strong> new · <strong>{count(outcome.updated)}</strong> updated ·{" "}
            <strong>{count(outcome.skipped)}</strong> unchanged
            {outcome.dateFrom ? <span className="text-muted"> · {dateSpan(outcome.dateFrom, outcome.dateTo)}</span> : null}
          </>
        )}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <ButtonLink
          href="/dashboard"
          size="sm"
          variant="secondary"
          iconAfter={ArrowRight}
          onClick={() => onOpenStore(outcome.storeId)}
        >
          {store ? `Open ${store.name}` : "Open overview"}
        </ButtonLink>
        <ButtonLink href="/dashboard/keywords" size="sm" variant="secondary" icon={Sprout} onClick={() => onOpenStore(outcome.storeId)}>
          Review keywords
        </ButtonLink>
      </div>
    </div>
  );
}
