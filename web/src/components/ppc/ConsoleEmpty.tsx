"use client";

import { Database, FileUp, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { EmptyState } from "@/components/ui/EmptyState";
import { loadDemo } from "@/lib/ppc";

import { DemoDialog, demoImpact, type DemoImpact } from "./DemoDialog";

export interface ConsoleEmptyProps {
  /** "no-stores": nothing set up yet. "no-rows": stores exist but the scope has no report rows. */
  reason?: "no-stores" | "no-rows";
  title?: string;
  description?: string;
  className?: string;
}

const COPY = {
  "no-stores": {
    title: "No stores yet",
    description:
      "Import a Search Term Report or a bulk file to create your first store, or load three demo stores to see what the console does with real-looking data.",
  },
  "no-rows": {
    title: "No search term data for this scope",
    description:
      "Import a Search Term Report for this store (daily, last 60 days works best), or load the demo stores to explore.",
  },
} as const;

/**
 * The empty state every console page falls back to: import a report, or
 * load the demo dataset (three stores, 60 days, a bulk file with IDs).
 */
export function ConsoleEmpty({ reason = "no-stores", title, description, className }: ConsoleEmptyProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<DemoImpact | null>(null);

  const runDemo = async () => {
    setBusy(true);
    setError(null);
    try {
      await loadDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  /** Loading replaces existing demo stores (and anything imported into them): confirm when there are some. */
  const onDemo = async () => {
    setError(null);
    try {
      const impact = await demoImpact();
      if (impact.stores.length) setConfirm(impact);
      else await runDemo();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  const copy = COPY[reason];

  return (
    <div className={className}>
      <EmptyState
        icon={reason === "no-stores" ? Database : FileUp}
        title={title ?? copy.title}
        description={description ?? copy.description}
        action={
          <>
            <ButtonLink href="/dashboard/import" icon={FileUp}>
              Import a report
            </ButtonLink>
            <Button variant="secondary" icon={Sparkles} onClick={() => void onDemo()} disabled={busy} aria-busy={busy}>
              {busy ? "Loading demo data…" : "Load demo data"}
            </Button>
          </>
        }
      />
      {error ? (
        <Callout variant="danger" title="Demo data could not be loaded" className="mt-4">
          <p>{error}</p>
        </Callout>
      ) : null}
      <DemoDialog
        mode={confirm ? "reload" : null}
        impact={confirm}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          setConfirm(null);
          void runDemo();
        }}
      />
    </div>
  );
}
