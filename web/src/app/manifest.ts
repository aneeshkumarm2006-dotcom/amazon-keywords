import type { MetadataRoute } from "next";

import { SITE_NAME, withBasePath } from "@/lib/site";

/**
 * The web app manifest, generated rather than served from `public/`.
 *
 * A static `public/manifest.webmanifest` cannot be templated, and every URL
 * in it — `id`, `start_url`, `scope`, every icon `src`, every shortcut `url` —
 * is root-relative. Served from a GitHub Pages project sub-path those all
 * resolve one directory too high: the icons 404, the scope excludes the app
 * that declares it, and the install prompt never fires. Building the file at
 * export time lets `withBasePath()` settle each one.
 *
 * `output: "export"` turns this into a plain file in `out/`, but only because
 * of the `dynamic` export at the bottom — a route handler without it fails
 * the build.
 */

/** Carried over verbatim from the static file this route replaced. */
const MANIFEST_DESCRIPTION =
  "Amazon PPC training for Filipino virtual assistants: graded quizzes, interview " +
  "prep, account case studies, SOPs, workflows, templates and live metric " +
  "calculators. Works offline once installed.";

/** 192px PNG, reused as every shortcut's icon. */
const SHORTCUT_ICON = [
  { src: withBasePath("/icons/icon-192.png"), sizes: "192x192", type: "image/png" },
];

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: withBasePath("/"),
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: MANIFEST_DESCRIPTION,
    start_url: withBasePath("/"),
    scope: withBasePath("/"),
    display: "standalone",
    display_override: ["standalone", "minimal-ui", "browser"],
    orientation: "any",
    background_color: "#fbfaf8",
    theme_color: "#fbfaf8",
    lang: "en-US",
    dir: "ltr",
    categories: ["education", "business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: withBasePath("/icons/icon.svg"),
        type: "image/svg+xml",
        sizes: "any",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-192.png"),
        type: "image/png",
        sizes: "192x192",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-256.png"),
        type: "image/png",
        sizes: "256x256",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-384.png"),
        type: "image/png",
        sizes: "384x384",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/icon-512.png"),
        type: "image/png",
        sizes: "512x512",
        purpose: "any",
      },
      {
        src: withBasePath("/icons/maskable-192.png"),
        type: "image/png",
        sizes: "192x192",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/maskable-512.png"),
        type: "image/png",
        sizes: "512x512",
        purpose: "maskable",
      },
      {
        src: withBasePath("/icons/monochrome.svg"),
        type: "image/svg+xml",
        sizes: "any",
        purpose: "monochrome",
      },
    ],
    shortcuts: [
      {
        name: "Take a quiz",
        short_name: "Quizzes",
        description: "126 graded questions across five difficulty levels.",
        url: withBasePath("/quizzes/"),
        icons: SHORTCUT_ICON,
      },
      {
        name: "Open the calculators",
        short_name: "Calculators",
        description: "ACoS, ROAS, break-even, bid and budget maths.",
        url: withBasePath("/calculators/"),
        icons: SHORTCUT_ICON,
      },
      {
        name: "Daily health check SOP",
        short_name: "Daily SOP",
        description: "The 15-minute morning routine for every account.",
        url: withBasePath("/sops/daily-health-check/"),
        icons: SHORTCUT_ICON,
      },
      {
        name: "My dashboard",
        short_name: "Dashboard",
        description: "Quiz scores, streak, weak areas and path progress.",
        url: withBasePath("/dashboard/"),
        icons: SHORTCUT_ICON,
      },
    ],
  };
}

/**
 * Required under `output: "export"`: without it Next treats the route as
 * dynamic and refuses to prerender it.
 */
export const dynamic = "force-static";
