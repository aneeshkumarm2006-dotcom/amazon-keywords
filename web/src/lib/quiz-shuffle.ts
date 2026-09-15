/**
 * Seeded shuffling for the quiz engine.
 *
 * A resumed session must present the same questions in the same order with
 * the same choice order it had before the refresh, so nothing here may use
 * `Math.random` at render time. Every permutation is derived from an integer
 * seed stored with the session, which makes the whole runner deterministic
 * and testable.
 */

/** FNV-1a. Small, fast, and stable across engines. */
export function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/** Mulberry32 PRNG — 32-bit state, uniform enough for shuffling. */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Fisher-Yates driven by a seeded PRNG. Returns a new array. */
export function seededShuffle<T>(items: readonly T[], seed: number): T[] {
  const out = items.slice();
  const random = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * The display order for one question's choices.
 *
 * Derived from the session seed plus the question id, so it is stable for a
 * given question inside a given session but different between sessions — a
 * retake never shows the answer in the same slot.
 */
export function choiceOrderFor(questionId: string, seed: number, choiceCount = 4): number[] {
  const indices = Array.from({ length: choiceCount }, (_, index) => index);
  return seededShuffle(indices, (hashString(questionId) ^ seed) >>> 0);
}

/** A fresh seed for a new session. */
export function newSeed(): number {
  return Math.floor(Math.random() * 0xffffffff) >>> 0;
}
