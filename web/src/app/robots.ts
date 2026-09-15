import type { MetadataRoute } from "next";

import { SITE_ORIGIN, absoluteUrl, withBasePath } from "@/lib/site";

/**
 * robots.txt, written to `out/robots.txt` at build time.
 *
 * Only two families of routes are held back, and both for the same reason:
 * they render from `localStorage`, so a crawler is guaranteed to index an
 * empty state that says "no attempts yet". Everything else is fair game.
 *
 * Rule paths carry the base path, because a robots rule matches a URL path on
 * the host, not an app route. One caveat that no amount of code fixes: a
 * crawler only reads `/robots.txt` at the origin root, so on a GitHub Pages
 * *project* site this file is written to `<base>/robots.txt` and is advisory
 * at best. Use a custom domain or a user page if the rules have to bite.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: withBasePath("/"),
        disallow: [
          withBasePath("/quizzes/*/results/"),
          withBasePath("/quizzes/review/"),
          withBasePath("/offline/"),
        ],
      },
    ],
    // `absoluteUrl` carries the base path, so this points at the sitemap this
    // build actually writes. `Host` is a hostname directive, though, so it
    // stays the bare origin even when the site sits under a sub-path.
    sitemap: absoluteUrl("/sitemap.xml"),
    host: SITE_ORIGIN,
  };
}

export const dynamic = "force-static";
