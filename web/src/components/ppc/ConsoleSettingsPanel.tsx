"use client";

import { DatabaseBackup, HardDriveUpload, RotateCcw, Save, Sparkles, Trash2, TriangleAlert } from "lucide-react";
import { useRef, useState, type ChangeEvent } from "react";

import { downloadFile } from "@/components/calc/csv";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import {
  exportBackup,
  importBackup,
  loadDemo,
  removeDemo,
  resetAll,
  validateBackup,
  type ConsoleBackup,
  type ConsoleSettings,
  type Store,
} from "@/lib/ppc";

import { DemoDialog, demoImpact, type DemoImpact } from "./DemoDialog";
import { bytes, localStamp, plural, stamp } from "./format";
import { FormSection } from "./FormBits";
import { useSettings } from "./hooks";
import { CURRENCIES } from "./markets";
import { parseLoose } from "./storeDraft";

const RESET_PHRASE = "DELETE";

type Notice = { tone: "success" | "danger" | "info"; text: string } | null;

function fmtRate(n: number | undefined): string {
  return typeof n === "number" && Number.isFinite(n) ? String(Number(n.toPrecision(6))) : "";
}

/** Base currency, FX rates, backup / restore, demo data and reset. */
export function ConsoleSettingsPanel({ stores }: { stores: Store[] }) {
  const { settings, loading, save } = useSettings();
  // Lives here, not in CurrencySettings: that form remounts (fresh drafts) whenever settings change.
  const [currencyNotice, setCurrencyNotice] = useState<Notice>(null);
  const used = Array.from(new Set(stores.map((s) => s.currency.toUpperCase()))).sort();

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-ink">Console settings</h2>
      {loading ? null : (
        <CurrencySettings
          key={JSON.stringify([settings.baseCurrency, settings.fxRates, used])}
          settings={settings}
          stores={stores}
          save={save}
          notice={currencyNotice}
          setNotice={setCurrencyNotice}
        />
      )}
      <DataSettings stores={stores} />
    </div>
  );
}

/* --------------------------------------------------------------- currency */

function CurrencySettings({
  settings,
  stores,
  save,
  notice,
  setNotice,
}: {
  settings: ConsoleSettings;
  stores: Store[];
  save: (patch: Partial<ConsoleSettings>) => Promise<void>;
  notice: Notice;
  setNotice: (n: Notice) => void;
}) {
  const base = settings.baseCurrency.toUpperCase();
  const used = Array.from(new Set(stores.map((s) => s.currency.toUpperCase()))).filter((c) => c !== base).sort();
  const [rates, setRates] = useState<Record<string, string>>(() => {
    const out: Record<string, string> = {};
    for (const c of used) out[c] = fmtRate(settings.fxRates[c]);
    return out;
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const missing = used.filter((c) => !(parseLoose(rates[c] ?? "") > 0));
  const baseOptions = Array.from(new Set([...CURRENCIES, base, ...used])).map((c) => ({ value: c, label: c }));

  const changeBase = async (next: string) => {
    if (next === base) return;
    // Re-express every rate against the new base using the old table, so the
    // numbers stay right instead of silently meaning something else.
    const pivot = settings.fxRates[next];
    // Without a rate for the new base the old numbers cannot be converted, and
    // keeping them would mislabel them — start from an empty table instead.
    let fxRates: Record<string, number> = {};
    let note =
      next === "USD"
        ? "Base currency is back to USD; the built-in rates fill any gaps. Check them below."
        : `Base currency is now ${next}. There was no ${next} rate to convert from, so enter the rates below.`;
    if (typeof pivot === "number" && pivot > 0) {
      fxRates = {};
      for (const [c, r] of Object.entries(settings.fxRates)) if (c !== next && r > 0) fxRates[c] = r / pivot;
      fxRates[base] = 1 / pivot;
      note = `Base currency is now ${next}; every rate was converted using the old ${next} rate. Check them below.`;
    }
    setBusy(true);
    try {
      await save({ baseCurrency: next, fxRates });
      setNotice({ tone: "success", text: note });
    } catch (e) {
      setNotice({ tone: "danger", text: `Could not save: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  const saveRates = async () => {
    const errs: Record<string, string> = {};
    const next: Record<string, number> = { ...settings.fxRates };
    for (const c of used) {
      const raw = (rates[c] ?? "").trim();
      if (!raw) {
        delete next[c];
        continue;
      }
      const n = parseLoose(raw);
      if (!(n > 0) || n > 1_000_000) errs[c] = "Enter a positive number.";
      else next[c] = n;
    }
    setErrors(errs);
    if (Object.keys(errs).length) return;
    setBusy(true);
    try {
      await save({ fxRates: next });
      setNotice({ tone: "success", text: "Rates saved." });
    } catch (e) {
      setNotice({ tone: "danger", text: `Could not save: ${e instanceof Error ? e.message : String(e)}` });
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormSection
      id="currency"
      title="Currency"
      description="The all-stores view adds money up in one base currency. Rates are typed in by you and never fetched — update them now and then."
    >
      <Select
        id="console-base-currency"
        label="Base currency"
        value={base}
        options={baseOptions}
        disabled={busy}
        onChange={(e) => void changeBase(e.target.value)}
        fieldClassName="max-w-xs"
      />

      {used.length === 0 ? (
        <p className="text-sm text-muted">
          Every store uses {base}, so no exchange rates are needed.
        </p>
      ) : (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            void saveRates();
          }}
          className="space-y-3"
        >
          <p className="text-[0.8125rem] font-medium text-ink">Exchange rates</p>
          {missing.length ? (
            <Callout variant="warn">
              <p>
                No rate for {missing.join(", ")}: {missing.length === 1 ? "that store is" : "those stores are"} left out of all-store money
                totals until you add one.
              </p>
            </Callout>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {used.map((c) => {
              const storesUsing = stores.filter((s) => s.currency.toUpperCase() === c).map((s) => s.name);
              return (
                <Input
                  key={c}
                  id={`fx-${c}`}
                  label={`1 ${c} =`}
                  value={rates[c] ?? ""}
                  inputMode="decimal"
                  suffix={base}
                  error={errors[c]}
                  hint={storesUsing.length ? `Used by ${storesUsing.join(", ")}` : undefined}
                  onChange={(e) => {
                    setRates((r) => ({ ...r, [c]: e.target.value }));
                    setNotice(null);
                  }}
                  className="tabular"
                />
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" icon={Save} disabled={busy}>
              Save rates
            </Button>
            <p className="text-xs text-faint">
              Units of {base} per 1 unit of each currency.{base === "USD" ? " Leave one blank to use the built-in rate." : ""}
            </p>
          </div>
        </form>
      )}
      {notice ? (
        <p aria-live="polite" className={notice.tone === "danger" ? "text-sm text-bad" : "text-sm text-good"}>
          {notice.text}
        </p>
      ) : null}
    </FormSection>
  );
}

/* ------------------------------------------------------------------- data */

interface PendingRestore {
  backup: ConsoleBackup;
  fileName: string;
  size: number;
}

function DataSettings({ stores }: { stores: Store[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [restore, setRestore] = useState<PendingRestore | null>(null);
  const [resetOpen, setResetOpen] = useState(false);
  const [resetText, setResetText] = useState("");
  const [demoConfirm, setDemoConfirm] = useState<{ mode: "reload" | "remove"; impact: DemoImpact } | null>(null);

  const demoCount = stores.filter((s) => s.demo).length;

  const run = async (label: string, fn: () => Promise<string>) => {
    setBusy(label);
    setNotice(null);
    try {
      const text = await fn();
      setNotice({ tone: "success", text });
    } catch (e) {
      setNotice({ tone: "danger", text: e instanceof Error ? e.message : String(e) });
    } finally {
      setBusy(null);
    }
  };

  const download = () =>
    run("backup", async () => {
      const backup = await exportBackup();
      const json = JSON.stringify(backup);
      const name = `ppc-console-backup-${localStamp()}.json`;
      downloadFile(name, json, "application/json");
      return `Backup downloaded: ${name} (${plural(backup.stores.length, "store")}, ${plural(backup.rows.length, "row")}, ${bytes(json.length)}).`;
    });

  const onRestoreFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setNotice(null);
    try {
      const text = await file.text();
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        throw new Error("That file is not valid JSON.");
      }
      const backup = validateBackup(parsed);
      setRestore({ backup, fileName: file.name, size: file.size });
    } catch (e) {
      setNotice({ tone: "danger", text: `Cannot restore ${file.name}: ${e instanceof Error ? e.message : String(e)}` });
    }
  };

  const confirmRestore = async () => {
    if (!restore) return;
    const { backup, fileName } = restore;
    setRestore(null);
    await run("restore", async () => {
      await importBackup(backup, { mode: "replace" });
      return `Restored ${fileName}: ${plural(backup.stores.length, "store")}, ${plural(backup.rows.length, "row")}, ${plural(backup.bulk.length, "bulk entity", "bulk entities")}.`;
    });
  };

  const loadOrReloadDemo = () =>
    run("demo", async () => {
      const r = await loadDemo();
      return `Demo data ${demoCount ? "reloaded" : "loaded"}: ${plural(r.stores, "store")}, ${plural(r.rows, "row")}, ${plural(r.bulk, "bulk entity", "bulk entities")}.`;
    });

  /** Reload / Remove delete the demo stores and anything imported into them: confirm first. */
  const askDemo = async (mode: "reload" | "remove") => {
    setNotice(null);
    try {
      setDemoConfirm({ mode, impact: await demoImpact() });
    } catch (e) {
      setNotice({ tone: "danger", text: e instanceof Error ? e.message : String(e) });
    }
  };

  const confirmDemo = async () => {
    const mode = demoConfirm?.mode;
    setDemoConfirm(null);
    if (mode === "reload") await loadOrReloadDemo();
    else if (mode === "remove")
      await run("remove-demo", async () => {
        const n = await removeDemo();
        return `Removed ${plural(n, "demo store")}.`;
      });
  };

  const confirmReset = async () => {
    if (resetText.trim().toUpperCase() !== RESET_PHRASE) return;
    setResetOpen(false);
    setResetText("");
    await run("reset", async () => {
      await resetAll();
      return "Everything was deleted. The console is empty and settings are back to defaults.";
    });
  };

  return (
    <>
      <FormSection
        id="data"
        title="Your data"
        description="Everything lives in this browser's IndexedDB. Clearing site data wipes it, so keep a backup."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="space-y-2 rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">Backup</p>
            <p className="text-xs leading-relaxed text-muted">Stores, settings, every imported row, bulk files and decisions in one JSON file.</p>
            <Button variant="secondary" icon={DatabaseBackup} onClick={download} disabled={busy !== null}>
              {busy === "backup" ? "Preparing…" : "Download backup"}
            </Button>
          </div>
          <div className="space-y-2 rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">Restore</p>
            <p className="text-xs leading-relaxed text-muted">Replaces everything in the console with a backup file. You confirm first.</p>
            <Button variant="secondary" icon={HardDriveUpload} onClick={() => fileRef.current?.click()} disabled={busy !== null}>
              {busy === "restore" ? "Restoring…" : "Restore from file"}
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => void onRestoreFile(e)}
            />
          </div>
          <div className="space-y-2 rounded-lg border border-hairline bg-canvas p-4">
            <p className="text-sm font-semibold text-ink">Demo data</p>
            <p className="text-xs leading-relaxed text-muted">
              {demoCount
                ? `${plural(demoCount, "demo store")} loaded. Reloading or removing them deletes everything in them, including files you imported into a demo store; your own stores are left alone.`
                : "Three demo stores with 60 days of search terms and a bulk file. Your own stores are untouched."}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                icon={Sparkles}
                disabled={busy !== null}
                onClick={() => void (demoCount ? askDemo("reload") : loadOrReloadDemo())}
              >
                {busy === "demo" ? "Loading…" : demoCount ? "Reload demo" : "Load demo"}
              </Button>
              {demoCount ? (
                <Button
                  variant="ghost"
                  icon={Trash2}
                  disabled={busy !== null}
                  onClick={() => void askDemo("remove")}
                >
                  Remove demo
                </Button>
              ) : null}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-bad/30 bg-bad-soft p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">Reset everything</p>
            <p className="text-xs text-muted">Deletes every store, import, row, bulk file and decision, and resets settings.</p>
          </div>
          <Button variant="danger" icon={RotateCcw} onClick={() => setResetOpen(true)} disabled={busy !== null}>
            Reset everything
          </Button>
        </div>

        <p aria-live="polite" className="sr-only">
          {notice?.text ?? ""}
        </p>
        {notice ? (
          <Callout variant={notice.tone === "danger" ? "danger" : notice.tone === "success" ? "success" : "info"}>
            <p>{notice.text}</p>
          </Callout>
        ) : null}
      </FormSection>

      <DemoDialog
        mode={demoConfirm?.mode ?? null}
        impact={demoConfirm?.impact ?? null}
        onCancel={() => setDemoConfirm(null)}
        onConfirm={() => void confirmDemo()}
      />

      <Dialog
        open={restore !== null}
        onClose={() => setRestore(null)}
        title="Replace everything with this backup?"
        description={restore ? `${restore.fileName} · ${bytes(restore.size)}` : undefined}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setRestore(null)}>
              Cancel
            </Button>
            <Button variant="danger" icon={HardDriveUpload} onClick={() => void confirmRestore()}>
              Replace and restore
            </Button>
          </>
        }
      >
        {restore ? (
          <div className="space-y-3">
            <p>
              Exported {stamp(restore.backup.exportedAt)}. It holds{" "}
              <strong>
                {plural(restore.backup.stores.length, "store")}, {plural(restore.backup.rows.length, "row")},{" "}
                {plural(restore.backup.bulk.length, "bulk entity", "bulk entities")}
              </strong>{" "}
              and {plural(restore.backup.batches.length, "import")}.
            </p>
            <p className="flex items-start gap-2 text-bad">
              <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                Everything currently in the console ({plural(stores.length, "store")}) is deleted first. Download a backup of the current
                data if you might need it.
              </span>
            </p>
          </div>
        ) : null}
      </Dialog>

      <Dialog
        open={resetOpen}
        onClose={() => {
          setResetOpen(false);
          setResetText("");
        }}
        title="Delete everything in the console?"
        description="There is no server copy. This cannot be undone."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              onClick={() => {
                setResetOpen(false);
                setResetText("");
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" icon={Trash2} disabled={resetText.trim().toUpperCase() !== RESET_PHRASE} onClick={() => void confirmReset()}>
              Delete everything
            </Button>
          </>
        }
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void confirmReset();
          }}
          className="space-y-3"
        >
          <p>
            {plural(stores.length, "store")} and all of {stores.length === 1 ? "its" : "their"} imports will be deleted. Type{" "}
            <strong className="font-mono">{RESET_PHRASE}</strong> to confirm.
          </p>
          <Input
            id="console-reset-confirm"
            label="Confirmation"
            hideLabel
            value={resetText}
            autoComplete="off"
            spellCheck={false}
            placeholder={RESET_PHRASE}
            onChange={(e) => setResetText(e.target.value)}
          />
          <p className="text-xs text-muted">Learner progress on /progress is stored separately and is not affected.</p>
        </form>
      </Dialog>
    </>
  );
}

