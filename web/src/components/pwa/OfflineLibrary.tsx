"use client";

import {
  CloudDownload,
  Database,
  FileText,
  RefreshCw,
  Signal,
  WifiOff,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { Button, ButtonLink } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Skeleton } from "@/components/ui/Skeleton";
import { StatTile } from "@/components/ui/StatTile";
import { findByHref, KIND_META, KIND_ORDER } from "@/content/registry";
import type { ResourceKind } from "@/types/content";
import { BASE_PATH, stripBasePath } from "@/lib/site";
import { cn } from "@/lib/utils";

/**
 * The offline page's working half.
 *
 * It reads the Cache Storage API straight from the window — no message
 * round-trip to the service worker — and turns the saved URLs back into named
 * resources, so "what do I still have?" has an honest answer instead of a
 * spinner.
 */

interface CachedPage {
  path: string;
  title: string;
  kind: ResourceKind | "index";
}

interface CacheReport {
  pages: CachedPage[];
  assetCount: number;
  payloadCount: number;
  supported: boolean;
  version: string | null;
}

const EMPTY_REPORT: CacheReport = {
  pages: [],
  assetCount: 0,
  payloadCount: 0,
  supported: true,
  version: null,
};

/** Section routes that are not registry resources but are worth listing. */
const INDEX_TITLES: Record<string, string> = {
  "/": "Home",
  "/offline": "This page",
  "/quizzes": "Quizzes — all levels",
  "/interviews": "Interview question bank",
  "/interviews/mock": "Mock interview",
  "/interviews/flashcards": "Interview flashcards",
  "/case-studies": "Case study library",
  "/case-studies/compare": "Case study comparison",
  "/sops": "SOP index",
  "/workflows": "Workflow index",
  "/templates": "Template index",
  "/automation": "Automation index",
  "/cheat-sheets": "Cheat sheet index",
  "/glossary": "Glossary",
  "/calculators": "Calculator index",
  "/scripts": "Script library",
  "/career": "Career guide",
  "/paths": "Learning paths",
  "/progress": "Your progress",
  "/dashboard": "PPC console",
  "/search": "Search",
  "/contribute": "Contribute",
  "/contribute/guidelines": "Contribution guidelines",
  "/contribute/roadmap": "Public roadmap",
};

function normalisePath(pathname: string): string {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

/**
 * Cache keys are real URLs, so under a sub-path deployment every one of them
 * starts with the base path — and a GitHub Pages account host may be serving
 * other projects from the same origin. Only our own entries are counted.
 */
function inScope(pathname: string): boolean {
  if (!BASE_PATH) return true;
  return pathname === BASE_PATH || pathname.startsWith(`${BASE_PATH}/`);
}

/** Takes an app route, i.e. a pathname already through `stripBasePath`. */
function looksLikeAsset(pathname: string): boolean {
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/downloads/") ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|xlsx|csv|pdf|webmanifest|js|css)$/i.test(
      pathname,
    )
  );
}

function titleFor(path: string): { title: string; kind: ResourceKind | "index" } {
  const resource = findByHref(path);
  if (resource) return { title: resource.title, kind: resource.kind };
  const known = INDEX_TITLES[path];
  if (known) return { title: known, kind: "index" };
  // Fall back to a readable version of the last path segment.
  const segment = path.split("/").filter(Boolean).pop() ?? "Home";
  return {
    title: segment.replace(/-/g, " ").replace(/^\w/, (c) => c.toUpperCase()),
    kind: "index",
  };
}

async function readCaches(): Promise<CacheReport> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return { ...EMPTY_REPORT, supported: false };
  }

  try {
    const names = (await caches.keys()).filter((name) => name.startsWith("ppc-academy-"));
    if (names.length === 0) return EMPTY_REPORT;

    const seen = new Map<string, CachedPage>();
    let assetCount = 0;
    let payloadCount = 0;

    for (const name of names) {
      const cache = await caches.open(name);
      for (const request of await cache.keys()) {
        let url: URL;
        try {
          url = new URL(request.url);
        } catch {
          continue;
        }
        if (url.origin !== window.location.origin) continue;
        if (!inScope(url.pathname)) continue;

        // Back to an app route, so it matches a `ResourceRef.href` and can be
        // handed to `next/link` without the base path ending up in it twice.
        const route = stripBasePath(url.pathname);
        const path = normalisePath(route);
        if (path.endsWith(".txt")) {
          payloadCount += 1;
          continue;
        }
        if (looksLikeAsset(route)) {
          assetCount += 1;
          continue;
        }
        if (seen.has(path)) continue;
        seen.set(path, { path, ...titleFor(path) });
      }
    }

    const version = names[0]?.split("-").pop() ?? null;
    const pages = Array.from(seen.values()).sort((a, b) => a.title.localeCompare(b.title));
    return { pages, assetCount, payloadCount, supported: true, version };
  } catch {
    return { ...EMPTY_REPORT, supported: false };
  }
}

function useOnlineStatus(): { online: boolean; known: boolean } {
  const [state, setState] = useState<{ online: boolean; known: boolean }>({
    online: true,
    known: false,
  });

  useEffect(() => {
    const update = () => setState({ online: navigator.onLine, known: true });
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  return state;
}

export function OfflineLibrary() {
  const { online, known } = useOnlineStatus();
  const [report, setReport] = useState<CacheReport | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(async () => {
    setRefreshing(true);
    const next = await readCaches();
    setReport(next);
    setRefreshing(false);
  }, []);

  // First read happens off the render pass: Cache Storage is an external
  // system, so the state lands when it answers rather than synchronously.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const next = await readCaches();
      if (!cancelled) setReport(next);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const grouped = new Map<ResourceKind | "index", CachedPage[]>();
  for (const page of report?.pages ?? []) {
    const bucket = grouped.get(page.kind);
    if (bucket) bucket.push(page);
    else grouped.set(page.kind, [page]);
  }

  const orderedKinds: (ResourceKind | "index")[] = [
    "index",
    ...KIND_ORDER.filter((kind) => grouped.has(kind)),
  ];

  return (
    <div className="space-y-6">
      {/* ------------------------------------------------ connection status */}
      <div
        className={cn(
          "flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center",
          known && !online ? "border-warn/40 bg-warn-soft" : "border-hairline bg-surface",
        )}
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-lg",
              known && !online ? "bg-warn/15 text-warn" : "bg-good-soft text-good",
            )}
            aria-hidden="true"
          >
            {known && !online ? <WifiOff className="size-5" /> : <Signal className="size-5" />}
          </span>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink" role="status" aria-live="polite">
              {!known ? "Checking your connection…" : online ? "You are online" : "You are offline"}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {known && !online
                ? "The page you asked for has not been saved to this device yet. Everything listed below still opens."
                : "This page is the fallback shown when a request fails with no connection. What is listed below is what your device has already saved."}
            </p>
          </div>
        </div>
        <Button
          size="md"
          variant="secondary"
          icon={RefreshCw}
          onClick={() => void refresh()}
          disabled={refreshing}
          className="w-full shrink-0 sm:w-auto"
        >
          {refreshing ? "Checking…" : "Re-check"}
        </Button>
      </div>

      {/* ---------------------------------------------------------- numbers */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile
          label="Pages saved"
          value={report ? String(report.pages.length) : "—"}
          hint="Full HTML documents that open with no connection"
          icon={FileText}
          tone="brand"
        />
        <StatTile
          label="Files saved"
          value={report ? String(report.assetCount) : "—"}
          hint="Scripts, styles, icons and spreadsheets"
          icon={Database}
          tone="info"
        />
        <StatTile
          label="Navigation payloads"
          value={report ? String(report.payloadCount) : "—"}
          hint="Lets in-app links work without a round trip"
          icon={CloudDownload}
          tone="neutral"
        />
      </div>

      {/* ----------------------------------------------------- cached pages */}
      {report === null ? (
        <div className="space-y-3" aria-hidden="true">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      ) : !report.supported ? (
        <EmptyState
          icon={Database}
          title="This browser will not tell us what is saved"
          description="Cache Storage is unavailable — usually private browsing, or storage blocked for this site. The site still works normally while you have a connection; it just cannot be read offline."
          action={<ButtonLink href="/">Back to the home page</ButtonLink>}
        />
      ) : report.pages.length === 0 ? (
        <EmptyState
          icon={CloudDownload}
          title="Nothing is saved on this device yet"
          description="The service worker saves each page as you open it, and pre-saves the quizzes, SOP index, cheat sheets, glossary, calculators and your progress page on your first visit. Reconnect, open a few pages, and they will be listed here."
          action={
            <>
              <ButtonLink href="/">Back to the home page</ButtonLink>
              <Button variant="secondary" onClick={() => void refresh()}>
                Re-check
              </Button>
            </>
          }
        />
      ) : (
        <div className="space-y-4">
          {orderedKinds.map((kind) => {
            const pages = grouped.get(kind);
            if (!pages || pages.length === 0) return null;
            const meta = kind === "index" ? null : KIND_META[kind];
            const Icon = meta?.icon ?? FileText;
            return (
              <section
                key={kind}
                aria-labelledby={`cached-${kind}`}
                className="overflow-hidden rounded-xl border border-hairline bg-surface"
              >
                <div className="flex items-center gap-2.5 border-b border-hairline bg-surface-2/60 px-4 py-2.5">
                  <Icon className="size-4 shrink-0 text-brand" aria-hidden="true" />
                  <h2
                    id={`cached-${kind}`}
                    className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-ink"
                  >
                    {meta ? meta.plural : "Sections and hubs"}
                  </h2>
                  <span className="tabular shrink-0 text-xs text-faint">{pages.length}</span>
                </div>
                <ul className="divide-y divide-hairline">
                  {pages.map((page) => (
                    <li key={page.path}>
                      <Link
                        href={page.path}
                        className="flex min-h-12 items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm text-ink">
                          {page.title}
                        </span>
                        <span className="tabular hidden shrink-0 text-xs text-faint sm:block">
                          {page.path}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
