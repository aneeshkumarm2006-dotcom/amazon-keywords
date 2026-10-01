/**
 * Self-test: the static-export postbuild step (scripts/flatten-export-segments.mjs).
 * On win32 Next 16 writes segment-prefetch files nested
 * (`dashboard/bids/__next.dashboard/bids/__PAGE__.txt`) instead of under the flat
 * name the client router requests (`__next.dashboard.bids.__PAGE__.txt`), so every
 * prefetch below the root 404s when a Windows-built `out/` is served.
 */

import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { convertSegmentPathToStaticExportFilename } from "next/dist/shared/lib/segment-cache/segment-value-encoding";
import { flatSegmentName, flattenExportSegments } from "./flatten-export-segments.mjs";
import { group, test } from "./ppc-test-harness";

group("site");

/** What the client requests for a segment, and where a win32 export writes it. */
function segmentNames(segments: string[]): { flat: string; win32Parts: string[] } {
  const flat = convertSegmentPathToStaticExportFilename("/" + segments.join("/"));
  // export/index.js builds the segment path from path.relative(), which joins with "\" on win32.
  const win32 = convertSegmentPathToStaticExportFilename("/" + path.win32.join(...segments));
  return { flat, win32Parts: win32.split("\\") };
}

async function writeAt(root: string, parts: string[], body: string): Promise<void> {
  const file = path.join(root, ...parts);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, body);
}

async function withTempDir(fn: (dir: string) => Promise<void>): Promise<void> {
  const dir = await mkdtemp(path.join(os.tmpdir(), "ppc-export-"));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test("flat name matches the file Next's client router requests", () => {
  for (const segments of [["dashboard", "bids", "__PAGE__"], ["sops", "daily-health-check"], ["progress", "__PAGE__"]]) {
    const { flat, win32Parts } = segmentNames(segments);
    assert.ok(win32Parts.length > 1, "win32 export name is nested");
    assert.equal(flatSegmentName(win32Parts[0], win32Parts.slice(1)), flat);
  }
});

test("a Windows-built export is flattened to the names the client requests", async () => {
  await withTempDir(async (out) => {
    const page = segmentNames(["dashboard", "bids", "__PAGE__"]);
    const layout = segmentNames(["dashboard", "bids"]);
    const routeDir = ["dashboard", "bids"];
    await writeAt(out, [...routeDir, ...page.win32Parts], "page");
    await writeAt(out, [...routeDir, ...layout.win32Parts], "layout");
    // Single-segment files are already flat and must be left alone.
    await writeAt(out, [...routeDir, "__next.dashboard.txt"], "dash");
    await writeAt(out, [...routeDir, "__next._tree.txt"], "tree");
    await writeAt(out, ["__next.__PAGE__.txt"], "root");
    await writeAt(out, ["_next", "static", "chunk.js"], "js");

    assert.equal(await flattenExportSegments(out), 2);
    assert.equal(await readFile(path.join(out, ...routeDir, page.flat), "utf8"), "page");
    assert.equal(await readFile(path.join(out, ...routeDir, layout.flat), "utf8"), "layout");
    assert.equal(existsSync(path.join(out, ...routeDir, "__next.dashboard")), false, "nested dir removed");
    assert.equal(await readFile(path.join(out, ...routeDir, "__next.dashboard.txt"), "utf8"), "dash");
    assert.equal(await readFile(path.join(out, ...routeDir, "__next._tree.txt"), "utf8"), "tree");
    assert.equal(await readFile(path.join(out, "__next.__PAGE__.txt"), "utf8"), "root");
    assert.equal(await readFile(path.join(out, "_next", "static", "chunk.js"), "utf8"), "js");

    assert.equal(await flattenExportSegments(out), 0, "second run is a no-op");
  });
});

test("an export built on Linux/macOS (already flat) is untouched", async () => {
  await withTempDir(async (out) => {
    const page = segmentNames(["progress", "__PAGE__"]);
    await writeAt(out, ["progress", page.flat], "page");
    await writeAt(out, ["progress", "__next._index.txt"], "index");
    assert.equal(await flattenExportSegments(out), 0);
    assert.equal(await readFile(path.join(out, "progress", page.flat), "utf8"), "page");
  });
});
