"use client";

import { useId, useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Used as the accessible name when the label is visually hidden. */
  srLabel?: string;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** Accessible name for the whole group. */
  label: string;
  /** Icons only — labels move to the accessible name. */
  iconOnly?: boolean;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
}

/**
 * ARIA radiogroup: exactly one control in the tab order, arrow keys move and
 * select, Home/End jump to the ends.
 */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  label,
  iconOnly,
  size = "md",
  fullWidth,
  className,
}: SegmentedControlProps<T>) {
  const groupId = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  const index = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );

  const move = (nextIndex: number) => {
    const next = options[(nextIndex + options.length) % options.length];
    onChange(next.value);
    refs.current[next.value]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        event.preventDefault();
        move(index + 1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        event.preventDefault();
        move(index - 1);
        break;
      case "Home":
        event.preventDefault();
        move(0);
        break;
      case "End":
        event.preventDefault();
        move(options.length - 1);
        break;
      default:
        break;
    }
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-surface-2 p-0.5",
        fullWidth && "flex w-full",
        className,
      )}
    >
      {options.map((option) => {
        const selected = option.value === value;
        const Icon = option.icon;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[option.value] = node;
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={iconOnly ? (option.srLabel ?? option.label) : undefined}
            id={`${groupId}-${option.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[0.4rem] font-medium",
              "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
              fullWidth && "flex-1",
              // Touch pointers get a 44px target; the visual density is
              // unchanged on a mouse.
              "[@media(pointer:coarse)]:min-h-11",
              size === "sm"
                ? cn("min-h-8 text-xs", iconOnly ? "w-8 px-0 [@media(pointer:coarse)]:w-11" : "px-2.5")
                : cn(
                    "min-h-9 text-[0.8125rem]",
                    iconOnly ? "w-9 px-0 [@media(pointer:coarse)]:w-11" : "px-3",
                  ),
              selected
                ? "bg-surface text-ink shadow-card"
                : "text-muted hover:text-ink",
            )}
          >
            {Icon ? (
              <Icon className={cn(size === "sm" ? "size-3.5" : "size-4")} aria-hidden="true" />
            ) : null}
            {iconOnly ? null : <span className="whitespace-nowrap">{option.label}</span>}
          </button>
        );
      })}
    </div>
  );
}
