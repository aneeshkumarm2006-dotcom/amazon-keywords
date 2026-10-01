"use client";

import { Sparkles, Trash2, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { listBatches, listDecisions, listStores, type ImportBatch, type Store } from "@/lib/ppc";

import { plural } from "./format";

/** What "Reload demo" / "Remove demo" deletes. */
export interface DemoImpact {
  stores: Store[];
  /** Imports into demo stores that the demo did not create (the user's own files). */
  ownImports: ImportBatch[];
  /** Decisions made on demo-store recommendations. */
  decisions: number;
}

/** Demo batches are written by db.ts `loadDemo` as `demo-rows-<store>` / `demo-bulk-<store>`. */
const isDemoBatch = (b: ImportBatch) => b.id.startsWith("demo-");

export async function demoImpact(): Promise<DemoImpact> {
  const stores = (await listStores()).filter((s) => s.demo);
  const ownImports: ImportBatch[] = [];
  let decisions = 0;
  for (const s of stores) {
    ownImports.push(...(await listBatches(s.id)).filter((b) => !isDemoBatch(b)));
    decisions += (await listDecisions(s.id)).length;
  }
  return { stores, ownImports, decisions };
}

/**
 * Confirm before demo stores are deleted (Reload, Remove, or Load demo data
 * while demo stores exist). Lists what goes, including anything the user
 * imported into a demo store and decisions made there.
 */
export function DemoDialog({
  mode,
  impact,
  onCancel,
  onConfirm,
}: {
  /** null = closed. */
  mode: "reload" | "remove" | null;
  impact: DemoImpact | null;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const open = mode !== null && impact !== null;
  const reload = mode === "reload";
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={reload ? "Reload the demo stores?" : "Remove the demo stores?"}
      description={reload ? "The demo stores are deleted and created again with fresh data." : "The demo stores and everything in them are deleted."}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
          <Button variant={impact?.ownImports.length ? "danger" : "primary"} icon={reload ? Sparkles : Trash2} onClick={onConfirm}>
            {reload ? "Delete and reload" : "Remove demo stores"}
          </Button>
        </>
      }
    >
      {impact ? (
        <div className="space-y-3">
          <p>
            Deleted: {impact.stores.length ? impact.stores.map((s) => s.name).join(", ") : "the demo stores"}, with every row, bulk file and import in{" "}
            {impact.stores.length === 1 ? "it" : "them"}
            {impact.decisions ? `, and ${plural(impact.decisions, "decision")} you made there` : ""}. Your own stores are not touched.
          </p>
          {impact.ownImports.length ? (
            <div className="flex items-start gap-2 text-bad">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <div className="min-w-0 space-y-1">
                <p>
                  {plural(impact.ownImports.length, "file")} you imported into a demo store {impact.ownImports.length === 1 ? "is" : "are"} deleted too:
                </p>
                <ul className="list-disc pl-5 [overflow-wrap:anywhere]">
                  {impact.ownImports.slice(0, 8).map((b) => (
                    <li key={b.id}>
                      {b.fileName} → {impact.stores.find((s) => s.id === b.storeId)?.name ?? "demo store"}
                    </li>
                  ))}
                  {impact.ownImports.length > 8 ? <li>and {plural(impact.ownImports.length - 8, "more")}</li> : null}
                </ul>
                <p>Cancel and re-import those files into one of your own stores first if you need them.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </Dialog>
  );
}
