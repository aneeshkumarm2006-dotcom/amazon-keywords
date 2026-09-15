"use client";

import { ArrowUpRight, CircleDot, Ruler, SlidersHorizontal } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { ButtonLink } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import { TONE_BORDER, TONE_SOLID_BG, TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";

import { issueUrl, roadmapClaimDraft } from "./github";
import {
  AREA_LABEL,
  ROADMAP,
  SIZE_LABEL,
  STATUS_META,
  fillCounts,
  type RoadmapArea,
  type RoadmapItem,
} from "./roadmap-data";

/**
 * The public roadmap board.
 *
 * Grouped by status rather than laid out as four kanban columns: the items
 * carry two or three sentences each, and a 300px column turns that into
 * unreadable confetti on anything smaller than a desktop. Sections stack,
 * cards flow, and the whole thing still works at 360px.
 */

type AreaFilter = RoadmapArea | "all";

const AREA_OPTIONS: SegmentedOption<AreaFilter>[] = [
  { value: "all", label: "All" },
  { value: "content", label: "Content" },
  { value: "platform", label: "Platform" },
  { value: "tooling", label: "Tooling" },
  { value: "community", label: "Community" },
];

export interface RoadmapBoardProps {
  /** Live library counts, used to fill `{token}`s in an item's count line. */
  counts: Record<string, number>;
}

function ItemCard({ item, counts }: { item: RoadmapItem; counts: Record<string, number> }) {
  const status = STATUS_META.find((entry) => entry.id === item.status);
  const tone = status?.tone ?? "neutral";

  const claimHref = issueUrl(
    roadmapClaimDraft({
      title: item.title,
      source: item.source,
      detail: item.detail,
      area: item.area,
    }),
  );

  return (
    <li className="flex">
      <article
        className={cn(
          "relative flex w-full flex-col gap-3 overflow-hidden rounded-xl border bg-surface p-5 pt-6",
          "transition-[border-color,box-shadow] duration-150 hover:shadow-card",
          TONE_BORDER[tone],
        )}
      >
        <span
          className={cn("absolute inset-x-0 top-0 h-[3px] opacity-80", TONE_SOLID_BG[tone])}
          aria-hidden="true"
        />

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge tone="neutral" variant="outline" size="sm">
            {AREA_LABEL[item.area]}
          </Badge>
          <Badge tone="neutral" size="sm" icon={Ruler}>
            {SIZE_LABEL[item.size]}
          </Badge>
        </div>

        <h3 className="font-display text-[1.0625rem] leading-snug font-semibold text-ink">
          {item.title}
        </h3>

        <p className="text-[0.875rem] leading-relaxed text-muted">{item.detail}</p>

        {item.countKey ? (
          <p className={cn("font-mono text-xs", TONE_TEXT[tone])}>
            {fillCounts(item.countKey, counts)}
          </p>
        ) : null}

        <p className="mt-auto pt-1 font-mono text-[0.6875rem] leading-relaxed text-faint">
          {item.source}
        </p>

        {item.claimable || item.shippedAt ? (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-hairline pt-3.5">
            {item.claimable ? (
              <ButtonLink href={claimHref} variant="secondary" size="sm" icon={CircleDot} external>
                Claim this
              </ButtonLink>
            ) : null}
            {item.shippedAt ? (
              <Link
                href={item.shippedAt.href}
                className="inline-flex min-h-9 items-center gap-1 text-[0.8125rem] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
              >
                {item.shippedAt.label}
                <ArrowUpRight className="size-3.5 shrink-0" aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        ) : null}
      </article>
    </li>
  );
}

export function RoadmapBoard({ counts }: RoadmapBoardProps) {
  const [area, setArea] = useState<AreaFilter>("all");
  const [claimableOnly, setClaimableOnly] = useState(false);

  const filtered = useMemo(
    () =>
      ROADMAP.filter((item) => {
        if (area !== "all" && item.area !== area) return false;
        if (claimableOnly && !item.claimable) return false;
        return true;
      }),
    [area, claimableOnly],
  );

  const groups = useMemo(
    () =>
      STATUS_META.map((status) => ({
        status,
        items: filtered.filter((item) => item.status === status.id),
      })),
    [filtered],
  );

  const visible = filtered.length;

  return (
    <div className="min-w-0">
      {/* ------------------------------------------------------- filters */}
      <div className="mb-8 flex flex-col gap-4 rounded-xl border border-hairline bg-surface p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <span className="inline-flex items-center gap-2 text-[0.8125rem] font-medium text-ink">
            <SlidersHorizontal className="size-4 text-faint" aria-hidden="true" />
            Filter the board
          </span>
          <span className="tabular text-xs text-faint">
            {visible} of {ROADMAP.length} items
          </span>
        </div>

        <div className="scroll-well -mx-1 overflow-x-auto px-1">
          <SegmentedControl
            options={AREA_OPTIONS}
            value={area}
            onChange={setArea}
            label="Filter roadmap by area"
            size="sm"
          />
        </div>

        <Checkbox
          id="roadmap-claimable"
          label="Only show items you can claim"
          hint="Hides shipped work and anything that needs a design decision first."
          checked={claimableOnly}
          onChange={(event) => setClaimableOnly(event.target.checked)}
        />
      </div>

      {/* --------------------------------------------------------- board */}
      {visible === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Every roadmap item belongs to one area. Widen the filter, or drop the claimable-only toggle to see shipped work too."
          icon={SlidersHorizontal}
        />
      ) : (
        <div className="flex flex-col gap-12">
          {groups.map(({ status, items }) =>
            items.length === 0 ? null : (
              <section key={status.id} aria-labelledby={`status-${status.id}`}>
                <div className="mb-5 flex flex-col gap-1.5 border-b border-hairline pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn("size-2.5 shrink-0 rounded-full", TONE_SOLID_BG[status.tone])}
                      aria-hidden="true"
                    />
                    <h2
                      id={`status-${status.id}`}
                      className="font-display text-xl font-bold text-ink"
                    >
                      {status.label}
                    </h2>
                    <span className="tabular rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
                      {items.length}
                    </span>
                  </div>
                  <p className="max-w-2xl text-[0.875rem] leading-relaxed text-muted">
                    {status.blurb}
                  </p>
                </div>

                <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {items.map((item) => (
                    <ItemCard key={item.id} item={item} counts={counts} />
                  ))}
                </ul>
              </section>
            ),
          )}
        </div>
      )}
    </div>
  );
}
