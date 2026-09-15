"use client";

import { useCallback, useMemo } from "react";

import { useLocalStorage } from "@/lib/storage";

/**
 * Calculator input state, persisted per tool.
 *
 * Every calculator ships with defaults that already produce a meaningful
 * answer, so the first paint is never an empty form. Whatever the visitor
 * types then replaces those defaults in `localStorage` under
 * `ppc-academy:calc:<id>` and survives a reload.
 *
 * The stored object is merged over the defaults on read. That matters because
 * a saved value from an earlier visit may predate a field added since: merging
 * keeps the old answers and fills the gap rather than throwing the lot away.
 */
export interface CalcState<T> {
  values: T;
  /** Update one field. */
  set: <K extends keyof T>(field: K, value: T[K]) => void;
  /** Replace the whole object — used by row editors and paste handlers. */
  replace: (next: T | ((previous: T) => T)) => void;
  /** Drop the stored value and go back to the shipped defaults. */
  reset: () => void;
  /** False until localStorage has been read. */
  ready: boolean;
}

export function useCalcState<T extends object>(id: string, defaults: T): CalcState<T> {
  const [stored, write, meta] = useLocalStorage<T>(`calc:${id}`, defaults);

  const values = useMemo(
    () => ({ ...defaults, ...stored }) as T,
    // `defaults` is a module-level constant in every caller; spreading it on
    // each render would still be correct, but memoising on its identity keeps
    // the derived-value chain below stable.
    [defaults, stored],
  );

  const set = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      write((previous) => ({ ...defaults, ...previous, [field]: value }));
    },
    [write, defaults],
  );

  const replace = useCallback(
    (next: T | ((previous: T) => T)) => {
      write((previous) =>
        typeof next === "function"
          ? (next as (previous: T) => T)({ ...defaults, ...previous })
          : next,
      );
    },
    [write, defaults],
  );

  const reset = useCallback(() => {
    meta.reset();
  }, [meta]);

  return { values, set, replace, reset, ready: meta.ready };
}
