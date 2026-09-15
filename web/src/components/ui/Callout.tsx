import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import type { Tone } from "@/types/content";

import { TONE_BORDER, TONE_ICON, TONE_SOFT_BG } from "./tone";

export type CalloutVariant = "info" | "warn" | "success" | "danger";

const VARIANT_TONE: Record<CalloutVariant, Tone> = {
  info: "info",
  warn: "warn",
  success: "good",
  danger: "bad",
};

/**
 * Link colour follows the callout's tone instead of always being brand.
 * `--brand` clears AA on `--brand-soft` (which was lightened for exactly that
 * reason) but lands at 4.40-4.47 on the info, good and bad tints in light
 * mode. Each tone's own text colour clears 4.5:1 on its own ground, and ember
 * maps to the AA-safe `--ember-ink`.
 */
const TONE_LINK: Record<Tone, string> = {
  neutral: "[&_a]:text-brand",
  brand: "[&_a]:text-brand",
  ember: "[&_a]:text-ember-ink",
  good: "[&_a]:text-good",
  warn: "[&_a]:text-warn",
  bad: "[&_a]:text-bad",
  info: "[&_a]:text-info",
};

const VARIANT_ICON: Record<CalloutVariant, LucideIcon> = {
  info: Info,
  warn: TriangleAlert,
  success: CircleCheck,
  danger: CircleAlert,
};

export interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  icon?: LucideIcon;
  className?: string;
  children: ReactNode;
}

export function Callout({
  variant = "info",
  title,
  icon,
  className,
  children,
}: CalloutProps) {
  const tone = VARIANT_TONE[variant];
  const Icon = icon ?? VARIANT_ICON[variant];

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border p-4",
        TONE_SOFT_BG[tone],
        TONE_BORDER[tone],
        className,
      )}
      role={variant === "danger" ? "alert" : undefined}
    >
      <Icon className={cn("mt-0.5 size-[1.125rem] shrink-0", TONE_ICON[tone])} aria-hidden="true" />
      <div className="min-w-0 flex-1 text-sm leading-relaxed text-ink">
        {title ? (
          <p className="mb-1 font-display text-[0.9375rem] font-semibold text-ink">{title}</p>
        ) : null}
        <div
          className={cn(
            "[&>*+*]:mt-2 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2",
            TONE_LINK[tone],
          )}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
