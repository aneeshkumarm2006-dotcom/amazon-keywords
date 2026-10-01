"use client";

import {
  CircleCheck,
  Download,
  EllipsisVertical,
  Share,
  Smartphone,
  SquarePlus,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useState } from "react";

import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

import { promptInstall, useInstallState, type InstallPlatform } from "./install-store";

/**
 * "Add to home screen" explainer.
 *
 * `variant="footer"` is a compact strip for the site footer; `variant="panel"`
 * is the fuller dashboard card. Both show the steps for the device you are
 * actually holding, and both fire the native prompt when the browser offers
 * one instead of making you hunt through a menu.
 */

export interface AddToHomeScreenProps {
  variant?: "footer" | "panel";
  className?: string;
}

interface Steps {
  heading: string;
  steps: { icon?: typeof Share; text: React.ReactNode }[];
}

const IOS_STEPS: Steps = {
  heading: "On iPhone and iPad",
  steps: [
    {
      icon: Share,
      text: (
        <>
          Tap <strong className="font-semibold">Share</strong> in the browser toolbar.
        </>
      ),
    },
    {
      icon: SquarePlus,
      text: (
        <>
          Choose <strong className="font-semibold">Add to Home Screen</strong>.
        </>
      ),
    },
    {
      text: (
        <>
          Tap <strong className="font-semibold">Add</strong> — the icon appears with your apps.
        </>
      ),
    },
  ],
};

const ANDROID_STEPS: Steps = {
  heading: "On Android",
  steps: [
    {
      icon: EllipsisVertical,
      text: (
        <>
          Open the browser menu (<strong className="font-semibold">⋮</strong>).
        </>
      ),
    },
    {
      icon: Smartphone,
      text: (
        <>
          Tap <strong className="font-semibold">Install app</strong> or{" "}
          <strong className="font-semibold">Add to Home screen</strong>.
        </>
      ),
    },
    { text: <>Confirm, and it opens full-screen from then on.</> },
  ],
};

const DESKTOP_STEPS: Steps = {
  heading: "On desktop",
  steps: [
    {
      icon: Download,
      text: (
        <>
          Click the install icon at the right of the address bar in Chrome or Edge.
        </>
      ),
    },
    {
      icon: EllipsisVertical,
      text: (
        <>
          Or use the browser menu:{" "}
          <strong className="font-semibold">Cast, save and share → Install</strong>.
        </>
      ),
    },
    { text: <>It gets its own window, dock icon and taskbar entry.</> },
  ],
};

function stepsFor(platform: InstallPlatform): Steps {
  if (platform === "ios") return IOS_STEPS;
  if (platform === "android") return ANDROID_STEPS;
  return DESKTOP_STEPS;
}

function otherSteps(platform: InstallPlatform): Steps[] {
  return [IOS_STEPS, ANDROID_STEPS, DESKTOP_STEPS].filter(
    (set) => set.heading !== stepsFor(platform).heading,
  );
}

function StepList({ set, compact }: { set: Steps; compact?: boolean }) {
  return (
    <ol className={cn("space-y-2", compact && "space-y-1.5")}>
      {set.steps.map((step, index) => {
        const Icon = step.icon;
        return (
          <li key={index} className="flex items-start gap-2.5 text-xs leading-relaxed text-muted">
            <span
              className="tabular mt-px flex size-5 shrink-0 items-center justify-center rounded-md bg-surface-2 text-[0.625rem] font-semibold text-faint"
              aria-hidden="true"
            >
              {index + 1}
            </span>
            {Icon ? (
              <Icon className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
            ) : (
              <span className="size-3.5 shrink-0" aria-hidden="true" />
            )}
            <span className="min-w-0">{step.text}</span>
          </li>
        );
      })}
    </ol>
  );
}

export function AddToHomeScreen({ variant = "panel", className }: AddToHomeScreenProps) {
  const install = useInstallState();
  const [outcome, setOutcome] = useState<"accepted" | "dismissed" | "unavailable" | null>(null);

  const onInstall = useCallback(async () => {
    setOutcome(await promptInstall());
  }, []);

  const installed = install.standalone || install.installed || outcome === "accepted";
  const primary = stepsFor(install.platform);

  /* ------------------------------------------------------- footer variant */
  if (variant === "footer") {
    return (
      <div
        className={cn(
          "rounded-xl border border-hairline bg-surface-2/60 p-4 sm:flex sm:items-center sm:gap-4",
          className,
        )}
      >
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Smartphone className="size-4 shrink-0 text-brand" aria-hidden="true" />
            {installed ? "Installed — you are running the app" : "Add PPC Academy to your home screen"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {installed ? (
              <>
                Pages you have opened stay readable without a connection. The{" "}
                <Link
                  href="/offline"
                  className="rounded text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  offline page
                </Link>{" "}
                lists what is saved.
              </>
            ) : install.isIos ? (
              <>
                Tap <strong className="font-semibold text-ink">Share</strong> →{" "}
                <strong className="font-semibold text-ink">Add to Home Screen</strong>. It opens
                full-screen and the pages you have read keep working offline.
              </>
            ) : (
              <>
                It opens full-screen with no browser bar, and the pages you have read keep working
                on a dropped connection. No app store, no account.
              </>
            )}
          </p>
        </div>
        {!installed && install.canPrompt ? (
          <div className="mt-3 shrink-0 sm:mt-0">
            <Button size="md" icon={Download} onClick={onInstall} className="w-full sm:w-auto">
              Install
            </Button>
          </div>
        ) : null}
      </div>
    );
  }

  /* -------------------------------------------------------- panel variant */
  return (
    <section
      aria-labelledby="a2hs-heading"
      className={cn("rounded-2xl border border-hairline bg-surface", className)}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-5 py-4">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
            <Smartphone className="size-3.5" aria-hidden="true" />
            Install
          </p>
          <h2 id="a2hs-heading" className="mt-1.5 font-display text-lg font-bold text-ink">
            {installed ? "You are running the installed app" : "Put this on your home screen"}
          </h2>
          <p className="mt-1.5 max-w-xl text-[0.8125rem] leading-relaxed text-muted">
            {installed
              ? "Everything below keeps working without a connection once you have opened it. Your scores stay in this app's own storage — export them from the data panel before switching devices."
              : "PPC Academy installs like an app: full-screen, no browser bar, its own icon. Every page you have opened is saved, so a dropped connection on a client call does not cost you the SOP you were reading."}
          </p>
        </div>
        {installed ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-good-soft px-2.5 py-1 text-xs font-medium text-good">
            <CircleCheck className="size-3.5" aria-hidden="true" />
            Standalone
          </span>
        ) : install.canPrompt ? (
          <Button size="md" icon={Download} onClick={onInstall}>
            Install now
          </Button>
        ) : null}
      </div>

      {!installed ? (
        <div className="grid gap-5 px-5 py-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2.5 text-[0.8125rem] font-semibold text-ink">{primary.heading}</h3>
            <StepList set={primary} />
            {outcome === "dismissed" ? (
              <p className="mt-2.5 text-xs text-faint">
                No problem — the browser install icon stays in the address bar whenever you change
                your mind.
              </p>
            ) : null}
          </div>

          <div>
            <h3 className="mb-2.5 text-[0.8125rem] font-semibold text-ink">What you get</h3>
            <ul className="space-y-2 text-xs leading-relaxed text-muted">
              <li className="flex items-start gap-2.5">
                <WifiOff className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  Offline reading for everything you have opened, plus the quizzes, SOP index,
                  cheat sheets and calculators, which are saved on first visit.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <Smartphone className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  Shortcuts straight into quizzes, calculators, the daily health check SOP and
                  your progress page from a long-press on the icon.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CircleCheck className="mt-0.5 size-3.5 shrink-0 text-brand" aria-hidden="true" />
                <span>
                  Under a megabyte, no account, no app store. On Android the installed app shares
                  storage with your browser; on iPhone it keeps its own copy, so export your
                  progress first if you want your scores to come with you.
                </span>
              </li>
            </ul>
          </div>

          <details className="group sm:col-span-2">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center text-xs font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden">
              Steps for other devices
            </summary>
            <div className="mt-2 grid gap-5 border-t border-hairline pt-3 sm:grid-cols-2">
              {otherSteps(install.platform).map((set) => (
                <div key={set.heading}>
                  <h3 className="mb-2 text-[0.8125rem] font-semibold text-ink">{set.heading}</h3>
                  <StepList set={set} compact />
                </div>
              ))}
            </div>
          </details>
        </div>
      ) : (
        <div className="px-5 py-4">
          <Link
            href="/offline"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg text-[0.8125rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            See what is saved for offline use
          </Link>
        </div>
      )}
    </section>
  );
}
