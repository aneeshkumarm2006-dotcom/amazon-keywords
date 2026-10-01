import { cn } from "@/lib/utils";

import { seriesBg } from "./markets";

export interface StoreDotProps {
  colorIndex: number;
  size?: "sm" | "md";
  className?: string;
}

/** The store's series colour as a small dot. Decorative: a name always sits beside it. */
export function StoreDot({ colorIndex, size = "sm", className }: StoreDotProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block shrink-0 rounded-full ring-2 ring-surface",
        size === "sm" ? "size-2.5" : "size-3.5",
        seriesBg(colorIndex),
        className,
      )}
    />
  );
}
