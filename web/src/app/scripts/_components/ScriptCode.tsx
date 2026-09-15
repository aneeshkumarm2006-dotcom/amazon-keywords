"use client";

import { ListTree } from "lucide-react";
import { useState } from "react";

import type { ScriptExplanation, ScriptLanguage } from "@/content/scripts";
import { cn } from "@/lib/utils";

import { CodeBlock } from "./CodeBlock";
import { parseLineRange } from "./syntax";

/**
 * The code block and its line-by-line explanation, wired together.
 *
 * Selecting an annotation tints the lines it describes. That link is the
 * whole point of the page: a VA reading "lines 43-53" should not have to
 * count rows in a 120-line file to find them.
 */
export function ScriptCode({
  code,
  language,
  fileName,
  explanation,
}: {
  code: string;
  language: ScriptLanguage;
  fileName: string;
  explanation: ScriptExplanation[];
}) {
  const [active, setActive] = useState<string | null>(null);
  const range = active ? parseLineRange(active) : null;

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start [&>*]:min-w-0">
      <CodeBlock
        code={code}
        language={language}
        fileName={fileName}
        highlight={range}
        className="xl:sticky xl:top-24"
      />

      <section className="min-w-0 rounded-xl border border-hairline bg-surface">
        <header className="flex flex-wrap items-center gap-2 border-b border-hairline px-4 py-3.5 sm:px-5">
          <ListTree className="size-4 shrink-0 text-brand" aria-hidden="true" />
          <h2 className="font-display text-[0.9375rem] font-semibold text-ink">Line by line</h2>
          <p className="w-full text-[0.8125rem] leading-relaxed text-muted sm:w-auto sm:flex-1">
            Select a note to mark the lines it describes.
          </p>
        </header>

        <ol className="divide-y divide-hairline">
          {explanation.map((entry) => {
            const selected = active === entry.lines;
            return (
              <li key={entry.lines}>
                <button
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setActive(selected ? null : entry.lines)}
                  className={cn(
                    "flex w-full gap-3 px-4 py-3.5 text-left transition-colors sm:px-5",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    selected ? "bg-brand-soft" : "hover:bg-surface-2",
                  )}
                >
                  <span
                    className={cn(
                      "tabular mt-px shrink-0 rounded-md border px-1.5 py-0.5 text-[0.6875rem] font-semibold",
                      selected
                        ? "border-brand/40 bg-surface text-brand"
                        : "border-hairline bg-surface-2 text-muted",
                    )}
                  >
                    {entry.lines}
                  </span>
                  <span className="text-[0.875rem] leading-relaxed text-muted">{entry.what}</span>
                </button>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
