/**
 * Module worker: parses uploaded reports off the main thread.
 *
 *   in  { id, name, size, buffer }         (buffer is transferred)
 *   out { id, type: "stage", stage }
 *       { id, type: "done", result }       (UploadAnalysis)
 *       { id, type: "error", message }
 *
 * Created by `parseClient.ts` via `new Worker(new URL(...), { type: "module" })`.
 */

import { processUpload, type UploadStage } from "./upload";

interface ParseRequest {
  id: number;
  name: string;
  size: number;
  buffer: ArrayBuffer;
}

// Typed loosely on purpose: the project compiles against the DOM lib, and
// pulling in the "webworker" lib alongside it redeclares globals.
const scope = self as unknown as {
  postMessage: (message: unknown) => void;
  onmessage: ((event: MessageEvent<ParseRequest>) => void) | null;
};

scope.onmessage = (event: MessageEvent<ParseRequest>) => {
  const { id, name, size, buffer } = event.data;
  const onStage = (stage: UploadStage) => scope.postMessage({ id, type: "stage", stage });
  processUpload(name, size, new Uint8Array(buffer), onStage).then(
    (result) => scope.postMessage({ id, type: "done", result }),
    (err: unknown) => scope.postMessage({ id, type: "error", message: err instanceof Error ? err.message : String(err) }),
  );
};
