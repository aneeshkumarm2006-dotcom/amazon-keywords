"use client";

import { Download, FileCode2 } from "lucide-react";
import { useCallback, useMemo } from "react";

import { downloadFile } from "@/components/calc/csv";
import { Button } from "@/components/ui/Button";
import { CopyButton } from "@/components/ui/CopyButton";
import { LANGUAGES, type ScriptLanguage } from "@/content/scripts";
import { cn } from "@/lib/utils";

import { TOKEN_CLASS, tokenizeLines } from "./syntax";

/**
 * A syntax-highlighted code block.
 *
 * Highlighting is hand-rolled (see `syntax.ts`) rather than pulled from a
 * library: the four languages here need seven token classes between them, and
 * a highlighter is a smaller thing to own than a dependency.
 *
 * `highlight` tints a line range. The detail page wires it to the line-by-line
 * explanation, so reading "lines 14-28" scrolls and marks the actual lines.
 */
export interface CodeBlockProps {
  code: string;
  language: ScriptLanguage;
  fileName: string;
  /** Inclusive 1-based line range to tint, or null for none. */
  highlight?: [number, number] | null;
  className?: string;
}

export function CodeBlock({ code, language, fileName, highlight, className }: CodeBlockProps) {
  const lines = useMemo(() => tokenizeLines(code.replace(/\n$/, ""), language), [code, language]);
  const meta = LANGUAGES[language];

  const download = useCallback(() => {
    downloadFile(fileName, code, meta.mime);
  }, [code, fileName, meta.mime]);

  const gutterWidth = `${String(lines.length).length + 1}ch`;

  return (
    <section
      className={cn("min-w-0 overflow-hidden rounded-xl border border-hairline bg-surface", className)}
    >
      <header className="flex flex-wrap items-center gap-3 border-b border-hairline bg-surface-2 px-4 py-2.5">
        <FileCode2 className="size-4 shrink-0 text-faint" aria-hidden="true" />
        <span className="font-mono text-[0.8125rem] font-medium text-ink">{fileName}</span>
        <span className="text-[0.6875rem] tracking-[0.06em] text-muted uppercase">
          {meta.label} · {lines.length} lines
        </span>
        <div className="ml-auto flex items-center gap-2">
          <CopyButton value={code} label="Copy code" />
          <Button variant="secondary" size="sm" icon={Download} onClick={download}>
            Download
          </Button>
        </div>
      </header>

      {/* A scroll well that only answers a wheel or a swipe strands keyboard
          users on the first 40-odd columns, so the well is focusable and named. */}
      <div
        role="group"
        aria-label={`${fileName} source`}
        tabIndex={0}
        className="scroll-well max-h-[40rem] overflow-auto bg-surface focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
      >
        <pre className="w-max min-w-full py-3 font-mono text-[0.78125rem] leading-[1.65]">
          <code>
            {lines.map((tokens, index) => {
              const number = index + 1;
              const marked =
                highlight !== null &&
                highlight !== undefined &&
                number >= highlight[0] &&
                number <= highlight[1];
              return (
                <span
                  key={number}
                  className={cn(
                    // The sticky gutter below inherits this background, so the
                    // row has to carry a real one: left transparent, scrolled
                    // code runs straight through the line numbers.
                    "flex w-full bg-surface pr-4",
                    marked && "bg-brand-soft shadow-[inset_2px_0_0_var(--brand)]",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className="sticky left-0 shrink-0 select-none bg-inherit pr-3 pl-4 text-right text-faint"
                    style={{ width: `calc(${gutterWidth} + 1.75rem)` }}
                  >
                    {number}
                  </span>
                  <span className="whitespace-pre">
                    {tokens.length === 0 ? (
                      " "
                    ) : (
                      tokens.map((token, tokenIndex) => (
                        <span
                          key={`${number}-${tokenIndex}`}
                          className={TOKEN_CLASS[token.type]}
                        >
                          {token.value}
                        </span>
                      ))
                    )}
                  </span>
                </span>
              );
            })}
          </code>
        </pre>
      </div>
    </section>
  );
}
