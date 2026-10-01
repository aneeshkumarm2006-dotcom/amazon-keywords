/**
 * Minimal ZIP container support — enough for .xlsx files.
 *
 * Reader: End Of Central Directory → central directory → local headers.
 * Methods 0 (STORED) and 8 (DEFLATE, via `DecompressionStream("deflate-raw")`,
 * available in every current browser and in Node ≥ 18). Sizes are taken from the
 * central directory, so entries written with a data descriptor (flag bit 3) work.
 * ZIP64 archives are rejected with a clear error (a bulk file would need > 4 GB).
 *
 * Writer: STORED only, with a CRC32 table. Excel, LibreOffice and Amazon's bulk
 * upload all accept uncompressed OOXML packages.
 */

export interface ZipEntry {
  name: string;
  /** 0 = stored, 8 = deflate. */
  method: number;
  compressedSize: number;
  size: number;
  crc32: number;
  /** Offset of the local file header. */
  localOffset: number;
}

export interface ZipInputFile {
  name: string;
  data: Uint8Array | string;
  /** Modification date for the DOS timestamp (default 2026-01-01 00:00). */
  date?: Date;
}

const SIG_LOCAL = 0x04034b50;
const SIG_CENTRAL = 0x02014b50;
const SIG_EOCD = 0x06054b50;

/* ------------------------------------------------------------------ CRC32 */

let crcTable: Uint32Array | null = null;

function getCrcTable(): Uint32Array {
  if (crcTable) return crcTable;
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  crcTable = table;
  return table;
}

/** Standard CRC-32 (IEEE 802.3), as used by ZIP and PNG. */
export function crc32(data: Uint8Array): number {
  const table = getCrcTable();
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/* ----------------------------------------------------------------- helpers */

function u16(b: Uint8Array, o: number): number {
  return b[o] | (b[o + 1] << 8);
}

function u32(b: Uint8Array, o: number): number {
  return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;
}

const utf8Decoder = { current: null as TextDecoder | null };

function decodeUtf8(bytes: Uint8Array): string {
  if (!utf8Decoder.current) utf8Decoder.current = new TextDecoder("utf-8");
  return utf8Decoder.current.decode(bytes);
}

function encodeUtf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

/** True when the bytes start with a ZIP local file header (`PK\x03\x04`). */
export function isZip(bytes: Uint8Array): boolean {
  return bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

/* ------------------------------------------------------------------ reader */

/** List the entries of a ZIP archive from its central directory. */
export function listZip(bytes: Uint8Array): ZipEntry[] {
  // EOCD is at least 22 bytes and may be followed by a comment of up to 65535.
  const minEocd = 22;
  if (bytes.length < minEocd) throw new Error("Not a ZIP file (too short).");
  let eocd = -1;
  const stop = Math.max(0, bytes.length - minEocd - 0xffff);
  for (let i = bytes.length - minEocd; i >= stop; i--) {
    if (u32(bytes, i) === SIG_EOCD) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("Not a ZIP file (no end-of-central-directory record).");
  const total = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);
  if (total === 0xffff || cdOffset === 0xffffffff || cdSize === 0xffffffff) {
    throw new Error("ZIP64 archives are not supported.");
  }
  if (cdOffset + cdSize > bytes.length) throw new Error("Corrupt ZIP: central directory out of range.");

  const entries: ZipEntry[] = [];
  let p = cdOffset;
  for (let n = 0; n < total; n++) {
    if (p + 46 > bytes.length || u32(bytes, p) !== SIG_CENTRAL) {
      throw new Error("Corrupt ZIP: bad central directory entry.");
    }
    const method = u16(bytes, p + 10);
    const crc = u32(bytes, p + 16);
    const compressedSize = u32(bytes, p + 20);
    const size = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const extraLen = u16(bytes, p + 30);
    const commentLen = u16(bytes, p + 32);
    const localOffset = u32(bytes, p + 42);
    const name = decodeUtf8(bytes.subarray(p + 46, p + 46 + nameLen));
    if (compressedSize === 0xffffffff || size === 0xffffffff || localOffset === 0xffffffff) {
      throw new Error("ZIP64 archives are not supported.");
    }
    entries.push({ name, method, compressedSize, size, crc32: crc, localOffset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

/**
 * Decompress raw DEFLATE data with the platform's DecompressionStream, yielding
 * the output in chunks as it is produced (no single buffer holds it all).
 */
export async function* inflateRawChunks(data: Uint8Array): AsyncGenerator<Uint8Array> {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("This environment has no DecompressionStream; cannot read compressed .xlsx files.");
  }
  const ds = new DecompressionStream("deflate-raw");
  const writer = ds.writable.getWriter();
  // Copy into a fresh ArrayBuffer-backed view (also detaches us from the caller's buffer).
  const input = new Uint8Array(data.length);
  input.set(data);
  const writing = writer.write(input).then(() => writer.close());
  // A corrupt stream rejects both sides; the reader's error is the one we surface.
  writing.catch(() => undefined);
  const reader = ds.readable.getReader();
  const fail = (err: unknown): Error => {
    const detail = err instanceof Error ? err.message || err.name : String(err);
    return new Error(`Corrupt compressed data in the file${detail ? ` (${detail})` : ""}.`);
  };
  try {
    for (;;) {
      let step: ReadableStreamReadResult<Uint8Array>;
      try {
        step = await reader.read();
      } catch (err) {
        throw fail(err);
      }
      if (step.done) break;
      if (step.value && step.value.length) yield step.value;
    }
    try {
      await writing;
    } catch (err) {
      throw fail(err);
    }
  } finally {
    // Stopped early (consumer broke out / threw): release the stream.
    reader.cancel().catch(() => undefined);
  }
}

/** Decompress raw DEFLATE data with the platform's DecompressionStream. */
export async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [];
  let length = 0;
  for await (const value of inflateRawChunks(data)) {
    chunks.push(value);
    length += value.length;
  }
  const out = new Uint8Array(length);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** The raw (still compressed) bytes of one entry. */
function entryData(bytes: Uint8Array, entry: ZipEntry): Uint8Array {
  const p = entry.localOffset;
  if (p + 30 > bytes.length || u32(bytes, p) !== SIG_LOCAL) {
    throw new Error(`Corrupt ZIP: bad local header for ${entry.name}.`);
  }
  const nameLen = u16(bytes, p + 26);
  const extraLen = u16(bytes, p + 28);
  const start = p + 30 + nameLen + extraLen;
  const end = start + entry.compressedSize;
  if (end > bytes.length) throw new Error(`Corrupt ZIP: ${entry.name} runs past the end of the file.`);
  if (entry.method !== 0 && entry.method !== 8) {
    throw new Error(`Unsupported ZIP compression method ${entry.method} for ${entry.name}.`);
  }
  return bytes.subarray(start, end);
}

/** Extract one entry's bytes. */
export async function readZipEntry(bytes: Uint8Array, entry: ZipEntry): Promise<Uint8Array> {
  const raw = entryData(bytes, entry);
  if (entry.method === 0) return raw.slice();
  return inflateRaw(raw);
}

/**
 * Extract one entry as a stream of chunks — for parts too large to hold as a
 * single buffer / string (a 500k-row worksheet is over 500 MB of XML).
 */
export async function* readZipEntryChunks(bytes: Uint8Array, entry: ZipEntry, storedChunkSize = 1 << 20): AsyncGenerator<Uint8Array> {
  const raw = entryData(bytes, entry);
  if (entry.method === 0) {
    for (let i = 0; i < raw.length; i += storedChunkSize) yield raw.subarray(i, Math.min(raw.length, i + storedChunkSize));
    return;
  }
  yield* inflateRawChunks(raw);
}

/**
 * Extract every entry (or only those accepted by `filter`) into a map keyed by
 * entry name. Directory entries are skipped.
 */
export async function unzip(
  bytes: Uint8Array,
  filter?: (name: string) => boolean,
): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  for (const entry of listZip(bytes)) {
    if (entry.name.endsWith("/")) continue;
    if (filter && !filter(entry.name)) continue;
    out.set(entry.name, await readZipEntry(bytes, entry));
  }
  return out;
}

/* ------------------------------------------------------------------ writer */

function dosDateTime(date: Date): { time: number; date: number } {
  const year = Math.max(1980, date.getFullYear());
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2),
    date: ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

/** Build a STORED (uncompressed) ZIP archive. */
export function zip(files: ZipInputFile[]): Uint8Array {
  const prepared = files.map((f) => {
    const data = typeof f.data === "string" ? encodeUtf8(f.data) : f.data;
    const name = encodeUtf8(f.name);
    const dt = dosDateTime(f.date ?? new Date(2026, 0, 1, 0, 0, 0));
    return { name, data, crc: crc32(data), dt };
  });

  let localSize = 0;
  let centralSize = 0;
  for (const f of prepared) {
    localSize += 30 + f.name.length + f.data.length;
    centralSize += 46 + f.name.length;
  }
  const out = new Uint8Array(localSize + centralSize + 22);
  const view = new DataView(out.buffer);
  let p = 0;
  const offsets: number[] = [];

  for (const f of prepared) {
    offsets.push(p);
    view.setUint32(p, SIG_LOCAL, true);
    view.setUint16(p + 4, 20, true); // version needed
    view.setUint16(p + 6, 0x0800, true); // UTF-8 names
    view.setUint16(p + 8, 0, true); // stored
    view.setUint16(p + 10, f.dt.time, true);
    view.setUint16(p + 12, f.dt.date, true);
    view.setUint32(p + 14, f.crc, true);
    view.setUint32(p + 18, f.data.length, true);
    view.setUint32(p + 22, f.data.length, true);
    view.setUint16(p + 26, f.name.length, true);
    view.setUint16(p + 28, 0, true);
    out.set(f.name, p + 30);
    out.set(f.data, p + 30 + f.name.length);
    p += 30 + f.name.length + f.data.length;
  }

  const cdStart = p;
  prepared.forEach((f, idx) => {
    view.setUint32(p, SIG_CENTRAL, true);
    view.setUint16(p + 4, 20, true); // version made by
    view.setUint16(p + 6, 20, true); // version needed
    view.setUint16(p + 8, 0x0800, true);
    view.setUint16(p + 10, 0, true);
    view.setUint16(p + 12, f.dt.time, true);
    view.setUint16(p + 14, f.dt.date, true);
    view.setUint32(p + 16, f.crc, true);
    view.setUint32(p + 20, f.data.length, true);
    view.setUint32(p + 24, f.data.length, true);
    view.setUint16(p + 28, f.name.length, true);
    view.setUint16(p + 30, 0, true); // extra
    view.setUint16(p + 32, 0, true); // comment
    view.setUint16(p + 34, 0, true); // disk
    view.setUint16(p + 36, 0, true); // internal attrs
    view.setUint32(p + 38, 0, true); // external attrs
    view.setUint32(p + 42, offsets[idx], true);
    out.set(f.name, p + 46);
    p += 46 + f.name.length;
  });

  const cdSize = p - cdStart;
  view.setUint32(p, SIG_EOCD, true);
  view.setUint16(p + 4, 0, true);
  view.setUint16(p + 6, 0, true);
  view.setUint16(p + 8, prepared.length, true);
  view.setUint16(p + 10, prepared.length, true);
  view.setUint32(p + 12, cdSize, true);
  view.setUint32(p + 16, cdStart, true);
  view.setUint16(p + 20, 0, true);
  return out;
}
