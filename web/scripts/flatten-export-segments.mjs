/**
 * Flatten the per-segment prefetch files of a static export built on Windows.
 *
 *   node scripts/flatten-export-segments.mjs [outDir]   (runs as `postbuild`)
 *
 * Next 16 writes one `__next.<segment path>.txt` file per route segment, and
 * the client router requests exactly that flat, dot-joined name
 * (`/dashboard/bids/__next.dashboard.bids.__PAGE__.txt`). On win32 the export
 * step builds the name from `path.relative()`, which uses backslashes, so the
 * file lands nested instead (`/dashboard/bids/__next.dashboard/bids/__PAGE__.txt`)
 * and every segment prefetch below the root 404s when that `out/` is served.
 *
 * This moves every file under a nested `__next.*` directory to the flat name
 * the client asks for, then removes the emptied directories. A Linux or macOS
 * build (CI, Vercel) never has such a directory, so this is a no-op there, and
 * running it twice changes nothing.
 */

import { readdir, rename, rmdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEGMENT_PREFIX = "__next.";

/**
 * The flat file name Next's client requests for a file found at
 * `<dirName>/<...relParts>`, e.g. ("__next.dashboard", ["bids", "__PAGE__.txt"])
 * -> "__next.dashboard.bids.__PAGE__.txt".
 *
 * @param {string} dirName
 * @param {string[]} relParts
 * @returns {string}
 */
export function flatSegmentName(dirName, relParts) {
  return [dirName, ...relParts].join(".");
}

/**
 * Every file under `dir` as path parts relative to it, plus every
 * subdirectory (deepest first) so they can be removed once emptied.
 *
 * @param {string} dir
 * @param {string[]} rel
 * @param {{ files: string[][]; dirs: string[] }} acc
 */
async function collect(dir, rel = [], acc = { files: [], dirs: [] }) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const parts = [...rel, entry.name];
    if (entry.isDirectory()) {
      await collect(path.join(dir, entry.name), parts, acc);
      acc.dirs.push(path.join(dir, entry.name));
    } else {
      acc.files.push(parts);
    }
  }
  return acc;
}

/**
 * Flatten every nested `__next.*` segment directory under `outDir`.
 * Returns the number of files moved (0 for an export that is already flat).
 *
 * @param {string} outDir
 * @returns {Promise<number>}
 */
export async function flattenExportSegments(outDir) {
  let moved = 0;
  /** @param {string} dir */
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const full = path.join(dir, entry.name);
      if (!entry.name.startsWith(SEGMENT_PREFIX)) {
        await walk(full);
        continue;
      }
      const { files, dirs } = await collect(full);
      for (const parts of files) {
        await rename(path.join(full, ...parts), path.join(dir, flatSegmentName(entry.name, parts)));
        moved++;
      }
      // Only empty directories are left; rmdir refuses anything else.
      for (const sub of dirs) await rmdir(sub);
      await rmdir(full);
    }
  }
  await walk(outDir);
  return moved;
}

function isEntryPoint() {
  const entry = process.argv[1] ? path.resolve(process.argv[1]) : "";
  const self = fileURLToPath(import.meta.url);
  return process.platform === "win32" ? entry.toLowerCase() === self.toLowerCase() : entry === self;
}

if (isEntryPoint()) {
  const outDir = path.resolve(process.argv[2] ?? "out");
  flattenExportSegments(outDir)
    .then((moved) => {
      if (moved) console.log(`flatten-export-segments: moved ${moved} segment file(s) to flat names in ${outDir}`);
    })
    .catch((err) => {
      if (err && err.code === "ENOENT" && err.path === outDir) return; // no export to fix
      console.error(err);
      process.exit(1);
    });
}
