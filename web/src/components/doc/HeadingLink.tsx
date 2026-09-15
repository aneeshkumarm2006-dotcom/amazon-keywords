"use client";

import { Check, Link2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Copies a deep link to one section. Sits inside the heading, invisible until
 * the heading is hovered or the button itself is focused, so the type block
 * stays clean but the affordance is still keyboard reachable.
 */
export function HeadingLink({ id }: { id: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    const url = `${window.location.origin}${window.location.pathname}#${id}`;

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard blocked (insecure origin, denied permission): still move the
      // reader to the anchor so they can copy the address bar themselves.
      window.location.hash = id;
      return;
    }

    window.history.replaceState(null, "", `#${id}`);
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }, [id]);

  const Icon = copied ? Check : Link2;

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? "Section link copied" : "Copy link to this section"}
      className="ml-1.5 inline-flex size-6 translate-y-0.5 items-center justify-center rounded-md align-middle text-faint opacity-0 transition-opacity duration-150 hover:bg-surface-2 hover:text-ink focus-visible:opacity-100 group-hover/heading:opacity-100 print:hidden"
    >
      <Icon className="size-3.5" aria-hidden="true" />
    </button>
  );
}
