"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  /** Small trailing count, e.g. "12". */
  count?: number;
  content: ReactNode;
}

export interface TabsProps {
  items: TabItem[];
  /** Id of the initially selected tab. Defaults to the first. */
  defaultTab?: string;
  /** Accessible name for the tab list. */
  label: string;
  className?: string;
  /** Stretch tabs to fill the row (good for two or three tabs on mobile). */
  fill?: boolean;
}

/**
 * WAI-ARIA tab pattern: roving tabindex, arrow/Home/End keys, one tab in the
 * tab order at a time, panels labelled by their tab.
 */
export function Tabs({ items, defaultTab, label, className, fill }: TabsProps) {
  const baseId = useId();
  const [active, setActive] = useState(defaultTab ?? items[0]?.id);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (items.length === 0) return null;

  const activeIndex = Math.max(
    0,
    items.findIndex((item) => item.id === active),
  );

  const focusTab = (index: number) => {
    const next = items[(index + items.length) % items.length];
    setActive(next.id);
    tabRefs.current[next.id]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        focusTab(activeIndex + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        focusTab(activeIndex - 1);
        break;
      case "Home":
        event.preventDefault();
        focusTab(0);
        break;
      case "End":
        event.preventDefault();
        focusTab(items.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div className={cn("flex flex-col gap-5", className)}>
      <div
        role="tablist"
        aria-label={label}
        aria-orientation="horizontal"
        className="scroll-well -mx-1 flex gap-1 overflow-x-auto px-1 pb-px"
      >
        {items.map((item, index) => {
          const selected = item.id === active;
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              ref={(node) => {
                tabRefs.current[item.id] = node;
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${item.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${item.id}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActive(item.id)}
              onKeyDown={onKeyDown}
              className={cn(
                "inline-flex min-h-10 shrink-0 items-center gap-2 rounded-lg border px-3 text-sm font-medium [@media(pointer:coarse)]:min-h-11",
                "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                fill && "flex-1 justify-center",
                selected
                  ? "border-hairline bg-surface text-ink shadow-card"
                  : "border-transparent text-muted hover:bg-surface-2 hover:text-ink",
              )}
              data-index={index}
            >
              {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
              <span className="whitespace-nowrap">{item.label}</span>
              {typeof item.count === "number" ? (
                <span
                  className={cn(
                    "tabular rounded-full px-1.5 py-0.5 text-[0.6875rem]",
                    selected ? "bg-brand-soft text-brand" : "bg-surface-2 text-faint",
                  )}
                >
                  {item.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {items.map((item) => (
        <div
          key={item.id}
          role="tabpanel"
          id={`${baseId}-panel-${item.id}`}
          aria-labelledby={`${baseId}-tab-${item.id}`}
          hidden={item.id !== active}
          tabIndex={0}
          className="focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand"
        >
          {item.id === active ? item.content : null}
        </div>
      ))}
    </div>
  );
}
