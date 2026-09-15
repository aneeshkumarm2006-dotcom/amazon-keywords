import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-brand text-on-brand border border-transparent hover:bg-brand-hover active:bg-brand-hover",
  secondary:
    "bg-surface text-ink border border-hairline hover:border-hairline-strong hover:bg-surface-2",
  ghost:
    "bg-transparent text-muted border border-transparent hover:bg-surface-2 hover:text-ink",
  danger: "bg-bad text-on-bad border border-transparent hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  // Min heights keep every control at or above a 44px touch target where it
  // matters; `sm` is reserved for dense toolbars inside a larger hit area,
  // and grows to the full 44px on a touch pointer.
  sm: "min-h-9 gap-1.5 rounded-lg px-3 text-[0.8125rem] [@media(pointer:coarse)]:min-h-11",
  md: "min-h-11 gap-2 rounded-lg px-4 text-sm",
  lg: "min-h-12 gap-2.5 rounded-lg px-5 text-[0.9375rem]",
};

const ICON_SIZES: Record<ButtonSize, string> = {
  sm: "size-3.5",
  md: "size-4",
  lg: "size-[1.125rem]",
};

const BASE =
  "inline-flex select-none items-center justify-center font-medium leading-none " +
  "transition-[background-color,border-color,color,opacity] duration-150 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

export interface ButtonStyleOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

/** The shared class recipe, exported so other elements can match a button. */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: ButtonStyleOptions = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], fullWidth && "w-full", className);
}

interface ButtonContentProps {
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  size: ButtonSize;
  children: ReactNode;
}

function ButtonContent({ icon: Icon, iconAfter: After, size, children }: ButtonContentProps) {
  return (
    <>
      {Icon ? <Icon className={cn(ICON_SIZES[size], "shrink-0")} aria-hidden="true" /> : null}
      <span className="truncate">{children}</span>
      {After ? <After className={cn(ICON_SIZES[size], "shrink-0")} aria-hidden="true" /> : null}
    </>
  );
}

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className">,
    ButtonStyleOptions {
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  icon,
  iconAfter,
  children,
  type = "button",
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={buttonClasses({ variant, size, fullWidth, className })}
      {...rest}
    >
      <ButtonContent icon={icon} iconAfter={iconAfter} size={size}>
        {children}
      </ButtonContent>
    </button>
  );
}

export interface ButtonLinkProps extends ButtonStyleOptions {
  href: string;
  icon?: LucideIcon;
  iconAfter?: LucideIcon;
  children: ReactNode;
  /** Renders a plain anchor with the right rel/target for off-site links. */
  external?: boolean;
  "aria-label"?: string;
  onClick?: () => void;
  prefetch?: boolean;
}

/** A link that looks and behaves like a button. */
export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  fullWidth,
  className,
  icon,
  iconAfter,
  external,
  children,
  onClick,
  prefetch,
  ...rest
}: ButtonLinkProps) {
  const classes = buttonClasses({ variant, size, fullWidth, className });
  const content = (
    <ButtonContent icon={icon} iconAfter={iconAfter} size={size}>
      {children}
    </ButtonContent>
  );

  if (external) {
    return (
      <a
        href={href}
        className={classes}
        target="_blank"
        rel="noreferrer noopener"
        onClick={onClick}
        {...rest}
      >
        {content}
      </a>
    );
  }

  return (
    <Link href={href} className={classes} onClick={onClick} prefetch={prefetch} {...rest}>
      {content}
    </Link>
  );
}
