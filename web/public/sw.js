/* eslint-disable */
/**
 * PPC Academy service worker.
 *
 * Strategy summary
 *   navigations  → network-first (with navigation preload), fall back to the
 *                  cached page, then to the pre-cached /offline/ page
 *   /_next/static → cache-first (content-hashed, immutable)
 *   icons, fonts, images, spreadsheets → cache-first
 *   RSC payloads (*.txt) → stale-while-revalidate
 *   anything else in scope → network-first with a cache fallback
 *
 * Every path above is relative to the deployment's base path, which the
 * worker derives from its own scope — see `readBasePath()`. Nothing here is
 * templated at build time, so the same file works at a domain root and under
 * a GitHub Pages project sub-path.
 *
 * Bump CACHE_VERSION on every meaningful change: the activate handler deletes
 * every cache whose name is not in the current allow-list, so old bundles are
 * never served next to new HTML.
 */

const CACHE_VERSION = "v3";
const SHELL_CACHE = `ppc-academy-shell-${CACHE_VERSION}`;
const PAGES_CACHE = `ppc-academy-pages-${CACHE_VERSION}`;
const ASSETS_CACHE = `ppc-academy-assets-${CACHE_VERSION}`;
const CACHE_ALLOWLIST = [SHELL_CACHE, PAGES_CACHE, ASSETS_CACHE];

/* ------------------------------------------------------------------ *
 * Where this worker is mounted
 * ------------------------------------------------------------------ *
 *
 * This file lives in `public/`, so it is copied to the export byte for byte
 * and cannot be templated with the build's `NEXT_PUBLIC_BASE_PATH`. It does
 * not need to be: a worker already knows where it is.
 *
 * `self.registration.scope` is the absolute URL it controls — it ends in a
 * slash and, for a sub-path deployment, carries the whole prefix. The script
 * location is the fallback, and gives the same answer because `sw.js` sits at
 * the root of whatever the app is served from.
 *
 *   served at the domain root   →  BASE_PATH === ""
 *   served at /ppc-tools-for-va →  BASE_PATH === "/ppc-tools-for-va"
 */

function readBasePath() {
  try {
    if (self.registration && self.registration.scope) {
      return new URL(self.registration.scope).pathname.replace(/\/+$/, "");
    }
  } catch {
    /* fall through to the script location */
  }
  // "/sw.js" → "", "/ppc-tools-for-va/sw.js" → "/ppc-tools-for-va"
  return self.location.pathname.replace(/\/[^/]*$/, "");
}

const BASE_PATH = readBasePath();

/** Turn an app route into a real path under this deployment. */
function scoped(path) {
  return `${BASE_PATH}${path}`;
}

/**
 * Same-origin is not the same as ours: GitHub Pages puts every project of an
 * account on one host, so `/some-other-repo/app.js` would otherwise be filed
 * in this app's caches. At the domain root every same-origin path is in scope
 * and this is always true.
 */
function inScope(url) {
  if (!BASE_PATH) return true;
  return url.pathname === BASE_PATH || url.pathname.startsWith(`${BASE_PATH}/`);
}

const OFFLINE_URL = scoped("/offline/");

/** How long a navigation waits for the network before the cache takes over. */
const NAVIGATION_TIMEOUT_MS = 4500;

/**
 * The app shell: routes worth having before the connection drops. Each entry
 * is fetched with its RSC payload sibling so client-side navigation to it
 * still works offline. Written as app routes and scoped on the way out.
 */
const PRECACHE_ROUTES = [
  "/",
  "/offline/",
  "/quizzes/",
  "/interviews/",
  "/sops/",
  "/sops/daily-health-check/",
  "/cheat-sheets/",
  "/glossary/",
  "/calculators/",
  "/paths/",
  "/dashboard/",
  "/search/",
].map(scoped);

/**
 * Fixed-name static files, which are the only ones this list can name: the
 * JavaScript, CSS and fonts the shell needs are content-hashed by the build,
 * so they are discovered from the precached HTML at install time instead --
 * see `staticRefsIn()`.
 */
const PRECACHE_ASSETS = [
  "/manifest.webmanifest",
  "/icons/icon.svg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/maskable-512.png",
  "/icons/apple-touch-icon.png",
  "/favicon.ico",
].map(scoped);

/* ------------------------------------------------------------------ *
 * Helpers
 * ------------------------------------------------------------------ */

/**
 * Page cache keys ignore the query string: `/search/?q=acos` and `/search/`
 * are the same document under a static export.
 */
function pageCacheKey(url) {
  return new Request(`${url.origin}${url.pathname}`, { credentials: "same-origin" });
}

/**
 * Resolve a route sent by the page into a URL inside this worker's scope.
 *
 * Callers speak in app routes ("/quizzes/"); only the worker knows the
 * prefix. Returns `null` for anything that is not ours to cache.
 */
function toScopedUrl(route) {
  let url;
  try {
    url = new URL(route, self.location.origin);
  } catch {
    return null;
  }
  if (url.origin !== self.location.origin) return null;
  if (inScope(url)) return url;
  return new URL(`${scoped(url.pathname)}${url.search}`, self.location.origin);
}

/** The RSC payload that Next.js requests for client-side navigation. */
function rscSiblingFor(route) {
  return route.endsWith("/") ? `${route}index.txt` : `${route}/index.txt`;
}

function isCacheableResponse(response) {
  return Boolean(
    response &&
      response.status === 200 &&
      (response.type === "basic" || response.type === "default"),
  );
}

function isImmutableAsset(url) {
  return url.pathname.startsWith(scoped("/_next/static/"));
}

function isStaticAsset(url) {
  return (
    url.pathname.startsWith(scoped("/icons/")) ||
    url.pathname.startsWith(scoped("/downloads/")) ||
    url.pathname === scoped("/manifest.webmanifest") ||
    url.pathname === scoped("/favicon.ico") ||
    /\.(?:png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|xlsx|csv|pdf)$/i.test(url.pathname)
  );
}

function isRscPayload(url) {
  return url.pathname.endsWith(".txt");
}

/** Put a response in a cache without ever rejecting the surrounding promise. */
async function safePut(cacheName, request, response) {
  if (!isCacheableResponse(response)) return;
  try {
    const cache = await caches.open(cacheName);
    await cache.put(request, response);
  } catch {
    /* quota or an opaque response — nothing we can do, keep serving */
  }
}

/** Resolve to `null` rather than throwing when the network is unavailable. */
async function fetchOrNull(request, timeoutMs) {
  try {
    if (!timeoutMs) return await fetch(request);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      // The request is re-created so the abort signal can be attached.
      return await fetch(request, { signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  } catch {
    return null;
  }
}

/**
 * The `/_next/static/` URLs a precached document references.
 *
 * Precaching HTML alone is not enough to render it offline: without its own
 * chunks and stylesheet the page opens unstyled and unhydrated, and those are
 * never fetched through this worker on a first visit because it is still
 * installing while they load. They cannot be listed by hand either — the build
 * content-hashes every filename and this file is never templated — so they are
 * read back out of the markup that was just fetched, which keeps the worker
 * base-path agnostic.
 */
function staticRefsIn(html, documentPath) {
  const base = new URL(documentPath, self.location.origin);
  const refs = new Set();
  // `<script src>`, `<link rel=stylesheet href>` and the `<link rel=preload
  // as=font href>` tags next/font emits.
  const tagPattern = /<(?:script|link)\b[^>]*?\b(?:src|href)="([^"]+)"/gi;
  for (const match of html.matchAll(tagPattern)) {
    let url;
    try {
      url = new URL(match[1], base);
    } catch {
      continue;
    }
    if (url.origin !== self.location.origin) continue;
    if (!isImmutableAsset(url)) continue;
    refs.add(url.href);
  }
  return refs;
}

/* ------------------------------------------------------------------ *
 * Install — precache the shell
 * ------------------------------------------------------------------ */

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);

      // `cache.addAll` is all-or-nothing; one 404 would throw away the whole
      // precache. Each entry is added on its own so a missing route never
      // blocks the install.
      const entries = [
        ...PRECACHE_ROUTES,
        ...PRECACHE_ROUTES.map(rscSiblingFor),
        ...PRECACHE_ASSETS,
      ];

      // Every hashed bundle those documents pull in, deduplicated across them
      // — one page's chunks are mostly the next page's chunks.
      const subresources = new Set();

      await Promise.all(
        entries.map(async (url) => {
          try {
            const request = new Request(url, { cache: "reload", credentials: "same-origin" });
            const response = await fetch(request);
            if (!isCacheableResponse(response)) return;
            if (PRECACHE_ROUTES.includes(url)) {
              // Clone first: caching the response consumes its body.
              const html = await response.clone().text();
              for (const ref of staticRefsIn(html, url)) subresources.add(ref);
            }
            await cache.put(new Request(url, { credentials: "same-origin" }), response);
          } catch {
            /* offline during install, or the route does not exist yet */
          }
        }),
      );

      // Filed in the cache the runtime cache-first branch reads, so nothing
      // downstream has to know these arrived early.
      const assets = await caches.open(ASSETS_CACHE);
      await Promise.all(
        [...subresources].map(async (href) => {
          try {
            const request = new Request(href, { credentials: "same-origin" });
            if (await assets.match(request)) return;
            const response = await fetch(request);
            if (isCacheableResponse(response)) {
              await assets.put(request, response);
            }
          } catch {
            /* a chunk that no longer exists, or the connection dropped */
          }
        }),
      );

      // A fresh worker should be ready to take over the moment the user
      // accepts the "new version" prompt; the page controls when that is.
      await self.skipWaiting();
    })(),
  );
});

/* ------------------------------------------------------------------ *
 * Activate — drop old versions, claim open pages
 * ------------------------------------------------------------------ */

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("ppc-academy-") && !CACHE_ALLOWLIST.includes(name))
          .map((name) => caches.delete(name)),
      );

      if (self.registration.navigationPreload) {
        try {
          await self.registration.navigationPreload.enable();
        } catch {
          /* not supported — plain fetch is used instead */
        }
      }

      await self.clients.claim();
    })(),
  );
});

/* ------------------------------------------------------------------ *
 * Fetch strategies
 * ------------------------------------------------------------------ */

async function handleNavigation(event) {
  const url = new URL(event.request.url);
  const key = pageCacheKey(url);

  // 1. Navigation preload, when the browser already started the request.
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded) {
      if (isCacheableResponse(preloaded)) {
        event.waitUntil(safePut(PAGES_CACHE, key, preloaded.clone()));
      }
      return preloaded;
    }
  } catch {
    /* preload failed — fall through to the network */
  }

  // 2. Network, with a short leash so a dead connection does not hang the tab.
  const fresh = await fetchOrNull(event.request, NAVIGATION_TIMEOUT_MS);
  if (fresh && isCacheableResponse(fresh)) {
    event.waitUntil(safePut(PAGES_CACHE, key, fresh.clone()));
    return fresh;
  }
  if (fresh) return fresh; // a real 404/500 from the server is still the truth

  // 3. This exact page, from either cache.
  const cached =
    (await caches.match(key, { cacheName: PAGES_CACHE })) ||
    (await caches.match(key, { cacheName: SHELL_CACHE })) ||
    (await caches.match(event.request, { ignoreSearch: true }));
  if (cached) return cached;

  // 4. The offline page, which lists what *is* available.
  const offline = await caches.match(OFFLINE_URL, { ignoreSearch: true });
  if (offline) return offline;

  return new Response(
    "<!doctype html><meta charset=utf-8><title>Offline</title><p>You are offline and this page has not been saved yet.</p>",
    { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request, { cacheName });
  if (cached) return cached;

  const fresh = await fetchOrNull(request);
  if (!fresh) {
    const anyCached = await caches.match(request);
    if (anyCached) return anyCached;
    return Response.error();
  }
  if (isCacheableResponse(fresh)) await safePut(cacheName, request, fresh.clone());
  return fresh;
}

async function staleWhileRevalidate(event, cacheName) {
  const { request } = event;

  // RSC payloads arrive with a cache-busting `?_rsc=<hash>` that varies with
  // the router state the navigation started from, so the raw request matches
  // nothing and every hash would store its own copy. Lookup and write both use
  // the bare path instead — the normalisation `handleNavigation` already does
  // for documents.
  const key = pageCacheKey(new URL(request.url));

  // The install handler files the precached payloads in the shell cache, so
  // look there as well as in the runtime one.
  const cached =
    (await caches.match(key, { cacheName })) ||
    (await caches.match(key, { cacheName: SHELL_CACHE }));

  const network = fetchOrNull(request).then(async (response) => {
    if (response && isCacheableResponse(response)) {
      await safePut(cacheName, key, response.clone());
    }
    return response;
  });

  if (cached) {
    event.waitUntil(network);
    return cached;
  }

  const fresh = await network;
  return fresh || Response.error();
}

async function networkFirst(event, cacheName) {
  const fresh = await fetchOrNull(event.request);
  if (fresh) {
    if (isCacheableResponse(fresh)) {
      event.waitUntil(safePut(cacheName, event.request, fresh.clone()));
    }
    return fresh;
  }
  const cached = await caches.match(event.request, { cacheName });
  return cached || Response.error();
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;
  if (request.headers.has("range")) return;

  let url;
  try {
    url = new URL(request.url);
  } catch {
    return;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return;
  if (url.origin !== self.location.origin) return; // never touch third parties
  if (!inScope(url)) return; // a neighbouring project on the same Pages host

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  if (isImmutableAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, ASSETS_CACHE));
    return;
  }

  if (isRscPayload(url)) {
    event.respondWith(staleWhileRevalidate(event, PAGES_CACHE));
    return;
  }

  event.respondWith(networkFirst(event, PAGES_CACHE));
});

/* ------------------------------------------------------------------ *
 * Messages from the page
 * ------------------------------------------------------------------ */

self.addEventListener("message", (event) => {
  const data = event.data;
  const type = typeof data === "string" ? data : data && data.type;

  if (type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  if (type === "GET_VERSION") {
    const port = event.ports && event.ports[0];
    if (port) port.postMessage({ type: "VERSION", version: CACHE_VERSION });
    return;
  }

  if (type === "CACHE_ROUTES" && Array.isArray(data.routes)) {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(PAGES_CACHE);
        await Promise.all(
          data.routes.map(async (route) => {
            const url = toScopedUrl(route);
            if (!url) return;
            try {
              const response = await fetch(new Request(url.href, { credentials: "same-origin" }));
              if (isCacheableResponse(response)) {
                await cache.put(pageCacheKey(url), response);
              }
            } catch {
              /* offline — nothing to warm */
            }
          }),
        );
      })(),
    );
  }
});
