"use client";

import { useCallback, useRef } from "react";

import { Skeleton } from "@/components/ui/Skeleton";

import { ConsoleEmpty } from "../ConsoleEmpty";
import { ConsolePageHeader } from "../ConsolePageHeader";
import { ALL_STORES, useActiveScope } from "../hooks";
import { useLocationSearch } from "../useLocationSearch";
import { parseView, type ViewId } from "../work/recs";
import { RecWorkspace } from "./RecWorkspace";
import { StorePicker } from "./StorePicker";

/**
 * `/dashboard/keywords` — the recommendation workbench.
 *
 * Reads `?view=` (harvest | negatives | bids | flags | skipped | approved),
 * `?q=` (initial search) and `?decided=1` (start with decided rows shown) with
 * `useLocationSearch` (not `useSearchParams`, which needs a Suspense bailout).
 * View changes are written back with `history.replaceState`.
 */
export function KeywordsConsole() {
  const params = useLocationSearch();
  const view = parseView(params.get("view"));
  const query = params.get("q") ?? "";
  // Links to a rec that already has a decision (Bids page) open with decided rows shown.
  const showDecided = params.get("decided") === "1";
  const { scope, ready, setScope, stores, activeStore } = useActiveScope();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const setView = useCallback((v: ViewId) => {
    const p = new URLSearchParams(window.location.search);
    p.set("view", v);
    p.delete("q");
    p.delete("decided");
    window.history.replaceState(null, "", `?${p.toString()}`);
  }, []);

  const switchScope = useCallback(
    (next: string) => {
      setScope(next);
      requestAnimationFrame(() => titleRef.current?.focus());
    },
    [setScope],
  );

  if (!ready) return <KeywordsFallback />;

  if (!stores.length) {
    return (
      <>
        <ConsolePageHeader title="Keywords" description={<p>Harvest winners, block wasted searches and tune bids — one store at a time.</p>} />
        <ConsoleEmpty reason="no-stores" />
      </>
    );
  }

  if (scope === ALL_STORES || !activeStore) {
    return (
      <>
        <div className="mb-6 max-w-3xl">
          <h1 ref={titleRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink focus:outline-none sm:text-[1.75rem]">
            Keywords
          </h1>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted">
            Recommendations are worked out per store, against that store&apos;s own target ACoS and bulk file. Pick a store to review its
            harvests, negatives and bid changes.
          </p>
        </div>
        <StorePicker
          stores={stores}
          onPick={switchScope}
          title="Choose a store"
          description="Open counts are recommendations still waiting for a decision. Impact is the rough monthly money at stake."
        />
      </>
    );
  }

  return (
    <RecWorkspace
      key={activeStore.id}
      store={activeStore}
      storeCount={stores.length}
      view={view}
      onView={setView}
      initialQuery={query}
      initialShowDecided={showDecided}
      onAllStores={() => switchScope(ALL_STORES)}
      titleRef={titleRef}
    />
  );
}

/** Matches the page's shape so nothing jumps when the island mounts. */
export function KeywordsFallback() {
  return (
    <div aria-hidden="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-3 h-5 w-72" />
      <div className="mt-5 grid gap-px overflow-hidden rounded-xl border border-hairline sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-surface px-4 py-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="mt-2 h-5 w-32" />
          </div>
        ))}
      </div>
      <div className="mt-5 flex gap-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-9 w-24" />
        ))}
      </div>
      <Skeleton className="mt-4 h-72 w-full rounded-xl" />
    </div>
  );
}
