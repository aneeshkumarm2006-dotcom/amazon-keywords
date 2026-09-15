import { useCallback, useMemo, useState, useSyncExternalStore } from "react";

/**
 * SSR-safe, namespaced localStorage.
 *
 * Every key written by the app is prefixed with `ppc-academy:` so the site
 * never collides with anything else on the origin. All reads and writes are
 * wrapped in try/catch: Safari private mode, disabled storage and quota
 * errors must never crash a page — when persistence is impossible the values
 * fall back to an in-memory store so the UI still behaves correctly for the
 * length of the session.
 *
 * This module intentionally has NO "use client" directive — the plain
 * functions are safe to import from server modules (they no-op on the
 * server), while the hooks are compiled into whichever client bundle
 * imports them.
 */

export const STORAGE_PREFIX = "ppc-academy:";

/** Key used by the no-flash theme script in `app/layout.tsx`. */
export const THEME_STORAGE_KEY = `${STORAGE_PREFIX}theme`;

/** Fired on the window when any namespaced key changes in this tab. */
const LOCAL_CHANGE_EVENT = "ppc-academy:storage";

/** Session fallback for browsers that refuse localStorage entirely. */
const memoryStore = new Map<string, string>();

export function storageKey(key: string): string {
  return key.startsWith(STORAGE_PREFIX) ? key : `${STORAGE_PREFIX}${key}`;
}

function localStorageOrNull(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage ?? null;
  } catch {
    return null;
  }
}

function notify(key: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(LOCAL_CHANGE_EVENT, { detail: { key } }));
}

/** Raw string read, used directly by the `useSyncExternalStore` snapshot. */
function readRaw(fullKey: string): string | null {
  const store = localStorageOrNull();
  if (store) {
    try {
      const value = store.getItem(fullKey);
      if (value !== null) return value;
    } catch {
      /* fall through to the memory store */
    }
  }
  return memoryStore.get(fullKey) ?? null;
}

function writeRaw(fullKey: string, raw: string): void {
  const store = localStorageOrNull();
  if (store) {
    try {
      store.setItem(fullKey, raw);
      memoryStore.delete(fullKey);
      notify(fullKey);
      return;
    } catch {
      /* quota exceeded or storage blocked — keep it in memory instead */
    }
  }
  memoryStore.set(fullKey, raw);
  notify(fullKey);
}

function parseOr<T>(raw: string | null, fallback: T): T {
  if (raw === null) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Read a JSON value. Returns `fallback` on the server or on any failure. */
export function storageGet<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  return parseOr(readRaw(storageKey(key)), fallback);
}

/** Write a JSON value. Silently no-ops on the server. */
export function storageSet<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    writeRaw(storageKey(key), JSON.stringify(value));
  } catch {
    /* value was not serialisable — nothing to persist */
  }
}

/** Remove a single namespaced key. */
export function storageRemove(key: string): void {
  if (typeof window === "undefined") return;
  const full = storageKey(key);
  const store = localStorageOrNull();
  try {
    store?.removeItem(full);
  } catch {
    /* ignore */
  }
  memoryStore.delete(full);
  notify(full);
}

/** Every namespaced key currently present. Useful for a "reset everything" action. */
export function storageKeys(): string[] {
  if (typeof window === "undefined") return [];
  const keys = new Set<string>(memoryStore.keys());
  const store = localStorageOrNull();
  try {
    if (store) {
      for (let i = 0; i < store.length; i += 1) {
        const key = store.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) keys.add(key);
      }
    }
  } catch {
    /* ignore */
  }
  return Array.from(keys);
}

/** Wipe every `ppc-academy:` key. Leaves the rest of the origin untouched. */
export function storageClearAll(): void {
  if (typeof window === "undefined") return;
  const store = localStorageOrNull();
  for (const key of storageKeys()) {
    try {
      store?.removeItem(key);
    } catch {
      /* ignore */
    }
  }
  memoryStore.clear();
  notify("*");
}

/* ------------------------------------------------------------------ *
 * Hooks
 * ------------------------------------------------------------------ */

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onChange);
  window.addEventListener(LOCAL_CHANGE_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(LOCAL_CHANGE_EVENT, onChange);
  };
}

const noopSubscribe = () => () => {};

/**
 * False during SSR and the hydrating render, true afterwards. Use it to gate
 * anything that would otherwise produce a hydration mismatch.
 */
export function useIsHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

export interface UseLocalStorageMeta {
  /** True once the value reflects what is actually in storage. */
  ready: boolean;
  /** Restore the initial value and drop the stored key. */
  reset: () => void;
}

/**
 * `useState` backed by localStorage.
 *
 * Renders `initialValue` on the server and during hydration, then swaps in
 * the stored value — via `useSyncExternalStore`, so there is no cascading
 * render. Stays in sync across tabs and across every other hook on the key.
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T,
): [T, (value: T | ((previous: T) => T)) => void, UseLocalStorageMeta] {
  const fullKey = storageKey(key);
  // `useState` freezes the seed on first render, so a caller passing an object
  // literal does not change the parsed value's identity on every render.
  const [seed] = useState(initialValue);

  const raw = useSyncExternalStore(
    subscribe,
    useCallback(() => readRaw(fullKey), [fullKey]),
    () => null,
  );

  const value = useMemo(() => parseOr<T>(raw, seed), [raw, seed]);
  const ready = useIsHydrated();

  const update = useCallback(
    (next: T | ((previous: T) => T)) => {
      const current = storageGet<T>(fullKey, seed);
      const resolved =
        typeof next === "function" ? (next as (previous: T) => T)(current) : next;
      storageSet(fullKey, resolved);
    },
    [fullKey, seed],
  );

  const reset = useCallback(() => {
    storageRemove(fullKey);
  }, [fullKey]);

  const meta = useMemo(() => ({ ready, reset }), [ready, reset]);

  return [value, update, meta];
}
