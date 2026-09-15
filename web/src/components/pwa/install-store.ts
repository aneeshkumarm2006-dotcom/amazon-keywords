"use client";

import { useSyncExternalStore } from "react";

/**
 * Install state, shared by every component that cares about it.
 *
 * `beforeinstallprompt` fires once, early, and only Chromium fires it at all.
 * A React component that mounts after the event has gone would never see it,
 * so the listener is attached at module scope (the module is pulled into the
 * first client chunk by the root layout) and the event is parked here.
 */

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: readonly string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

export type InstallPlatform = "ios" | "android" | "desktop" | "unknown";

export interface InstallState {
  /** A native install prompt is parked and ready to fire. */
  canPrompt: boolean;
  /** The app is already running from the home screen / an app window. */
  standalone: boolean;
  /** `appinstalled` fired during this session. */
  installed: boolean;
  platform: InstallPlatform;
  /** iOS cannot prompt programmatically — the Share sheet is the only route. */
  isIos: boolean;
  /** iOS Safari specifically (Chrome/Firefox on iOS word the menu differently). */
  isIosSafari: boolean;
  /** Everything has been measured in a real browser. */
  ready: boolean;
}

const SERVER_STATE: InstallState = {
  canPrompt: false,
  standalone: false,
  installed: false,
  platform: "unknown",
  isIos: false,
  isIosSafari: false,
  ready: false,
};

let state: InstallState = SERVER_STATE;
let deferred: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function setState(patch: Partial<InstallState>): void {
  const next = { ...state, ...patch };
  const changed = (Object.keys(next) as (keyof InstallState)[]).some(
    (key) => next[key] !== state[key],
  );
  if (!changed) return;
  state = next;
  emit();
}

function detectStandalone(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const displayMode =
      window.matchMedia("(display-mode: standalone)").matches ||
      window.matchMedia("(display-mode: minimal-ui)").matches ||
      window.matchMedia("(display-mode: fullscreen)").matches;
    // iOS Safari predates the display-mode query and uses this instead.
    const iosStandalone =
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
    return displayMode || iosStandalone;
  } catch {
    return false;
  }
}

function detectPlatform(): {
  platform: InstallPlatform;
  isIos: boolean;
  isIosSafari: boolean;
} {
  if (typeof navigator === "undefined") {
    return { platform: "unknown", isIos: false, isIosSafari: false };
  }
  const ua = navigator.userAgent || "";
  // iPadOS 13+ reports a desktop Mac UA, so the touch-point count is the tell.
  const iPadOs =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  const isIos = /iPhone|iPad|iPod/i.test(ua) || iPadOs;
  const isAndroid = /Android/i.test(ua);
  const isIosSafari = isIos && !/CriOS|FxiOS|EdgiOS|OPiOS|Chrome/i.test(ua);

  return {
    platform: isIos ? "ios" : isAndroid ? "android" : "desktop",
    isIos,
    isIosSafari,
  };
}

let initialised = false;

function init(): void {
  if (initialised || typeof window === "undefined") return;
  initialised = true;

  const detected = detectPlatform();
  state = {
    ...state,
    ...detected,
    standalone: detectStandalone(),
    ready: true,
  };

  window.addEventListener("beforeinstallprompt", (event) => {
    // Keep the browser's own mini-infobar out of the way; the app shows a
    // card of its own at a moment that makes sense.
    event.preventDefault();
    deferred = event as BeforeInstallPromptEvent;
    setState({ canPrompt: true });
  });

  window.addEventListener("appinstalled", () => {
    deferred = null;
    setState({ canPrompt: false, installed: true, standalone: true });
  });

  try {
    const query = window.matchMedia("(display-mode: standalone)");
    const onChange = () => setState({ standalone: detectStandalone() });
    if (typeof query.addEventListener === "function") {
      query.addEventListener("change", onChange);
    } else if (typeof query.addListener === "function") {
      query.addListener(onChange);
    }
  } catch {
    /* matchMedia unavailable — the one-off read above still stands */
  }
}

init();

function subscribe(onChange: () => void): () => void {
  init();
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}

/** Live install state. Returns the inert server snapshot until hydrated. */
export function useInstallState(): InstallState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => SERVER_STATE,
  );
}

/**
 * Fire the parked native prompt. Resolves with the user's choice, or
 * `"unavailable"` when no prompt was ever offered (iOS, Firefox, already
 * installed, or the event has been spent).
 */
export async function promptInstall(): Promise<"accepted" | "dismissed" | "unavailable"> {
  const event = deferred;
  if (!event) return "unavailable";
  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    deferred = null;
    setState({ canPrompt: false, installed: outcome === "accepted" ? true : state.installed });
    return outcome;
  } catch {
    deferred = null;
    setState({ canPrompt: false });
    return "unavailable";
  }
}
