"use client";

import { ArrowRight, Clock, Search, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { LANGUAGES, type ScriptLanguage } from "@/content/scripts";
import { cn, formatMinutes, humanize } from "@/lib/utils";
import type { Level, Tone } from "@/types/content";

export interface ScriptCard {
  id: string;
  title: string;
  summary: string;
  href: string;
  language: ScriptLanguage;
  difficulty: Level;
  minutes: number;
  automates: string;
  frequency: string;
  saves: string;
  lines: number;
  tags: string[];
}

const LEVEL_TONE: Record<string, Tone> = {
  beginner: "good",
  intermediate: "info",
  advanced: "ember",
  expert: "bad",
  scenario: "brand",
};

const LANGUAGE_TONE: Record<ScriptLanguage, Tone> = {
  python: "info",
  "google-apps-script": "brand",
  sql: "ember",
  "bulk-sheet-formula": "good",
};

/** Static class map — Tailwind cannot see a class built by interpolation. */
const DOT: Record<Tone, string> = {
  neutral: "bg-hairline-strong",
  brand: "bg-brand",
  ember: "bg-ember",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
};

function FilterChip({
  label,
  count,
  active,
  tone = "neutral",
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: Tone;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[0.8125rem] font-medium",
        "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        active
          ? "border-brand bg-brand text-on-brand"
          : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
      )}
    >
      <span
        className={cn("size-2 shrink-0 rounded-full", active ? "bg-on-brand/70" : DOT[tone])}
        aria-hidden="true"
      />
      {label}
      <span className={cn("tabular text-[0.6875rem]", active ? "text-on-brand/75" : "text-faint")}>
        {count}
      </span>
    </button>
  );
}

export function ScriptLibrary({ scripts }: { scripts: ScriptCard[] }) {
  const [query, setQuery] = useState("");
  const [languages, setLanguages] = useState<ScriptLanguage[]>([]);
  const [levels, setLevels] = useState<string[]>([]);

  const languageCounts = useMemo(() => {
    const counts = new Map<ScriptLanguage, number>();
    for (const script of scripts) {
      counts.set(script.language, (counts.get(script.language) ?? 0) + 1);
    }
    return counts;
  }, [scripts]);

  const levelCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const script of scripts) {
      counts.set(script.difficulty, (counts.get(script.difficulty) ?? 0) + 1);
    }
    return counts;
  }, [scripts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return scripts.filter((script) => {
      if (languages.length > 0 && !languages.includes(script.language)) return false;
      if (levels.length > 0 && !levels.includes(script.difficulty)) return false;
      if (needle.length === 0) return true;
      const haystack = [
        script.title,
        script.summary,
        script.automates,
        script.tags.join(" "),
        LANGUAGES[script.language].label,
      ]
        .join(" ")
        .toLowerCase();
      return needle.split(/\s+/).every((term) => haystack.includes(term));
    });
  }, [scripts, query, languages, levels]);

  const toggleLanguage = (language: ScriptLanguage) =>
    setLanguages((current) =>
      current.includes(language)
        ? current.filter((entry) => entry !== language)
        : [...current, language],
    );

  const toggleLevel = (level: string) =>
    setLevels((current) =>
      current.includes(level) ? current.filter((entry) => entry !== level) : [...current, level],
    );

  const filtersActive = languages.length > 0 || levels.length > 0 || query.trim().length > 0;

  const clear = () => {
    setQuery("");
    setLanguages([]);
    setLevels([]);
  };

  return (
    <div className="grid gap-5">
      {/* Script cards are h3s. This keeps the outline from jumping h1 to h3;
          it is hidden because the page heading already names the library. */}
      <h2 className="sr-only" id="script-library-heading">
        The script library
      </h2>

      <div className="grid gap-3.5 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <Input
          id="script-search"
          label="Search the library"
          hideLabel
          icon={Search}
          type="search"
          placeholder="Search by what it does — negatives, pacing, dayparting, bulk…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Language
          </span>
          {(Object.keys(LANGUAGES) as ScriptLanguage[])
            .filter((language) => (languageCounts.get(language) ?? 0) > 0)
            .map((language) => (
              <FilterChip
                key={language}
                label={LANGUAGES[language].label}
                count={languageCounts.get(language) ?? 0}
                active={languages.includes(language)}
                tone={LANGUAGE_TONE[language]}
                onClick={() => toggleLanguage(language)}
              />
            ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Level
          </span>
          {["beginner", "intermediate", "advanced"]
            .filter((level) => (levelCounts.get(level) ?? 0) > 0)
            .map((level) => (
              <FilterChip
                key={level}
                label={humanize(level)}
                count={levelCounts.get(level) ?? 0}
                active={levels.includes(level)}
                tone={LEVEL_TONE[level]}
                onClick={() => toggleLevel(level)}
              />
            ))}

          {filtersActive ? (
            <Button variant="ghost" size="sm" icon={X} onClick={clear} className="ml-auto">
              Clear filters
            </Button>
          ) : null}
        </div>
      </div>

      <p className="text-[0.8125rem] text-muted" role="status" aria-live="polite">
        Showing {filtered.length} of {scripts.length} assets
        {filtersActive ? " matching your filters" : ""}.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="Nothing matches that"
          description="Try a broader term, or clear the language and level filters. Every asset is searchable by what it automates as well as by its name."
          action={
            <Button variant="secondary" onClick={clear}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((script) => (
            <li key={script.id} className="flex">
              <Link
                href={script.href}
                className="group flex w-full flex-col rounded-xl border border-hairline bg-surface p-5 transition-[border-color,box-shadow] duration-150 hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge tone={LANGUAGE_TONE[script.language]} size="sm">
                    {LANGUAGES[script.language].label}
                  </Badge>
                  <Badge tone={LEVEL_TONE[script.difficulty] ?? "neutral"} size="sm" variant="outline">
                    {humanize(script.difficulty)}
                  </Badge>
                  <span className="tabular ml-auto text-[0.6875rem] text-faint">
                    {script.lines} lines
                  </span>
                </div>

                <h3 className="mt-3 font-display text-base leading-snug font-semibold text-ink">
                  {script.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{script.summary}</p>

                <dl className="mt-3.5 grid gap-1.5 border-t border-hairline pt-3.5 text-[0.8125rem]">
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-faint">Replaces</dt>
                    <dd className="text-muted">{script.automates}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="shrink-0 text-faint">Gives back</dt>
                    <dd className="font-medium text-good">{script.saves}</dd>
                  </div>
                </dl>

                <div className="mt-auto flex flex-wrap items-center gap-3 pt-4">
                  <span className="inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-brand">
                    Open
                    <ArrowRight
                      className="size-3.5 transition-transform duration-150 group-hover:translate-x-0.5"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-faint">
                    <Clock className="size-3.5" aria-hidden="true" />
                    {formatMinutes(script.minutes)} to set up · {script.frequency}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
