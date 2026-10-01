/**
 * PPC Console engine — public API.
 *
 * Pure modules (no React, no browser globals at import time) plus `db.ts`,
 * whose functions touch IndexedDB only when called, so this barrel is safe to
 * import from server components and during static prerendering.
 */

export * from "./types";
export * from "./csv";
export * from "./zip";
export * from "./xlsx";
export * from "./dates";
export * from "./keys";
export * from "./parse";
export * from "./detect";
export * from "./metrics";
export * from "./bidding";
export * from "./bulk-index";
export * from "./rules";
export * from "./export";
export * from "./demo";
export * from "./db";
