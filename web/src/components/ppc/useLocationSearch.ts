"use client";

import { useMemo, useSyncExternalStore } from "react";

/**
 * Query-string reader for console pages, used instead of `useSearchParams()`.
 *
 * In a static export `useSearchParams()` forces a client-side-rendering bailout:
 * the prerendered HTML holds the <Suspense> fallback and React only swaps the
 * real content in through a scheduling path that never runs in a fully hidden
 * tab (no requestAnimationFrame / requestIdleCallback), so a console page opened
 * in a background tab sat on its skeleton until focused. Reading
 * `window.location.search` through `useSyncExternalStore` renders the server
 * snapshot ("") during hydration and the real query right after — no Suspense.
 *
 * Next's router and our own `history.replaceState` calls change the URL without
 * a `popstate`, so the history methods are wrapped once to announce changes.
 */

const LOCATION_EVENT = "ppc-console:location";
let patched = false;

function patchHistory() {
  if (patched || typeof window === "undefined") return;
  patched = true;
  for (const method of ["pushState", "replaceState"] as const) {
    const original = window.history[method];
    window.history[method] = function patchedHistoryMethod(this: History, ...args: Parameters<History["pushState"]>) {
      const result = original.apply(this, args);
      window.dispatchEvent(new Event(LOCATION_EVENT));
      return result;
    };
  }
}

function subscribe(onChange: () => void) {
  patchHistory();
  window.addEventListener("popstate", onChange);
  window.addEventListener(LOCATION_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(LOCATION_EVENT, onChange);
  };
}

const getSnapshot = () => window.location.search;
const getServerSnapshot = () => "";

/** Current `URLSearchParams`; empty on the server and during hydration. */
export function useLocationSearch(): URLSearchParams {
  const search = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(() => new URLSearchParams(search), [search]);
}
