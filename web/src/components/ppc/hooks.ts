"use client";

/**
 * PPC console data layer — the React side of `src/lib/ppc/db.ts`.
 *
 * Every console page reads through these hooks; nothing else should call the
 * db read functions from a component. Writes go straight to db.ts (saveStore,
 * importRows, …): each write emits a change event, the hooks bump the topics
 * it affects, and only the queries that depend on those topics reload.
 *
 * Design
 * - One module-level query cache keyed by string ("rows:all", "rows:<id>",
 *   "recs:<id>", …). A page switch re-mounts hooks against the same cache, so
 *   the previous result renders instantly while a stale one refreshes.
 * - Topic versions instead of the global db version: saving settings (the
 *   store switcher does, on every click) must not reload 100k rows.
 * - SSR-safe: the server snapshot is always "loading", and IndexedDB is only
 *   touched from effects on the client.
 * - Row caches are the heavy ones; at most ROW_CACHE_LIMIT unused row sets
 *   are kept (sets a mounted component is reading are never evicted).
 *
 * Contract for pages
 *   const { scope, ready } = useActiveScope();
 *   const { rows, loading } = useScopedRows(ready ? scope : null);
 * Passing `null` means "scope not resolved yet" and reports `loading: true`.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";

import {
  DEFAULT_SETTINGS,
  getAllBulk,
  getAllRows,
  getBulk,
  getRows,
  getSettings,
  getVersion,
  isDbAvailable,
  listBatches,
  listDecisions,
  listStores,
  liveBulkBatches,
  recommend,
  saveSettings,
  storeCounts,
  subscribe as subscribeDb,
  toBase,
  type BulkEntity,
  type ChangeScope,
  type ConsoleSettings,
  type DateWindow,
  type Decision,
  type ImportBatch,
  type Priority,
  type Recommendation,
  type RecommendResult,
  type SearchTermRow,
  type SkippedTerm,
  type Store,
  type StoreCounts,
} from "@/lib/ppc";

/* ------------------------------------------------------------------ types */

/** "all" or a store id. */
export type Scope = "all" | (string & {});

export const ALL_STORES = "all" as const;

export type DbStatus = "pending" | "ready" | "unavailable";

export interface QueryState<T> {
  data: T;
  /** No data for this key yet (first load, or scope still resolving). */
  loading: boolean;
  /** Showing cached data while a newer version loads. */
  refreshing: boolean;
  error?: string;
}

export interface StoreRecommendations extends RecommendResult {
  store: Store;
}

/* ----------------------------------------------------------------- topics */

type Topic = "settings" | "stores" | "rows" | "bulk" | "batches" | "decisions";

const ALL_TOPICS: Topic[] = ["settings", "stores", "rows", "bulk", "batches", "decisions"];

/** Which cached reads a db change invalidates. importRows/importBulk also write a batch. */
const AFFECTS: Record<ChangeScope, Topic[]> = {
  settings: ["settings"],
  stores: ["stores"],
  rows: ["rows", "batches"],
  bulk: ["bulk", "batches"],
  batches: ["batches"],
  decisions: ["decisions"],
  all: ALL_TOPICS,
};

const topicVersion: Record<Topic, number> = { settings: 0, stores: 0, rows: 0, bulk: 0, batches: 0, decisions: 0 };

// Stable topic lists (identity matters: they are effect dependencies).
const T_SETTINGS: readonly Topic[] = ["settings"];
const T_STORES: readonly Topic[] = ["stores"];
const T_ROWS: readonly Topic[] = ["rows"];
const T_BULK: readonly Topic[] = ["bulk"];
const T_BATCHES: readonly Topic[] = ["batches"];
const T_DECISIONS: readonly Topic[] = ["decisions"];
const T_RECS: readonly Topic[] = ["stores", "rows", "bulk"];
const T_COUNTS: readonly Topic[] = ["rows", "bulk", "batches", "decisions"];

function stampOf(topics: readonly Topic[]): string {
  let s = "";
  for (const t of topics) s += `${topicVersion[t]}.`;
  return s;
}

/* ------------------------------------------------------------ hook store */

const listeners = new Set<() => void>();
let dbBound = false;

function notifyHooks(): void {
  for (const l of [...listeners]) l();
}

function bindDb(): void {
  if (dbBound || typeof window === "undefined") return;
  dbBound = true;
  subscribeDb((scope) => {
    for (const t of AFFECTS[scope] ?? ALL_TOPICS) topicVersion[t]++;
    notifyHooks();
  });
}

function subscribeHooks(cb: () => void): () => void {
  bindDb();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Force every console query to reload (e.g. a "Try again" button). */
export function invalidateConsoleData(): void {
  for (const t of ALL_TOPICS) topicVersion[t]++;
  notifyHooks();
}

/* ------------------------------------------------------------ query cache */

interface Entry {
  data?: unknown;
  /** Topic stamp the data was loaded at. */
  stamp?: string;
  loading: boolean;
  error?: string;
}

const IDLE: Entry = Object.freeze({ loading: true }) as Entry;
const entries = new Map<string, Entry>();
const inflight = new Map<string, { stamp: string; promise: Promise<unknown> }>();

/** Mounted readers per key; row sets with readers are never evicted. */
const retained = new Map<string, number>();
const ROW_CACHE_LIMIT = 3;
const rowKeyOrder: string[] = [];

function evictRows(current: string): void {
  const idx = rowKeyOrder.indexOf(current);
  if (idx !== -1) rowKeyOrder.splice(idx, 1);
  rowKeyOrder.push(current);
  let unused = rowKeyOrder.filter((k) => k !== current && !retained.get(k));
  while (unused.length > ROW_CACHE_LIMIT - 1) {
    const victim = unused[0];
    unused = unused.slice(1);
    rowKeyOrder.splice(rowKeyOrder.indexOf(victim), 1);
    entries.delete(victim);
  }
}

function setEntry(key: string, entry: Entry): void {
  entries.set(key, entry);
  if (key.startsWith("rows:") && entry.data !== undefined) evictRows(key);
  notifyHooks();
}

function errorMessage(err: unknown): string {
  if (err instanceof Error) {
    // db.ts already retried once on a fresh connection; this one was lost again.
    if ((err.name === "InvalidStateError" || err.name === "UnknownError") && /clos|connection|lost/i.test(err.message)) {
      return `The connection to this browser's storage was lost (site data was cleared, or the browser restarted its storage). Press Try again; reload the page if it keeps happening. (${err.name}: ${err.message})`;
    }
    if (err.name === "InvalidStateError" || err.name === "SecurityError") {
      return `This browser refused to open local storage for the console — usually private browsing or blocked site data. Allow site data for this site, or use a normal window. (${err.name}: ${err.message})`;
    }
    if (err.name === "QuotaExceededError") {
      return "The browser is out of storage space for this site. Delete old imports or free up disk space, then try again.";
    }
    return err.message || err.name;
  }
  return String(err);
}

/**
 * Load `key` unless the cached value is current for `topics`. Concurrent
 * callers share one promise. Safe to call from loaders (nested queries).
 */
function ensure<T>(key: string, topics: readonly Topic[], loader: () => Promise<T>): Promise<T> {
  const stamp = stampOf(topics);
  const cur = entries.get(key);
  if (cur && cur.stamp === stamp && !cur.loading) {
    return cur.error !== undefined ? Promise.reject(new Error(cur.error)) : Promise.resolve(cur.data as T);
  }
  const running = inflight.get(key);
  if (running && running.stamp === stamp) return running.promise as Promise<T>;

  let promise: Promise<T>;
  try {
    promise = loader();
  } catch (err) {
    promise = Promise.reject(err);
  }
  inflight.set(key, { stamp, promise });
  setEntry(key, { data: cur?.data, stamp: cur?.stamp, loading: true });
  promise.then(
    (data) => {
      if (inflight.get(key)?.promise !== promise) return;
      inflight.delete(key);
      setEntry(key, { data, stamp, loading: false });
    },
    (err: unknown) => {
      if (inflight.get(key)?.promise !== promise) return;
      inflight.delete(key);
      setEntry(key, { data: cur?.data, stamp, loading: false, error: errorMessage(err) });
    },
  );
  return promise;
}

const noopSubscribe = () => () => {};
const readDbStatus = (): DbStatus => (isDbAvailable() ? "ready" : "unavailable");
const serverDbStatus = (): DbStatus => "pending";

/**
 * "pending" on the server and during hydration, then "ready" or
 * "unavailable" (no IndexedDB at all). A database that exists but refuses to
 * open (private mode) surfaces as an `error` on the queries instead.
 */
export function useDbStatus(): DbStatus {
  return useSyncExternalStore(noopSubscribe, readDbStatus, serverDbStatus);
}

/** db.ts's global change counter — bumps on every write in any tab. */
export function useDbVersion(): number {
  return useSyncExternalStore(subscribeDb, getVersion, () => 0);
}

export const DB_UNAVAILABLE_MESSAGE =
  "This browser has no IndexedDB, so the console has nowhere to keep your reports. Use a current Chrome, Edge, Firefox or Safari outside private mode.";

const serverStamp = () => "";
const serverEntry = () => IDLE;

function useQuery<T>(key: string | null, topics: readonly Topic[], loader: () => Promise<T>, empty: T): QueryState<T> {
  const status = useDbStatus();
  const stamp = useSyncExternalStore(subscribeHooks, () => stampOf(topics), serverStamp);
  const entry = useSyncExternalStore(subscribeHooks, () => (key ? (entries.get(key) ?? IDLE) : IDLE), serverEntry);

  useEffect(() => {
    if (!key) return;
    retained.set(key, (retained.get(key) ?? 0) + 1);
    return () => {
      const n = (retained.get(key) ?? 1) - 1;
      if (n <= 0) retained.delete(key);
      else retained.set(key, n);
    };
  }, [key]);

  useEffect(() => {
    if (!key || status !== "ready") return;
    ensure(key, topics, loader).catch(() => undefined);
  }, [key, stamp, status, topics, loader]);

  if (status === "unavailable") return { data: empty, loading: false, refreshing: false, error: DB_UNAVAILABLE_MESSAGE };
  const hasData = entry.data !== undefined;
  return {
    data: hasData ? (entry.data as T) : empty,
    loading: !hasData && entry.error === undefined,
    refreshing: hasData && (entry.loading || entry.stamp !== stamp),
    error: entry.error,
  };
}

/* ---------------------------------------------------------------- empties */

const NO_STORES: Store[] = [];
const NO_ROWS: SearchTermRow[] = [];
const NO_BULK: BulkEntity[] = [];
const NO_DECISIONS: Decision[] = [];
const NO_BATCHES: ImportBatch[] = [];
const NO_RECS: Recommendation[] = [];
const NO_SKIPPED: SkippedTerm[] = [];
const NO_STORE_RECS: StoreRecommendations[] = [];
const EMPTY_WINDOW: DateWindow = { from: "", to: "" };

/* -------------------------------------------------------------- settings */

export interface SettingsState {
  settings: ConsoleSettings;
  loading: boolean;
  error?: string;
  /** Merge and persist. Applied to the cache first so the UI never waits. */
  save: (patch: Partial<ConsoleSettings>) => Promise<void>;
}

async function saveSettingsPatch(patch: Partial<ConsoleSettings>): Promise<void> {
  const cached = entries.get("settings");
  const current = (cached?.data as ConsoleSettings | undefined) ?? (await getSettings());
  // A patch's fxRates replaces the whole table (the FX editor sends all rows).
  const next: ConsoleSettings = { ...current, ...patch, fxRates: { ...(patch.fxRates ?? current.fxRates) } };
  // A reload started by the previous save may still resolve with the value
  // from before this one; drop it (ensure ignores it) so it cannot overwrite
  // the optimistic value. This save's change event starts a fresh reload.
  inflight.delete("settings");
  setEntry("settings", { ...(cached ?? { loading: false }), data: next, loading: false });
  try {
    await saveSettings(next);
  } catch (err) {
    // Roll back to whatever is really stored.
    entries.set("settings", { ...(entries.get("settings") ?? { loading: false }), stamp: undefined });
    ensure("settings", T_SETTINGS, getSettings).catch(() => undefined);
    throw err;
  }
}

export function useSettings(): SettingsState {
  const q = useQuery("settings", T_SETTINGS, getSettings, DEFAULT_SETTINGS);
  return { settings: q.data, loading: q.loading, error: q.error, save: saveSettingsPatch };
}

/* ---------------------------------------------------------------- stores */

export function useStores(): { stores: Store[]; loading: boolean; error?: string } {
  const q = useQuery("stores", T_STORES, listStores, NO_STORES);
  return { stores: q.data, loading: q.loading, error: q.error };
}

export interface ActiveScope {
  /** Resolved scope: a store id that exists, else "all". "all" until `ready`. */
  scope: Scope;
  /** Settings and stores have loaded, so `scope` is final. */
  ready: boolean;
  setScope: (scope: Scope) => void;
  stores: Store[];
  /** The selected store when scope is a store id. */
  activeStore?: Store;
  error?: string;
}

/* ------------------------------------------------------------- tab scope */

/**
 * The switcher's choice belongs to this tab. `settings.activeStoreId` is
 * shared by every tab (and broadcast to them), so following it would flip a
 * second tab to whatever store was picked here — remounting its Keywords page
 * and dropping typed bids, selections and the Undo snapshot. A tab therefore
 * pins its scope (sessionStorage, so a reload stays put) and uses the
 * persisted value only as the default it starts from.
 */
const TAB_SCOPE_KEY = "ppc-console:scope";
/** undefined = not read yet; null = nothing pinned in this tab. */
let tabScope: string | null | undefined;
const tabScopeListeners = new Set<() => void>();

function readTabScope(): string | null {
  if (tabScope === undefined) {
    tabScope = null;
    try {
      tabScope = window.sessionStorage.getItem(TAB_SCOPE_KEY);
    } catch {
      /* storage blocked: the pin lives in memory only */
    }
  }
  return tabScope;
}

function writeTabScope(next: string): void {
  if (tabScope === next) return;
  tabScope = next;
  try {
    window.sessionStorage.setItem(TAB_SCOPE_KEY, next);
  } catch {
    /* storage blocked: the pin lives in memory only */
  }
  for (const l of [...tabScopeListeners]) l();
}

function subscribeTabScope(cb: () => void): () => void {
  tabScopeListeners.add(cb);
  return () => {
    tabScopeListeners.delete(cb);
  };
}

const serverTabScope = (): string | null => null;

export function useActiveScope(): ActiveScope {
  const { settings, loading: settingsLoading, error: settingsError, save } = useSettings();
  const { stores, loading: storesLoading, error: storesError } = useStores();
  const pinned = useSyncExternalStore(subscribeTabScope, readTabScope, serverTabScope);
  const ready = !settingsLoading && !storesLoading;
  const fallback = settings.activeStoreId || ALL_STORES;
  const wanted = pinned ?? fallback;
  const activeStore = wanted === ALL_STORES ? undefined : stores.find((s) => s.id === wanted);
  const scope: Scope = activeStore ? activeStore.id : ALL_STORES;
  // Pin the persisted default once it has loaded: a switch in another tab no longer moves this one.
  useEffect(() => {
    if (ready && pinned === null) writeTabScope(fallback);
  }, [ready, pinned, fallback]);
  const setScope = useCallback(
    (next: Scope) => {
      writeTabScope(next);
      // Also the default for tabs opened later.
      save({ activeStoreId: next }).catch(() => undefined);
    },
    [save],
  );
  return { scope, ready, setScope, stores, activeStore, error: settingsError ?? storesError };
}

/* ------------------------------------------------------------------ rows */

export function useScopedRows(scope: Scope | null): { rows: SearchTermRow[]; loading: boolean; refreshing: boolean; error?: string } {
  const loader = useCallback(() => (scope === ALL_STORES ? getAllRows() : getRows(scope ?? "")), [scope]);
  const q = useQuery(scope === null ? null : `rows:${scope}`, T_ROWS, loader, NO_ROWS);
  return { rows: q.data, loading: q.loading, refreshing: q.refreshing, error: q.error };
}

export function useBulk(scope: Scope | null): { bulk: BulkEntity[]; loading: boolean; refreshing: boolean; error?: string } {
  const loader = useCallback(() => (scope === ALL_STORES ? getAllBulk() : getBulk(scope ?? "")), [scope]);
  const q = useQuery(scope === null ? null : `bulk:${scope}`, T_BULK, loader, NO_BULK);
  return { bulk: q.data, loading: q.loading, refreshing: q.refreshing, error: q.error };
}

export function useDecisions(scope: Scope | null): { decisions: Decision[]; loading: boolean; error?: string } {
  const loader = useCallback(() => listDecisions(scope === ALL_STORES ? undefined : (scope ?? undefined)), [scope]);
  const q = useQuery(scope === null ? null : `decisions:${scope}`, T_DECISIONS, loader, NO_DECISIONS);
  return { decisions: q.data, loading: q.loading, error: q.error };
}

/** Import history, newest first. `storeId` omitted or "all" = every store. */
export function useBatches(storeId?: Scope | null): { batches: ImportBatch[]; loading: boolean; error?: string } {
  const scope = storeId ?? ALL_STORES;
  const loader = useCallback(() => listBatches(scope === ALL_STORES ? undefined : scope), [scope]);
  const q = useQuery(storeId === null ? null : `batches:${scope}`, T_BATCHES, loader, NO_BATCHES);
  return { batches: q.data, loading: q.loading, error: q.error };
}

const NO_LIVE_BULK: { batchId: string; storeId: string }[] = [];

/**
 * The bulk batch each store's current snapshot belongs to (db.ts
 * `liveBulkBatches`): at most one per store, none for a store whose snapshot
 * was deleted — even while older, replaced bulk imports stay in the history.
 */
export function useLiveBulk(enabled = true): { live: { batchId: string; storeId: string }[]; loading: boolean; error?: string } {
  const q = useQuery(enabled ? "live-bulk" : null, T_BULK, liveBulkBatches, NO_LIVE_BULK);
  return { live: q.data, loading: q.loading, error: q.error };
}

/** Record counts for one store (what deleting it would remove). */
export function useStoreCounts(storeId: string | null): { counts?: StoreCounts; loading: boolean; error?: string } {
  const loader = useCallback(() => storeCounts(storeId ?? ""), [storeId]);
  const q = useQuery<StoreCounts | undefined>(storeId ? `counts:${storeId}` : null, T_COUNTS, loader, undefined);
  return { counts: q.data, loading: q.loading, error: q.error };
}

/* ------------------------------------------------------- recommendations */

async function loadStoreRecs(storeId: string): Promise<StoreRecommendations | null> {
  const [stores, rows, bulk] = await Promise.all([
    ensure("stores", T_STORES, listStores),
    ensure(`rows:${storeId}`, T_ROWS, () => getRows(storeId)),
    ensure(`bulk:${storeId}`, T_BULK, () => getBulk(storeId)),
  ]);
  const store = stores.find((s) => s.id === storeId);
  if (!store) return null;
  return { store, ...recommend({ store, rows, bulk }) };
}

export interface RecommendationsState {
  /** The full engine output with its store; undefined while loading or when the store is gone. */
  result?: StoreRecommendations;
  store?: Store;
  recommendations: Recommendation[];
  skipped: SkippedTerm[];
  /** Evaluated window (empty strings when the store has no rows). */
  window: DateWindow;
  loading: boolean;
  refreshing: boolean;
  error?: string;
}

/**
 * Memoised `recommend()` for one store over all its rows and its bulk file.
 * Recomputed only when that store's rows, bulk entities or settings (rules,
 * economics, term lists) change. `null` = not resolved yet (loading).
 */
export function useRecommendations(storeId: string | null): RecommendationsState {
  const loader = useCallback(() => loadStoreRecs(storeId ?? ""), [storeId]);
  const q = useQuery<StoreRecommendations | null | undefined>(storeId ? `recs:${storeId}` : null, T_RECS, loader, undefined);
  const r = q.data ?? undefined;
  return {
    result: r,
    store: r?.store,
    recommendations: r?.recommendations ?? NO_RECS,
    skipped: r?.skipped ?? NO_SKIPPED,
    window: r?.window ?? EMPTY_WINDOW,
    loading: q.loading,
    refreshing: q.refreshing,
    error: q.error,
  };
}

export interface AllRecommendationsState {
  /** One entry per store, in store order. */
  perStore: StoreRecommendations[];
  byStore: Record<string, StoreRecommendations>;
  /** Every store's recommendations: priority, then impact in base currency (desc), then id. */
  recommendations: Recommendation[];
  skipped: SkippedTerm[];
  loading: boolean;
  refreshing: boolean;
  error?: string;
}

const PRIORITY_RANK: Record<Priority, number> = { high: 0, medium: 1, low: 2 };

async function loadAllRecs(): Promise<StoreRecommendations[]> {
  const stores = await ensure("stores", T_STORES, listStores);
  const list = await Promise.all(stores.map((s) => ensure(`recs:${s.id}`, T_RECS, () => loadStoreRecs(s.id))));
  return list.filter((x): x is StoreRecommendations => x !== null);
}

/**
 * `recommend()` for every store, merged. Per-store results share the useRecommendations cache.
 * `enabled: false` skips the work (reports `loading: true`) — for a page that only needs every
 * store in the All-stores scope and would otherwise run the engine on all of them for nothing.
 */
export function useAllRecommendations(enabled = true): AllRecommendationsState {
  const q = useQuery<StoreRecommendations[]>(enabled ? "recs:all" : null, T_RECS, loadAllRecs, NO_STORE_RECS);
  const { settings } = useSettings();
  const perStore = q.data;
  const merged = useMemo(() => {
    const byStore: Record<string, StoreRecommendations> = {};
    const currency = new Map<string, string>();
    const recommendations: Recommendation[] = [];
    const skipped: SkippedTerm[] = [];
    for (const s of perStore) {
      byStore[s.store.id] = s;
      currency.set(s.store.id, s.store.currency);
      recommendations.push(...s.recommendations);
      skipped.push(...s.skipped);
    }
    const impact = (r: Recommendation) => {
      const v = toBase(r.impact ?? 0, currency.get(r.storeId) ?? settings.baseCurrency, settings);
      return Number.isFinite(v) ? v : 0;
    };
    recommendations.sort(
      (a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || impact(b) - impact(a) || a.id.localeCompare(b.id),
    );
    return { byStore, recommendations, skipped };
  }, [perStore, settings]);
  return { perStore, ...merged, loading: q.loading, refreshing: q.refreshing, error: q.error };
}
