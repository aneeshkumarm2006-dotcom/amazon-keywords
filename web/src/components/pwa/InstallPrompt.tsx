"use client";

import { Download, Share, SquarePlus, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

import { Button } from "@/components/ui/Button";
import { useLocalStorage } from "@/lib/storage";

import { promptInstall, useInstallState } from "./install-store";

/**
 * The install card.
 *
 * Rules it follows so it never feels like an ad:
 *   - nothing appears for the first 12 seconds of a session
 *   - nothing appears at all when the app is already installed
 *   - a dismissal is remembered for 30 days, and three dismissals are final
 *   - iOS gets the manual Share-sheet steps, because Safari has no prompt
 */

const DISMISS_KEY = "pwa:install-dismissed";
const DISMISS_DAYS = 30;
const MAX_DISMISSALS = 3;
const APPEAR_AFTER_MS = 12_000;

interface DismissRecord {
  at: number;
  count: number;
}

const NO_DISMISSAL: DismissRecord = { at: 0, count: 0 };

export function InstallPrompt() {
  const install = useInstallState();
  const [record, setRecord, meta] = useLocalStorage<DismissRecord>(DISMISS_KEY, NO_DISMISSAL);
  const [waited, setWaited] = useState(false);
  const [closed, setClosed] = useState(false);
  // One clock, read on mount: the snooze window must not shift mid-session.
  const [now] = useState(() => Date.now());

  useEffect(() => {
    const timer = setTimeout(() => setWaited(true), APPEAR_AFTER_MS);
    return () => clearTimeout(timer);
  }, []);

  const dismiss = useCallback(() => {
    setClosed(true);
    setRecord((previous) => ({ at: Date.now(), count: (previous?.count ?? 0) + 1 }));
  }, [setRecord]);

  const accept = useCallback(async () => {
    const outcome = await promptInstall();
    if (outcome === "accepted" || outcome === "unavailable") setClosed(true);
    if (outcome === "dismissed") dismiss();
  }, [dismiss]);

  const snoozed =
    record.count >= MAX_DISMISSALS ||
    (record.at > 0 && now - record.at < DISMISS_DAYS * 24 * 60 * 60 * 1000);

  // iOS never fires `beforeinstallprompt`, so the manual route is the only one.
  const iosRoute = install.isIos && !install.canPrompt;
  const showable = install.ready && !install.standalone && !install.installed;
  const hasRoute = install.canPrompt || iosRoute;

  if (!showable || !hasRoute || !waited || closed || !meta.ready || snoozed) return null;

  return (
    <div
      role="complementary"
      aria-label="Install PPC Academy"
      className="pointer-events-auto w-full max-w-sm rounded-xl border border-hairline bg-surface p-4 shadow-card"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-brand text-on-brand"
          aria-hidden="true"
        >
          <Download className="size-[1.125rem]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="font-display text-sm leading-snug font-semibold text-ink">
            Install PPC Academy
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {iosRoute
              ? "Add it to your home screen and the SOPs, cheat sheets and calculators open like an app — no browser bar, and they keep working on a dropped connection."
              : "Keep the quizzes, SOPs and calculators one tap away. It installs in a second, takes almost no space, and the pages you have opened stay readable offline."}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss the install prompt"
          className="-mt-1 -mr-1 flex size-11 shrink-0 items-center justify-center rounded-lg text-faint transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>

      {iosRoute ? (
        <ol className="mt-3 space-y-2 border-t border-hairline pt-3">
          <li className="flex items-center gap-2.5 text-xs text-ink">
            <span
              className="tabular flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[0.6875rem] font-semibold text-muted"
              aria-hidden="true"
            >
              1
            </span>
            <Share className="size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              Tap <strong className="font-semibold">Share</strong> in the{" "}
              {install.isIosSafari ? "Safari" : "browser"} toolbar.
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-ink">
            <span
              className="tabular flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[0.6875rem] font-semibold text-muted"
              aria-hidden="true"
            >
              2
            </span>
            <SquarePlus className="size-4 shrink-0 text-brand" aria-hidden="true" />
            <span>
              Scroll and choose <strong className="font-semibold">Add to Home Screen</strong>.
            </span>
          </li>
          <li className="flex items-center gap-2.5 text-xs text-ink">
            <span
              className="tabular flex size-6 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[0.6875rem] font-semibold text-muted"
              aria-hidden="true"
            >
              3
            </span>
            <span className="size-4 shrink-0" aria-hidden="true" />
            <span>
              Tap <strong className="font-semibold">Add</strong>. The icon lands on your home
              screen.
            </span>
          </li>
        </ol>
      ) : (
        <div className="mt-3 flex gap-2">
          <Button size="md" icon={Download} onClick={accept} className="flex-1">
            Install
          </Button>
          <Button size="md" variant="secondary" onClick={dismiss}>
            Not now
          </Button>
        </div>
      )}
    </div>
  );
}
