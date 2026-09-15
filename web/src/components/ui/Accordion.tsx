"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface AccordionItemData {
  id: string;
  title: ReactNode;
  /** Optional right-aligned meta, e.g. a level badge or a duration. */
  meta?: ReactNode;
  content: ReactNode;
  defaultOpen?: boolean;
}

export interface AccordionProps {
  items: AccordionItemData[];
  /** Only one panel open at a time. */
  single?: boolean;
  className?: string;
}

export function Accordion({ items, single = false, className }: AccordionProps) {
  const baseId = useId();
  const [open, setOpen] = useState<string[]>(() =>
    items.filter((item) => item.defaultOpen).map((item) => item.id),
  );

  const toggle = (id: string) => {
    setOpen((current) => {
      const isOpen = current.includes(id);
      if (single) return isOpen ? [] : [id];
      return isOpen ? current.filter((value) => value !== id) : [...current, id];
    });
  };

  return (
    <div
      className={cn(
        "divide-y divide-hairline overflow-hidden rounded-xl border border-hairline bg-surface",
        className,
      )}
    >
      {items.map((item) => {
        const isOpen = open.includes(item.id);
        return (
          <div key={item.id}>
            <h3 className="m-0">
              <button
                type="button"
                id={`${baseId}-trigger-${item.id}`}
                aria-expanded={isOpen}
                aria-controls={`${baseId}-panel-${item.id}`}
                onClick={() => toggle(item.id)}
                className={cn(
                  "flex w-full min-h-12 items-center gap-3 px-4 py-3.5 text-left",
                  "transition-colors duration-150 hover:bg-surface-2",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                )}
              >
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-faint transition-transform duration-200",
                    isOpen && "rotate-180 text-brand",
                  )}
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 font-display text-[0.9375rem] leading-snug font-semibold text-ink">
                  {item.title}
                </span>
                {item.meta ? <span className="shrink-0">{item.meta}</span> : null}
              </button>
            </h3>
            <div
              id={`${baseId}-panel-${item.id}`}
              role="region"
              aria-labelledby={`${baseId}-trigger-${item.id}`}
              hidden={!isOpen}
              className="border-t border-hairline bg-canvas px-4 py-4 text-sm leading-relaxed text-muted"
            >
              {isOpen ? item.content : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
