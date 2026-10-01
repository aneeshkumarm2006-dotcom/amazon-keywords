"use client";

import { CloudUpload, FileUp, ListChecks, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";

import { Button } from "@/components/ui/Button";
import {
  getStore,
  importBulk,
  importRows,
  listStores,
  saveStore,
  type ImportBatch,
  type Store,
} from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { ConsolePageHeader } from "./ConsolePageHeader";
import { count, newId, plural } from "./format";
import { ALL_STORES, useActiveScope, useBulk, useStoreCounts, type Scope } from "./hooks";
import { ImportFileCard, NEW_STORE, type FileItem } from "./ImportFileCard";
import { ImportHistory } from "./ImportHistory";
import { draftFromHint, storeFromDraft, validateDraft, type NewStoreDraft } from "./NewStoreFields";
import { analyzeFile } from "./parseClient";
import { ReportHelp } from "./ReportHelp";
import type { UploadAnalysis } from "./upload";

const ACCEPT = ".csv,.tsv,.txt,.xlsx,.xls,text/csv,text/tab-separated-values,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const ALLOWED = /\.(csv|tsv|txt|xlsx|xls)$/i;

type CampaignIndex = Map<string, { ids: Set<string>; names: Set<string> }>;

/** Share of the file's campaigns (by ID, else by name) that a store's latest bulk file already has. */
function campaignOverlap(a: UploadAnalysis, known: { ids: Set<string>; names: Set<string> } | undefined): number {
  if (!known) return 0;
  const { ids, names } = a.campaigns;
  if (ids.length && known.ids.size) return ids.filter((id) => known.ids.has(id)).length / ids.length;
  if (names.length && known.names.size) return names.filter((n) => known.names.has(n)).length / names.length;
  return 0;
}

/**
 * The store a file should go to unless the user picks another:
 * 1. among stores with the file's currency (+ marketplace) — or all stores
 *    for a bulk file, which has no currency — the one whose bulk file already
 *    holds most of the file's campaigns (≥ 30%, clear winner);
 * 2. else the only currency match, or the active store when it matches;
 * 3. a new store when no store uses the file's currency;
 * 4. otherwise "" — the user must choose (never guess between two stores).
 * Demo stores are never suggested: "Reload / Remove demo" deletes everything
 * in them, real imports included.
 */
function defaultTarget(a: UploadAnalysis | undefined, allStores: Store[], scope: Scope, index: CampaignIndex): string {
  const stores = allStores.filter((s) => !s.demo);
  if (!stores.length) return NEW_STORE;
  const inScope = scope !== ALL_STORES && stores.some((s) => s.id === scope) ? scope : undefined;
  const cur = a?.kind === "search-term" ? (a.currencies[0] ?? a.suggestion.currency) : undefined;
  let candidates = stores;
  if (cur) {
    candidates = stores.filter((s) => s.currency === cur);
    const country = a?.suggestion.country;
    if (country && candidates.some((s) => s.marketplace === country)) candidates = candidates.filter((s) => s.marketplace === country);
    if (!candidates.length) return NEW_STORE;
  }
  if (a && candidates.length > 1) {
    const scored = candidates
      .map((s) => ({ id: s.id, score: campaignOverlap(a, index.get(s.id)) }))
      .sort((x, y) => y.score - x.score);
    if (scored[0].score >= 0.3 && scored[0].score > scored[1].score) return scored[0].id;
  }
  if (candidates.length === 1) {
    // A bulk file matched against a single store still needs some evidence
    // when other stores exist — otherwise ask.
    if (cur || stores.length === 1 || !a || campaignOverlap(a, index.get(candidates[0].id)) >= 0.3) return candidates[0].id;
  }
  if (inScope && candidates.some((s) => s.id === inScope) && (cur || stores.length === 1)) return inScope;
  return "";
}

function stripHeavy(a: UploadAnalysis): UploadAnalysis {
  // Keep the preview rows only; the full arrays can be 100k records.
  // The card's counts still describe the whole file.
  const fullCounts = a.fullCounts ?? { rows: a.rows.length, entities: a.entities.length };
  return { ...a, rows: a.rows.slice(0, 5), entities: a.entities.slice(0, 5), fullCounts };
}

export function ImportConsole() {
  const { scope, ready, stores, setScope } = useActiveScope();
  const { bulk: allBulk } = useBulk(ready ? ALL_STORES : null);
  const campaignIndex = useMemo(() => {
    const index: CampaignIndex = new Map();
    for (const e of allBulk) {
      let entry = index.get(e.storeId);
      if (!entry) {
        entry = { ids: new Set(), names: new Set() };
        index.set(e.storeId, entry);
      }
      entry.ids.add(e.campaignId);
      const n = e.campaignName.replace(/\s+/g, " ").trim().toLowerCase();
      if (n) entry.names.add(n);
    }
    return index;
  }, [allBulk]);
  const [items, setItems] = useState<FileItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [announce, setAnnounce] = useState("");
  const [bulkRunning, setBulkRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // What an import reads when it starts. "Import all" runs for a while, so it
  // must see the files, store choices and stores as they are now, not as they
  // were when the button was pressed.
  const latest = useRef({ items, stores, scope, campaignIndex });
  useEffect(() => {
    latest.current = { items, stores, scope, campaignIndex };
  }, [items, stores, scope, campaignIndex]);
  /** Files being imported, or imported: never twice (per-file Import during "Import all"). */
  const claimed = useRef(new Set<string>());

  const update = (id: string, patch: Partial<FileItem>) =>
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, ...patch } : it)));

  const targetOf = (it: FileItem) => it.target ?? defaultTarget(it.analysis, stores, scope, campaignIndex);
  const draftOf = (it: FileItem): NewStoreDraft => it.draft ?? draftFromHint(it.analysis?.suggestion);

  /* ------------------------------------------------------------ parsing */

  const addFiles = async (list: FileList | File[]) => {
    const files = Array.from(list);
    if (!files.length) return;
    const fresh: FileItem[] = files.map((file) =>
      ALLOWED.test(file.name)
        ? { id: newId("file"), file, phase: "analyzing", stage: "reading" }
        : {
            id: newId("file"),
            file,
            phase: "failed",
            error: `“${file.name.split(".").pop()}” files are not supported. Use a .csv, .tsv, .txt or .xlsx export from Amazon.`,
          },
    );
    setItems((prev) => [...fresh, ...prev]);
    // One at a time: a 100k-row file already keeps the worker busy.
    for (const it of fresh) {
      if (it.phase !== "analyzing") continue;
      try {
        const analysis = await analyzeFile(it.file, (stage) => update(it.id, { stage }));
        update(it.id, { analysis, phase: analysis.importable ? "ready" : "invalid" });
        setAnnounce(
          analysis.importable
            ? `${it.file.name}: ${analysis.kind === "bulk" ? "bulk file" : "search term report"}, ${
                analysis.kind === "bulk" ? plural(analysis.entities.length, "entity", "entities") : plural(analysis.rows.length, "row")
              } ready to import.`
            : `${it.file.name} could not be imported.`,
        );
      } catch (err) {
        update(it.id, { phase: "failed", error: err instanceof Error ? err.message : String(err) });
      }
    }
  };

  const onInput = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    event.target.value = "";
    void addFiles(files);
  };

  const onDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!Array.from(event.dataTransfer.types).includes("Files")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (!dragging) setDragging(true);
  };

  const onDragLeave = (event: DragEvent<HTMLDivElement>) => {
    if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
    setDragging(false);
  };

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  /* ------------------------------------------------------------ importing */

  /** Import one file as it is now; skipped when it was removed, is no longer ready, or is already being imported. */
  const runImport = async (id: string) => {
    const now = latest.current;
    const it = now.items.find((x) => x.id === id);
    if (!it || claimed.current.has(id) || (it.phase !== "ready" && it.phase !== "failed")) return;
    claimed.current.add(id);
    let imported = false;
    try {
      imported = await importItem(it, now);
    } finally {
      if (!imported) claimed.current.delete(id);
    }
  };

  /** True when the file was written. */
  const importItem = async (it: FileItem, now: typeof latest.current): Promise<boolean> => {
    const a = it.analysis;
    if (!a || !a.importable || !a.kind) return false;
    const target = it.target ?? defaultTarget(a, now.stores, now.scope, now.campaignIndex);
    if (!target) {
      update(it.id, { targetError: "Choose which store this file belongs to." });
      return false;
    }
    let store: Store | undefined;
    let createdStore = false;
    try {
      if (target === NEW_STORE) {
        const draft = draftOf(it);
        const errors = validateDraft(draft);
        if (errors.name || errors.currency) {
          update(it.id, { draftErrors: errors, draft });
          return false;
        }
        const existing = await listStores();
        const name = draft.name.trim().toLowerCase();
        // Two files set to the same new store (or a retry) reuse it instead of duplicating.
        store = existing.find(
          (s) => s.name.trim().toLowerCase() === name && s.marketplace === draft.marketplace && s.currency === draft.currency.toUpperCase(),
        );
        if (!store) {
          store = storeFromDraft(draft, existing);
          await saveStore(store);
          createdStore = true;
        }
      } else {
        store = now.stores.find((s) => s.id === target) ?? (await getStore(target));
      }
      if (!store) {
        update(it.id, { targetError: "That store no longer exists. Choose another." });
        return false;
      }
    } catch (err) {
      update(it.id, { phase: "failed", error: err instanceof Error ? err.message : String(err) });
      return false;
    }

    const total = a.kind === "bulk" ? a.entities.length : a.rows.length;
    update(it.id, {
      phase: "importing",
      target: store.id,
      targetError: undefined,
      draftErrors: undefined,
      progress: { done: 0, total },
      error: undefined,
    });
    const batch: ImportBatch = {
      id: newId("batch"),
      storeId: store.id,
      kind: a.kind,
      fileName: a.name,
      importedAt: new Date().toISOString(),
      rowCount: a.dataRows,
      inserted: 0,
      updated: 0,
      skipped: 0,
      dateFrom: a.dateFrom,
      dateTo: a.dateTo,
      errors: a.errors,
      ...(a.attributionDays ? { attributionDays: a.attributionDays } : {}),
    };
    const onProgress = (done: number, all: number) => update(it.id, { progress: { done, total: all } });
    try {
      const res =
        a.kind === "bulk"
          ? await importBulk(store.id, batch, a.entities, onProgress)
          : await importRows(store.id, batch, a.rows, onProgress);
      update(it.id, {
        phase: "done",
        analysis: stripHeavy(a),
        progress: undefined,
        outcome: {
          storeId: store.id,
          storeName: store.name,
          kind: a.kind,
          inserted: res.inserted,
          updated: res.updated,
          skipped: res.skipped,
          replaced: res.replaced,
          dateFrom: res.batch.dateFrom,
          dateTo: res.batch.dateTo,
          createdStore,
        },
      });
      setAnnounce(
        a.kind === "bulk"
          ? `Bulk file stored for ${store.name}.`
          : `Imported into ${store.name}: ${count(res.inserted)} new, ${count(res.updated)} updated, ${count(res.skipped)} unchanged.`,
      );
      return true;
    } catch (err) {
      update(it.id, { phase: "failed", progress: undefined, error: err instanceof Error ? err.message : String(err) });
      setAnnounce(`Import of ${it.file.name} failed.`);
      return false;
    }
  };

  const readyItems = items.filter((it) => it.phase === "ready" && it.analysis?.importable);
  const importAll = async () => {
    setBulkRunning(true);
    try {
      // By id: runImport re-reads each file when its turn comes.
      for (const id of readyItems.map((it) => it.id)) await runImport(id);
    } finally {
      setBulkRunning(false);
    }
  };
  const finished = items.filter((it) => it.phase === "done" || it.phase === "invalid" || it.phase === "failed");

  return (
    <div className="space-y-8">
      <ConsolePageHeader
        title="Import reports"
        description={
          <p>
            Drop Search Term Reports and bulk files straight from Amazon. Files are read in this browser — the console detects the
            report, shows what it found, and only writes when you press Import. Re-importing an overlapping report is safe: rows
            already stored are left alone and changed ones are updated, and overlapping Daily and Summary reports are never added
            together — daily rows win for the days they cover, and a newer summary period replaces an older one it overlaps.
          </p>
        }
      />

      <p aria-live="polite" className="sr-only">
        {announce}
      </p>

      {/* ------------------------------------------------------------ dropzone */}
      <div
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed px-5 py-10 text-center transition-colors duration-150",
          dragging ? "border-brand bg-brand-soft" : "border-hairline-strong bg-surface",
        )}
      >
        <span className={cn("flex size-12 items-center justify-center rounded-xl", dragging ? "bg-surface" : "bg-surface-2")}>
          <CloudUpload className={cn("size-6", dragging ? "text-brand" : "text-faint")} aria-hidden="true" />
        </span>
        <div className="max-w-md space-y-1">
          <p className="font-display text-base font-semibold text-ink">
            {dragging ? "Drop to read the files" : "Drop reports here, or choose them"}
          </p>
          <p className="text-sm text-muted">
            Search Term Reports and bulk files · .csv, .tsv, .txt or .xlsx · several at once. Nothing leaves this browser.
          </p>
        </div>
        <Button icon={FileUp} onClick={() => inputRef.current?.click()}>
          Choose files
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPT}
          onChange={onInput}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* ------------------------------------------------------------ files */}
      {items.length ? (
        <section aria-labelledby="files-heading" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 id="files-heading" className="font-display text-lg font-semibold text-ink">
              Files <span className="tabular text-sm font-normal text-muted">({items.length})</span>
            </h2>
            <div className="flex flex-wrap gap-2">
              {readyItems.length > 1 ? (
                <Button icon={ListChecks} onClick={importAll} disabled={bulkRunning}>
                  {bulkRunning ? "Importing…" : `Import all ${readyItems.length} ready files`}
                </Button>
              ) : null}
              {finished.length ? (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  onClick={() => setItems((prev) => prev.filter((it) => !finished.some((f) => f.id === it.id)))}
                >
                  Clear finished
                </Button>
              ) : null}
            </div>
          </div>
          <div className="space-y-4">
            {items.map((it) => (
              <FileCardContainer
                key={it.id}
                item={it}
                stores={stores}
                storesReady={ready}
                target={targetOf(it)}
                draft={draftOf(it)}
                onTargetChange={(target) => update(it.id, { target, targetError: undefined })}
                onDraftChange={(draft) => update(it.id, { draft, draftErrors: undefined })}
                onImport={() => void runImport(it.id)}
                queued={bulkRunning}
                onRemove={() => setItems((prev) => prev.filter((x) => x.id !== it.id))}
                onOpenStore={(storeId) => setScope(storeId)}
              />
            ))}
          </div>
        </section>
      ) : null}

      <ImportHistory scope={scope} ready={ready} stores={stores} />

      <ReportHelp />
    </div>
  );
}

/** Adds the "current bulk entities" count for bulk files headed to an existing store. */
function FileCardContainer(props: Omit<Parameters<typeof ImportFileCard>[0], "currentBulk">) {
  const isBulkToStore = props.item.analysis?.kind === "bulk" && props.target !== NEW_STORE && props.target !== "";
  const { counts } = useStoreCounts(isBulkToStore && props.item.phase === "ready" ? props.target : null);
  return <ImportFileCard {...props} currentBulk={counts?.bulk} />;
}
