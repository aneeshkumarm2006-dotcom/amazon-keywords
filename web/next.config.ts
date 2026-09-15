import type { NextConfig } from "next";

/**
 * The sub-path this build is served from.
 *
 * Empty (the default) means "served at the domain root" — Netlify, Vercel, a
 * custom domain, a GitHub *user* page. A GitHub Pages **project** site lives
 * under `/<repo>`, so that build sets:
 *
 *     NEXT_PUBLIC_BASE_PATH=/ppc-tools-for-va npm run build
 *
 * The `NEXT_PUBLIC_` prefix is load-bearing: Next inlines the value into the
 * client bundles, so `withBasePath()` in `src/lib/site.ts` resolves to the
 * same prefix in the browser as it does during prerendering.
 */
function readBasePath(): string {
  const raw = process.env.NEXT_PUBLIC_BASE_PATH?.trim();
  if (!raw || raw === "/") return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

const basePath = readBasePath();

const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  typedRoutes: false,
  /**
   * Spread rather than assigned, so a root-served build carries neither key.
   * Next defaults `assetPrefix` to `basePath` when it is left empty, and the
   * two are set together here so `/_next/*` and every page URL agree.
   */
  ...(basePath ? { basePath, assetPrefix: basePath } : {}),
};

export default nextConfig;
