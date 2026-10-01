"use client";

import { useCallback, useSyncExternalStore } from "react";

import { todayIso } from "@/lib/ppc";

import { DEFAULT_PERIOD, isPeriodDays, type PeriodDays } from "./compute";

/**
 * Per-browser overview preferences. Stored under the `ppc-console:` prefix on
 * purpose: the academy's progress Export/Reset wipes `ppc-academy:*`, and the
 * console's settings must survive that.
 */
const PERIOD_KEY = "ppc-console:overview-period";
const PERIOD_EVENT = "ppc-console:overview-period-change";

/** Session fallback when localStorage refuses (private mode, blocked storage). */
let memoryPeriod: PeriodDays | null = null;

function readPeriod(): PeriodDays {
  try {
    const raw = window.localStorage.getItem(PERIOD_KEY);
    const n = raw === null ? NaN : Number(raw);
    if (isPeriodDays(n)) return n;
  } catch {
    /* storage unavailable: fall through */
  }
  return memoryPeriod ?? DEFAULT_PERIOD;
}

function subscribePeriod(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PERIOD_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(PERIOD_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(PERIOD_EVENT, onChange);
  };
}

const serverPeriod = (): PeriodDays => DEFAULT_PERIOD;

/** The overview period in days (7/14/30/60/90), remembered per browser. */
export function usePeriodPreference(): [PeriodDays, (days: PeriodDays) => void] {
  const days = useSyncExternalStore(subscribePeriod, readPeriod, serverPeriod);
  const setDays = useCallback((next: PeriodDays) => {
    memoryPeriod = next;
    try {
      window.localStorage.setItem(PERIOD_KEY, String(next));
    } catch {
      /* memory fallback already set */
    }
    window.dispatchEvent(new Event(PERIOD_EVENT));
  }, []);
  return [days, setDays];
}

function subscribeToday(onChange: () => void): () => void {
  // A tab left open overnight picks up the new day when it is looked at again.
  const onVisible = () => {
    if (document.visibilityState === "visible") onChange();
  };
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("focus", onChange);
  return () => {
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("focus", onChange);
  };
}

const serverToday = () => "";

/** Today's local date ("YYYY-MM-DD"); "" during prerender. */
export function useToday(): string {
  return useSyncExternalStore(subscribeToday, todayIso, serverToday);
}
