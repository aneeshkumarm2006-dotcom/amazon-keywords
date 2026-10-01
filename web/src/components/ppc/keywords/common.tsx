"use client";

/**
 * Small UI pieces shared by the Keywords, Search terms and Bids pages:
 * glossary tooltips, action / status badges, toned ACoS, a media-query hook,
 * binary downloads and the "show more" pager.
 */

import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { TONE_TEXT } from "@/components/ui/tone";
import type { ActionType, Priority } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, pct } from "../format";
import { acosTone } from "../overview/compute";
import type { RecStatus } from "../work/decisions";
import { GLOSSARY, type GlossaryKey } from "../work/glossary";
import { ACTION_LABEL, ACTION_TONE } from "../work/recs";

/* ----------------------------------------------------------------- jargon */

export interface JargonProps {
  k: GlossaryKey;
  /** Visible text; defaults to the glossary term. */
  children?: ReactNode;
  /** Definition to show instead of the glossary's default one (e.g. with a store's own thresholds). */
  text?: string;
  className?: string;
}

/**
 * A term with a plain-English definition on hover, focus or tap. The tooltip
 * is `position: fixed` (measured on open) so a table's scroll box never clips
 * it; it closes on Escape, blur, scroll, a tap elsewhere and a second tap.
 *
 * A tap fires mouseenter and focus (both open it) before click, so the click
 * must not simply toggle — that would close it again on the same tap. A
 * pointer click opens and pins the tooltip unless the tooltip was already
 * open when the press began and was pinned by an earlier click.
 */
export function Jargon({ k, children, text, className }: JargonProps) {
  const id = useId();
  const entry = GLOSSARY[k];
  const btn = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ left: number; top: number; below: boolean } | null>(null);
  /** Opened by a click / tap (stays open when the pointer leaves). */
  const pinned = useRef(false);
  /** Whether it was open when the current press began (before mouseenter / focus of a tap). */
  const openAtPress = useRef(false);

  useLayoutEffect(() => {
    if (!open || !btn.current) return;
    const r = btn.current.getBoundingClientRect();
    const width = Math.min(260, window.innerWidth - 16);
    const left = Math.max(8, Math.min(window.innerWidth - width - 8, r.left + r.width / 2 - width / 2));
    const below = r.top < 120;
    setPos({ left, top: below ? r.bottom + 6 : r.top - 6, below });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const close = () => {
      pinned.current = false;
      setOpen(false);
    };
    // Safari does not focus buttons on click, so blur alone cannot close a pinned tooltip.
    const outside = (e: PointerEvent) => {
      if (!btn.current?.contains(e.target as Node)) close();
    };
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    document.addEventListener("pointerdown", outside, true);
    return () => {
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
      document.removeEventListener("pointerdown", outside, true);
    };
  }, [open]);

  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-describedby={open ? id : undefined}
        onPointerDown={() => {
          openAtPress.current = open;
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned.current) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          pinned.current = false;
          setOpen(false);
        }}
        onClick={(e) => {
          e.stopPropagation();
          if (e.detail === 0) {
            // Enter / Space: a plain toggle (focus already opened it).
            pinned.current = !open;
            setOpen(!open);
            return;
          }
          const close = openAtPress.current && pinned.current;
          openAtPress.current = false;
          pinned.current = !close;
          setOpen(!close);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            pinned.current = false;
            setOpen(false);
          }
        }}
        className={cn(
          "inline cursor-help rounded-sm border-b border-dotted border-current/50 text-inherit [letter-spacing:inherit] [text-transform:inherit]",
          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
          className,
        )}
      >
        {children ?? entry.term}
      </button>
      <span
        id={id}
        role="tooltip"
        hidden={!open || !pos}
        style={pos ? { left: pos.left, top: pos.top, transform: pos.below ? undefined : "translateY(-100%)" } : undefined}
        className="pointer-events-none fixed z-[60] w-[min(260px,calc(100vw-16px))] rounded-lg border border-hairline bg-surface px-3 py-2 text-left text-xs leading-snug font-normal tracking-normal text-ink normal-case shadow-card"
      >
        <span className="font-semibold">{entry.term}: </span>
        {text ?? entry.text}
      </span>
    </>
  );
}

/* ----------------------------------------------------------------- badges */

export function ActionBadge({ action, priority, size = "sm" }: { action: ActionType; priority?: Priority; size?: "sm" | "md" }) {
  return (
    <Badge tone={ACTION_TONE[action]} size={size} variant={priority === "high" ? "solid" : "soft"}>
      {ACTION_LABEL[action]}
    </Badge>
  );
}

const PRIORITY_DOT: Record<Priority, string> = { high: "bg-bad", medium: "bg-warn", low: "bg-hairline-strong" };

export function PriorityTag({ priority }: { priority: Priority }) {
  return (
    <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-muted uppercase">
      <span aria-hidden="true" className={cn("size-1.5 rounded-full", PRIORITY_DOT[priority])} />
      {priority}
      <span className="sr-only"> priority</span>
    </span>
  );
}

const STATUS_META: Record<RecStatus, { label: string; tone: "good" | "bad" | "info" | "warn" | "neutral" | "brand" }> = {
  open: { label: "Open", tone: "neutral" },
  approved: { label: "Approved", tone: "good" },
  applied: { label: "Applied", tone: "brand" },
  rejected: { label: "Rejected", tone: "neutral" },
  snoozed: { label: "Snoozed", tone: "warn" },
};

export function StatusBadge({ status, detail }: { status: RecStatus; detail?: string }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} size="sm" variant="outline">
      {m.label}
      {detail ? ` ${detail}` : ""}
    </Badge>
  );
}

/** ACoS coloured against the store's target and break-even (spend with no sales reads "no sales"). */
export function AcosText({
  acos,
  target,
  breakEven,
  spend,
  className,
}: {
  acos: number;
  target: number;
  breakEven: number;
  spend: number;
  className?: string;
}) {
  const tone = acosTone(acos, target, breakEven, spend);
  const spoken = tone === "good" ? "at or under target" : tone === "warn" ? "over target, under break-even" : tone === "bad" ? "over break-even" : "";
  if (!Number.isFinite(acos)) {
    return spend > 0 ? (
      <span className={cn("text-xs font-medium whitespace-nowrap text-bad", className)}>no sales</span>
    ) : (
      <span className={cn("text-faint", className)}>—</span>
    );
  }
  return (
    <span className={cn("tabular font-medium whitespace-nowrap", tone === "neutral" ? "text-ink" : TONE_TEXT[tone], className)}>
      {pct(acos)}
      {spoken ? <span className="sr-only"> ({spoken})</span> : null}
    </span>
  );
}

/* ------------------------------------------------------------ media query */

/** Matches a media query on the client; `false` during prerender and hydration. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (cb: () => void) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    [query],
  );
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/* --------------------------------------------------------------- download */

/** Save bytes (e.g. an .xlsx) as a file. Event handlers only. */
export function downloadBytes(filename: string, bytes: Uint8Array, mime: string): void {
  const blob = new Blob([bytes as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/* ------------------------------------------------------------------ pager */

export interface ShowMoreProps {
  shown: number;
  total: number;
  step: number;
  noun: string;
  onMore: () => void;
  onAll?: () => void;
  className?: string;
}

/** "Showing 50 of 214 · Show 50 more · Show all" under a long list. */
export function ShowMore({ shown, total, step, noun, onMore, onAll, className }: ShowMoreProps) {
  if (total <= shown) {
    return total > step ? <p className={cn("px-4 py-3 text-xs text-muted sm:px-5", className)}>All {count(total)} {noun} shown.</p> : null;
  }
  const next = Math.min(step, total - shown);
  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:px-5", className)}>
      <p className="text-xs text-muted">
        Showing {count(shown)} of {count(total)} {noun}
      </p>
      <Button variant="secondary" size="sm" icon={ChevronDown} onClick={onMore}>
        Show {count(next)} more
      </Button>
      {onAll && total - shown > step && total <= 2000 ? (
        <Button variant="ghost" size="sm" onClick={onAll}>
          Show all
        </Button>
      ) : null}
    </div>
  );
}

/** A labelled figure for stacked cards: "Clicks  79". */
export function Figure({ label, children, className }: { label: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.6875rem] tracking-wide text-muted uppercase">{label}</dt>
      <dd className="tabular text-[0.8125rem] text-ink">{children}</dd>
    </div>
  );
}

export const TEXT_BUTTON =
  "inline-flex min-h-8 items-center gap-1 rounded-md px-1 text-[0.8125rem] font-medium text-brand hover:text-brand-hover hover:underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11";
