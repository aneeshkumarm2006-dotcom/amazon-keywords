"use client";

import { ArrowDown, ArrowUp, ChevronsUpDown, X } from "lucide-react";
import { useMemo, useState } from "react";

import { NumberField } from "@/components/calc/fields";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TBody, TD, TH, THead, TR, Table } from "@/components/ui/Table";
import { TOOL_TIERS, type PpcTool, type ToolTier } from "@/content/scripts";
import { cn, formatCurrency } from "@/lib/utils";
import type { Tone } from "@/types/content";

/**
 * The twelve-tool comparison, sortable and filterable.
 *
 * The one live number is the ROI column. The source guide computes it at a
 * $15 hourly rate — the typical VA rate it quotes — but the whole point of
 * the formula is that the answer changes with what your time is worth, so the
 * rate is an input rather than a constant.
 *
 *   ROI = hours saved x hourly rate x 4 weeks - monthly tool cost
 */

const TIER_TONE: Record<ToolTier, Tone> = {
  essential: "brand",
  professional: "info",
  budget: "warn",
  free: "good",
};

const TIER_ORDER: ToolTier[] = ["essential", "professional", "budget", "free"];

type SortKey = "rank" | "name" | "priceFrom" | "hours" | "roi";

interface Column {
  key: SortKey | null;
  label: string;
  numeric?: boolean;
}

const COLUMNS: Column[] = [
  { key: "rank", label: "#", numeric: true },
  { key: "name", label: "Tool" },
  { key: null, label: "Tier" },
  { key: "priceFrom", label: "From", numeric: true },
  { key: null, label: "Automation" },
  { key: null, label: "Best for" },
  { key: "hours", label: "Hrs saved / wk", numeric: true },
  { key: "roi", label: "ROI / month", numeric: true },
];

function roiFor(tool: PpcTool, rate: number): number | null {
  if (tool.hoursSavedPerWeek === undefined) return null;
  return tool.hoursSavedPerWeek * rate * 4 - (tool.roiCostBasis ?? tool.priceFrom);
}

export function ToolComparison({ tools }: { tools: PpcTool[] }) {
  const [rate, setRate] = useState(15);
  const [tiers, setTiers] = useState<ToolTier[]>([]);
  const [freeOnly, setFreeOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [direction, setDirection] = useState<"asc" | "desc">("asc");
  const [open, setOpen] = useState<string | null>(null);

  const counts = useMemo(() => {
    const map = new Map<ToolTier, number>();
    for (const tool of tools) map.set(tool.tier, (map.get(tool.tier) ?? 0) + 1);
    return map;
  }, [tools]);

  const rows = useMemo(() => {
    const filtered = tools.filter((tool) => {
      if (tiers.length > 0 && !tiers.includes(tool.tier)) return false;
      if (freeOnly && tool.priceFrom > 0) return false;
      return true;
    });

    const factor = direction === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      if (sortKey === "name") return factor * a.name.localeCompare(b.name);
      if (sortKey === "hours") {
        return factor * ((a.hoursSavedPerWeek ?? -1) - (b.hoursSavedPerWeek ?? -1));
      }
      if (sortKey === "roi") {
        return factor * ((roiFor(a, rate) ?? -99999) - (roiFor(b, rate) ?? -99999));
      }
      return factor * (a[sortKey] - b[sortKey]);
    });
  }, [tools, tiers, freeOnly, sortKey, direction, rate]);

  const onSort = (key: SortKey) => {
    if (key === sortKey) {
      setDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setDirection(key === "name" || key === "rank" ? "asc" : "desc");
  };

  const toggleTier = (tier: ToolTier) =>
    setTiers((current) =>
      current.includes(tier) ? current.filter((entry) => entry !== tier) : [...current, tier],
    );

  const filtersActive = tiers.length > 0 || freeOnly;
  const positive = rows.filter((tool) => (roiFor(tool, rate) ?? 0) > 0).length;

  return (
    <div className="grid gap-4">
      <div className="grid gap-3.5 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-end gap-3">
          <NumberField
            id="tool-hourly-rate"
            label="Your hourly rate"
            value={rate}
            onChange={setRate}
            min={1}
            max={200}
            step={1}
            decimals={0}
            unit="USD/hr"
            hint="The source guide uses $15, the typical VA rate. Change it and every ROI recalculates."
            className="w-full max-w-[16rem]"
          />
          <p className="pb-1 text-[0.8125rem] leading-relaxed text-muted">
            <span className="font-mono text-xs text-ink">
              ROI = hours saved x rate x 4 weeks − monthly cost
            </span>
            <br />
            At {formatCurrency(rate, 0)} an hour, {positive} of the {rows.length} listed tools pay
            for themselves in time saved alone.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted uppercase">
            Tier
          </span>
          {TIER_ORDER.filter((tier) => (counts.get(tier) ?? 0) > 0).map((tier) => {
            const active = tiers.includes(tier);
            return (
              <button
                key={tier}
                type="button"
                aria-pressed={active}
                onClick={() => toggleTier(tier)}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-[0.8125rem] font-medium",
                  "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  active
                    ? "border-brand bg-brand text-on-brand"
                    : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                {TOOL_TIERS[tier].label.replace("Tier ", "T").replace(" — ", " · ")}
                <span
                  className={cn("tabular text-[0.6875rem]", active ? "text-on-brand/75" : "text-faint")}
                >
                  {counts.get(tier)}
                </span>
              </button>
            );
          })}

          <button
            type="button"
            aria-pressed={freeOnly}
            onClick={() => setFreeOnly((current) => !current)}
            className={cn(
              "inline-flex min-h-9 items-center rounded-lg border px-3 text-[0.8125rem] font-medium",
              "transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              freeOnly
                ? "border-good bg-good text-on-good"
                : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
            )}
          >
            Free to start
          </button>

          {filtersActive ? (
            <Button
              variant="ghost"
              size="sm"
              icon={X}
              className="ml-auto"
              onClick={() => {
                setTiers([]);
                setFreeOnly(false);
              }}
            >
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <Table
        caption="Twelve Amazon PPC tools with price, automation level, time saved and return on the subscription."
        stickyFirstColumn
      >
        <THead>
          <TR>
            {COLUMNS.map((column) => {
              if (!column.key) {
                return (
                  <TH key={column.label} numeric={column.numeric}>
                    {column.label}
                  </TH>
                );
              }
              const active = sortKey === column.key;
              const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ChevronsUpDown;
              return (
                <TH
                  key={column.label}
                  numeric={column.numeric}
                  aria-sort={
                    active ? (direction === "asc" ? "ascending" : "descending") : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSort(column.key as SortKey)}
                    className={cn(
                      "inline-flex min-h-8 items-center gap-1 rounded px-0.5 transition-colors hover:text-ink",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      column.numeric && "flex-row-reverse",
                      active && "text-ink",
                    )}
                  >
                    <Icon
                      className={cn("size-3 shrink-0", active ? "text-brand" : "text-faint")}
                      aria-hidden="true"
                    />
                    <span>{column.label}</span>
                  </button>
                </TH>
              );
            })}
          </TR>
        </THead>
        <TBody>
          {rows.map((tool) => {
            const roi = roiFor(tool, rate);
            const expanded = open === tool.name;
            return (
              <TR key={tool.name} className="align-top">
                <TD numeric mono className="text-faint">
                  {tool.rank}
                </TD>
                <TD className="min-w-[13rem]">
                  <button
                    type="button"
                    aria-expanded={expanded}
                    onClick={() => setOpen(expanded ? null : tool.name)}
                    className="rounded text-left font-medium text-ink underline decoration-hairline-strong underline-offset-4 transition-colors hover:text-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {tool.name}
                  </button>
                  {expanded ? (
                    <div className="mt-2 max-w-md space-y-2 rounded-lg border border-hairline bg-surface-2 p-3">
                      <p className="text-[0.8125rem] leading-relaxed text-ink">{tool.verdict}</p>
                      <ul className="flex flex-wrap gap-1.5">
                        {tool.features.map((feature) => (
                          <li key={feature}>
                            <Badge tone="neutral" size="sm" variant="outline">
                              {feature}
                            </Badge>
                          </li>
                        ))}
                      </ul>
                      {tool.limitation ? (
                        <p className="text-xs leading-relaxed text-bad">
                          Limitation: {tool.limitation}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </TD>
                <TD>
                  <Badge tone={TIER_TONE[tool.tier]} size="sm">
                    {TOOL_TIERS[tool.tier].label.split(" — ")[1]}
                  </Badge>
                </TD>
                <TD numeric mono className="whitespace-nowrap">
                  {tool.priceLabel}
                </TD>
                <TD className="whitespace-nowrap text-muted">{tool.automation}</TD>
                <TD className="min-w-[14rem] text-muted">{tool.bestFor}</TD>
                <TD numeric mono>
                  {tool.hoursSavedPerWeek === undefined ? (
                    <span className="text-faint">—</span>
                  ) : (
                    tool.hoursSavedPerWeek
                  )}
                </TD>
                <TD
                  numeric
                  mono
                  className={cn(
                    "font-semibold whitespace-nowrap",
                    roi === null ? "text-faint" : roi > 0 ? "text-good" : "text-muted",
                  )}
                >
                  {roi === null
                    ? "—"
                    : roi === 0
                      ? "baseline"
                      : `${roi > 0 ? "+" : "−"}${formatCurrency(Math.abs(roi), 0)}`}
                </TD>
              </TR>
            );
          })}
        </TBody>
      </Table>

      <p className="text-[0.8125rem] leading-relaxed text-muted">
        A dash means the source guide publishes no time-saved figure for that tool, and a number
        has not been invented to fill the gap. Select a tool name to read its verdict, features and
        limitations. Prices are 2026 list prices and exclude Adtomic&rsquo;s 2% ad-spend fee, which
        on a $20,000 monthly budget adds $400 a month on top of the subscription.
      </p>
    </div>
  );
}
