"use client";

import { ArrowRight, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { isActivePath, NAV, SEARCH_ROUTE } from "@/lib/nav";
import { cn } from "@/lib/utils";

import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

const FOCUSABLE =
  'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])';

export interface MobileNavProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Full-screen drawer. Traps focus, locks body scroll, restores focus to the
 * trigger on close, and closes itself whenever the route changes.
 */
export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const firstRender = useRef(true);

  // Close on navigation.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    onClose();
    // `onClose` is stable enough here; re-running on identity changes would
    // close the drawer on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Body scroll lock.
  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // Focus management + focus trap + Escape.
  useEffect(() => {
    if (!open) return;
    if (typeof document === "undefined") return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !panel) return;

      const items = Array.from(panel.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (node) => node.offsetParent !== null,
      );
      if (items.length === 0) return;

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || !panel.contains(active))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  const stop = useCallback((event: React.MouseEvent) => event.stopPropagation(), []);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 lg:hidden"
      role="dialog"
      aria-modal="true"
      aria-label="Site navigation"
      onClick={onClose}
    >
      <div className="absolute inset-0 bg-scrim backdrop-blur-[2px]" aria-hidden="true" />

      <div
        ref={panelRef}
        onClick={stop}
        className="scroll-well absolute inset-y-0 right-0 flex w-full max-w-sm flex-col overflow-y-auto border-l border-hairline bg-canvas shadow-card"
      >
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-canvas/95 px-4 py-3 backdrop-blur">
          <Wordmark />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close navigation"
            className="flex size-11 items-center justify-center rounded-lg border border-hairline text-muted transition-colors hover:bg-surface-2 hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 px-4 py-5">
          <ButtonLink href={SEARCH_ROUTE} variant="secondary" icon={Search} fullWidth size="md">
            Search every resource
          </ButtonLink>

          <nav aria-label="Main" className="mt-6 flex flex-col gap-7">
            {NAV.map((group) => (
              <div key={group.id}>
                <p className="mb-1 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
                  {group.label}
                </p>
                <p className="mb-3 text-xs leading-relaxed text-faint">{group.description}</p>
                <ul className="flex flex-col gap-1">
                  {group.links.map((link) => {
                    const Icon = link.icon;
                    const active = isActivePath(pathname, link.href);
                    return (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "flex min-h-12 items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                            "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                            active
                              ? "border-brand/35 bg-brand-soft"
                              : "border-transparent hover:bg-surface-2",
                          )}
                        >
                          <Icon
                            className={cn(
                              "mt-0.5 size-4 shrink-0",
                              active ? "text-brand" : "text-faint",
                            )}
                            aria-hidden="true"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "text-sm font-medium",
                                  active ? "text-brand" : "text-ink",
                                )}
                              >
                                {link.label}
                              </span>
                              {link.meta ? (
                                <span className="tabular rounded-full bg-surface-2 px-1.5 py-0.5 text-[0.625rem] text-faint">
                                  {link.meta}
                                </span>
                              ) : null}
                            </span>
                            <span className="mt-0.5 block text-xs leading-relaxed text-muted">
                              {link.description}
                            </span>
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-hairline bg-canvas px-4 py-3.5 pb-[calc(0.875rem+env(safe-area-inset-bottom))]">
          <ThemeToggle iconOnly size="sm" />
          <Link
            href="/quizzes"
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-sm font-medium text-brand hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
          >
            Start the quiz
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </div>
  );
}
