"use client";

import { ChevronDown, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";

import { openCommandPalette } from "@/components/search/CommandPalette";
import { isActivePath, NAV, SEARCH_ROUTE, type NavGroup } from "@/lib/nav";
import { useIsHydrated } from "@/lib/storage";
import { cn } from "@/lib/utils";

import { MobileNav } from "./MobileNav";
import { ThemeToggle } from "./ThemeToggle";
import { Wordmark } from "./Wordmark";

function MegaMenu({
  group,
  onRequestClose,
  pathname,
}: {
  group: NavGroup;
  onRequestClose: () => void;
  pathname: string;
}) {
  return (
    // The transparent top padding bridges the gap between the trigger and the
    // panel so the pointer never leaves the menu on its way down.
    <div className="absolute top-full left-0 z-50 w-full max-w-[36rem] pt-3">
      <div
        id={`mega-${group.id}`}
        className="rounded-2xl border border-hairline bg-surface p-2 shadow-card"
      >
        <p className="px-3 pt-2 pb-3 text-xs leading-relaxed text-muted">{group.description}</p>
        <ul className="grid grid-cols-2 gap-1">
          {group.links.map((link) => {
            const Icon = link.icon;
            const active = isActivePath(pathname, link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  onClick={onRequestClose}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-full gap-3 rounded-xl border p-3 transition-colors",
                    "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                    active
                      ? "border-brand/30 bg-brand-soft"
                      : "border-transparent hover:bg-surface-2",
                  )}
                >
                  <Icon
                    className={cn("mt-0.5 size-4 shrink-0", active ? "text-brand" : "text-faint")}
                    aria-hidden="true"
                  />
                  <span className="min-w-0">
                    <span className="flex items-center gap-2">
                      <span
                        className={cn(
                          "text-[0.8125rem] font-semibold",
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
                    <span className="mt-1 block text-xs leading-relaxed text-muted">
                      {link.description}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function Header() {
  const pathname = usePathname();
  const hydrated = useIsHydrated();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Computed only after hydration, so the server and client markup agree.
  const isApple =
    hydrated && typeof navigator !== "undefined" && /Mac|iPhone|iPad|iPod/.test(navigator.userAgent);
  const shortcutHint = isApple ? "⌘ K" : "Ctrl K";

  const closeMenu = useCallback(() => setOpenGroup(null), []);

  // Close the mega-menu on route change. Adjusting state during render is the
  // documented way to react to a changed input without an extra render pass.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpenGroup(null);
  }

  const activeGroup = NAV.find((group) => group.id === openGroup) ?? null;

  // Hairline appears once the page is scrolled.
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Click outside + Escape close the mega-menu.
  useEffect(() => {
    if (!openGroup) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!navRef.current?.contains(event.target as Node)) setOpenGroup(null);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpenGroup(null);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [openGroup]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  // Ctrl/Cmd+K opens the command palette, matching the hint on the button.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== "k" || !(event.metaKey || event.ctrlKey)) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || target?.isContentEditable) return;
      event.preventDefault();
      setOpenGroup(null);
      setDrawerOpen(false);
      openCommandPalette();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  const scheduleClose = () => {
    cancelClose();
    closeTimer.current = setTimeout(() => setOpenGroup(null), 140);
  };

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 border-b bg-[var(--header-bg)] backdrop-blur-md backdrop-saturate-150",
          scrolled ? "border-hairline" : "border-transparent",
        )}
      >
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center gap-3 px-4 sm:px-6 lg:px-8">
          <Wordmark />

          <div
            ref={navRef}
            className="relative ml-4 hidden flex-1 items-center gap-1 lg:flex"
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            <nav aria-label="Main">
              <ul className="flex items-center gap-1">
                {NAV.map((group) => {
                  const isOpen = openGroup === group.id;
                  const groupActive = group.links.some((link) =>
                    isActivePath(pathname, link.href),
                  );
                  return (
                    <li
                      key={group.id}
                      onMouseEnter={() => {
                        cancelClose();
                        setOpenGroup(group.id);
                      }}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-haspopup="true"
                        aria-controls={isOpen ? `mega-${group.id}` : undefined}
                        onClick={() => setOpenGroup(isOpen ? null : group.id)}
                        onKeyDown={(event) => {
                          if (event.key === "ArrowDown") {
                            event.preventDefault();
                            setOpenGroup(group.id);
                          }
                        }}
                        className={cn(
                          "inline-flex min-h-10 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors",
                          "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                          isOpen || groupActive
                            ? "bg-surface-2 text-ink"
                            : "text-muted hover:bg-surface-2 hover:text-ink",
                        )}
                      >
                        {group.label}
                        <ChevronDown
                          className={cn(
                            "size-3.5 text-faint transition-transform duration-150",
                            isOpen && "rotate-180",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {activeGroup ? (
              <MegaMenu group={activeGroup} onRequestClose={closeMenu} pathname={pathname} />
            ) : null}
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link
              href={SEARCH_ROUTE}
              onClick={(event) => {
                // Plain clicks open the palette; modified clicks keep the link,
                // so "open in a new tab" still reaches the search page.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openCommandPalette();
              }}
              className={cn(
                "hidden min-h-9 items-center gap-2 rounded-lg border border-hairline bg-surface px-2.5 pr-2 text-sm text-muted transition-colors sm:inline-flex",
                "hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
              )}
            >
              <Search className="size-4" aria-hidden="true" />
              <span className="hidden md:inline">Search</span>
              <kbd className="ml-1 hidden rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] text-faint md:inline">
                {shortcutHint}
              </kbd>
            </Link>

            <Link
              href={SEARCH_ROUTE}
              aria-label="Search"
              onClick={(event) => {
                // Plain clicks open the palette; modified clicks keep the link,
                // so "open in a new tab" still reaches the search page.
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                event.preventDefault();
                openCommandPalette();
              }}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-hairline bg-surface text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:hidden"
            >
              <Search className="size-[1.125rem]" aria-hidden="true" />
            </Link>

            <div className="hidden sm:block">
              <ThemeToggle iconOnly size="sm" />
            </div>

            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-label="Open navigation"
              aria-expanded={drawerOpen}
              className="inline-flex size-11 items-center justify-center rounded-lg border border-hairline bg-surface text-muted transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand lg:hidden"
            >
              <Menu className="size-[1.125rem]" aria-hidden="true" />
            </button>
          </div>
        </div>
      </header>

      <MobileNav open={drawerOpen} onClose={() => setDrawerOpen(false)} />
    </>
  );
}
