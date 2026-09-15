import Link from "next/link";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const BASE = "rounded-xl border border-hairline bg-surface";
const INTERACTIVE =
  "transition-[border-color,box-shadow,transform] duration-150 " +
  "hover:border-hairline-strong hover:shadow-card focus-visible:outline-2 " +
  "focus-visible:outline-offset-2 focus-visible:outline-brand";

export interface CardStyleOptions {
  /** Adds hover elevation. Use for cards that are themselves clickable. */
  interactive?: boolean;
  /** `panel` uses the larger 2xl radius for page-level containers. */
  as?: "card" | "panel";
  className?: string;
}

export function cardClasses({ interactive, as = "card", className }: CardStyleOptions = {}) {
  return cn(BASE, as === "panel" && "rounded-2xl", interactive && INTERACTIVE, className);
}

export interface CardProps extends HTMLAttributes<HTMLDivElement>, CardStyleOptions {
  children: ReactNode;
}

export function Card({ interactive, as = "card", className, children, ...rest }: CardProps) {
  return (
    <div className={cardClasses({ interactive, as, className })} {...rest}>
      {children}
    </div>
  );
}

export interface CardLinkProps extends CardStyleOptions {
  href: string;
  children: ReactNode;
  className?: string;
  "aria-label"?: string;
}

/** A whole card that is one link. Always interactive. */
export function CardLink({ href, className, as = "card", children, ...rest }: CardLinkProps) {
  return (
    <Link
      href={href}
      className={cardClasses({ interactive: true, as, className: cn("block", className) })}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function CardHeader({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 p-5 pb-0", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardTitle({ className, children, ...rest }: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("font-display text-base leading-snug font-semibold text-ink", className)}
      {...rest}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  children,
  ...rest
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm leading-relaxed text-muted", className)} {...rest}>
      {children}
    </p>
  );
}

export function CardBody({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("p-5", className)} {...rest}>
      {children}
    </div>
  );
}

export function CardFooter({ className, children, ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-hairline px-5 py-3.5",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
