import type { ElementType, HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

export type ContainerWidth = "prose" | "default" | "wide" | "full";

const WIDTHS: Record<ContainerWidth, string> = {
  prose: "max-w-3xl",
  default: "max-w-6xl",
  wide: "max-w-7xl",
  full: "max-w-none",
};

export interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  width?: ContainerWidth;
  as?: ElementType;
  children: ReactNode;
}

/**
 * Horizontal gutter + max width. The 16px side padding at the smallest
 * breakpoint is what keeps the page readable at 360px.
 */
export function Container({
  width = "default",
  as: Tag = "div",
  className,
  children,
  ...rest
}: ContainerProps) {
  return (
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 lg:px-8", WIDTHS[width], className)} {...rest}>
      {children}
    </Tag>
  );
}
