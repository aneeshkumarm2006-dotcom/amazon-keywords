"use client";

import {
  Download,
  HardDriveDownload,
  ShieldCheck,
  Trash2,
  TriangleAlert,
  Upload,
} from "lucide-react";
import { useCallback, useId, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { CopyButton } from "@/components/ui/CopyButton";
import { Dialog } from "@/components/ui/Dialog";
import { Textarea } from "@/components/ui/Textarea";
import {
  exportAllJson,
  exportFilename,
  importAll,
  resetAll,
  type ImportResult,
} from "@/lib/progress";
import { cn, formatNumber } from "@/lib/utils";

import { useProgressSnapshot } from "./useProgress";

export interface DataPanelProps {
  className?: string;
}

const RESET_PHRASE = "RESET";

/** What the static export contains: a valid, empty progress file. */
const EMPTY_SNAPSHOT = JSON.stringify(
  { format: "ppc-academy/progress", version: 1, exportedAt: "", data: {} },
  null,
  2,
);

/**
 * Export, import and reset.
 *
 * The export is the whole `ppc-academy:` namespace minus the theme, so it
 * carries quiz attempts and mock interviews as well as this layer's records.
 * Importing replaces the keys the file contains and leaves the rest alone —
 * a progress-only file from an older build cannot silently wipe a quiz
 * history it predates.
 *
 * Reset is typed-confirmation rather than a plain "are you sure", because
 * there is no server copy to restore from.
 */
export function DataPanel({ className }: DataPanelProps) {
  const fieldId = useId();
  const fileRef = useRef<HTMLInputElement>(null);

  const [importOpen, setImportOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [pasted, setPasted] = useState("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [resetConfirm, setResetConfirm] = useState("");
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Recomputed only when something in the namespace actually changes, so the
  // clipboard button always holds a current snapshot without serialising the
  // whole store on every render.
  const snapshotJson = useProgressSnapshot(exportAllJson, EMPTY_SNAPSHOT);

  const download = useCallback(() => {
    try {
      const blob = new Blob([exportAllJson()], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = exportFilename();
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      // Revoked on the next frame so the browser has started the download.
      requestAnimationFrame(() => URL.revokeObjectURL(url));
      setDownloadError(null);
    } catch {
      setDownloadError(
        "This browser blocked the download. Use Copy JSON instead and paste it into a file yourself.",
      );
    }
  }, []);

  const runImport = useCallback((json: string) => {
    const outcome = importAll(json);
    setResult(outcome);
    if (outcome.ok) setPasted("");
  }, []);

  const onFile = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => runImport(String(reader.result ?? ""));
      reader.onerror = () =>
        setResult({ ok: false, imported: 0, error: "That file could not be read." });
      reader.readAsText(file);
      event.target.value = "";
    },
    [runImport],
  );

  const confirmReset = useCallback(() => {
    if (resetConfirm.trim().toUpperCase() !== RESET_PHRASE) return;
    resetAll();
    setResetConfirm("");
    setResetOpen(false);
  }, [resetConfirm]);

  return (
    <>
      <section
        aria-labelledby="data-heading"
        className={cn("rounded-xl border border-hairline bg-surface", className)}
      >
        <header className="border-b border-hairline px-4 py-3.5 sm:px-5">
          <h3
            id="data-heading"
            className="font-display text-[0.9375rem] leading-snug font-semibold text-ink"
          >
            Your data
          </h3>
          <p className="mt-1 text-[0.8125rem] leading-relaxed text-muted">
            Everything on this page lives in this browser. Export it to move machines, or wipe
            it and start clean.
          </p>
        </header>

        <div className="space-y-4 px-4 py-4 sm:px-5">
          <div className="flex flex-wrap gap-2">
            <Button icon={Download} onClick={download}>
              Export JSON
            </Button>
            <CopyButton value={snapshotJson} label="Copy JSON" size="md" />
            <Button variant="secondary" icon={Upload} onClick={() => setImportOpen(true)}>
              Import JSON
            </Button>
            <Button variant="ghost" icon={Trash2} onClick={() => setResetOpen(true)}>
              Reset everything
            </Button>
          </div>

          {downloadError ? (
            <Callout variant="warn" title="Download blocked">
              <p>{downloadError}</p>
            </Callout>
          ) : null}

          <div className="flex items-start gap-2.5 rounded-lg border border-hairline bg-canvas p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-good" aria-hidden="true" />
            <p className="text-[0.8125rem] leading-relaxed text-muted">
              There is no account and no server. Every record is written to{" "}
              <code className="rounded border border-hairline bg-surface-2 px-1 py-0.5 font-mono text-[0.75rem] text-ember-ink">
                localStorage
              </code>{" "}
              under the <code className="rounded border border-hairline bg-surface-2 px-1 py-0.5 font-mono text-[0.75rem] text-ember-ink">ppc-academy:</code>{" "}
              prefix. Clearing site data in your browser clears all of it, which is why the
              export exists.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------ import */}
      <Dialog
        open={importOpen}
        onClose={() => {
          setImportOpen(false);
          setResult(null);
        }}
        title="Import a progress file"
        description="Choose an exported .json file, or paste its contents. Keys the file contains are replaced; anything it does not mention is left as it is."
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setImportOpen(false);
                setResult(null);
              }}
            >
              Close
            </Button>
            <Button
              icon={HardDriveDownload}
              disabled={pasted.trim().length === 0}
              onClick={() => runImport(pasted)}
            >
              Import pasted JSON
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label
              htmlFor={`${fieldId}-file`}
              className="mb-1.5 block text-[0.8125rem] font-medium text-ink"
            >
              Choose a file
            </label>
            <input
              ref={fileRef}
              id={`${fieldId}-file`}
              type="file"
              accept="application/json,.json"
              onChange={onFile}
              className="block w-full cursor-pointer rounded-lg border border-hairline bg-surface text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-l-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2.5 file:text-sm file:font-medium file:text-ink hover:border-hairline-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            />
          </div>

          <Textarea
            id={`${fieldId}-paste`}
            label="Or paste the JSON"
            hint="Useful when the file lives on another device and you can only copy the text across."
            rows={6}
            value={pasted}
            placeholder='{"format":"ppc-academy/progress", ...}'
            onChange={(event) => setPasted(event.target.value)}
            className="font-mono text-[0.75rem]"
          />

          {result ? (
            result.ok ? (
              <Callout variant="success" title="Imported">
                <p>
                  {formatNumber(result.imported)} record
                  {result.imported === 1 ? "" : "s"} restored
                  {result.exportedAt
                    ? ` from an export taken on ${new Date(result.exportedAt).toLocaleDateString("en-GB")}`
                    : ""}
                  . The progress page behind this dialog has already updated.
                </p>
              </Callout>
            ) : (
              <Callout variant="danger" title="Import failed">
                <p>{result.error}</p>
              </Callout>
            )
          ) : null}
        </div>
      </Dialog>

      {/* ------------------------------------------------------------- reset */}
      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetConfirm("");
        }}
        title="Reset everything?"
        description="This deletes your profile, completions, bookmarks, path progress, quiz attempts, mastery, the review queue and every mock interview report."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setResetOpen(false);
                setResetConfirm("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              icon={Trash2}
              disabled={resetConfirm.trim().toUpperCase() !== RESET_PHRASE}
              onClick={confirmReset}
            >
              Delete everything
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <Callout variant="danger" title="There is no undo" icon={TriangleAlert}>
            <p>
              Nothing is stored on a server, so there is no copy to restore from. Export first if
              there is any chance you want this back.
            </p>
          </Callout>

          <div>
            <label
              htmlFor={`${fieldId}-confirm`}
              className="mb-1.5 block text-[0.8125rem] font-medium text-ink"
            >
              Type <span className="font-mono font-semibold text-ink">{RESET_PHRASE}</span> to
              confirm
            </label>
            <input
              id={`${fieldId}-confirm`}
              value={resetConfirm}
              autoComplete="off"
              onChange={(event) => setResetConfirm(event.target.value)}
              className="h-11 w-full rounded-lg border border-hairline bg-surface px-3 font-mono text-sm text-ink placeholder:text-faint focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              placeholder={RESET_PHRASE}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
