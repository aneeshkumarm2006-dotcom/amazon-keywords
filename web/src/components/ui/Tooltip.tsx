"use client";

import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface TooltipProps {
  /** The tooltip text. Keep it short — it is a hint, not documentation. */
  content: ReactNode;
  side?: "top" | "bottom";
  className?: string;
  children: ReactNode;
}

/**
 * Hover AND focus triggered, dismissible with Escape, wired to the trigger
 * with `aria-describedby`. The trigger stays keyboard reachable because the
 * wrapper is a `<span tabIndex={0}>` only when the child is not focusable —
 * so pass a button or link as the child wherever possible.
 */
export function Tooltip({ content, side = "top", className, children }: TooltipProps) {
  const id = useId();
  const [open, setOpen] = useState(false);

  return (
    <span
      className={cn("relative inline-flex", className)}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocusCapture={() => setOpen(true)}
      onBlurCapture={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <span aria-describedby={open ? id : undefined} className="inline-flex">
        {children}
      </span>
      <span
        id={id}
        role="tooltip"
        hidden={!open}
        className={cn(
          "pointer-events-none absolute left-1/2 z-50 w-max max-w-[15rem] -translate-x-1/2",
          "rounded-lg border border-hairline bg-surface px-2.5 py-1.5 text-xs leading-snug text-ink shadow-card",
          side === "top" ? "bottom-[calc(100%+0.4rem)]" : "top-[calc(100%+0.4rem)]",
        )}
      >
        {content}
      </span>
    </span>
  );
}
