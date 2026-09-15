import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils";

export interface Crumb {
  label: string;
  /** Omit on the final crumb — it renders as the current page. */
  href?: string;
}

export interface BreadcrumbsProps {
  items: Crumb[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  if (items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-x-1 gap-y-1 text-[0.8125rem] text-muted">
        <li className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded px-1 py-0.5 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Home
          </Link>
          <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
        </li>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center gap-1">
              {item.href && !last ? (
                <Link
                  href={item.href}
                  className="truncate rounded px-1 py-0.5 transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                >
                  {item.label}
                </Link>
              ) : (
                <span className="truncate px-1 py-0.5 font-medium text-ink" aria-current="page">
                  {item.label}
                </span>
              )}
              {last ? null : (
                <ChevronRight className="size-3.5 shrink-0 text-faint" aria-hidden="true" />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
