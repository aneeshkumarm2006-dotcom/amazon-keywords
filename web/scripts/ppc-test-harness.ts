/**
 * Minimal test harness for the PPC engine self-test (no framework).
 */

export type TestFn = () => void | Promise<void>;

interface TestCase {
  group: string;
  name: string;
  fn: TestFn;
}

const cases: TestCase[] = [];
let currentGroup = "misc";

export function group(name: string): void {
  currentGroup = name;
}

export function test(name: string, fn: TestFn): void {
  cases.push({ group: currentGroup, name, fn });
}

/** Informational lines printed in the summary (timings, counts). */
export const notes: string[] = [];

export function note(line: string): void {
  notes.push(line);
}

export async function run(): Promise<number> {
  const failures: { c: TestCase; err: unknown }[] = [];
  const perGroup = new Map<string, { pass: number; fail: number }>();
  const started = Date.now();
  const verbose = typeof process !== "undefined" && !!process.env.PPC_TEST_VERBOSE;
  for (const c of cases) {
    const g = perGroup.get(c.group) ?? { pass: 0, fail: 0 };
    perGroup.set(c.group, g);
    if (verbose) console.log(`… [${c.group}] ${c.name}`);
    try {
      await c.fn();
      g.pass++;
    } catch (err) {
      g.fail++;
      failures.push({ c, err });
    }
  }
  const lines: string[] = [];
  lines.push("PPC engine self-test");
  for (const [name, g] of perGroup) {
    lines.push(`  ${g.fail ? "FAIL" : "ok  "} ${name.padEnd(10)} ${g.pass}/${g.pass + g.fail}`);
  }
  for (const n of notes) lines.push(`  · ${n}`);
  const total = cases.length;
  const passed = total - failures.length;
  lines.push(`  ${passed}/${total} passed in ${Date.now() - started} ms`);
  console.log(lines.join("\n"));
  for (const f of failures) {
    console.error(`\n✗ [${f.c.group}] ${f.c.name}`);
    console.error(f.err instanceof Error ? f.err.stack ?? f.err.message : f.err);
  }
  return failures.length;
}
