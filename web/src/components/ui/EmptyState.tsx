import { SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Buttons or links offering the way out. */
  action?: ReactNode;
  className?: string;
  /** Renders without the dashed border, for use inside an existing card. */
  bare?: boolean;
}

export function EmptyState({
  title,
  description,
  icon: Icon = SearchX,
  action,
  className,
  bare,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 px-6 py-12 text-center",
        !bare && "rounded-xl border border-dashed border-hairline-strong bg-surface",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-xl bg-surface-2">
        <Icon className="size-5 text-faint" aria-hidden="true" />
      </span>
      <div className="max-w-md space-y-1.5">
        <p className="font-display text-base font-semibold text-ink">{title}</p>
        {description ? (
          <p className="text-sm leading-relaxed text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}
