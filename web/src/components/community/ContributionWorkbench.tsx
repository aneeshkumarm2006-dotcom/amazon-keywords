"use client";

import { BookOpenCheck, CircleCheck, CircleDot, GitPullRequest } from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useSyncExternalStore,
  type KeyboardEvent,
} from "react";

import { ButtonLink } from "@/components/ui/Button";
import { TONE_BORDER, TONE_ICON, TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import { cn } from "@/lib/utils";

import { ContributionForm } from "./ContributionForm";
import { CONTRIBUTION_VARIANTS, findVariant, type VariantId } from "./form-spec";
import { CONTRIBUTING_URL, FORK_URL, ISSUES_URL } from "./github";

/**
 * The four ways to contribute, as a tab set.
 *
 * The cards are the tab list — there is no point describing four routes and
 * then making the reader hunt for the control that opens one. Selecting a
 * card swaps the guided form below it and writes the variant into the URL
 * hash, so `/contribute#quiz-question` links straight to the right form and
 * a back button behaves.
 */

const VARIANT_IDS = CONTRIBUTION_VARIANTS.map((variant) => variant.id);

/**
 * The selected tab is not component state — it is the URL fragment, read
 * through `useSyncExternalStore`. That keeps `/contribute#quiz-question`,
 * an in-page link and a tab click all going through one path, and avoids
 * copying the location into state inside an effect.
 */
function subscribeToHash(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function readHash(): string {
  return typeof window === "undefined" ? "" : window.location.hash;
}

function variantFromHash(hash: string): VariantId | null {
  const raw = hash.replace(/^#/, "");
  return (VARIANT_IDS as string[]).includes(raw) ? (raw as VariantId) : null;
}

/** Same path, ignoring the trailing slash `trailingSlash: true` puts on hrefs. */
function samePath(a: string, b: string): boolean {
  const trim = (path: string) => (path.endsWith("/") ? path.slice(0, -1) : path);
  return trim(a) === trim(b);
}

function revealWorkbench(node: HTMLElement | null): void {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  node?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
}

export function ContributionWorkbench({ defaultVariant }: { defaultVariant?: VariantId }) {
  const baseId = useId();
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const rootRef = useRef<HTMLDivElement | null>(null);

  const hash = useSyncExternalStore(
    subscribeToHash,
    readHash,
    () => "",
  );
  const active =
    variantFromHash(hash) ?? defaultVariant ?? CONTRIBUTION_VARIANTS[0].id;

  /**
   * `#quiz-question` is a variant name, not an element id, so the browser has
   * nothing to scroll to when someone arrives on one of those links — the
   * right tab opens but the viewport never moves, which on a phone looks like
   * a dead link. Scroll the workbench into view once, on arrival only.
   */
  const arrivedWithHash = useRef(true);
  useEffect(() => {
    if (!arrivedWithHash.current) return;
    arrivedWithHash.current = false;
    if (!variantFromHash(window.location.hash)) return;

    revealWorkbench(rootRef.current);
  }, []);

  /**
   * `replaceState` keeps arrow-keying through the tabs out of the history
   * stack, but it does not fire `hashchange` — so the event is dispatched by
   * hand to wake the store above.
   */
  const select = useCallback((id: VariantId, focus = false) => {
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
      window.dispatchEvent(new Event("hashchange"));
    }
    if (focus) tabRefs.current[id]?.focus();
  }, []);

  /**
   * The rest of the page links into the workbench by hash — the CTA at the
   * foot of `/contribute`, the feedback ledger's "turn a note into an issue".
   * Those render through `next/link`, which navigates a same-page hash with
   * `pushState`, and pushState fires neither `hashchange` nor `popstate`:
   * the URL would change while the tabs sat still. Catch the click in the
   * capture phase — ahead of `next/link`, which bails once the default is
   * prevented — and run it through the same path as a tab click.
   */
  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const target = event.target;
      const anchor = target instanceof Element ? target.closest("a[href]") : null;
      if (!(anchor instanceof HTMLAnchorElement) || anchor.target === "_blank") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (!samePath(url.pathname, window.location.pathname)) return;
      if (url.search !== window.location.search) return;

      const id = variantFromHash(url.hash);
      if (!id) return;

      event.preventDefault();
      select(id);
      revealWorkbench(rootRef.current);
    };

    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, [select]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const index = VARIANT_IDS.indexOf(active);
    const move = (delta: number) => {
      event.preventDefault();
      select(VARIANT_IDS[(index + delta + VARIANT_IDS.length) % VARIANT_IDS.length], true);
    };

    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        move(1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        move(-1);
        break;
      case "Home":
        event.preventDefault();
        select(VARIANT_IDS[0], true);
        break;
      case "End":
        event.preventDefault();
        select(VARIANT_IDS[VARIANT_IDS.length - 1], true);
        break;
      default:
        break;
    }
  };

  const variant = findVariant(active) ?? CONTRIBUTION_VARIANTS[0];
  const BarIcon = variant.icon;

  return (
    <div className="min-w-0 scroll-mt-24" id="contribute-forms" ref={rootRef}>
      {/* ------------------------------------------------------- tab list */}
      <ul
        role="tablist"
        aria-label="Ways to contribute"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {CONTRIBUTION_VARIANTS.map((entry) => {
          const selected = entry.id === active;
          const Icon = entry.icon;

          return (
            <li key={entry.id} role="presentation" className="flex">
              <button
                ref={(node) => {
                  tabRefs.current[entry.id] = node;
                }}
                type="button"
                role="tab"
                id={`${baseId}-tab-${entry.id}`}
                aria-selected={selected}
                aria-controls={`${baseId}-panel`}
                tabIndex={selected ? 0 : -1}
                onClick={() => select(entry.id)}
                onKeyDown={onKeyDown}
                className={cn(
                  "group relative flex w-full flex-col gap-2.5 overflow-hidden rounded-xl border p-5 pt-6 text-left",
                  "transition-[border-color,box-shadow,background-color] duration-150",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                  selected
                    ? cn("bg-surface shadow-card", TONE_BORDER[entry.tone])
                    : "border-hairline bg-surface hover:border-hairline-strong hover:shadow-card",
                )}
              >
                <span
                  className={cn(
                    "absolute inset-x-0 top-0 h-[3px] transition-opacity",
                    selected ? "opacity-100" : "opacity-0",
                    entry.tone === "good"
                      ? "bg-good"
                      : entry.tone === "ember"
                        ? "bg-ember"
                        : entry.tone === "warn"
                          ? "bg-warn"
                          : "bg-brand",
                  )}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "flex size-9 items-center justify-center rounded-lg",
                    selected ? TONE_SOFT_BG[entry.tone] : "bg-surface-2",
                  )}
                  aria-hidden="true"
                >
                  <Icon
                    className={cn("size-[1.125rem]", selected ? TONE_ICON[entry.tone] : "text-faint")}
                  />
                </span>
                <span
                  className={cn(
                    "font-display text-[1.0625rem] leading-snug font-semibold",
                    selected ? "text-ink" : "text-ink group-hover:text-brand",
                  )}
                >
                  {entry.label}
                </span>
                <span className="text-[0.8125rem] leading-relaxed text-muted">
                  {entry.tagline}
                </span>
                <span
                  className={cn(
                    "mt-1 text-[0.6875rem] font-medium tracking-[0.08em] uppercase",
                    selected ? TONE_TEXT[entry.tone] : "text-faint",
                  )}
                >
                  {selected
                    ? "Form open below"
                    : `${entry.steps.length} steps`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* ---------------------------------------------------------- panel */}
      <div
        role="tabpanel"
        id={`${baseId}-panel`}
        aria-labelledby={`${baseId}-tab-${active}`}
        className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_19rem]"
      >
        {/* `key` gives each variant its own instance, so switching tabs never
            carries one form's answers into another's fields. */}
        <ContributionForm key={variant.id} variant={variant} />

        <aside className="min-w-0 space-y-4">
          <section
            aria-labelledby={`${baseId}-bar-heading`}
            className="rounded-xl border border-hairline bg-surface p-5"
          >
            <h3
              id={`${baseId}-bar-heading`}
              className="flex items-center gap-2 font-display text-[0.9375rem] font-semibold text-ink"
            >
              <BarIcon className={cn("size-4 shrink-0", TONE_ICON[variant.tone])} aria-hidden="true" />
              What gets merged
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              The bar from the repo&rsquo;s contributing guide for this submission type.
            </p>
            <ul className="mt-3.5 space-y-2.5">
              {variant.bar.map((line) => (
                <li key={line} className="flex gap-2.5 text-[0.8125rem] leading-relaxed text-ink">
                  <CircleCheck
                    className={cn("mt-0.5 size-4 shrink-0", TONE_ICON[variant.tone])}
                    aria-hidden="true"
                  />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/contribute/guidelines"
              className="mt-4 inline-flex min-h-9 items-center gap-1.5 text-[0.8125rem] font-medium text-brand transition-colors hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <BookOpenCheck className="size-3.5 shrink-0" aria-hidden="true" />
              Read the full guidelines
            </Link>
          </section>

          <section
            aria-labelledby={`${baseId}-repo-heading`}
            className="rounded-xl border border-hairline bg-surface p-5"
          >
            <h3
              id={`${baseId}-repo-heading`}
              className="font-display text-[0.9375rem] font-semibold text-ink"
            >
              Prefer to send a pull request?
            </h3>
            <p className="mt-2 text-[0.8125rem] leading-relaxed text-muted">
              Fork the repo, branch, edit the markdown directly and open a PR. The guide asks you
              to test every Excel formula before submitting.
            </p>
            <div className="mt-4 flex flex-col gap-2">
              <ButtonLink href={FORK_URL} variant="secondary" size="sm" icon={GitPullRequest} external>
                Fork the repository
              </ButtonLink>
              <ButtonLink href={ISSUES_URL} variant="ghost" size="sm" icon={CircleDot} external>
                Browse open issues
              </ButtonLink>
              <ButtonLink href={CONTRIBUTING_URL} variant="ghost" size="sm" icon={BookOpenCheck} external>
                CONTRIBUTING.md
              </ButtonLink>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
