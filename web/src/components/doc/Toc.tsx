"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

import type { TocItem } from "./slug";

export interface TocProps {
  items: TocItem[];
  className?: string;
}

/**
 * Sticky contents list with a scroll spy. The spy tracks the heading nearest
 * the top of the viewport rather than whichever intersection fired last, so
 * fast scrolling and short sections do not make the marker jump around.
 */
export function Toc({ items, className }: TocProps) {
  const [active, setActive] = useState<string>(items[0]?.id ?? "");

  useEffect(() => {
    if (items.length === 0) return;

    const ids = items.map((item) => item.id);

    const pick = () => {
      // 140px down from the top of the viewport: below the sticky header, at
      // roughly the line a reader's eye rests on.
      const line = 140;
      let current = ids[0];

      for (const id of ids) {
        const node = document.getElementById(id);
        if (!node) continue;
        if (node.getBoundingClientRect().top <= line) current = id;
        else break;
      }

      // At the very bottom of the page the last section may never reach the
      // line; make sure it still lights up.
      const atBottom =
        window.innerHeight + window.scrollY >= document.body.scrollHeight - 2;
      setActive(atBottom ? ids[ids.length - 1] : current);
    };

    pick();

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        pick();
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [items]);

  if (items.length === 0) return null;

  return (
    <nav aria-label="On this page" className={cn("min-w-0", className)}>
      <p className="mb-3 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-faint uppercase">
        On this page
      </p>
      <ul className="scroll-well max-h-[calc(100vh-13rem)] space-y-px overflow-y-auto border-l border-hairline">
        {items.map((item) => {
          const current = item.id === active;
          return (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                aria-current={current ? "location" : undefined}
                className={cn(
                  "-ml-px block border-l-2 py-1.5 text-[0.8125rem] leading-snug transition-colors",
                  item.depth === 3 ? "pl-6 pr-2" : "pl-3.5 pr-2 font-medium",
                  current
                    ? "border-brand text-brand"
                    : "border-transparent text-muted hover:border-hairline-strong hover:text-ink",
                )}
              >
                {item.text}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** The same contents list, collapsed into a disclosure for small screens. */
export function TocDisclosure({ items, className }: TocProps) {
  if (items.length === 0) return null;

  return (
    <details
      className={cn(
        "group rounded-xl border border-hairline bg-surface print:hidden",
        className,
      )}
    >
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium text-ink">
        <span>On this page</span>
        <span className="font-mono text-xs text-faint">
          {items.length} sections
        </span>
      </summary>
      <ul className="border-t border-hairline px-2 py-2">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "block rounded-lg px-2 py-2 text-[0.8125rem] leading-snug text-muted hover:bg-surface-2 hover:text-ink",
                item.depth === 3 && "pl-6",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}
