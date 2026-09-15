"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useEffect } from "react";

import { SegmentedControl, type SegmentedOption } from "@/components/ui/SegmentedControl";
import { THEME_STORAGE_KEY, useLocalStorage } from "@/lib/storage";
import { cn } from "@/lib/utils";

export type ThemeChoice = "light" | "dark" | "system";

const OPTIONS: SegmentedOption<ThemeChoice>[] = [
  { value: "light", label: "Light", icon: Sun, srLabel: "Light theme" },
  { value: "dark", label: "Dark", icon: Moon, srLabel: "Dark theme" },
  { value: "system", label: "System", icon: Monitor, srLabel: "Match system theme" },
];

function prefersDark(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function normalise(value: unknown): ThemeChoice {
  return value === "light" || value === "dark" ? value : "system";
}

/** Apply a choice to the document. Mirrors the inline no-flash script. */
export function applyTheme(choice: ThemeChoice): void {
  if (typeof document === "undefined") return;
  const dark = choice === "dark" || (choice === "system" && prefersDark());
  const root = document.documentElement;
  root.classList.toggle("dark", dark);
  root.style.colorScheme = dark ? "dark" : "light";
}

export interface ThemeToggleProps {
  /** Icon-only for the header; labelled for settings surfaces. */
  iconOnly?: boolean;
  size?: "sm" | "md";
  className?: string;
}

export function ThemeToggle({ iconOnly = true, size = "sm", className }: ThemeToggleProps) {
  const [stored, setStored, { ready }] = useLocalStorage<ThemeChoice>(
    THEME_STORAGE_KEY,
    "system",
  );
  const choice = normalise(stored);

  // Keep the document in sync with the stored choice, including changes made
  // in another tab. Syncing an external system is exactly what effects are for.
  useEffect(() => {
    if (!ready) return;
    applyTheme(choice);
  }, [choice, ready]);

  // Follow the OS while the choice is "system".
  useEffect(() => {
    if (!ready || choice !== "system" || typeof window === "undefined") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [choice, ready]);

  // Before hydration the stored choice is unknown, so render an inert
  // placeholder of identical size rather than a wrong selected state.
  if (!ready) {
    return (
      <div
        aria-hidden="true"
        className={cn(
          "rounded-lg border border-hairline bg-surface-2",
          size === "sm" ? "h-[2.375rem]" : "h-[2.625rem]",
          iconOnly ? (size === "sm" ? "w-[6.625rem]" : "w-[7.375rem]") : "w-[13.5rem]",
          className,
        )}
      />
    );
  }

  return (
    <SegmentedControl
      options={OPTIONS}
      value={choice}
      onChange={setStored}
      label="Colour theme"
      iconOnly={iconOnly}
      size={size}
      className={className}
    />
  );
}
