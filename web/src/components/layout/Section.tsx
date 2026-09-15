import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

import { Container, type ContainerWidth } from "./Container";

export interface SectionProps {
  /** Small uppercase kicker above the title. */
  eyebrow?: string;
  title?: string;
  description?: string;
  /** Right-aligned actions on desktop, stacked under the copy on mobile. */
  actions?: ReactNode;
  /** Convenience: renders a "see all" style link in the actions slot. */
  link?: { href: string; label: string };
  width?: ContainerWidth;
  /** Tightens the vertical rhythm for stacked sections. */
  tight?: boolean;
  /** Paints the band in the raised surface colour. */
  surface?: boolean;
  /** Draws a hairline above the section. */
  divided?: boolean;
  id?: string;
  className?: string;
  headerClassName?: string;
  children: ReactNode;
}

export function Section({
  eyebrow,
  title,
  description,
  actions,
  link,
  width = "default",
  tight,
  surface,
  divided,
  id,
  className,
  headerClassName,
  children,
}: SectionProps) {
  const hasHeader = Boolean(eyebrow || title || description || actions || link);

  return (
    <section
      id={id}
      className={cn(
        tight ? "py-10 sm:py-12" : "py-14 sm:py-18 lg:py-22",
        surface && "bg-surface-2",
        divided && "border-t border-hairline",
        className,
      )}
    >
      <Container width={width}>
        {hasHeader ? (
          <div
            className={cn(
              "mb-8 flex flex-col gap-4 sm:mb-10 sm:flex-row sm:items-end sm:justify-between",
              headerClassName,
            )}
          >
            <div className="max-w-2xl">
              {eyebrow ? (
                <p className="mb-2 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
                  {eyebrow}
                </p>
              ) : null}
              {title ? (
                <h2 className="text-2xl leading-tight font-bold text-ink sm:text-[1.75rem]">
                  {title}
                </h2>
              ) : null}
              {description ? (
                <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted">{description}</p>
              ) : null}
            </div>

            {actions || link ? (
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                {actions}
                {link ? (
                  <Link
                    href={link.href}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
                  >
                    {link.label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {children}
      </Container>
    </section>
  );
}
