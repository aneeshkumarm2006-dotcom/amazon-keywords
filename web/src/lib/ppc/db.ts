/**
 * IndexedDB persistence for the PPC console (browser only).
 *
 * Database `ppc-console` v1:
 *   stores     keyPath id
 *   settings   out-of-line key, single record "settings"
 *   batches    keyPath id,     index storeId
 *   rows       keyPath key,    indexes storeId, batchId, storeDate [storeId, date]
 *   bulk       keyPath key,    indexes storeId, batchId
 *   decisions  keyPath recId,  index storeId
 *
 * Import-safe during SSR / prerender: nothing touches `indexedDB`, `window` or
 * `BroadcastChannel` at module load. Every exported function is async and
 * rejects with a clear error when IndexedDB is unavailable.
 *
 * Semantics
 * - importRows is idempotent: a row whose natural key exists with identical
 *   counters is counted as skipped (it stays owned by the batch that first
 *   wrote it); a row with different counters is updated and re-owned by the
 *   new batch. Either way the row remembers every other batch that holds it
 *   (`SearchTermRow.versions`, with the counters each had) — see
 *   `mergeRowVersion`. Writes happen in chunked transactions of 2,000 rows.
 * - importBulk replaces all bulk entities of that store in one transaction:
 *   the latest bulk file wins (a bulk file is a full snapshot of the account,
 *   not a delta), and a failed import leaves the previous snapshot intact.
 * - A search-term import that fails part-way still records its batch (with an
 *   error entry) so the rows it did write can be found and deleted.
 * - deleteBatch takes the batch off every row: a row it owns falls back to
 *   the newest other batch that holds it (restoring that batch's counters)
 *   and is deleted only when no other batch holds it (`dropRowVersion`).
 * - Reads (getRows / getAllRows) return one series per search term:
 *   overlapping Summary / Daily imports are resolved by `resolveOverlaps`
 *   (metrics.ts); stored rows are untouched.
 * - A connection the browser closes (site data cleared, storage restarted) is
 *   forgotten; the next call reopens, and a transaction that hits a closing
 *   connection is retried once on a fresh one.
 * - Every write bumps `getVersion()`, notifies `subscribe` listeners, dispatches
 *   `ppc-console:change` on window, and pings other tabs via BroadcastChannel.
 */

import { addDays, isIsoDate } from "./dates";
import { makeDemoData } from "./demo";
import { norm } from "./keys";
import { countersOf, inWindow, resolveOverlaps } from "./metrics";
import type { BulkEntity, ConsoleBackup, ConsoleSettings, Counters, Decision, ImportBatch, RowVersion, SearchTermRow, Store } from "./types";

export const DB_NAME = "ppc-console";
export const DB_VERSION = 1;
export const CHANGE_EVENT = "ppc-console:change";

export type ChangeScope = "stores" | "settings" | "batches" | "rows" | "bulk" | "decisions" | "all";

const STORE_NAMES = ["stores", "settings", "batches", "rows", "bulk", "decisions"] as const;
type StoreName = (typeof STORE_NAMES)[number];

const CHUNK = 2000;

export const DEFAULT_SETTINGS: ConsoleSettings = {
  baseCurrency: "USD",
  fxRates: { GBP: 1.27, EUR: 1.08, CAD: 0.74, AUD: 0.66, INR: 0.012, JPY: 0.0067, MXN: 0.055 },
  activeStoreId: "all",
};

function defaultSettings(): ConsoleSettings {
  return { ...DEFAULT_SETTINGS, fxRates: { ...DEFAULT_SETTINGS.fxRates } };
}

/* ------------------------------------------------------------ change feed */

let version = 0;
const listeners = new Set<(scope: ChangeScope) => void>();
let channel: BroadcastChannel | null = null;
let channelInit = false;

function ensureChannel() {
  if (channelInit) return;
  channelInit = true;
  // Cross-tab sync only matters where the data lives (a browser with IndexedDB).
  // Under Node a BroadcastChannel would also keep the process alive.
  if (typeof BroadcastChannel === "undefined" || typeof indexedDB === "undefined") return;
  try {
    channel = new BroadcastChannel(DB_NAME);
    (channel as unknown as { unref?: () => void }).unref?.();
    channel.onmessage = (ev: MessageEvent) => {
      const scope = (ev.data && (ev.data as { scope?: ChangeScope }).scope) || "all";
      notify(scope, false);
    };
  } catch {
    channel = null;
  }
}

function notify(scope: ChangeScope, broadcast: boolean) {
  version++;
  for (const cb of [...listeners]) {
    try {
      cb(scope);
    } catch {
      /* a listener error must not break the write path */
    }
  }
  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function" && typeof CustomEvent !== "undefined") {
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { scope } }));
  }
  if (broadcast && channel) {
    try {
      channel.postMessage({ scope });
    } catch {
      /* ignore */
    }
  }
}

function emit(scope: ChangeScope) {
  ensureChannel();
  notify(scope, true);
}

/**
 * Listen for data changes (this tab and other tabs). Compatible with
 * `useSyncExternalStore(subscribe, getVersion, () => 0)`.
 */
export function subscribe(cb: (scope: ChangeScope) => void): () => void {
  ensureChannel();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

/** Monotonically increasing change counter. */
export function getVersion(): number {
  return version;
}

/* ------------------------------------------------------------- low level */

export function isDbAvailable(): boolean {
  return typeof indexedDB !== "undefined";
}

function factory(): IDBFactory {
  if (typeof indexedDB === "undefined") {
    throw new Error("IndexedDB is not available here — the PPC console stores its data in the browser.");
  }
  return indexedDB;
}

let dbPromise: Promise<IDBDatabase> | null = null;
/** The connection `dbPromise` resolved to. */
let currentDb: IDBDatabase | null = null;

/** Drop a connection so the next call opens a fresh one. */
function forgetDb(db: IDBDatabase): void {
  if (currentDb !== db) return;
  currentDb = null;
  dbPromise = null;
  try {
    db.close();
  } catch {
    /* already closed */
  }
}

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  const f = factory();
  const opening = new Promise<IDBDatabase>((resolve, reject) => {
    let req: IDBOpenDBRequest;
    try {
      req = f.open(DB_NAME, DB_VERSION);
    } catch (err) {
      // Sandboxed frames / blocked storage throw synchronously (SecurityError).
      reject(err instanceof Error ? err : new Error("Could not open the PPC console database."));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("stores")) db.createObjectStore("stores", { keyPath: "id" });
      if (!db.objectStoreNames.contains("settings")) db.createObjectStore("settings");
      if (!db.objectStoreNames.contains("batches")) {
        const s = db.createObjectStore("batches", { keyPath: "id" });
        s.createIndex("storeId", "storeId");
      }
      if (!db.objectStoreNames.contains("rows")) {
        const s = db.createObjectStore("rows", { keyPath: "key" });
        s.createIndex("storeId", "storeId");
        s.createIndex("batchId", "batchId");
        s.createIndex("storeDate", ["storeId", "date"]);
      }
      if (!db.objectStoreNames.contains("bulk")) {
        const s = db.createObjectStore("bulk", { keyPath: "key" });
        s.createIndex("storeId", "storeId");
        s.createIndex("batchId", "batchId");
      }
      if (!db.objectStoreNames.contains("decisions")) {
        const s = db.createObjectStore("decisions", { keyPath: "recId" });
        s.createIndex("storeId", "storeId");
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      currentDb = db;
      // Another tab upgrading the schema: close so it can proceed.
      db.onversionchange = () => forgetDb(db);
      // The browser closed the connection (site data cleared while the tab is
      // open, Safari losing its storage server): reopen on the next call
      // instead of failing every call until a reload.
      db.onclose = () => forgetDb(db);
      resolve(db);
      purgeReopenMarkers(db);
    };
    req.onerror = () => {
      reject(req.error ?? new Error("Could not open the PPC console database."));
    };
    req.onblocked = () => {
      /* resolves once other tabs close their connections */
    };
  });
  dbPromise = opening;
  // A failed open is forgotten so a later call can retry.
  opening.catch(() => {
    if (dbPromise === opening) dbPromise = null;
  });
  return opening;
}

/** The error `db.transaction()` throws on a connection the browser closed or lost. */
function isLostConnection(err: unknown): boolean {
  const name = err instanceof Error ? err.name : "";
  return name === "InvalidStateError" || name === "UnknownError";
}

function promisify<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Run `fn` inside a transaction; resolves with fn's value once the transaction commits. */
async function withTx<T>(names: StoreName[], mode: IDBTransactionMode, fn: (tx: IDBTransaction) => T | Promise<T>): Promise<T> {
  let db = await openDb();
  let tx: IDBTransaction;
  try {
    tx = db.transaction(names, mode);
  } catch (err) {
    if (!isLostConnection(err)) throw err;
    // Nothing ran yet, so one retry on a fresh connection is safe.
    forgetDb(db);
    db = await openDb();
    tx = db.transaction(names, mode);
  }
  return new Promise<T>((resolve, reject) => {
    let result: T;
    let failed = false;
    tx.oncomplete = () => resolve(result);
    tx.onerror = () => {
      if (!failed) reject(tx.error ?? new Error("IndexedDB transaction failed."));
      failed = true;
    };
    tx.onabort = () => {
      if (!failed) reject(tx.error ?? new Error("IndexedDB transaction aborted."));
      failed = true;
    };
    Promise.resolve()
      .then(() => fn(tx))
      .then((r) => {
        result = r;
      })
      .catch((err) => {
        failed = true;
        try {
          tx.abort();
        } catch {
          /* already finished */
        }
        reject(err);
      });
  });
}

async function getAllFrom<T>(name: StoreName, index?: string, query?: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return withTx([name], "readonly", (tx) => {
    const store = tx.objectStore(name);
    const source = index ? store.index(index) : store;
    return promisify(source.getAll(query) as IDBRequest<T[]>);
  });
}

async function deleteByIndex(tx: IDBTransaction, name: StoreName, index: string, value: IDBValidKey): Promise<number> {
  const store = tx.objectStore(name);
  const keys = await promisify(store.index(index).getAllKeys(value));
  for (const k of keys) store.delete(k);
  return keys.length;
}

/* ---------------------------------------------------------------- settings */

export async function getSettings(): Promise<ConsoleSettings> {
  const s = await withTx(["settings"], "readonly", (tx) => promisify(tx.objectStore("settings").get("settings") as IDBRequest<ConsoleSettings | undefined>));
  if (!s) return defaultSettings();
  // The built-in rates are USD-denominated: only fill gaps with them while the
  // base currency is still USD, or they would silently mean the wrong thing.
  const base = (s.baseCurrency || DEFAULT_SETTINGS.baseCurrency).toUpperCase();
  const fxRates = base === DEFAULT_SETTINGS.baseCurrency ? { ...DEFAULT_SETTINGS.fxRates, ...s.fxRates } : { ...(s.fxRates ?? {}) };
  return { ...defaultSettings(), ...s, fxRates };
}

export async function saveSettings(settings: ConsoleSettings): Promise<void> {
  await withTx(["settings"], "readwrite", (tx) => {
    tx.objectStore("settings").put(settings, "settings");
  });
  emit("settings");
}

/* ------------------------------------------------------------------ stores */

export async function listStores(): Promise<Store[]> {
  const stores = await getAllFrom<Store>("stores");
  // Creation order, so recolouring a store never moves it in the switcher.
  // Demo stores share one createdAt; their colour slots keep them in order.
  return stores.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.colorIndex - b.colorIndex || a.name.localeCompare(b.name));
}

export async function getStore(id: string): Promise<Store | undefined> {
  return withTx(["stores"], "readonly", (tx) => promisify(tx.objectStore("stores").get(id) as IDBRequest<Store | undefined>));
}

export async function saveStore(store: Store): Promise<void> {
  await withTx(["stores"], "readwrite", (tx) => {
    tx.objectStore("stores").put(store);
  });
  emit("stores");
}

/**
 * Every row / bulk key starts with `norm(storeId)|` (keys.ts; imports re-key
 * onto the target store), so one ranged delete removes a store's records —
 * about 50× faster than deleting 100k keys one by one. The index pass after
 * it only finds records that break the key convention (normally none).
 */
async function deleteStoreRecords(tx: IDBTransaction, name: "rows" | "bulk", storeId: string): Promise<void> {
  const prefix = `${norm(storeId)}|`;
  if (typeof IDBKeyRange !== "undefined") tx.objectStore(name).delete(IDBKeyRange.bound(prefix, `${prefix}￿`));
  await deleteByIndex(tx, name, "storeId", storeId);
}

async function cascadeDelete(tx: IDBTransaction, storeId: string) {
  await deleteStoreRecords(tx, "rows", storeId);
  await deleteStoreRecords(tx, "bulk", storeId);
  await deleteByIndex(tx, "batches", "storeId", storeId);
  await deleteByIndex(tx, "decisions", "storeId", storeId);
  tx.objectStore("stores").delete(storeId);
}

/** Delete a store and all its rows, bulk entities, batches and decisions. */
export async function deleteStore(id: string): Promise<void> {
  await withTx(["stores", "rows", "bulk", "batches", "decisions", "settings"], "readwrite", async (tx) => {
    await cascadeDelete(tx, id);
    const settings = tx.objectStore("settings");
    const s = (await promisify(settings.get("settings") as IDBRequest<ConsoleSettings | undefined>)) ?? undefined;
    if (s && s.activeStoreId === id) settings.put({ ...s, activeStoreId: "all" }, "settings");
  });
  emit("all");
}

/* ----------------------------------------------------------------- imports */

function sameCounters(a: Counters, b: Counters): boolean {
  return (
    a.impressions === b.impressions &&
    a.clicks === b.clicks &&
    Math.abs(a.spend - b.spend) < 1e-6 &&
    Math.abs(a.sales - b.sales) < 1e-6 &&
    a.orders === b.orders &&
    a.units === b.units
  );
}

/**
 * Most other batches remembered per row (`SearchTermRow.versions`); the oldest
 * fall off. A row is in one import per re-download of its period, so this
 * covers deleting a dozen newer overlapping imports before a hole can appear.
 */
export const MAX_ROW_VERSIONS = 12;

function withVersions(row: SearchTermRow, versions: RowVersion[] | undefined): SearchTermRow {
  const next = { ...row };
  if (versions && versions.length) next.versions = versions.slice(-MAX_ROW_VERSIONS);
  else delete next.versions;
  return next;
}

export type MergeOutcome = "inserted" | "updated" | "skipped";

/**
 * importRows' merge of an incoming row (re-keyed, stamped with its batch) with
 * the stored one. `write` is the record to put (null = nothing to write).
 * - New key → inserted.
 * - Identical counters → skipped: the first writer stays the owner and the new
 *   batch is remembered as another holder, so deleting either import leaves
 *   the row in place for the other.
 * - Changed counters → updated: the new batch owns the row and the previous
 *   owner is remembered with its counters, so deleting the new import puts
 *   the older import's numbers back instead of leaving a hole.
 * - The same batch again (a duplicate key within one file) → last one wins.
 */
export function mergeRowVersion(prev: SearchTermRow | undefined, row: SearchTermRow): { write: SearchTermRow | null; outcome: MergeOutcome } {
  if (!prev) return { write: withVersions(row, undefined), outcome: "inserted" };
  const same = sameCounters(prev, row);
  if (prev.batchId === row.batchId) {
    return same ? { write: null, outcome: "skipped" } : { write: withVersions(row, prev.versions), outcome: "updated" };
  }
  const others = (prev.versions ?? []).filter((v) => v.batchId !== row.batchId);
  if (same) return { write: withVersions(prev, [...others, { batchId: row.batchId }]), outcome: "skipped" };
  // Entries without counters had the previous counters, which change now.
  const held = countersOf(prev);
  const versions = [...others.map((v) => (v.counters ? v : { batchId: v.batchId, counters: held })), { batchId: prev.batchId, counters: held }];
  return { write: withVersions(row, versions), outcome: "updated" };
}

/**
 * deleteBatch's change to one row: take `batchId` off it. A row the batch owns
 * falls back to its newest other holder, with that holder's counters; null
 * when no other batch holds it (the row is deleted). A row owned by another
 * batch just forgets `batchId`.
 */
export function dropRowVersion(row: SearchTermRow, batchId: string): SearchTermRow | null {
  const others = (row.versions ?? []).filter((v) => v.batchId !== batchId);
  if (row.batchId !== batchId) return withVersions(row, others);
  const next = others.pop();
  if (!next) return null;
  const cur = countersOf(row);
  const counters = next.counters ?? cur;
  const changed = !sameCounters(counters, cur);
  // Entries without counters had the current counters, which change now.
  const rest = changed ? others.map((v) => (v.counters ? v : { batchId: v.batchId, counters: cur })) : others;
  return withVersions({ ...row, ...counters, batchId: next.batchId }, rest);
}

export interface ImportResult {
  inserted: number;
  updated: number;
  skipped: number;
  batch: ImportBatch;
  /** importBulk only: number of previous bulk entities of the store that were replaced. */
  replaced?: number;
}

/**
 * Store search-term rows for a store and record the batch. Idempotent on the
 * natural key (see module docs). `onProgress(done, total)` fires per chunk.
 */
export async function importRows(
  storeId: string,
  batch: ImportBatch,
  rows: SearchTermRow[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  let inserted = 0;
  let updated = 0;
  let skipped = 0;
  let dateFrom: string | undefined;
  let dateTo: string | undefined;
  const finalBatch = (extraErrors: ImportBatch["errors"] = []): ImportBatch => ({
    ...batch,
    storeId,
    kind: "search-term",
    rowCount: batch.rowCount || rows.length,
    inserted,
    updated,
    skipped,
    dateFrom: dateFrom ?? batch.dateFrom,
    dateTo: dateTo ?? batch.dateTo,
    errors: [...extraErrors, ...(batch.errors ?? [])].slice(0, 200),
  });
  // Sorted by key so every chunk is one contiguous key range: existing rows
  // are then read with a single getAll(range) per chunk instead of one get
  // per row (a 100k-row re-import touches 50 ranges, not 100k keys).
  const prepared: SearchTermRow[] = rows.map((raw) => ({ ...raw, storeId, batchId: batch.id, key: rekey(raw.key, raw.storeId, storeId) }));
  prepared.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));
  try {
    if (prepared.length && typeof IDBKeyRange === "undefined") factory();
    for (let i = 0; i < prepared.length; i += CHUNK) {
      const chunk = prepared.slice(i, i + CHUNK);
      // Counted per chunk and folded in only after the chunk commits, so a
      // failed chunk (quota, abort) does not inflate the totals.
      let cIns = 0;
      let cUpd = 0;
      let cSkip = 0;
      let cFrom: string | undefined;
      let cTo: string | undefined;
      await withTx(["rows"], "readwrite", async (tx) => {
        const store = tx.objectStore("rows");
        const range = IDBKeyRange.bound(chunk[0].key, chunk[chunk.length - 1].key);
        const existing = new Map<string, SearchTermRow>();
        for (const r of await promisify(store.getAll(range) as IDBRequest<SearchTermRow[]>)) existing.set(r.key, r);
        for (const row of chunk) {
          const end = row.endDate ?? row.date;
          if (!cFrom || row.date < cFrom) cFrom = row.date;
          if (!cTo || end > cTo) cTo = end;
          const prev = existing.get(row.key);
          const { write, outcome } = mergeRowVersion(prev, row);
          if (write) store.put(write);
          if (outcome === "inserted") cIns++;
          else if (outcome === "updated") cUpd++;
          else cSkip++;
          // A duplicate key later in the same chunk compares against this row.
          existing.set(row.key, write ?? prev ?? row);
        }
      });
      inserted += cIns;
      updated += cUpd;
      skipped += cSkip;
      if (cFrom && (!dateFrom || cFrom < dateFrom)) dateFrom = cFrom;
      if (cTo && (!dateTo || cTo > dateTo)) dateTo = cTo;
      onProgress?.(Math.min(i + CHUNK, rows.length), rows.length);
    }
  } catch (err) {
    // Rows from committed chunks are already stored and owned (or, when
    // skipped, also held) by this batch. Record the batch anyway so they stay
    // visible (and deletable) in the import history instead of pointing at a
    // batch that does not exist.
    const message = err instanceof Error ? err.message : String(err);
    if (inserted + updated + skipped > 0) {
      const partial = finalBatch([{ row: 0, message: `Import stopped after ${inserted + updated + skipped} of ${rows.length} rows: ${message}` }]);
      try {
        await withTx(["batches"], "readwrite", (tx) => {
          tx.objectStore("batches").put(partial);
        });
      } catch {
        /* the original error is the one worth reporting */
      }
      emit("rows");
    }
    throw err;
  }
  const saved = finalBatch();
  await withTx(["batches"], "readwrite", (tx) => {
    tx.objectStore("batches").put(saved);
  });
  emit("rows");
  return { inserted, updated, skipped, batch: saved };
}

/**
 * Replace the store's bulk entities with this file's (latest bulk file wins).
 * One transaction: the old snapshot is only gone once the new one is fully
 * written, so a failed import (quota, abort) leaves the previous file intact.
 * `onProgress(done, total)` fires every 2,000 entities as they are written.
 */
export async function importBulk(
  storeId: string,
  batch: ImportBatch,
  entities: BulkEntity[],
  onProgress?: (done: number, total: number) => void,
): Promise<ImportResult> {
  let previous = 0;
  await withTx(["bulk"], "readwrite", async (tx) => {
    previous = await promisify(tx.objectStore("bulk").index("storeId").count(storeId));
    await deleteStoreRecords(tx, "bulk", storeId);
    const store = tx.objectStore("bulk");
    const total = entities.length;
    entities.forEach((e, i) => {
      const req = store.put({ ...e, storeId, batchId: batch.id, key: rekey(e.key, e.storeId, storeId) });
      const done = i + 1;
      if (onProgress && (done % CHUNK === 0 || done === total)) req.onsuccess = () => onProgress(done, total);
    });
  });
  const saved: ImportBatch = {
    ...batch,
    storeId,
    kind: "bulk",
    rowCount: batch.rowCount || entities.length,
    inserted: entities.length,
    updated: 0,
    skipped: 0,
    errors: (batch.errors ?? []).slice(0, 200),
  };
  await withTx(["batches"], "readwrite", (tx) => {
    tx.objectStore("batches").put(saved);
  });
  emit("bulk");
  return { inserted: entities.length, updated: 0, skipped: 0, replaced: previous, batch: saved };
}

export async function listBatches(storeId?: string): Promise<ImportBatch[]> {
  const list = storeId ? await getAllFrom<ImportBatch>("batches", "storeId", storeId) : await getAllFrom<ImportBatch>("batches");
  return list.sort((a, b) => b.importedAt.localeCompare(a.importedAt));
}

export interface BatchOwnership {
  /** Search-term rows only this batch holds — deleted with it. */
  rows: number;
  /** Rows this batch owns that another import also holds — they go back to that import's numbers. */
  restored: number;
  /** Bulk entities (the live snapshot when the batch is the store's current bulk file). */
  bulk: number;
}

/** Longest date span deleteBatch scans for rows that list the batch as a holder. */
const MAX_SPAN_DAYS = 3660;

/**
 * Delete a batch. Rows it owns fall back to the newest other import that holds
 * them (with that import's counters) or are deleted when none does; rows other
 * imports own forget it; its bulk entities are deleted.
 */
export async function deleteBatch(batchId: string): Promise<BatchOwnership> {
  let rows = 0;
  let restored = 0;
  let bulk = 0;
  await withTx(["rows", "bulk", "batches"], "readwrite", async (tx) => {
    const batches = tx.objectStore("batches");
    const batch = await promisify(batches.get(batchId) as IDBRequest<ImportBatch | undefined>);
    const store = tx.objectStore("rows");
    const owned = await promisify(store.index("batchId").getAll(batchId) as IDBRequest<SearchTermRow[]>);
    for (const row of owned) {
      const next = dropRowVersion(row, batchId);
      if (next) {
        store.put(next);
        restored++;
      } else {
        store.delete(row.key);
        rows++;
      }
    }
    // Rows other imports own that list this batch as a holder: every row the
    // batch held is dated inside its span, so scan that span day by day.
    if (batch && batch.kind === "search-term" && batch.dateFrom && batch.dateTo && isIsoDate(batch.dateFrom) && isIsoDate(batch.dateTo)) {
      const byDay = store.index("storeDate");
      let d = batch.dateFrom;
      for (let n = 0; d <= batch.dateTo && n < MAX_SPAN_DAYS; n++, d = addDays(d, 1)) {
        const dayRows = await promisify(byDay.getAll([batch.storeId, d]) as IDBRequest<SearchTermRow[]>);
        for (const r of dayRows) {
          if (r.batchId === batchId || !r.versions?.some((v) => v.batchId === batchId)) continue;
          const next = dropRowVersion(r, batchId);
          if (next) store.put(next);
        }
      }
    }
    bulk = await deleteByIndex(tx, "bulk", "batchId", batchId);
    batches.delete(batchId);
  });
  emit("all");
  return { rows, restored, bulk };
}

/** What `deleteBatch` would do: rows deleted, rows restored to another import's numbers, bulk entities deleted. */
export async function batchOwnership(batchId: string): Promise<BatchOwnership> {
  return withTx(["rows", "bulk"], "readonly", async (tx) => {
    const [owned, bulk] = await Promise.all([
      promisify(tx.objectStore("rows").index("batchId").getAll(batchId) as IDBRequest<SearchTermRow[]>),
      promisify(tx.objectStore("bulk").index("batchId").count(batchId)),
    ]);
    let restored = 0;
    for (const r of owned) if (r.versions?.some((v) => v.batchId !== batchId)) restored++;
    return { rows: owned.length - restored, restored, bulk };
  });
}

/**
 * The bulk batch each store's snapshot belongs to. importBulk replaces a
 * store's whole snapshot, so there is at most one per store — and none once
 * that snapshot was deleted, even while older, replaced bulk batches are
 * still listed in the import history.
 */
export async function liveBulkBatches(): Promise<{ batchId: string; storeId: string }[]> {
  return withTx(["bulk"], "readonly", (tx) => {
    return new Promise<{ batchId: string; storeId: string }[]>((resolve, reject) => {
      const out: { batchId: string; storeId: string }[] = [];
      const req = tx.objectStore("bulk").index("batchId").openCursor(null, "nextunique");
      req.onsuccess = () => {
        const cursor = req.result;
        if (!cursor) {
          resolve(out);
          return;
        }
        const e = cursor.value as BulkEntity;
        out.push({ batchId: e.batchId, storeId: e.storeId });
        cursor.continue();
      };
      req.onerror = () => reject(req.error);
    });
  });
}

export interface StoreCounts {
  rows: number;
  bulk: number;
  batches: number;
  decisions: number;
}

/** Record counts for one store — what `deleteStore` would remove. */
export async function storeCounts(storeId: string): Promise<StoreCounts> {
  return withTx(["rows", "bulk", "batches", "decisions"], "readonly", async (tx) => {
    const count = (name: StoreName) => promisify(tx.objectStore(name).index("storeId").count(storeId));
    const [rows, bulk, batches, decisions] = await Promise.all([count("rows"), count("bulk"), count("batches"), count("decisions")]);
    return { rows, bulk, batches, decisions };
  });
}

/* ------------------------------------------------------------------- reads */

/**
 * Rows for one store, optionally limited to a date range, as one series per
 * search term (`resolveOverlaps`). Summary rows are included when their
 * period overlaps the range (the index scan starts 120 days before `from` to
 * catch summary periods that began earlier).
 */
export async function getRows(storeId: string, range: { from?: string; to?: string } = {}): Promise<SearchTermRow[]> {
  if (!range.from && !range.to) return resolveOverlaps(await getAllFrom<SearchTermRow>("rows", "storeId", storeId));
  if (typeof IDBKeyRange === "undefined") factory();
  const lower = range.from ? addDays(range.from, -120) : "";
  const upper = range.to ?? String.fromCharCode(0xffff);
  const rows = resolveOverlaps(await getAllFrom<SearchTermRow>("rows", "storeDate", IDBKeyRange.bound([storeId, lower], [storeId, upper])));
  const w = { from: range.from ?? "0000-01-01", to: range.to ?? "9999-12-31" };
  return rows.filter((r) => inWindow(r, w));
}

/** Every row of every store (for the "all stores" scope), one series per search term. */
export async function getAllRows(): Promise<SearchTermRow[]> {
  return resolveOverlaps(await getAllFrom<SearchTermRow>("rows"));
}

export async function getBulk(storeId: string): Promise<BulkEntity[]> {
  return getAllFrom<BulkEntity>("bulk", "storeId", storeId);
}

export async function getAllBulk(): Promise<BulkEntity[]> {
  return getAllFrom<BulkEntity>("bulk");
}

/* --------------------------------------------------------------- decisions */

export async function listDecisions(storeId?: string): Promise<Decision[]> {
  return storeId ? getAllFrom<Decision>("decisions", "storeId", storeId) : getAllFrom<Decision>("decisions");
}

export async function saveDecision(decision: Decision): Promise<void> {
  await withTx(["decisions"], "readwrite", (tx) => {
    tx.objectStore("decisions").put(decision);
  });
  emit("decisions");
}

/** Save many decisions in one transaction (bulk approve / reject). */
export async function saveDecisions(decisions: Decision[]): Promise<void> {
  await withTx(["decisions"], "readwrite", (tx) => {
    const s = tx.objectStore("decisions");
    for (const d of decisions) s.put(d);
  });
  emit("decisions");
}

export async function deleteDecision(recId: string): Promise<void> {
  await deleteDecisions([recId]);
}

/** Delete many decisions in one transaction (one change event). */
export async function deleteDecisions(recIds: string[]): Promise<void> {
  await applyDecisionChanges({ remove: recIds });
}

/**
 * Save and delete decisions in one transaction with one change event, so a
 * family (a harvest with its paired negative) changes together or not at all.
 */
export async function applyDecisionChanges(change: { save?: Decision[]; remove?: string[] }): Promise<void> {
  const save = change.save ?? [];
  const remove = change.remove ?? [];
  if (!save.length && !remove.length) return;
  await withTx(["decisions"], "readwrite", (tx) => {
    const s = tx.objectStore("decisions");
    for (const id of remove) s.delete(id);
    for (const d of save) s.put(d);
  });
  emit("decisions");
}

/**
 * Earlier versions reopened many rows at once by writing an expired snooze
 * ("1970-01-01") instead of deleting each decision. Such a marker means
 * exactly "no decision".
 */
export function isReopenMarker(d: Decision): boolean {
  return d.status === "snoozed" && d.snoozeUntil === "1970-01-01" && d.editedBid === undefined && !d.destination && !d.appliedAt;
}

/** Remove legacy reopen markers once per connection (they inflate counts and backups). */
function purgeReopenMarkers(db: IDBDatabase): void {
  try {
    const tx = db.transaction(["decisions"], "readwrite");
    let removed = 0;
    const req = tx.objectStore("decisions").openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      if (isReopenMarker(cursor.value as Decision)) {
        cursor.delete();
        removed++;
      }
      cursor.continue();
    };
    tx.oncomplete = () => {
      if (removed) emit("decisions");
    };
  } catch {
    /* housekeeping only */
  }
}

/* ------------------------------------------------------------------ backup */

export async function exportBackup(): Promise<ConsoleBackup> {
  return withTx([...STORE_NAMES], "readonly", async (tx) => {
    const all = <T>(name: StoreName) => promisify(tx.objectStore(name).getAll() as IDBRequest<T[]>);
    const [stores, batches, rows, bulk, decisions, settings] = await Promise.all([
      all<Store>("stores"),
      all<ImportBatch>("batches"),
      all<SearchTermRow>("rows"),
      all<BulkEntity>("bulk"),
      all<Decision>("decisions"),
      promisify(tx.objectStore("settings").get("settings") as IDBRequest<ConsoleSettings | undefined>),
    ]);
    return {
      app: "ppc-console" as const,
      version: 1 as const,
      exportedAt: new Date().toISOString(),
      settings: settings ?? defaultSettings(),
      stores,
      batches,
      rows,
      bulk,
      decisions,
    };
  });
}

/** Throws when the value is not a PPC console backup. */
export function validateBackup(value: unknown): ConsoleBackup {
  const b = value as Partial<ConsoleBackup> | null;
  if (!b || typeof b !== "object" || b.app !== "ppc-console") throw new Error("Not a PPC console backup file.");
  if (b.version !== 1) throw new Error(`Unsupported backup version ${String(b.version)}.`);
  for (const k of ["stores", "batches", "rows", "bulk", "decisions"] as const) {
    if (!Array.isArray(b[k])) throw new Error(`Backup is missing “${k}”.`);
  }
  return b as ConsoleBackup;
}

/**
 * Restore a backup. Only "replace" is supported: all console data is cleared
 * first. Ladder bounds serialised as null (JSON has no Infinity) are restored.
 */
export async function importBackup(backup: ConsoleBackup, options: { mode: "replace" } = { mode: "replace" }): Promise<void> {
  if (options.mode !== "replace") throw new Error("Only replace mode is supported.");
  const b = validateBackup(backup);
  const stores = b.stores.map((s) => ({
    ...s,
    rules: { ...s.rules, ladder: (s.rules?.ladder ?? []).map((r) => ({ ...r, upTo: typeof r.upTo === "number" ? r.upTo : Infinity })) },
  }));
  await withTx([...STORE_NAMES], "readwrite", (tx) => {
    for (const n of STORE_NAMES) tx.objectStore(n).clear();
    tx.objectStore("settings").put({ ...defaultSettings(), ...(b.settings ?? {}) }, "settings");
    for (const s of stores) tx.objectStore("stores").put(s);
    for (const x of b.batches) tx.objectStore("batches").put(x);
    for (const x of b.rows) tx.objectStore("rows").put(x);
    for (const x of b.bulk) tx.objectStore("bulk").put(x);
    for (const x of b.decisions) tx.objectStore("decisions").put(x);
  });
  emit("all");
}

/** Wipe every console record (settings return to defaults). */
export async function resetAll(): Promise<void> {
  await withTx([...STORE_NAMES], "readwrite", (tx) => {
    for (const n of STORE_NAMES) tx.objectStore(n).clear();
  });
  emit("all");
}

/* -------------------------------------------------------------------- demo */

/** Replace existing demo stores with fresh demo data. Non-demo stores are untouched. */
export async function loadDemo(seed?: number): Promise<{ stores: number; rows: number; bulk: number }> {
  const data = makeDemoData(seed);
  await removeDemoInternal();
  // Give demo stores colour slots the user's own stores are not using.
  const own = (await getAllFrom<Store>("stores")).filter((s) => !s.demo);
  const used = new Set(own.map((s) => ((Math.trunc(s.colorIndex) % 6) + 6) % 6));
  const free = [0, 1, 2, 3, 4, 5].filter((i) => !used.has(i));
  for (const s of data.stores) {
    const i = used.has(s.colorIndex) ? -1 : free.indexOf(s.colorIndex);
    if (i !== -1) free.splice(i, 1); // keeps its own slot
  }
  data.stores.forEach((s, i) => {
    if (used.has(s.colorIndex) && free.length) s.colorIndex = free.shift() as number;
    // Stagger createdAt by a second so listStores keeps the demo's own order.
    const t = Date.parse(s.createdAt);
    if (Number.isFinite(t)) s.createdAt = new Date(t + i * 1000).toISOString();
  });
  const now = new Date().toISOString();
  await withTx(["stores"], "readwrite", (tx) => {
    for (const s of data.stores) tx.objectStore("stores").put(s);
  });
  for (const s of data.stores) {
    const rows = data.rows.filter((r) => r.storeId === s.id);
    const bulk = data.bulk.filter((b) => b.storeId === s.id);
    await importRows(s.id, makeBatch(`demo-rows-${s.id}`, s.id, "search-term", "Demo search term report", now, rows.length, 7), rows);
    await importBulk(s.id, makeBatch(`demo-bulk-${s.id}`, s.id, "bulk", "Demo bulk file", now, bulk.length), bulk);
  }
  emit("all");
  return { stores: data.stores.length, rows: data.rows.length, bulk: data.bulk.length };
}

function makeBatch(
  id: string,
  storeId: string,
  kind: ImportBatch["kind"],
  fileName: string,
  importedAt: string,
  rowCount: number,
  attributionDays?: number,
): ImportBatch {
  return { id, storeId, kind, fileName, importedAt, rowCount, inserted: 0, updated: 0, skipped: 0, errors: [], ...(attributionDays ? { attributionDays } : {}) };
}

async function removeDemoInternal(): Promise<number> {
  const stores = await getAllFrom<Store>("stores");
  const demo = stores.filter((s) => s.demo);
  if (!demo.length) return 0;
  await withTx(["stores", "rows", "bulk", "batches", "decisions", "settings"], "readwrite", async (tx) => {
    for (const s of demo) await cascadeDelete(tx, s.id);
    const settings = tx.objectStore("settings");
    const cur = await promisify(settings.get("settings") as IDBRequest<ConsoleSettings | undefined>);
    if (cur && demo.some((s) => s.id === cur.activeStoreId)) settings.put({ ...cur, activeStoreId: "all" }, "settings");
  });
  return demo.length;
}

/** Remove every demo store and its data. */
export async function removeDemo(): Promise<number> {
  const n = await removeDemoInternal();
  emit("all");
  return n;
}

/** Natural keys start with the normalised store id; move a key to another store. */
function rekey(key: string, fromStore: string, toStore: string): string {
  if (fromStore === toStore) return key;
  const prefix = `${norm(fromStore)}|`;
  return key.startsWith(prefix) ? `${norm(toStore)}|${key.slice(prefix.length)}` : key;
}
