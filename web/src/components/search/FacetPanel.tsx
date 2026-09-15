"use client";

import { Check, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { TONE_ICON, TONE_SOLID_BG } from "@/components/ui/tone";
import { KIND_META } from "@/content/registry";
import {
  selectionCount,
  type FacetDimension,
  type FacetSelection,
  type Facets,
} from "@/lib/search";
import { cn } from "@/lib/utils";

import { LEVEL_LABEL, LEVEL_TONE } from "./tokens";

const TAG_PREVIEW = 16;

export interface FacetPanelProps {
  facets: Facets;
  selection: FacetSelection;
  onToggle: (dimension: FacetDimension, value: string) => void;
  onClear: () => void;
  className?: string;
}

function CheckBox({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "flex size-4 shrink-0 items-center justify-center rounded-[0.25rem] border transition-colors",
        on ? "border-brand bg-brand" : "border-hairline-strong bg-surface",
      )}
      aria-hidden="true"
    >
      {on ? <Check className="size-3 text-on-brand" strokeWidth={3} /> : null}
    </span>
  );
}

function FacetRow({
  on,
  label,
  count,
  onClick,
  lead,
}: {
  on: boolean;
  label: string;
  count: number;
  onClick: () => void;
  lead?: ReactNode;
}) {
  return (
    <li>
      <button
        type="button"
        aria-pressed={on}
        onClick={onClick}
        disabled={count === 0 && !on}
        className={cn(
          "flex min-h-11 w-full items-center gap-2.5 rounded-lg px-2 text-left text-[0.8125rem] lg:min-h-9",
          "transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
          on ? "bg-brand-soft text-ink" : "text-muted hover:bg-surface-2 hover:text-ink",
          count === 0 && !on && "cursor-not-allowed opacity-45 hover:bg-transparent",
        )}
      >
        <CheckBox on={on} />
        {lead}
        <span className={cn("min-w-0 flex-1 truncate", on && "font-medium")}>{label}</span>
        <span className="tabular text-[0.6875rem] text-faint">{count}</span>
      </button>
    </li>
  );
}

function Group({
  title,
  titleId,
  children,
}: {
  title: string;
  titleId: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={titleId} className="border-t border-hairline pt-4 first:border-0 first:pt-0">
      <h3
        id={titleId}
        className="mb-2 px-2 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase"
      >
        {title}
      </h3>
      {children}
    </section>
  );
}

/**
 * Kind, level and tag facets with live counts.
 *
 * Counts are computed against the results for the current query with the
 * dimension being counted left out of the filter, so a count never claims a
 * choice that would empty the page — and never hides one that would not.
 */
export function FacetPanel({
  facets,
  selection,
  onToggle,
  onClear,
  className,
}: FacetPanelProps) {
  const baseId = useId();
  const [allTags, setAllTags] = useState(false);
  const chosen = selectionCount(selection);
  const tags = allTags ? facets.tags : facets.tags.slice(0, TAG_PREVIEW);

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div className="flex min-h-8 items-center justify-between gap-2 px-2">
        <h2 className="font-display text-[0.8125rem] font-semibold text-ink">Filters</h2>
        {chosen > 0 ? (
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-8 items-center gap-1 rounded-md px-1.5 text-xs font-medium text-brand transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X className="size-3.5" aria-hidden="true" />
            Clear {chosen}
          </button>
        ) : null}
      </div>

      {facets.kinds.length > 0 ? (
        <Group title="Type" titleId={`${baseId}-kind`}>
          <ul className="flex flex-col">
            {facets.kinds.map((bucket) => {
              const meta = KIND_META[bucket.value];
              const Icon = meta.icon;
              return (
                <FacetRow
                  key={bucket.value}
                  on={bucket.selected}
                  label={meta.plural}
                  count={bucket.count}
                  onClick={() => onToggle("kinds", bucket.value)}
                  lead={
                    <Icon
                      className={cn("size-3.5 shrink-0", TONE_ICON[meta.accent])}
                      aria-hidden="true"
                    />
                  }
                />
              );
            })}
          </ul>
        </Group>
      ) : null}

      {facets.levels.length > 0 ? (
        <Group title="Level" titleId={`${baseId}-level`}>
          <ul className="flex flex-col">
            {facets.levels.map((bucket) => (
              <FacetRow
                key={bucket.value}
                on={bucket.selected}
                label={LEVEL_LABEL[bucket.value]}
                count={bucket.count}
                onClick={() => onToggle("levels", bucket.value)}
                lead={
                  <span
                    className={cn(
                      "size-2 shrink-0 rounded-full",
                      TONE_SOLID_BG[LEVEL_TONE[bucket.value]],
                    )}
                    aria-hidden="true"
                  />
                }
              />
            ))}
          </ul>
        </Group>
      ) : null}

      {facets.tags.length > 0 ? (
        <Group title="Tags" titleId={`${baseId}-tag`}>
          <div className="flex flex-wrap gap-1.5 px-2">
            {tags.map((bucket) => (
              <button
                key={bucket.value}
                type="button"
                aria-pressed={bucket.selected}
                onClick={() => onToggle("tags", bucket.value)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium transition-colors lg:min-h-8",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  bucket.selected
                    ? "border-brand bg-brand text-on-brand"
                    : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                {bucket.value}
                <span
                  className={cn(
                    "tabular text-[0.6875rem]",
                    bucket.selected ? "opacity-80" : "text-faint",
                  )}
                >
                  {bucket.count}
                </span>
              </button>
            ))}
          </div>

          {facets.tags.length > TAG_PREVIEW ? (
            <button
              type="button"
              onClick={() => setAllTags((open) => !open)}
              className="mt-2 inline-flex min-h-8 items-center px-2 text-xs font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              {allTags ? "Show fewer tags" : `Show all ${facets.tags.length} tags`}
            </button>
          ) : null}
        </Group>
      ) : null}
    </div>
  );
}
