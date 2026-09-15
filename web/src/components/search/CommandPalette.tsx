"use client";

import {
  CornerDownLeft,
  History,
  Home,
  LayoutDashboard,
  Loader2,
  Moon,
  Search as SearchIcon,
  Sparkles,
  Sun,
  Target,
  type LucideIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { applyTheme, type ThemeChoice } from "@/components/layout/ThemeToggle";
import { TONE_ICON } from "@/components/ui/tone";
import {
  highlight,
  subsequenceRanges,
  type HighlightRange,
} from "@/lib/highlight";
import { ALL_NAV_LINKS, SEARCH_ROUTE } from "@/lib/nav";
import { rememberSearch, useRecentSearches, usePopularSearches } from "@/lib/search-history";
import { THEME_STORAGE_KEY, storageSet } from "@/lib/storage";
import { cn, formatMinutes } from "@/lib/utils";
import type { SearchHit } from "@/lib/search";

/**
 * The command palette.
 *
 * Ctrl/Cmd-K anywhere, or "/" when the caret is not in a field. It searches
 * three things at once: static actions, every nav destination, and — once the
 * index has loaded — every registered resource.
 *
 * The index and the content behind it are imported dynamically the first time
 * the palette opens. This component is mounted from the root layout, so a
 * static import would put the entire content registry in the bundle of every
 * page on the site; instead the shell costs almost nothing and the index
 * arrives in its own chunk, before the reader has finished typing.
 */

export const COMMAND_PALETTE_EVENT = "ppc-academy:command-palette";

interface PaletteEventDetail {
  query?: string;
}

/** Open the palette from anywhere — the header search button uses this. */
export function openCommandPalette(query?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent<PaletteEventDetail>(COMMAND_PALETTE_EVENT, { detail: { query } }),
  );
}

type SearchModule = typeof import("@/lib/search");

interface PaletteItem {
  id: string;
  label: string;
  description?: string;
  icon: LucideIcon;
  /** Right-hand hint: a kind, a time, a shortcut. */
  meta?: string;
  /** Extra words the matcher may hit that are not shown. */
  keywords?: string;
  ranges?: HighlightRange[];
  run: () => void;
}

interface PaletteSection {
  heading: string;
  items: (PaletteItem & { index: number })[];
}

const DEBOUNCE_MS = 100;
const RESOURCE_LIMIT = 7;
const RECENT_LIMIT = 5;

/* ------------------------------------------------------------------ *
 * Matching for the static items
 * ------------------------------------------------------------------ */

interface Match {
  score: number;
  ranges: HighlightRange[];
}

/**
 * Prefix beats substring beats subsequence beats a hidden-keyword hit, which
 * is all the ordering twenty static rows need — no index required.
 */
function matchItem(item: PaletteItem, query: string): Match | null {
  const needle = query.trim().toLowerCase();
  if (needle.length === 0) return { score: 0, ranges: [] };

  const label = item.label.toLowerCase();
  const at = label.indexOf(needle);
  if (at === 0) return { score: 0, ranges: [[0, needle.length - 1]] };
  if (at > 0) return { score: 0.2, ranges: [[at, at + needle.length - 1]] };

  const loose = subsequenceRanges(item.label, needle);
  if (loose) return { score: 0.45, ranges: loose };

  const haystack = `${item.description ?? ""} ${item.keywords ?? ""}`.toLowerCase();
  if (haystack.includes(needle)) return { score: 0.7, ranges: [] };

  return null;
}

function filterItems(items: PaletteItem[], query: string): PaletteItem[] {
  if (query.trim().length === 0) return items;
  return items
    .map((item) => ({ item, match: matchItem(item, query) }))
    .filter((entry): entry is { item: PaletteItem; match: Match } => entry.match !== null)
    .sort((a, b) => a.match.score - b.match.score)
    .map(({ item, match }) => ({ ...item, ranges: match.ranges }));
}

function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    element.isContentEditable === true
  );
}

/* ------------------------------------------------------------------ *
 * Component
 * ------------------------------------------------------------------ */

export function CommandPalette() {
  const router = useRouter();
  const pathname = usePathname();

  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [deferred, setDeferred] = useState("");
  const [active, setActive] = useState(0);
  const [engine, setEngine] = useState<SearchModule | null>(null);
  const [dark, setDark] = useState(false);

  const { recent } = useRecentSearches();
  const popular = usePopularSearches(RECENT_LIMIT);

  /* ------------------------------------------------------------ open */

  const close = useCallback(() => setOpen(false), []);

  const show = useCallback((initial?: string) => {
    setQuery(initial ?? "");
    setDeferred(initial ?? "");
    setActive(0);
    setDark(document.documentElement.classList.contains("dark"));
    setOpen(true);
  }, []);

  // The header's search button and the global shortcuts both come through here.
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<PaletteEventDetail>).detail;
      show(detail?.query);
    };
    window.addEventListener(COMMAND_PALETTE_EVENT, onOpen);
    return () => window.removeEventListener(COMMAND_PALETTE_EVENT, onOpen);
  }, [show]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const typing = isTypingTarget(event.target);

      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        if (typing) return;
        event.preventDefault();
        show();
        return;
      }

      if (event.key === "/" && !typing && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault();
        show();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [show]);

  // Native <dialog> gives us the top layer, a real focus trap and Escape.
  useEffect(() => {
    const node = dialogRef.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    else if (!open && node.open) node.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    inputRef.current?.focus();
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  // A route change means the palette did its job, or the reader used the back
  // button — either way it should not still be sitting there. Adjusting state
  // during render, rather than in an effect, keeps it to a single pass.
  const [lastPath, setLastPath] = useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    if (open) setOpen(false);
  }

  /* ----------------------------------------------------------- index */

  useEffect(() => {
    if (!open || engine) return;
    let cancelled = false;
    void import("@/lib/search").then((module) => {
      if (!cancelled) setEngine(module);
    });
    return () => {
      cancelled = true;
    };
  }, [open, engine]);

  useEffect(() => {
    const id = window.setTimeout(() => setDeferred(query), DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [query]);

  /* ------------------------------------------------------------ data */

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router],
  );

  const toggleTheme = useCallback(() => {
    const next: ThemeChoice = document.documentElement.classList.contains("dark")
      ? "light"
      : "dark";
    storageSet(THEME_STORAGE_KEY, next);
    applyTheme(next);
    setDark(next === "dark");
    setOpen(false);
  }, []);

  const actions = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [
      {
        id: "action-theme",
        label: "Toggle theme",
        description: dark ? "Switch to the light palette" : "Switch to the dark palette",
        icon: dark ? Sun : Moon,
        keywords: "dark light mode colour scheme appearance",
        run: toggleTheme,
      },
      {
        id: "action-quiz",
        label: "Start a quiz",
        description: "Graded questions from match-type basics to scenario problems",
        icon: Target,
        keywords: "test exam practice questions score",
        run: () => go("/quizzes"),
      },
      {
        id: "action-dashboard",
        label: "Open dashboard",
        description: "Quiz scores, finished SOPs and path progress",
        icon: LayoutDashboard,
        keywords: "progress stats history saved",
        run: () => go("/dashboard"),
      },
    ];

    const trimmed = query.trim();
    if (trimmed.length > 0) {
      list.unshift({
        id: "action-search",
        label: `Search everything for “${trimmed}”`,
        description: "Open the full search page with facets and sorting",
        icon: SearchIcon,
        keywords: trimmed,
        run: () => {
          rememberSearch(trimmed);
          go(`${SEARCH_ROUTE}?q=${encodeURIComponent(trimmed)}`);
        },
      });
    }

    return list;
  }, [dark, go, query, toggleTheme]);

  const pages = useMemo<PaletteItem[]>(
    () => [
      {
        id: "page-home",
        label: "Home",
        description: "The overview of everything in the library",
        icon: Home,
        run: () => go("/"),
      },
      ...ALL_NAV_LINKS.map((link) => ({
        id: `page-${link.href}`,
        label: link.label,
        description: link.description,
        icon: link.icon,
        meta: link.meta,
        keywords: link.href,
        run: () => go(link.href),
      })),
    ],
    [go],
  );

  const hits: SearchHit[] = useMemo(() => {
    if (!engine || deferred.trim().length < 2) return [];
    return engine.search(deferred, { limit: RESOURCE_LIMIT });
  }, [engine, deferred]);

  const { sections, flat } = useMemo(() => {
    const groups: { heading: string; items: PaletteItem[] }[] = [];
    const typing = query.trim().length > 0;

    if (!typing) {
      if (recent.length > 0) {
        groups.push({
          heading: "Recent searches",
          items: recent.slice(0, RECENT_LIMIT).map((entry) => ({
            id: `recent-${entry}`,
            label: entry,
            icon: History,
            meta: "Search",
            run: () => {
              setQuery(entry);
              setDeferred(entry);
              setActive(0);
              inputRef.current?.focus();
            },
          })),
        });
      } else {
        groups.push({
          heading: "Try searching for",
          items: popular.map((entry) => ({
            id: `popular-${entry}`,
            label: entry,
            icon: Sparkles,
            meta: "Search",
            run: () => {
              setQuery(entry);
              setDeferred(entry);
              setActive(0);
              inputRef.current?.focus();
            },
          })),
        });
      }
    }

    groups.push({ heading: "Actions", items: filterItems(actions, query) });
    groups.push({ heading: "Jump to", items: filterItems(pages, query) });

    if (engine && hits.length > 0) {
      const kinds = engine.KIND_META;
      groups.push({
        heading: "Resources",
        items: hits.map((hit) => {
          const meta = kinds[hit.resource.kind];
          return {
            id: `hit-${hit.resource.id}`,
            label: hit.resource.title,
            description: hit.resource.summary,
            icon: meta.icon,
            meta: hit.resource.minutes ? formatMinutes(hit.resource.minutes) : meta.label,
            ranges: hit.titleRanges,
            run: () => {
              rememberSearch(deferred);
              go(hit.resource.href);
            },
          };
        }),
      });
    }

    let cursor = 0;
    const indexed: PaletteSection[] = groups
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        heading: group.heading,
        items: group.items.map((item) => {
          const withIndex = { ...item, index: cursor };
          cursor += 1;
          return withIndex;
        }),
      }));

    return { sections: indexed, flat: indexed.flatMap((group) => group.items) };
  }, [actions, deferred, engine, go, hits, pages, popular, query, recent]);

  const count = flat.length;
  const activeItem = count > 0 ? flat[Math.min(active, count - 1)] : undefined;
  const loading = engine === null && deferred.trim().length >= 2;

  // Keep the cursor inside the list as it shrinks under the reader's typing.
  const [lastCount, setLastCount] = useState(count);
  if (lastCount !== count) {
    setLastCount(count);
    if (active > count - 1) setActive(count > 0 ? count - 1 : 0);
  }

  useEffect(() => {
    if (!activeItem) return;
    document
      .getElementById(`command-item-${activeItem.index}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeItem]);

  /* -------------------------------------------------------- keyboard */

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      if (count > 0) setActive((current) => (current + 1) % count);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      if (count > 0) setActive((current) => (current - 1 + count) % count);
    } else if (event.key === "Home") {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setActive(Math.max(0, count - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      activeItem?.run();
    }
  };

  /* ----------------------------------------------------------- render */

  return (
    <dialog
      ref={dialogRef}
      aria-label="Command palette"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClose={() => {
        if (open) close();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current) close();
      }}
      className={cn(
        "m-0 mt-auto max-h-[86dvh] w-full max-w-none rounded-t-2xl rounded-b-none border border-hairline bg-surface p-0 text-ink shadow-card",
        "backdrop:bg-scrim backdrop:backdrop-blur-[2px]",
        // As a bottom sheet the last result would otherwise sit under the
        // home indicator on a phone.
        "pb-[env(safe-area-inset-bottom)]",
        "sm:m-auto sm:mt-[9vh] sm:mb-auto sm:max-h-[70vh] sm:w-[calc(100vw-2rem)] sm:max-w-2xl sm:rounded-2xl sm:pb-0",
      )}
    >
      {open ? (
        <div className="flex max-h-[86dvh] flex-col sm:max-h-[70vh]">
          {/* -------------------------------------------------------- input */}
          <div className="flex items-center gap-3 border-b border-hairline px-4">
            <SearchIcon className="size-[1.125rem] shrink-0 text-faint" aria-hidden="true" />
            <label htmlFor="command-input" className="sr-only">
              Search resources, pages and actions
            </label>
            <input
              id="command-input"
              ref={inputRef}
              type="text"
              role="combobox"
              aria-expanded={count > 0}
              aria-controls="command-list"
              aria-autocomplete="list"
              aria-activedescendant={
                activeItem ? `command-item-${activeItem.index}` : undefined
              }
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder="Search resources, jump to a page, run an action…"
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-14 w-full min-w-0 bg-transparent text-base text-ink placeholder:text-faint focus:outline-none sm:h-13 sm:text-sm"
            />
            {loading ? (
              <Loader2
                className="size-4 shrink-0 animate-spin text-faint"
                aria-label="Loading the index"
              />
            ) : null}
            <kbd className="hidden shrink-0 rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono text-[0.625rem] text-faint sm:block">
              Esc
            </kbd>
          </div>

          {/* ------------------------------------------------------- results */}
          <div
            id="command-list"
            role="listbox"
            aria-label="Results"
            className="scroll-well min-h-0 flex-1 overflow-y-auto overscroll-contain p-2"
          >
            {count === 0 ? (
              <p className="px-3 py-10 text-center text-sm text-muted">
                {loading
                  ? "Loading the search index…"
                  : `No actions, pages or resources match “${query.trim()}”.`}
              </p>
            ) : (
              sections.map((section, group) => (
                <div
                  key={section.heading}
                  role="group"
                  aria-labelledby={`command-group-${group}`}
                  className="mb-1 last:mb-0"
                >
                  <div
                    id={`command-group-${group}`}
                    role="presentation"
                    className="px-3 pt-3 pb-1.5 font-mono text-[0.625rem] font-medium tracking-[0.14em] text-faint uppercase"
                  >
                    {section.heading}
                  </div>

                  {section.items.map((item) => {
                    const Icon = item.icon;
                    const on = activeItem?.index === item.index;
                    return (
                      <div
                        key={item.id}
                        id={`command-item-${item.index}`}
                        role="option"
                        aria-selected={on}
                        onClick={item.run}
                        onMouseMove={() => {
                          if (!on) setActive(item.index);
                        }}
                        className={cn(
                          "flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-3 py-2 transition-colors",
                          on ? "bg-brand-soft" : "hover:bg-surface-2",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            on ? TONE_ICON.brand : "text-faint",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.8125rem] font-medium text-ink">
                            {item.ranges && item.ranges.length > 0
                              ? highlight(item.label, item.ranges)
                              : item.label}
                          </span>
                          {item.description ? (
                            <span className="mt-0.5 block truncate text-xs text-muted">
                              {item.description}
                            </span>
                          ) : null}
                        </span>
                        {item.meta ? (
                          <span className="tabular hidden shrink-0 text-[0.6875rem] text-faint sm:block">
                            {item.meta}
                          </span>
                        ) : null}
                        <CornerDownLeft
                          className={cn(
                            "size-3.5 shrink-0 text-brand transition-opacity",
                            on ? "opacity-100" : "opacity-0",
                          )}
                          aria-hidden="true"
                        />
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>

          {/* -------------------------------------------------------- footer */}
          <div className="hidden items-center gap-4 border-t border-hairline px-4 py-2.5 text-[0.6875rem] text-faint sm:flex">
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono">
                ↑
              </kbd>
              <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono">
                ↓
              </kbd>
              move
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono">
                ⏎
              </kbd>
              open
            </span>
            <span className="flex items-center gap-1.5">
              <kbd className="rounded border border-hairline bg-surface-2 px-1.5 py-0.5 font-mono">
                /
              </kbd>
              reopen anywhere
            </span>
            <span className="ml-auto tabular">
              {count} {count === 1 ? "result" : "results"}
            </span>
          </div>
        </div>
      ) : null}
    </dialog>
  );
}
