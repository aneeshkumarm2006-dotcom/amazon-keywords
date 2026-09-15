import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

import { Breadcrumbs, type Crumb } from "./Breadcrumbs";
import { Container, type ContainerWidth } from "./Container";

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  description?: string;
  /** Buttons, filters or a share control. */
  actions?: ReactNode;
  breadcrumbs?: Crumb[];
  /** Chips or a meta row rendered under the description. */
  meta?: ReactNode;
  width?: ContainerWidth;
  className?: string;
}

/** The standard top block for every interior page. */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  breadcrumbs,
  meta,
  width = "default",
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("border-b border-hairline bg-surface", className)}>
      <Container width={width} className="py-8 sm:py-10">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <Breadcrumbs items={breadcrumbs} className="mb-5" />
        ) : null}

        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            {eyebrow ? (
              <p className="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-[1.75rem] leading-[1.15] font-bold text-ink sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 text-[0.9375rem] leading-relaxed text-muted sm:text-base">
                {description}
              </p>
            ) : null}
            {meta ? <div className="mt-4 flex flex-wrap items-center gap-2">{meta}</div> : null}
          </div>

          {actions ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          ) : null}
        </div>
      </Container>
    </div>
  );
}
