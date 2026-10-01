"use client";

import { Eye, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { deleteStore, listStores, saveStore, storeCounts, type Store, type StoreCounts } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { ConsoleEmpty } from "./ConsoleEmpty";
import { ConsolePageHeader } from "./ConsolePageHeader";
import { ConsoleSettingsPanel } from "./ConsoleSettingsPanel";
import { pct, plural } from "./format";
import { useActiveScope, useStoreCounts } from "./hooks";
import { marketplaceByCode } from "./markets";
import { NewStoreFields, draftFromHint, storeFromDraft, validateDraft, type NewStoreDraft } from "./NewStoreFields";
import { StoreDot } from "./StoreDot";
import { StoreEditor } from "./StoreEditor";

const GOAL_LABEL = { profit: "Profit", growth: "Growth", launch: "Launch", liquidate: "Liquidate" } as const;
const ADD_BUTTON_ID = "stores-add";
const editButtonId = (storeId: string) => `store-edit-${storeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;

export function StoresConsole() {
  const { stores, ready, scope, setScope } = useActiveScope();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<NewStoreDraft>(() => draftFromHint());
  const [draftErrors, setDraftErrors] = useState<{ name?: string; currency?: string }>({});
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [toDelete, setToDelete] = useState<Store | null>(null);
  const [deleteCounts, setDeleteCounts] = useState<StoreCounts | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const editing = editingId ? stores.find((s) => s.id === editingId) : undefined;

  // Add store, Cancel, View and Back to stores each remove the button that was
  // pressed: focus what replaces it instead of dropping keyboard users on <body>.
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  }, [adding, editingId, scope]);

  const askDelete = (s: Store) => {
    setToDelete(s);
    setDeleteCounts(null);
    setDeleteError(null);
    storeCounts(s.id).then(setDeleteCounts, () => setDeleteCounts(null));
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await deleteStore(toDelete.id);
      setNotice(`Deleted ${toDelete.name} and all of its data.`);
      if (editingId === toDelete.id) setEditingId(null);
      setToDelete(null);
    } catch (e) {
      setDeleteError(e instanceof Error ? e.message : String(e));
    } finally {
      setDeleting(false);
    }
  };

  const create = async () => {
    const errs = validateDraft(draft);
    setDraftErrors(errs);
    if (errs.name || errs.currency) return;
    setCreating(true);
    try {
      const existing = await listStores();
      const store = storeFromDraft(draft, existing);
      await saveStore(store);
      setAdding(false);
      setDraft(draftFromHint());
      setNotice(`Created ${store.name}. Set its economics and rules below, then import its reports.`);
      setEditingId(store.id);
    } catch (e) {
      setDraftErrors({ name: e instanceof Error ? e.message : String(e) });
    } finally {
      setCreating(false);
    }
  };

  const deleteDialog = (
    <Dialog
      open={toDelete !== null}
      onClose={() => (deleting ? undefined : setToDelete(null))}
      title={toDelete ? `Delete ${toDelete.name}?` : "Delete store?"}
      description="The store and everything imported into it is removed from this browser."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => setToDelete(null)} disabled={deleting}>
            Cancel
          </Button>
          <Button variant="danger" icon={Trash2} onClick={() => void confirmDelete()} disabled={deleting}>
            {deleting ? "Deleting…" : "Delete store"}
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <p>
          {deleteCounts ? (
            <>
              This deletes <strong>{plural(deleteCounts.rows, "search term row")}</strong>,{" "}
              <strong>{plural(deleteCounts.bulk, "bulk entity", "bulk entities")}</strong>, {plural(deleteCounts.batches, "import")} and{" "}
              {plural(deleteCounts.decisions, "saved decision")}.
            </>
          ) : (
            "Counting what will be removed…"
          )}
        </p>
        <p className="text-muted">It cannot be undone. Download a backup first if you might want it back.</p>
        {deleteError ? (
          <Callout variant="danger">
            <p>{deleteError}</p>
          </Callout>
        ) : null}
      </div>
    </Dialog>
  );

  if (editing) {
    return (
      <>
        {notice ? (
          <Callout variant="success" className="mb-6">
            <p>{notice}</p>
          </Callout>
        ) : null}
        <StoreEditor
          key={editing.id}
          store={editing}
          onBack={() => {
            pendingFocus.current = editButtonId(editing.id);
            setEditingId(null);
            setNotice(null);
          }}
          onDelete={askDelete}
        />
        {deleteDialog}
      </>
    );
  }

  return (
    <div className="space-y-10">
      <div>
        <ConsolePageHeader
          title="Stores & settings"
          description={
            <p>
              One store per seller account and marketplace. Each has its own currency, economics, rules and term lists — the
              recommendations for a store only ever use its own settings.
            </p>
          }
          actions={
            ready && !adding ? (
              <Button
                id={ADD_BUTTON_ID}
                icon={Plus}
                onClick={() => {
                  pendingFocus.current = "stores-new-name";
                  setAdding(true);
                }}
              >
                Add store
              </Button>
            ) : null
          }
        />

        <p aria-live="polite" className="sr-only">
          {notice ?? ""}
        </p>
        {notice ? (
          <Callout variant="success" className="mb-4">
            <p>{notice}</p>
          </Callout>
        ) : null}

        {adding ? (
          <form
            noValidate
            onSubmit={(e) => {
              e.preventDefault();
              void create();
            }}
            className="mb-6 rounded-xl border border-hairline bg-surface p-4 sm:p-5"
            aria-labelledby="new-store-heading"
          >
            <h2 id="new-store-heading" className="mb-3 font-display text-base font-semibold text-ink">
              New store
            </h2>
            <NewStoreFields idPrefix="stores-new" draft={draft} onChange={setDraft} errors={draftErrors} />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="submit" icon={Plus} disabled={creating}>
                {creating ? "Creating…" : "Create store"}
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  pendingFocus.current = ADD_BUTTON_ID;
                  setAdding(false);
                  setDraftErrors({});
                }}
              >
                Cancel
              </Button>
            </div>
          </form>
        ) : null}

        {!ready ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : stores.length === 0 ? (
          adding ? null : <ConsoleEmpty reason="no-stores" />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stores.map((s) => (
              <li key={s.id} className="min-w-0">
                <StoreCard
                  store={s}
                  active={scope === s.id}
                  onEdit={() => {
                    setNotice(null);
                    setEditingId(s.id);
                  }}
                  onDelete={() => askDelete(s)}
                  onView={() => {
                    // View turns into the "In view" badge: focus the card's Edit button.
                    pendingFocus.current = editButtonId(s.id);
                    setScope(s.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {ready ? <ConsoleSettingsPanel stores={stores} /> : null}

      {deleteDialog}
    </div>
  );
}

function StoreCard({
  store,
  active,
  onEdit,
  onDelete,
  onView,
}: {
  store: Store;
  active: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onView: () => void;
}) {
  const { counts } = useStoreCounts(store.id);
  const e = store.economics;
  const mp = marketplaceByCode(store.marketplace);
  const headingId = `store-card-${store.id}`;
  const dest = store.harvestDestination;
  return (
    <article
      aria-labelledby={headingId}
      className={cn("flex h-full flex-col rounded-xl border bg-surface", active ? "border-brand" : "border-hairline")}
    >
      <header className="flex items-start gap-3 px-4 pt-4">
        <StoreDot colorIndex={store.colorIndex} size="md" className="mt-1.5" />
        <div className="min-w-0 flex-1">
          <h3 id={headingId} className="truncate font-display text-base font-semibold text-ink" title={store.name}>
            {store.name}
          </h3>
          <p className="text-xs text-muted">
            {store.marketplace}
            {mp ? ` · ${mp.domain}` : ""} · {store.currency}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {store.demo ? (
            <Badge tone="ember" size="sm">
              Demo
            </Badge>
          ) : null}
          {active ? (
            <Badge tone="brand" size="sm" variant="outline">
              In view
            </Badge>
          ) : null}
        </div>
      </header>
      <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-2.5 px-4 py-4 text-sm">
        <div>
          <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">Target ACoS</dt>
          <dd className="tabular font-semibold text-ink">{pct(e.targetAcos)}</dd>
        </div>
        <div>
          <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">Break-even</dt>
          <dd className="tabular font-semibold text-ink">{pct(e.breakEvenAcos)}</dd>
        </div>
        <div>
          <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">Goal</dt>
          <dd className="text-ink">{GOAL_LABEL[e.goal]}</dd>
        </div>
        <div>
          <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">Harvest to</dt>
          <dd className="truncate text-ink" title={dest.mode === "existing" ? `${dest.campaignName} › ${dest.adGroupName}` : undefined}>
            {dest.mode === "existing" ? dest.adGroupName || dest.campaignName : dest.mode === "new-campaign" ? "New campaign" : "Source ad group"}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-[0.6875rem] font-medium tracking-[0.08em] text-muted uppercase">Data</dt>
          <dd className="tabular text-ink">
            {counts
              ? `${plural(counts.rows, "row")} · ${counts.bulk ? plural(counts.bulk, "bulk entity", "bulk entities") : "no bulk file"} · ${plural(counts.batches, "import")}`
              : "…"}
          </dd>
        </div>
      </dl>
      <footer className="flex flex-wrap items-center gap-2 border-t border-hairline px-4 py-3">
        <Button id={editButtonId(store.id)} variant="secondary" size="sm" icon={Pencil} onClick={onEdit} aria-label={`Edit ${store.name}`}>
          Edit
        </Button>
        {!active ? (
          <Button variant="ghost" size="sm" icon={Eye} onClick={onView} aria-label={`View ${store.name} across the console`}>
            View
          </Button>
        ) : null}
        <Button
          variant="ghost"
          size="sm"
          icon={Trash2}
          onClick={onDelete}
          aria-label={`Delete ${store.name}`}
          className="ml-auto min-w-9 px-2 [@media(pointer:coarse)]:min-w-11"
        >
          <span className="sr-only">Delete</span>
        </Button>
      </footer>
    </article>
  );
}

