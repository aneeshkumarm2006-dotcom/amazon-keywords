import type { Metadata } from "next";

/**
 * Site-level constants, the base-path helpers, and the one metadata builder
 * every route uses.
 *
 * Two build-time variables decide where this export believes it lives:
 *
 *   NEXT_PUBLIC_SITE_URL   the origin, e.g. https://projectamazonph.github.io
 *   NEXT_PUBLIC_BASE_PATH  the sub-path, e.g. /ppc-tools-for-va ("" = root)
 *
 * `SITE_URL` is the two of them joined, so it is the real root of the site
 * rather than just its host. Every canonical, `og:url`, sitemap entry and
 * JSON-LD `@id` is built from it and stays reachable under either deployment
 * shape. Both default to the reference deployment; set them before
 * `npm run build` for anywhere else.
 */

const FALLBACK_ORIGIN = "https://ppc-academy.netlify.app";

function readOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!raw) return FALLBACK_ORIGIN;
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/**
 * Mirrors `readBasePath()` in `next.config.ts` — the two must agree, or the
 * hand-written URLs below would point somewhere `next/link` does not.
 */
function readBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (!raw || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

/** Bare origin, no path: `https://projectamazonph.github.io`. */
export const SITE_ORIGIN = readOrigin();

/** Sub-path the site is mounted at: `/ppc-tools-for-va`, or `""` at the root. */
export const BASE_PATH = readBasePath();

/** The canonical root of this build: origin + base path, no trailing slash. */
export const SITE_URL = `${SITE_ORIGIN}${BASE_PATH}`;

/** Anything with a scheme, a protocol-relative host, or a bare fragment/query. */
const NOT_A_SITE_PATH = /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\?)/i;

/**
 * Prefix a root-relative path with this deployment's base path.
 *
 * `next/link`, `next/image` and `/_next/*` are rewritten by Next itself.
 * Everything hand-written is not: a raw `<a href="/downloads/x.xlsx">`, the
 * icon URLs in `metadata`, the manifest, the service-worker script. Those all
 * go through here.
 *
 * Idempotent, so passing an already-prefixed path back in is harmless.
 */
export function withBasePath(path = "/"): string {
  if (!BASE_PATH) return path;
  if (NOT_A_SITE_PATH.test(path)) return path;
  if (!path.startsWith("/")) return path;
  if (path === BASE_PATH || path.startsWith(`${BASE_PATH}/`)) return path;
  return `${BASE_PATH}${path}`;
}

/**
 * The inverse: turn a real URL pathname back into an app route.
 *
 * Needed wherever the browser hands us a live pathname that is then fed back
 * to `next/link` or matched against a `ResourceRef.href` — Cache Storage keys,
 * most obviously. Without it a sub-path deployment doubles the prefix.
 */
export function stripBasePath(pathname: string): string {
  if (!BASE_PATH) return pathname;
  if (pathname === BASE_PATH) return "/";
  if (pathname.startsWith(`${BASE_PATH}/`)) return pathname.slice(BASE_PATH.length);
  return pathname;
}

export const SITE_NAME = "PPC Academy";
export const SITE_TAGLINE = "Amazon PPC training for Filipino VAs";
export const SITE_LOCALE = "en_US";

export const SITE_DESCRIPTION =
  "A free, open-source Amazon PPC training platform for Filipino virtual assistants: graded quizzes, interview prep, account case studies, SOPs, workflows, templates and live metric calculators.";

export const AUTHOR = {
  name: "Ryan Roland Dabao",
  role: "Amazon PPC Lead Manager and VA coach",
  linkedin: "https://linkedin.com/in/ryan-roland-dabao-55416187",
  youtube: "https://youtube.com/@RyanRolandDabao",
  coaching: "https://projectamazonph-courses.netlify.app",
  location: "Iloilo City, Philippines",
} as const;

export const SOURCE_REPO = "https://github.com/projectamazonph/ppc-tools-for-va";

/**
 * The shared social card. 1200x630 is the size both Open Graph and X expect.
 *
 * This is a real file in `public/`, not the `/opengraph-image` metadata
 * route. With `trailingSlash: true` that route exports to `out/opengraph-image`
 * with no file extension, so a static host serves it as
 * `application/octet-stream` and every card validator rejects it. The art is
 * still authored in `src/app/opengraph-image.tsx`; see the README for the one
 * command that re-copies its output into `public/og.png`.
 */
export const OG_IMAGE = {
  url: "/og.png",
  width: 1200,
  height: 630,
  alt: "PPC Academy — Amazon PPC training for Filipino virtual assistants",
} as const;

/** Paths ending in a file extension are assets, not routes. */
const FILE_PATH = /\.[a-z0-9]{2,5}$/i;

/**
 * Absolute URL for an internal route or asset.
 *
 * `next.config.ts` sets `trailingSlash: true`, so the exported file for
 * `/sops/bid-optimization` is `/sops/bid-optimization/index.html` and the
 * canonical URL has to carry the slash or it redirects on most static hosts.
 * Assets are the exception — `/og.png/` is a 404 everywhere — so anything
 * that ends in a file extension keeps its bare path.
 *
 * SITE_URL already carries the base path, so the result is absolute and
 * complete under either deployment shape. Pass app routes here, never a path
 * that has already been through withBasePath().
 */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  const [routeAndQuery, hash] = path.split("#");
  const [route, query] = routeAndQuery.split("?");
  const clean = `/${route.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  const withSlash = clean === "/" || FILE_PATH.test(clean) ? clean : `${clean}/`;
  return `${SITE_URL}${withSlash}${query ? `?${query}` : ""}${hash ? `#${hash}` : ""}`;
}

/** Canonical *path* (leading and trailing slash), for JSON-LD `@id` values. */
export function canonicalPath(path = "/"): string {
  const clean = `/${path.replace(/^\/+/, "").replace(/\/+$/, "")}`;
  return clean === "/" ? "/" : `${clean}/`;
}

export type OgType = "website" | "article" | "profile";

export interface PageMetaInput {
  /** Page title without the site suffix — the layout template appends it. */
  title: string;
  /**
   * Skip the `%s · PPC Academy` template and use `title` verbatim. Only the
   * home page does this; it already carries the site name.
   */
  absoluteTitle?: boolean;
  description: string;
  /** Internal route this page lives at, e.g. "/sops/daily-health-check". */
  path: string;
  /** Extra keywords on top of the site-wide set. */
  keywords?: string[];
  type?: OgType;
  /** ISO date, emitted as `article:published_time` for article pages. */
  published?: string;
  /** ISO date, emitted as `article:modified_time`. */
  modified?: string;
  /** Section label for article pages, e.g. "SOPs". */
  section?: string;
  /** Leave the page out of the index — used by throwaway result routes. */
  noindex?: boolean;
  /**
   * Longer title for the social card when the nav title is terse. Falls back
   * to `title`, with the site name appended so a shared link is self-describing.
   */
  socialTitle?: string;
}

/**
 * Build a complete, self-consistent metadata object for one route.
 *
 * Every page gets: a distinct title and description, a canonical URL, the
 * matching Open Graph block with an absolute `url` and the shared card image,
 * and a `summary_large_image` Twitter card. Pages that opt out of indexing
 * still get the canonical so the crawler knows which URL they duplicate.
 */
export function pageMetadata({
  title,
  absoluteTitle,
  description,
  path,
  keywords,
  type = "website",
  published,
  modified,
  section,
  noindex,
  socialTitle,
}: PageMetaInput): Metadata {
  const url = absoluteUrl(path);
  const social = socialTitle ?? `${title} · ${SITE_NAME}`;

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    ...(keywords && keywords.length > 0 ? { keywords } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: type === "profile" ? "profile" : type,
      url,
      siteName: SITE_NAME,
      title: social,
      description,
      locale: SITE_LOCALE,
      images: [{ ...OG_IMAGE, url: absoluteUrl(OG_IMAGE.url) }],
      ...(type === "article"
        ? {
            publishedTime: published,
            modifiedTime: modified ?? published,
            authors: [AUTHOR.linkedin],
            section,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: social,
      description,
      images: [absoluteUrl(OG_IMAGE.url)],
    },
    ...(noindex ? { robots: { index: false, follow: true } } : {}),
  };
}
