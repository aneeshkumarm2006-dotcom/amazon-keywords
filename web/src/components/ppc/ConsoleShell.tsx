"use client";

import {
  CircleGauge,
  Gavel,
  Layers,
  LayoutDashboard,
  Lock,
  RotateCcw,
  Sprout,
  Store as StoreIcon,
  TextSearch,
  Upload,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, type KeyboardEvent, type ReactNode } from "react";

import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Skeleton } from "@/components/ui/Skeleton";
import type { Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { ALL_STORES, DB_UNAVAILABLE_MESSAGE, invalidateConsoleData, useActiveScope, useDbStatus, type Scope } from "./hooks";
import { StoreDot } from "./StoreDot";

interface ConsoleSection {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const CONSOLE_SECTIONS: ConsoleSection[] = [
  { label: "Overview", href: "/dashboard", icon: LayoutDashboard },
  { label: "Import", href: "/dashboard/import", icon: Upload },
  { label: "Search terms", href: "/dashboard/search-terms", icon: TextSearch },
  { label: "Keywords", href: "/dashboard/keywords", icon: Sprout },
  { label: "Bids", href: "/dashboard/bids", icon: Gavel },
  { label: "Stores", href: "/dashboard/stores", icon: StoreIcon },
];

function normalise(pathname: string | null): string {
  const p = (pathname ?? "/dashboard").replace(/\/+$/, "");
  return p || "/";
}

function isCurrent(pathname: string, href: string): boolean {
  if (href === "/dashboard") return pathname === "/dashboard";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * The frame around every /dashboard page: console title, the store scope
 * switcher (which doubles as the colour legend for per-store charts), and the
 * section tabs. Each page renders its own <h1> below it.
 */
export function ConsoleShell({ children }: { children: ReactNode }) {
  const pathname = normalise(usePathname());
  const status = useDbStatus();
  const { scope, ready, setScope, stores, error } = useActiveScope();

  let body: ReactNode = children;
  if (status === "unavailable") {
    body = (
      <Callout variant="danger" title="The console cannot store data in this browser">
        <p>{DB_UNAVAILABLE_MESSAGE}</p>
      </Callout>
    );
  } else if (error) {
    body = (
      <Callout variant="danger" title="Could not open the console database">
        <p>{error}</p>
        <div>
          <Button variant="secondary" size="sm" icon={RotateCcw} onClick={invalidateConsoleData}>
            Try again
          </Button>
        </div>
      </Callout>
    );
  }

  return (
    <>
      <div className="border-b border-hairline bg-surface">
        <Container width="wide" className="pt-5 sm:pt-6">
          <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-1.5 font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
                <CircleGauge className="size-3.5" aria-hidden="true" />
                Personal tool
              </p>
              <p className="mt-1 font-display text-xl leading-tight font-bold text-ink sm:text-2xl">PPC Console</p>
              <p className="mt-1 flex items-start gap-1.5 text-xs leading-relaxed text-muted">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-good" aria-hidden="true" />
                <span>Data stays in this browser. Nothing is uploaded anywhere.</span>
              </p>
            </div>
            <ScopeSwitcher scope={scope} ready={ready && status === "ready" && !error} stores={stores} onChange={setScope} />
          </div>

          <nav aria-label="Console sections" className="mt-3 min-w-0">
            <ul className="scroll-well -mb-px flex gap-0.5 overflow-x-auto">
              {CONSOLE_SECTIONS.map(({ label, href, icon: Icon }) => {
                const current = isCurrent(pathname, href);
                return (
                  <li key={href} className="shrink-0">
                    <Link
                      href={href}
                      aria-current={current ? "page" : undefined}
                      className={cn(
                        "inline-flex min-h-11 items-center gap-2 border-b-2 px-3 text-sm font-medium whitespace-nowrap",
                        "transition-colors duration-150 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand",
                        current
                          ? "border-brand text-ink"
                          : "border-transparent text-muted hover:border-hairline-strong hover:text-ink",
                      )}
                    >
                      <Icon className={cn("size-4 shrink-0", current ? "text-brand" : "text-faint")} aria-hidden="true" />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </Container>
      </div>

      <Container width="wide" className="py-6 sm:py-8">
        {body}
      </Container>
    </>
  );
}

interface ScopeSwitcherProps {
  scope: Scope;
  ready: boolean;
  stores: Store[];
  onChange: (scope: Scope) => void;
}

/**
 * ARIA radiogroup of chips: "All stores" plus one per store with its series
 * colour. One chip in the tab order; arrows / Home / End move and select.
 * Scrolls sideways inside its own box when there are many stores.
 */
function ScopeSwitcher({ scope, ready, stores, onChange }: ScopeSwitcherProps) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  if (!ready) {
    return (
      <div className="flex gap-1.5" aria-hidden="true">
        <Skeleton className="h-9 w-24 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
    );
  }
  if (stores.length === 0) {
    return (
      <p className="text-xs text-muted lg:text-right">
        No stores yet —{" "}
        <Link
          href="/dashboard/stores"
          className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
        >
          add one
        </Link>{" "}
        or import a report.
      </p>
    );
  }

  const options: { value: Scope; label: string; colorIndex?: number }[] = [
    { value: ALL_STORES, label: "All stores" },
    ...stores.map((s) => ({ value: s.id, label: s.name, colorIndex: s.colorIndex })),
  ];
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === scope),
  );

  const move = (next: number) => {
    const o = options[(next + options.length) % options.length];
    onChange(o.value);
    refs.current[o.value]?.focus();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const keys: Record<string, () => void> = {
      ArrowRight: () => move(index + 1),
      ArrowDown: () => move(index + 1),
      ArrowLeft: () => move(index - 1),
      ArrowUp: () => move(index - 1),
      Home: () => move(0),
      End: () => move(options.length - 1),
    };
    const fn = keys[event.key];
    if (fn) {
      event.preventDefault();
      fn();
    }
  };

  return (
    <div className="min-w-0 lg:max-w-[60%]">
      <div
        role="radiogroup"
        aria-label="Store scope"
        className="scroll-well -mx-1 flex gap-1.5 overflow-x-auto px-1 py-1 lg:flex-wrap lg:justify-end lg:overflow-visible"
      >
        {options.map((o) => {
          const selected = o.value === scope;
          return (
            <button
              key={o.value}
              ref={(node) => {
                refs.current[o.value] = node;
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onChange(o.value)}
              onKeyDown={onKeyDown}
              title={o.label}
              className={cn(
                "inline-flex min-h-9 max-w-[15rem] shrink-0 items-center gap-2 rounded-full border px-3 text-[0.8125rem] font-medium",
                "transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand",
                "[@media(pointer:coarse)]:min-h-11",
                selected
                  ? "border-brand bg-brand-soft text-ink"
                  : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
              )}
            >
              {o.colorIndex === undefined ? (
                <Layers className={cn("size-3.5 shrink-0", selected ? "text-brand" : "text-faint")} aria-hidden="true" />
              ) : (
                <StoreDot colorIndex={o.colorIndex} />
              )}
              <span className="truncate">{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
