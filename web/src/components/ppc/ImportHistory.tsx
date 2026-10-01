"use client";

import { History, Trash2 } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonText } from "@/components/ui/Skeleton";
import { TBody, TD, TH, THead, THRow, TR, Table } from "@/components/ui/Table";
import { batchOwnership, deleteBatch, type BatchOwnership, type ImportBatch, type Store } from "@/lib/ppc";

import { count, dateSpan, plural, stamp } from "./format";
import { ALL_STORES, useBatches, useLiveBulk, type Scope } from "./hooks";
import { StoreDot } from "./StoreDot";

export interface ImportHistoryProps {
  scope: Scope;
  ready: boolean;
  stores: Store[];
}

/** Every import batch for the scope, newest first, with delete. */
export function ImportHistory({ scope, ready, stores }: ImportHistoryProps) {
  const { batches, loading, error } = useBatches(ready ? scope : null);
  const [target, setTarget] = useState<ImportBatch | null>(null);
  const [owned, setOwned] = useState<BatchOwnership | null>(null);
  const liveQ = useLiveBulk(ready);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const storeById = new Map(stores.map((s) => [s.id, s]));
  // The live snapshot is the bulk batch that still owns entities — not simply the newest one:
  // after its snapshot is deleted, an older, replaced batch owns nothing and is not Current.
  const liveBulk = new Set<string>();
  if (!liveQ.loading && !liveQ.error) {
    for (const l of liveQ.live) liveBulk.add(l.batchId);
  } else {
    // Until that loads: the newest bulk batch per store.
    const seenStore = new Set<string>();
    for (const b of batches) {
      if (b.kind !== "bulk" || seenStore.has(b.storeId)) continue;
      seenStore.add(b.storeId);
      liveBulk.add(b.id);
    }
  }
  const hasBulk = batches.some((b) => b.kind === "bulk");

  const openDelete = (b: ImportBatch) => {
    setTarget(b);
    setOwned(null);
    setDeleteError(null);
    batchOwnership(b.id).then(setOwned, () => setOwned(null));
  };

  const confirmDelete = async () => {
    if (!target) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await deleteBatch(target.id);
      setNotice(
        `Deleted “${target.fileName}”: ${
          target.kind === "bulk"
            ? `${plural(res.bulk, "bulk entity", "bulk entities")} removed.`
            : `${plural(res.rows, "row")} removed${res.restored ? `, ${plural(res.restored, "row")} kept from other imports` : ""}.`
        }`,
      );
      setTarget(null);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : String(err));
    } finally {
      setDeleting(false);
    }
  };

  const scopeStore = scope === ALL_STORES ? undefined : storeById.get(scope);

  return (
    <section aria-labelledby="import-history-heading">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 id="import-history-heading" className="font-display text-lg font-semibold text-ink">
            Import history
          </h2>
          <p className="text-[0.8125rem] text-muted">
            {scopeStore ? `Imports for ${scopeStore.name}.` : "Imports for every store."} Deleting an import removes the rows only it
            holds; rows another import also holds stay, with that import&apos;s numbers.
          </p>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {notice ?? ""}
      </p>
      {notice ? (
        <Callout variant="success" className="mb-3">
          <p>{notice}</p>
        </Callout>
      ) : null}

      {error ? (
        <Callout variant="danger" title="Could not load the import history">
          <p>{error}</p>
        </Callout>
      ) : loading ? (
        <div className="rounded-xl border border-hairline bg-surface p-5">
          <SkeletonText lines={3} />
        </div>
      ) : batches.length === 0 ? (
        <EmptyState icon={History} title="Nothing imported yet" description="Files you import appear here with their row counts and date spans." />
      ) : (
        <>
          <Table caption="Import history" stickyFirstColumn wrapperClassName="relative">
            <THead>
              <tr>
                <TH>File</TH>
                <TH>Store</TH>
                <TH>Kind</TH>
                <TH numeric>Rows</TH>
                <TH numeric>New / updated / same</TH>
                <TH>Date span</TH>
                <TH>Imported</TH>
                <TH>
                  <span className="sr-only">Actions</span>
                </TH>
              </tr>
            </THead>
            <TBody>
              {batches.map((b) => {
                const store = storeById.get(b.storeId);
                const live = liveBulk.has(b.id);
                return (
                  <TR key={b.id}>
                    <THRow className="max-w-[16rem]">
                      <span className="block truncate" title={b.fileName}>
                        {b.fileName}
                      </span>
                      {b.errors.length ? (
                        <span className="block text-xs font-normal text-warn">{plural(b.errors.length, "problem")}</span>
                      ) : null}
                    </THRow>
                    <TD className="max-w-[12rem]">
                      <span className="flex min-w-0 items-center gap-2">
                        {store ? <StoreDot colorIndex={store.colorIndex} /> : null}
                        <span className="truncate">{store?.name ?? "Deleted store"}</span>
                      </span>
                    </TD>
                    <TD className="whitespace-nowrap">
                      {b.kind === "bulk" ? (
                        <span className="flex flex-wrap items-center gap-1.5">
                          <Badge tone="info" size="sm">
                            Bulk
                          </Badge>
                          <Badge tone={live ? "good" : "neutral"} variant="outline" size="sm">
                            {live ? "Current" : "Replaced"}
                          </Badge>
                        </span>
                      ) : (
                        <Badge tone="brand" size="sm">
                          Search terms
                        </Badge>
                      )}
                    </TD>
                    <TD numeric mono>
                      {count(b.rowCount)}
                    </TD>
                    <TD numeric mono className="whitespace-nowrap">
                      {b.kind === "bulk" ? (
                        <span>{count(b.inserted)} saved</span>
                      ) : (
                        <span>
                          {count(b.inserted)} / {count(b.updated)} / {count(b.skipped)}
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-muted">{b.kind === "bulk" ? "—" : dateSpan(b.dateFrom, b.dateTo)}</TD>
                    <TD className="whitespace-nowrap text-muted">{stamp(b.importedAt)}</TD>
                    <TD className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => openDelete(b)}
                        aria-label={`Delete import ${b.fileName}`}
                        className="min-w-9 px-2 [@media(pointer:coarse)]:min-w-11"
                      >
                        <span className="sr-only">Delete</span>
                      </Button>
                    </TD>
                  </TR>
                );
              })}
            </TBody>
          </Table>
          {hasBulk ? (
            <p className="mt-2 text-xs text-muted">
              Latest bulk file wins: each bulk import replaces the store&apos;s previous snapshot, so at most one per store is{" "}
              <em>Current</em>. Deleting a replaced bulk import changes nothing.
            </p>
          ) : null}
        </>
      )}

      <Dialog
        open={target !== null}
        onClose={() => (deleting ? undefined : setTarget(null))}
        title="Delete this import?"
        description={target ? target.fileName : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} onClick={confirmDelete} disabled={deleting}>
              {deleting ? "Deleting…" : "Delete import"}
            </Button>
          </>
        }
      >
        {target ? (
          <div className="space-y-3">
            <p>
              {owned === null ? (
                "Counting what this import still owns…"
              ) : target.kind === "bulk" ? (
                owned.bulk > 0 ? (
                  <>
                    This removes the <strong>{count(owned.bulk)}</strong> bulk entities of the current snapshot for{" "}
                    {storeById.get(target.storeId)?.name ?? "this store"}. Recommendations fall back to average CPC and exports lose
                    their IDs until you import a bulk file again.
                  </>
                ) : (
                  "This bulk import no longer holds any entities (a newer file replaced it, or its snapshot was already deleted), so deleting it only removes the history entry."
                )
              ) : owned.rows > 0 || owned.restored > 0 ? (
                <>
                  {owned.rows > 0 ? (
                    <>
                      This removes <strong>{count(owned.rows)}</strong> search term rows no other import holds.
                    </>
                  ) : (
                    "Every row in this file is also in another import, so no rows are removed."
                  )}
                  {owned.restored > 0 ? (
                    <>
                      {" "}
                      <strong>{count(owned.restored)}</strong> rows stay because another import also holds them (where its numbers
                      differ, they are used).
                    </>
                  ) : null}
                </>
              ) : (
                "Every row in this file is also held by another import, so deleting it only removes the history entry."
              )}
            </p>
            <p className="text-muted">This cannot be undone. Download a backup in Stores first if you might want it back.</p>
            {deleteError ? (
              <Callout variant="danger">
                <p>{deleteError}</p>
              </Callout>
            ) : null}
          </div>
        ) : null}
      </Dialog>
    </section>
  );
}
