"use client";

import { RefreshCw, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { withBasePath } from "@/lib/site";

/**
 * Registers `sw.js` in production and surfaces one thing to the user: a
 * quiet "new version available" toast once a newer worker has taken over.
 *
 * The worker calls `skipWaiting()` during install and `clients.claim()` on
 * activate, so an update lands the moment it downloads. The page the user is
 * looking at is still running the previous JS bundle at that point, which is
 * why the reload is offered rather than forced — nobody should lose a
 * half-finished quiz to a background deploy.
 */

/**
 * Both the script URL and the scope carry the deployment's base path. The
 * scope matters as much as the URL: a worker's default scope is the directory
 * its script was served from, and registering it against the wrong prefix
 * means it controls nothing and the site is never available offline.
 */
const SW_URL = withBasePath("/sw.js");
const SW_SCOPE = withBasePath("/");
/** Re-check for a new build roughly every 30 minutes on a long-lived tab. */
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export function ServiceWorkerManager() {
  const [updateReady, setUpdateReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [reloading, setReloading] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const reloadingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // In development a stale production worker would serve cached bundles over
    // the dev server, so any existing registration is torn down instead.
    if (process.env.NODE_ENV !== "production") {
      navigator.serviceWorker
        .getRegistrations()
        .then((registrations) => {
          for (const registration of registrations) void registration.unregister();
        })
        .catch(() => {
          /* nothing registered */
        });
      return;
    }

    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;
    const hadController = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      // A different worker is now in charge. On a first-ever install that is
      // expected and silent; afterwards it means the build changed.
      if (reloadingRef.current) return;
      if (hadController) setUpdateReady(true);
    };

    const watchInstalling = (worker: ServiceWorker | null) => {
      if (!worker) return;
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) {
          setUpdateReady(true);
        }
      });
    };

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register(SW_URL, { scope: SW_SCOPE });
        if (cancelled) return;
        registrationRef.current = registration;

        if (registration.waiting && navigator.serviceWorker.controller) setUpdateReady(true);
        watchInstalling(registration.installing);
        registration.addEventListener("updatefound", () =>
          watchInstalling(registration.installing),
        );

        interval = setInterval(() => {
          registration.update().catch(() => {
            /* offline, or the server is unreachable — try again next tick */
          });
        }, UPDATE_INTERVAL_MS);
      } catch {
        /* registration blocked (private mode, insecure origin) — the site
           still works, it just will not be available offline */
      }
    };

    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Registering after `load` keeps the worker off the critical path.
    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener("load", register, { once: true });
    }

    const onVisible = () => {
      if (document.visibilityState !== "visible") return;
      registrationRef.current?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (interval) clearInterval(interval);
      window.removeEventListener("load", register);
      document.removeEventListener("visibilitychange", onVisible);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  const reload = useCallback(() => {
    reloadingRef.current = true;
    setReloading(true);
    const waiting = registrationRef.current?.waiting;
    if (waiting) {
      // Tell a worker that is still parked to take over, then reload once it
      // has — otherwise the refreshed page would load under the old worker.
      const onChange = () => {
        navigator.serviceWorker.removeEventListener("controllerchange", onChange);
        window.location.reload();
      };
      navigator.serviceWorker.addEventListener("controllerchange", onChange);
      waiting.postMessage({ type: "SKIP_WAITING" });
      // Safety net: reload anyway if the worker never reports back.
      setTimeout(() => window.location.reload(), 2000);
      return;
    }
    window.location.reload();
  }, []);

  if (!updateReady || dismissed) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-auto w-full max-w-sm rounded-xl border border-hairline bg-surface p-3 shadow-card sm:w-auto"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand-soft text-brand"
          aria-hidden="true"
        >
          <RefreshCw className="size-[1.125rem]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-[0.8125rem] leading-snug font-semibold text-ink">
            New version available
          </p>
          <p className="mt-0.5 text-xs leading-snug text-muted">
            Reload to pick up the latest content and fixes.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss the update notice"
          className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2.5 flex sm:justify-end">
        <Button
          size="md"
          icon={RefreshCw}
          onClick={reload}
          disabled={reloading}
          className="w-full sm:w-auto"
        >
          {reloading ? "Reloading…" : "Reload now"}
        </Button>
      </div>
    </div>
  );
}
