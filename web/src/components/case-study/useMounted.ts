"use client";

import { useSyncExternalStore } from "react";

/**
 * False on the server and during hydration, true once the client has taken
 * over. Gate anything that measures the DOM on it — every chart on this route
 * — so the static export's HTML and the first client render agree.
 *
 * It announces the change from `subscribe` rather than relying on React
 * noticing that a snapshot moved at the end of hydration. Both of this
 * route's client islands mount inside a `<Suspense>` boundary, because they
 * read `useSearchParams`, and a chart that never learns it is on the client
 * stays a grey rectangle forever. One microtask after subscribing is early
 * enough to be invisible and late enough to be certain.
 */
function subscribe(onStoreChange: () => void): () => void {
  let live = true;
  queueMicrotask(() => {
    if (live) onStoreChange();
  });
  return () => {
    live = false;
  };
}

const onClient = () => true;
const onServer = () => false;

export function useMounted(): boolean {
  return useSyncExternalStore(subscribe, onClient, onServer);
}
