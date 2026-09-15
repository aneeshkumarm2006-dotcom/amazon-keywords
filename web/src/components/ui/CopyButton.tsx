"use client";

import { Check, Copy } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

export interface CopyButtonProps {
  /** Text placed on the clipboard. */
  value: string;
  /** Visible label. Omit for an icon-only button (an aria-label is added). */
  label?: string;
  size?: "sm" | "md";
  className?: string;
}

async function writeToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    /* fall through to the textarea fallback */
  }

  try {
    const area = document.createElement("textarea");
    area.value = value;
    area.setAttribute("readonly", "");
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(area);
    return ok;
  } catch {
    return false;
  }
}

export function CopyButton({ value, label, size = "sm", className }: CopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const ok = await writeToClipboard(value);
    setState(ok ? "copied" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setState("idle"), 2000);
  }, [value]);

  const Icon = state === "copied" ? Check : Copy;
  const text =
    state === "copied" ? "Copied" : state === "failed" ? "Press Ctrl+C" : (label ?? "Copy");

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label ? undefined : "Copy to clipboard"}
      aria-live="polite"
      className={cn(
        "inline-flex items-center gap-1.5 rounded-lg border border-hairline bg-surface font-medium text-muted",
        "transition-colors duration-150 hover:border-hairline-strong hover:text-ink",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        size === "sm" ? "min-h-8 px-2.5 text-xs" : "min-h-10 px-3 text-sm",
        // Matches Button: a dense toolbar height on a mouse, a full 44px
        // target on a touch pointer.
        "[@media(pointer:coarse)]:min-h-11",
        state === "copied" && "border-good/40 text-good",
        className,
      )}
    >
      <Icon className={cn(size === "sm" ? "size-3.5" : "size-4")} aria-hidden="true" />
      {label || state !== "idle" ? <span>{text}</span> : null}
    </button>
  );
}
