"use client";

import { ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { useId, useState } from "react";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import type { MatchType } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { Jargon } from "../keywords/common";
import { normalizeAmountText } from "../work/calculator";
import {
  activePreset,
  presetsFor,
  type ExplorerFilter,
  type FilterChip,
  type OrdersFilter,
  type PresetId,
  type PresetRules,
  type TermKind,
} from "../work/explorer";

/** Text for the numeric inputs, kept separately so half-typed values ("0.") survive. */
export type FilterTexts = Record<NumericKey, string>;
export type NumericKey = "minClicks" | "minImpressions" | "minSpend" | "acosMin" | "acosMax" | "ctrMin" | "ctrMax" | "cvrMin" | "cvrMax";

const PERCENT_KEYS: readonly NumericKey[] = ["acosMin", "acosMax", "ctrMin", "ctrMax", "cvrMin", "cvrMax"];
const ADVANCED_KEYS: readonly (keyof ExplorerFilter)[] = [
  "minClicks",
  "minImpressions",
  "minSpend",
  "acosMin",
  "acosMax",
  "acosVsTarget",
  "ctrMin",
  "ctrMax",
  "cvrMin",
  "cvrMax",
  "termKind",
];

export function textsFromFilter(f: ExplorerFilter): FilterTexts {
  const t = {} as FilterTexts;
  for (const k of ["minClicks", "minImpressions", "minSpend", "acosMin", "acosMax", "ctrMin", "ctrMax", "cvrMin", "cvrMax"] as NumericKey[]) {
    const v = f[k];
    t[k] = v === null ? "" : PERCENT_KEYS.includes(k) ? String(Number((v * 100).toFixed(4))) : String(v);
  }
  return t;
}

/** Parse a numeric input: blank → null; percent keys become ratios. Invalid → null. "1,000" is a thousand, "0,2" is 0.2. */
export function parseNumeric(key: NumericKey, text: string): number | null {
  const t = normalizeAmountText(text.replace("%", ""));
  if (!t) return null;
  const n = Number(t);
  if (!Number.isFinite(n) || n < 0) return null;
  return PERCENT_KEYS.includes(key) ? n / 100 : n;
}

export interface ExplorerFiltersProps {
  filter: ExplorerFilter;
  texts: FilterTexts;
  onText: (key: NumericKey, text: string) => void;
  onChange: (patch: Partial<ExplorerFilter>) => void;
  onPreset: (id: PresetId | null) => void;
  campaigns: { value: string; label: string }[];
  adGroups: { value: string; label: string }[];
  chips: FilterChip[];
  onRemoveChip: (key: string) => void;
  onClear: () => void;
  currency: string;
  showTermKind: boolean;
  /** The store's thresholds for the quick filters (defaults in All stores). */
  rules?: PresetRules;
}

export function ExplorerFilters({
  filter,
  texts,
  onText,
  onChange,
  onPreset,
  campaigns,
  adGroups,
  chips,
  onRemoveChip,
  onClear,
  currency,
  showTermKind,
  rules,
}: ExplorerFiltersProps) {
  const uid = useId();
  const presets = presetsFor(rules);
  const preset = activePreset(filter, rules);
  const advancedActive = ADVANCED_KEYS.filter((k) => {
    const v = filter[k];
    return v !== null && v !== "any" && v !== "all";
  }).length;
  const [open, setOpen] = useState(false);
  const num = (key: NumericKey, label: string, suffix?: string, hint?: string) => (
    <Input
      id={`${uid}-${key}`}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={texts[key]}
      suffix={suffix}
      hint={hint}
      placeholder="—"
      onChange={(e) => onText(key, e.target.value)}
      className="tabular"
    />
  );

  return (
    <div className="space-y-3 border-b border-hairline px-4 py-3 sm:px-5">
      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Quick filters">
        <span className="text-xs font-medium text-muted">Quick filters:</span>
        {presets.map((p) => {
          const on = preset === p.id;
          return (
            <button
              key={p.id}
              type="button"
              aria-pressed={on}
              title={p.description}
              onClick={() => onPreset(on ? null : p.id)}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full border px-3 text-[0.8125rem] font-medium transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11",
                on ? "border-brand bg-brand-soft text-ink" : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
              )}
            >
              {p.label}
              <span className="sr-only">: {p.description}</span>
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)_minmax(0,1fr)_9rem_9rem]">
        <Input
          id={`${uid}-q`}
          label="Search"
          icon={Search}
          placeholder="garlic, press, -free"
          hint="Comma = any of these. Start with - to exclude."
          value={filter.text}
          onChange={(e) => onChange({ text: e.target.value })}
        />
        <Select
          id={`${uid}-camp`}
          label="Campaign"
          value={filter.campaign}
          onChange={(e) => onChange({ campaign: e.target.value, adGroup: "" })}
          options={[
            { value: "", label: "All campaigns" },
            ...campaigns,
            ...(filter.campaign && !campaigns.some((c) => c.value === filter.campaign) ? [{ value: filter.campaign, label: `${filter.campaign} (no data)` }] : []),
          ]}
        />
        <Select
          id={`${uid}-ag`}
          label="Ad group"
          value={filter.adGroup}
          disabled={!filter.campaign}
          hint={filter.campaign ? undefined : "Pick a campaign first"}
          onChange={(e) => onChange({ adGroup: e.target.value })}
          options={[{ value: "", label: "All ad groups" }, ...adGroups]}
        />
        <Select
          id={`${uid}-mt`}
          label="Match type"
          value={filter.matchType}
          onChange={(e) => onChange({ matchType: e.target.value as MatchType | "" })}
          options={[
            { value: "", label: "Any" },
            { value: "exact", label: "Exact" },
            { value: "phrase", label: "Phrase" },
            { value: "broad", label: "Broad" },
            { value: "auto", label: "Auto" },
            { value: "product", label: "Product" },
          ]}
        />
        <Select
          id={`${uid}-orders`}
          label="Orders"
          value={filter.orders}
          onChange={(e) => onChange({ orders: e.target.value as OrdersFilter })}
          options={[
            { value: "any", label: "Any" },
            { value: "0", label: "None (0)" },
            { value: "1+", label: "1 or more" },
            { value: "2+", label: "2 or more" },
          ]}
        />
      </div>

      <div>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`${uid}-more`}
          onClick={() => setOpen((o) => !o)}
          className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-1 text-[0.8125rem] font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
          More filters{advancedActive ? ` (${advancedActive} on)` : ""}
          <ChevronDown className={cn("size-3.5 transition-transform motion-reduce:transition-none", open && "rotate-180")} aria-hidden="true" />
        </button>
        <div id={`${uid}-more`} hidden={!open} className="mt-2 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {num("minClicks", "Min clicks")}
          {num("minImpressions", "Min impressions")}
          {num("minSpend", "Min spend", currency)}
          {num("acosMin", "ACoS from", "%")}
          {num("acosMax", "ACoS up to", "%")}
          <Select
            id={`${uid}-vs`}
            label="ACoS vs target"
            value={filter.acosVsTarget}
            onChange={(e) => onChange({ acosVsTarget: e.target.value as ExplorerFilter["acosVsTarget"] })}
            options={[
              { value: "any", label: "Any" },
              { value: "below", label: "Under target" },
              { value: "above", label: "Over target / no sales" },
            ]}
          />
          {num("ctrMin", "CTR at least", "%")}
          {num("ctrMax", "CTR below", "%")}
          {num("cvrMin", "CVR at least", "%")}
          {num("cvrMax", "CVR up to", "%")}
          {showTermKind ? (
            <Select
              id={`${uid}-kind`}
              label="Search term type"
              value={filter.termKind}
              onChange={(e) => onChange({ termKind: e.target.value as TermKind })}
              options={[
                { value: "all", label: "All" },
                { value: "asin", label: "ASINs (product pages)" },
                { value: "keyword", label: "Typed searches" },
              ]}
            />
          ) : null}
          <p className="text-xs leading-relaxed text-muted sm:col-span-3 lg:col-span-6">
            Percent fields take percent (0.2 = 0.2%). <Jargon k="ctr">CTR</Jargon> = clicks ÷ impressions, <Jargon k="cvr">CVR</Jargon> = orders ÷
            clicks, <Jargon k="acos">ACoS</Jargon> = spend ÷ sales.
          </p>
        </div>
      </div>

      {chips.length ? (
        <div className="flex flex-wrap items-center gap-1.5" aria-label="Active filters" role="group">
          {chips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => onRemoveChip(c.key)}
              aria-label={`Remove filter: ${c.label}`}
              className="inline-flex min-h-8 max-w-full items-center gap-1 rounded-full border border-brand/30 bg-brand-soft px-2.5 text-xs font-medium text-ink hover:border-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
            >
              <span className="truncate">{c.label}</span>
              <X className="size-3 shrink-0 text-muted" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={onClear}
            className="inline-flex min-h-8 items-center rounded-md px-1.5 text-xs font-medium text-muted underline-offset-2 hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  );
}
