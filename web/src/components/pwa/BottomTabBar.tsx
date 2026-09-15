"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { activeMobileTab, MOBILE_TABS } from "@/lib/nav";
import { cn } from "@/lib/utils";

/**
 * Phone tab bar.
 *
 * Five destinations, each a 44px-plus target, pinned to the bottom of the
 * viewport inside the safe area. It slides out of the way when you scroll
 * down — reading a long SOP should not cost 56px of screen — and comes back
 * the moment you scroll up, which is when someone is looking for navigation.
 *
 * Hidden from `md` up, where the header mega-menu and drawer take over.
 */

/** Ignore sub-pixel and rubber-band jitter. */
const DELTA_THRESHOLD = 8;
/** Never hide while the page is still near the top. */
const HIDE_AFTER_PX = 140;

export function BottomTabBar() {
  const pathname = usePathname();
  const [hidden, setHidden] = useState(false);
  const lastY = useRef(0);

  // A route change always brings the bar back.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (hidden) setHidden(false);
  }

  useEffect(() => {
    lastY.current = window.scrollY;

    // Deliberately no requestAnimationFrame gate: a frame that never arrives
    // (a backgrounded tab, a throttled webview) would leave the "waiting for
    // a frame" flag set and freeze the bar off-screen for good. Passive
    // scroll events are already delivered at most once a frame, and the two
    // reads below are cheap.
    const onScroll = () => {
      const y = Math.max(0, window.scrollY);
      const delta = y - lastY.current;
      if (Math.abs(delta) < DELTA_THRESHOLD) return;
      lastY.current = y;

      if (delta < 0 || y <= HIDE_AFTER_PX) {
        setHidden(false);
        return;
      }

      // Scrolling down: stay put once the end of the document is in view, so
      // the bar never covers the last rows of a page.
      const atBottom = window.innerHeight + y >= document.documentElement.scrollHeight - 24;
      setHidden(!atBottom);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const active = activeMobileTab(pathname);

  return (
    <nav
      aria-label="Primary"
      data-hidden={hidden ? "true" : undefined}
      className={cn(
        "fixed inset-x-0 bottom-0 z-40 border-t border-hairline bg-[var(--header-bg)] backdrop-blur-md backdrop-saturate-150 md:hidden",
        "pb-[env(safe-area-inset-bottom)] transition-transform duration-200 ease-out",
        hidden && "translate-y-[calc(100%+1px)]",
      )}
    >
      <ul className="mx-auto flex max-w-lg items-stretch">
        {MOBILE_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active?.href === tab.href;
          return (
            <li key={tab.href} className="min-w-0 flex-1">
              <Link
                href={tab.href}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-1.5 text-[0.625rem] font-medium",
                  "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                  isActive ? "text-brand" : "text-muted",
                )}
              >
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-x-3 top-0 h-0.5 rounded-b-full transition-colors",
                    isActive ? "bg-brand" : "bg-transparent",
                  )}
                />
                <Icon className={cn("size-5 shrink-0", isActive && "stroke-[2.25]")} aria-hidden="true" />
                <span className="w-full truncate text-center">{tab.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
