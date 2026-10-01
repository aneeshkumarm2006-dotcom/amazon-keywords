"use client";

/**
 * Parse an uploaded File, preferring the module worker so a 100k-row report
 * never blocks the page. If workers are unavailable or the worker fails to
 * load, the same `processUpload` runs on the main thread after yielding a
 * frame (the UI shows a spinner either way).
 */

import type { UploadAnalysis, UploadStage } from "./upload";

type Pending = {
  resolve: (a: UploadAnalysis) => void;
  reject: (e: Error) => void;
  onStage?: (s: UploadStage) => void;
};

class WorkerUnavailable extends Error {}

let worker: Worker | null = null;
let workerBroken = false;
let seq = 0;
const pending = new Map<number, Pending>();

function failAll(err: Error) {
  for (const p of pending.values()) p.reject(err);
  pending.clear();
}

function getWorker(): Worker | null {
  if (workerBroken || typeof window === "undefined" || typeof Worker === "undefined") return null;
  if (worker) return worker;
  try {
    const w = new Worker(new URL("./parse.worker.ts", import.meta.url), { type: "module" });
    w.onmessage = (event: MessageEvent) => {
      const msg = event.data as
        | { id: number; type: "stage"; stage: UploadStage }
        | { id: number; type: "done"; result: UploadAnalysis }
        | { id: number; type: "error"; message: string };
      const p = pending.get(msg.id);
      if (!p) return;
      if (msg.type === "stage") {
        p.onStage?.(msg.stage);
        return;
      }
      pending.delete(msg.id);
      if (msg.type === "done") p.resolve(msg.result);
      else p.reject(new Error(msg.message));
    };
    w.onerror = (event) => {
      // Script failed to load or crashed: stop using workers for this session.
      event.preventDefault?.();
      workerBroken = true;
      w.terminate();
      worker = null;
      failAll(new WorkerUnavailable(event.message || "The parser worker stopped."));
    };
    w.onmessageerror = () => {
      failAll(new WorkerUnavailable("The parser worker sent a message that could not be read."));
    };
    worker = w;
    return w;
  } catch {
    workerBroken = true;
    return null;
  }
}

async function onMainThread(file: File, onStage?: (s: UploadStage) => void): Promise<UploadAnalysis> {
  onStage?.("parsing");
  // Let the spinner paint before the synchronous parse starts.
  await new Promise((resolve) => setTimeout(resolve, 30));
  const [{ processUpload }, buffer] = await Promise.all([import("./upload"), file.arrayBuffer()]);
  return processUpload(file.name, file.size, new Uint8Array(buffer), onStage);
}

export async function analyzeFile(file: File, onStage?: (s: UploadStage) => void): Promise<UploadAnalysis> {
  onStage?.("reading");
  const w = getWorker();
  if (w) {
    try {
      const buffer = await file.arrayBuffer();
      // The worker can fail to load while the file is being read; its onerror
      // then ran with nothing pending, and posting to it would hang forever.
      if (worker !== w || workerBroken) throw new WorkerUnavailable("The parser worker stopped.");
      const id = ++seq;
      return await new Promise<UploadAnalysis>((resolve, reject) => {
        pending.set(id, { resolve, reject, onStage });
        w.postMessage({ id, name: file.name, size: file.size, buffer }, [buffer]);
      });
    } catch (err) {
      if (!(err instanceof WorkerUnavailable)) throw err;
      // Fall through to the main thread; the buffer was transferred, so re-read.
    }
  }
  return onMainThread(file, onStage);
}
