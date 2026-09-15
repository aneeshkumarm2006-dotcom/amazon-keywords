"use client";

import { ArrowUpRight, Search, Sigma, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { CONTROL_BASE } from "@/components/ui/Field";
import { cn } from "@/lib/utils";
import type { GlossaryTerm } from "@/types/content";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

interface Group {
  letter: string;
  entries: GlossaryTerm[];
}

function groupByLetter(entries: GlossaryTerm[]): Group[] {
  const groups = new Map<string, GlossaryTerm[]>();

  for (const entry of entries) {
    const first = entry.term.charAt(0).toUpperCase();
    const letter = /[A-Z]/.test(first) ? first : "#";
    const bucket = groups.get(letter);
    if (bucket) bucket.push(entry);
    else groups.set(letter, [entry]);
  }

  return Array.from(groups.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([letter, list]) => ({ letter, entries: list }));
}

export interface GlossaryBrowserProps {
  terms: GlossaryTerm[];
  categories: string[];
  /** Route -> human title, so "see also" links read as their destination. */
  linkTitles: Record<string, string>;
}

/**
 * The glossary surface: a live filter, category chips, an A-Z jump index that
 * disables letters with no matches, and cross-links between related terms.
 *
 * Terms arrive pre-sorted from the server so the first paint is already in
 * alphabetical order and the anchors are stable for deep links.
 */
export function GlossaryBrowser({
  terms,
  categories,
  linkTitles,
}: GlossaryBrowserProps) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // "/" focuses the filter, the way every reference site the audience already
  // uses behaves. Ignored while another field has focus.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const active = document.activeElement;
      if (
        active instanceof HTMLInputElement ||
        active instanceof HTMLTextAreaElement ||
        active instanceof HTMLSelectElement
      ) {
        return;
      }
      event.preventDefault();
      searchRef.current?.focus();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const haystacks = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of terms) {
      map.set(
        entry.id,
        [
          entry.term,
          entry.abbreviation ?? "",
          entry.definition,
          entry.formula ?? "",
          entry.example ?? "",
          entry.category,
        ]
          .join(" ")
          .toLowerCase(),
      );
    }
    return map;
  }, [terms]);

  const results = useMemo(() => {
    const needles = query.toLowerCase().split(/\s+/).filter(Boolean);
    return terms.filter((entry) => {
      if (category && entry.category !== category) return false;
      const haystack = haystacks.get(entry.id) ?? "";
      return needles.every((needle) => haystack.includes(needle));
    });
  }, [terms, category, query, haystacks]);

  const groups = useMemo(() => groupByLetter(results), [results]);
  const activeLetters = useMemo(
    () => new Set(groups.map((group) => group.letter)),
    [groups],
  );

  const byId = useMemo(() => {
    const map = new Map<string, GlossaryTerm>();
    for (const entry of terms) map.set(entry.id, entry);
    return map;
  }, [terms]);

  const filtered = query !== "" || category !== null;

  const reset = () => {
    setQuery("");
    setCategory(null);
  };

  return (
    <div>
      {/* ---------------------------------------------------------- filter */}
      <div className="flex flex-col gap-4">
        <div className="relative flex items-center">
          <Search
            className="pointer-events-none absolute left-3 size-4 text-faint"
            aria-hidden="true"
          />
          <label htmlFor="glossary-filter" className="sr-only">
            Filter glossary terms
          </label>
          <input
            id="glossary-filter"
            ref={searchRef}
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Filter ${terms.length} terms — try "acos", "match", "budget"…`}
            autoComplete="off"
            className={cn(
              CONTROL_BASE,
              "h-12 border-hairline pl-9 text-[0.9375rem] hover:border-hairline-strong",
              "[&::-webkit-search-cancel-button]:appearance-none",
            )}
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label="Clear the filter text"
              className="absolute right-2 inline-flex size-8 items-center justify-center rounded-md text-faint hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="pointer-events-none absolute right-3 hidden rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.6875rem] text-faint sm:block">
              /
            </kbd>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            aria-pressed={category === null}
            className={cn(
              "inline-flex min-h-8 items-center rounded-full border px-2.5 text-xs font-medium transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              category === null
                ? "border-brand bg-brand text-on-brand"
                : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
            )}
          >
            All
          </button>
          {categories.map((name) => {
            const on = category === name;
            const count = terms.filter((entry) => entry.category === name).length;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setCategory(on ? null : name)}
                aria-pressed={on}
                className={cn(
                  "inline-flex min-h-8 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  on
                    ? "border-brand bg-brand text-on-brand"
                    : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                {name}
                <span className={cn("tabular text-[0.6875rem]", on ? "opacity-80" : "text-faint")}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* ------------------------------------------------------ A-Z index */}
        <nav aria-label="Jump to letter" className="scroll-well -mx-1 overflow-x-auto px-1">
          <ul className="flex min-w-max items-center gap-0.5 rounded-lg border border-hairline bg-surface p-1">
            {ALPHABET.map((letter) => {
              const enabled = activeLetters.has(letter);
              return (
                <li key={letter}>
                  {enabled ? (
                    <a
                      href={`#letter-${letter}`}
                      className="tabular flex size-8 items-center justify-center rounded-md text-[0.8125rem] font-semibold text-ink transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand [@media(pointer:coarse)]:size-11"
                    >
                      {letter}
                    </a>
                  ) : (
                    <span
                      aria-hidden="true"
                      className="tabular flex size-8 items-center justify-center rounded-md text-[0.8125rem] text-faint/50 [@media(pointer:coarse)]:size-11"
                    >
                      {letter}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-3">
          <p className="text-[0.8125rem] text-muted" aria-live="polite">
            <span className="tabular font-semibold text-ink">{results.length}</span> term
            {results.length === 1 ? "" : "s"}
            {filtered ? (
              <>
                {" "}
                of <span className="tabular">{terms.length}</span>
              </>
            ) : null}
          </p>
          {filtered ? (
            <Button variant="ghost" size="sm" icon={X} onClick={reset}>
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      {/* ----------------------------------------------------------- terms */}
      {results.length === 0 ? (
        <EmptyState
          className="mt-8"
          title="No terms match that filter"
          description="Try a shorter word, or clear the category filter to search all of the glossary."
          action={
            <Button variant="secondary" size="sm" onClick={reset}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <div className="mt-8 space-y-10">
          {groups.map((group) => (
            <section key={group.letter} aria-labelledby={`letter-${group.letter}`}>
              <h2
                id={`letter-${group.letter}`}
                className="mb-4 scroll-mt-24 border-b border-hairline pb-2 font-display text-2xl font-bold text-brand"
              >
                {group.letter}
              </h2>

              <dl className="grid gap-4 lg:grid-cols-2">
                {group.entries.map((entry) => (
                  <div
                    key={entry.id}
                    id={entry.id}
                    className="scroll-mt-24 rounded-xl border border-hairline bg-surface p-5 target:border-brand target:shadow-card"
                  >
                    <dt className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      <span className="font-display text-[1.0625rem] leading-tight font-semibold text-ink">
                        {entry.term}
                      </span>
                      {entry.abbreviation && entry.abbreviation !== entry.term ? (
                        <span className="text-[0.8125rem] text-muted">
                          {entry.abbreviation}
                        </span>
                      ) : null}
                      <span className="ml-auto shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.6875rem] font-medium text-muted">
                        {entry.category}
                      </span>
                    </dt>

                    <dd className="mt-2 space-y-3">
                      <p className="text-[0.875rem] leading-relaxed text-muted">
                        {entry.definition}
                      </p>

                      {entry.formula ? (
                        <p className="flex items-start gap-2 rounded-lg border border-brand/25 bg-brand-soft px-3 py-2">
                          <Sigma
                            className="mt-0.5 size-3.5 shrink-0 text-brand"
                            aria-hidden="true"
                          />
                          <code className="tabular text-[0.78125rem] leading-relaxed break-words text-ink">
                            {entry.formula}
                          </code>
                        </p>
                      ) : null}

                      {entry.example ? (
                        <p className="border-l-2 border-hairline-strong pl-3 text-[0.8125rem] leading-relaxed text-faint">
                          {entry.example}
                        </p>
                      ) : null}

                      {entry.related && entry.related.length > 0 ? (
                        <p className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="text-[0.6875rem] font-medium tracking-[0.08em] text-faint uppercase">
                            Related
                          </span>
                          {entry.related.map((id) => {
                            const target = byId.get(id);
                            if (!target) return null;
                            return (
                              <a
                                key={id}
                                href={`#${id}`}
                                onClick={() => {
                                  // A filtered view may not contain the target;
                                  // clearing the filters guarantees the jump lands.
                                  setQuery("");
                                  setCategory(null);
                                }}
                                className="inline-flex h-6 items-center rounded-full border border-hairline bg-surface-2 px-2 text-[0.6875rem] text-muted transition-colors hover:border-brand/40 hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                              >
                                {target.term}
                              </a>
                            );
                          })}
                        </p>
                      ) : null}

                      {entry.seeAlso && entry.seeAlso.length > 0 ? (
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5">
                          {entry.seeAlso.map((href) => (
                            <Link
                              key={href}
                              href={href}
                              className="inline-flex items-center gap-1 text-[0.75rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                            >
                              {linkTitles[href] ?? href}
                              <ArrowUpRight className="size-3" aria-hidden="true" />
                            </Link>
                          ))}
                        </p>
                      ) : null}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
