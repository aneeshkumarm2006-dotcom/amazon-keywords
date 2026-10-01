import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface ConsolePageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned buttons on wide screens, stacked under the copy on phones. */
  actions?: ReactNode;
  className?: string;
}

/** The page-level <h1> row inside the console shell. */
export function ConsolePageHeader({ title, description, actions, className }: ConsolePageHeaderProps) {
  return (
    <div className={cn("mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-3xl">
        <h1 className="text-2xl leading-tight font-bold text-ink sm:text-[1.75rem]">{title}</h1>
        {description ? <div className="mt-2 text-[0.9375rem] leading-relaxed text-muted">{description}</div> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
