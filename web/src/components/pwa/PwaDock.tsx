"use client";

import { InstallPrompt } from "./InstallPrompt";
import { ServiceWorkerManager } from "./ServiceWorkerManager";

/**
 * One bottom-anchored stack for everything the PWA layer can say, so the
 * update toast and the install card can never land on top of each other.
 *
 * The wrapper itself ignores pointer events; each card re-enables them. The
 * bottom padding clears the phone tab bar and the home indicator, and drops
 * back to a normal gutter from `md` up where the tab bar is gone.
 */
export function PwaDock() {
  return (
    <div
      className={
        "pointer-events-none fixed inset-x-0 bottom-0 z-[45] flex flex-col items-center gap-2 px-3 " +
        "pb-[calc(env(safe-area-inset-bottom)+4.25rem)] md:items-end md:px-4 " +
        "md:pb-[calc(env(safe-area-inset-bottom)+1rem)]"
      }
    >
      <ServiceWorkerManager />
      <InstallPrompt />
    </div>
  );
}
