# PPC Academy

An interactive Amazon PPC training platform for Filipino virtual assistants moving into
PPC specialist work. It is the [`ppc-tools-for-va`](https://github.com/projectamazonph/ppc-tools-for-va)
toolkit — SOPs, quizzes, interview prep, case studies, templates — rebuilt as a product you
can actually work through: graded quizzes with spaced repetition, a mock interview
simulator, calculators that run the maths live, and a progress page that keeps
everything in your own browser.

There is no account, no server and no database. The whole site is a static export.

---

## Contents

- [What is in it](#what-is-in-it)
- [Stack](#stack)
- [Running it](#running-it)
- [Route map](#route-map)
- [Content architecture](#content-architecture)
- [Adding content](#adding-content)
- [Generated data files](#generated-data-files)
- [Design tokens](#design-tokens)
- [Accessibility and responsiveness](#accessibility-and-responsiveness)
- [SEO](#seo)
- [Deployment](#deployment)
- [Credit](#credit)

---

## What is in it

| Area | What it does |
|---|---|
| **Quizzes** | 126 graded questions across five levels plus a 40-question mock exam. Practice, exam and flashcard modes, a keyboard-driven runner, an explanation and a source link on every answer, and a Leitner review queue that resurfaces anything you got wrong after 1, 3, 7 and 21 days. |
| **Interview prep** | 117 questions across nine competencies, each with a model answer, the key points an interviewer listens for, the red flags that lose the job and the likely follow-ups. Plus a timed mock interview simulator with self-scoring and a flashcard drill. |
| **Case studies** | 12 accounts with real before/after metrics, a period-by-period spend and revenue timeline, the exact steps taken, the lessons, and a side-by-side comparison tool. |
| **SOPs and workflows** | 8 standard operating procedures and 6 process maps, each with objective, inputs, steps, decision rules, outputs and escalation criteria. |
| **Templates and scripts** | 7 spreadsheet and comms templates, and 14 runnable automation assets in Python, Google Apps Script, SQL and sheet formulas — full code, line-by-line explanation, prerequisites and expected output. |
| **Calculators** | 7 tools — ACoS/ROAS, break-even ACoS, bid maths, profit margin, budget planner, keyword ROI, TACoS. Every one recalculates live, shows the formula with your numbers substituted in, and saves your inputs. |
| **Reference** | 8 cheat sheets, a 102-term glossary with formulas and worked examples, and an automation guide covering 12 tools. |
| **Learning paths** | 4 sequenced routes through the library, from "VA to PPC Specialist in 30 days" to "Advanced Optimization". |
| **Progress** | XP, streak, topic mastery, weak areas, path progress, bookmarks and an activity feed — computed from localStorage, exportable as JSON. |
| **PPC Console** | A personal Amazon PPC console at `/dashboard`: import Search Term Reports and bulk files (CSV or XLSX), keep several stores side by side, and review harvest, negative and bid recommendations. Stored in IndexedDB in your browser, never uploaded. |
| **Search** | Fuzzy full-text search over all 305 registered resources with facets by type, level and tag, plus a Cmd/Ctrl-K command palette. |

Everything works offline once visited: the site installs as a PWA with a service worker.

---

## Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router) with `output: "export"` | Static HTML for every route. No server, no runtime cost. |
| UI | **React 19** | Server components by default; client islands only where there is state. |
| Styling | **Tailwind CSS v4** | Theme lives in `src/app/globals.css` under `@theme` — there is no `tailwind.config.js`. |
| Search | **fuse.js** | Fuzzy matching in the browser, index built on demand. |
| Charts | **recharts** | Timeline, mastery and score-trend charts, all with a table fallback. |
| Markdown | **react-markdown** + `remark-gfm`, `rehype-slug`, `rehype-autolink-headings` | Rendered in **server** components, so the markdown pipeline never reaches the browser. |
| Icons | **lucide-react** | No emoji used as iconography. |
| State | **localStorage** via `src/lib/storage.ts`, plus **zustand** where a store is genuinely shared | SSR-safe, namespaced under `ppc-academy:`, falls back to memory when storage is blocked. |
| Utilities | **clsx** + **tailwind-merge** (`cn`), **gray-matter** | |

No other runtime dependencies, and no build step beyond `next build`.

### Constraints worth knowing before you change anything

- **Static export.** No API routes, no server actions, no middleware, no `revalidate`,
  no `next/headers`. Every dynamic route needs `generateStaticParams`.
- **No new npm dependencies.** The list above is the whole toolbox.
- Anything with hooks, event handlers, `localStorage`, recharts or fuse.js needs
  `"use client"`. Keep pages as server components that import client islands.

---

## Running it

```bash
npm install     # once
npm run dev     # http://localhost:3000
npm run build   # static export to ./out
```

`npm run build` also type-checks. Before opening a PR, all three of these must be clean:

```bash
npm run build
npx eslint src
npx tsc --noEmit
```

The build is the real test suite here: several content modules validate themselves at
module load and **throw during the build** rather than shipping broken data.

| Guard | Lives in | Fails the build when |
|---|---|---|
| Learning-path step hrefs | `src/content/paths.ts` | A path step points at a route that is neither a registered resource nor a known page. |
| Case-study timelines | `src/content/case-studies.ts` | ACoS is derived from spend and revenue, so a chart can never disagree with a metric tile. |
| `assertReferenceIndex()` | `src/lib/related.ts`, called from `src/app/quizzes/page.tsx` | A quiz question cites a route with no label, or a label has drifted from the registry. |
| `assertResourceIndex()` | `src/lib/related.ts`, called from `src/app/quizzes/page.tsx` | `src/content/resource-index.ts` has drifted from the registry. |

Two build-time variables move the export somewhere else. `NEXT_PUBLIC_SITE_URL` sets the
origin used by canonicals, `og:url`, the sitemap and robots; `NEXT_PUBLIC_BASE_PATH` sets
the sub-path when the site is not served at a domain root. Leave the second one unset for
a root deployment.

```bash
# a domain root — Netlify, Vercel, a custom domain
NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run build

# a GitHub Pages project sub-path
NEXT_PUBLIC_BASE_PATH=/ppc-tools-for-va \
NEXT_PUBLIC_SITE_URL=https://projectamazonph.github.io \
npm run build
```

See [Deployment](#deployment) for what each one reaches.

---

## Route map

236 routes, all prerendered. Detail routes are generated from the content modules.

### Train

| Route | What it is |
|---|---|
| `/paths` | The four learning paths. |
| `/paths/[id]` | One path: modules, steps, outcomes, printable certificate. 4 routes. |
| `/quizzes` | Quiz hub: level sets, mastery, review queue, custom quiz builder. |
| `/quizzes/[id]` | The runner for one of the 6 graded sets, or `/quizzes/custom`. 7 routes. |
| `/quizzes/[id]/results` | Scored breakdown of the most recent attempt. 7 routes. |
| `/quizzes/review` | The spaced-repetition queue. |
| `/quizzes/review/results` | Results of the last review session. |
| `/interviews` | The question bank browser, expandable inline. |
| `/interviews/[id]` | One question: model answer, key points, red flags, follow-ups. 117 routes. |
| `/interviews/mock` | Timed mock interview with self-scoring. |
| `/interviews/flashcards` | Rapid recall drill. |
| `/case-studies` | Gallery, filterable by result type and tag. |
| `/case-studies/[id]` | One account: metrics, charts, approach, results, lessons, playbook. 12 routes. |
| `/case-studies/compare` | Two or three accounts side by side. |

### Operate

| Route | What it is |
|---|---|
| `/sops`, `/sops/[id]` | 8 standard operating procedures. |
| `/workflows`, `/workflows/[id]` | 6 process maps with rendered decision diagrams. |
| `/templates`, `/templates/[id]` | 7 templates. |
| `/automation`, `/automation/[id]` | 8 automation guides. |

### Reference

| Route | What it is |
|---|---|
| `/cheat-sheets`, `/cheat-sheets/[id]` | 8 one-page references. |
| `/glossary` | 102 terms, browsable and filterable. Each term is an anchor, not a page. |
| `/calculators`, `/calculators/{acos-roas,bid,break-even-acos,budget-planner,keyword-roi,profit-margin,tacos}` | 7 live calculators. |
| `/scripts`, `/scripts/[id]` | 14 automation scripts. |

### Career and meta

| Route | What it is |
|---|---|
| `/career`, `/career/[id]` | 4 career resources. |
| `/progress` | Personal learning progress, all from localStorage. |
| `/dashboard`, `/dashboard/{import,search-terms,keywords,bids,stores}` | Personal PPC console (noindex). Data lives in IndexedDB (`ppc-console`). |
| `/search` | Faceted full-text search. |
| `/contribute`, `/contribute/guidelines`, `/contribute/roadmap` | Guided submission forms, the content bar, and the public roadmap. |
| `/offline` | Service-worker fallback shell and offline library. |
| `/sitemap.xml`, `/robots.txt`, `/manifest.webmanifest` | Generated at build time. |
| `/404` | Not-found page with quick links and the resource grid. |

---

## Content architecture

All content is TypeScript, not MDX. A domain module owns its data and exports two things:
the typed array, and a `resourceRefs()` helper that projects it into the shared
`ResourceRef` shape.

```
src/types/content.ts        the contracts: ResourceKind, ResourceRef, QuizQuestion,
                            InterviewQuestion, CaseStudy, DocResource, GlossaryTerm, …

src/content/
  sops.ts  workflows.ts  templates.ts  automation.ts  career.ts  cheat-sheets.ts
                            DocResource[] — markdown body, rendered by <Markdown />
  glossary.ts               GlossaryTerm[] — anchors on /glossary, not pages
  quizzes.ts                Quiz[] + the flat question bank
  interviews.ts             InterviewEntry[]
  case-studies.ts           CaseStudyDoc[] — metrics, timeline, playbook links
  calculators.ts            CalculatorSpec[] — fields, formulas, outputs
  scripts.ts (+ -python, -apps, -sql)
  paths.ts                  LearningPathDoc[] — a reading order over the registry
  registry.ts               aggregates every resourceRefs() into `allResources`
  resource-index.ts         generated: the same resources without their bodies
  reference-labels.ts       generated: titles for the routes quiz answers cite
```

`registry.ts` is the single source of truth. Search, the sitemap, the "Related" rails,
the counts on the home page and the learning-path steps all read from it, which is why a
renamed SOP renames everywhere at once and why there is no second list to keep in step.

### The two indexes, and why they exist

Importing `registry.ts` pulls in every content module behind it — the full markdown of
every SOP, every case study, the whole question bank. That is exactly right for the search
page and exactly wrong for a client component that only wants to turn an id into a title.

- **`src/content/resource-index.ts`** — every resource's id, kind, title, summary, href,
  minutes, level and tags, and nothing else. `src/lib/progress.ts`, `progress-scope.ts`
  and `paths.ts` read this, which keeps roughly 700KB of content out of the bundle of
  every page that carries a progress control.
- **`src/content/reference-labels.ts`** — the titles behind the 54 routes quiz
  explanations link to, so the quiz runner can say "SOP-03: Bid Optimization" instead of
  "Read the reference" without importing the library.

Both are generated, and both are checked against the registry on every build. See
[Generated data files](#generated-data-files).

### Cross-links

`src/lib/related.ts` derives every cross-link; none of them are hand-maintained.

- **Forward** — `relatedResources(href)` scores the whole registry against one page on
  shared tags (weighted heaviest, because tags are the only signal an author writes
  deliberately), same kind and same level, then caps the result at two per kind so the
  list stays mixed rather than returning six more SOPs.
- **Backward** — `usedIn(href)` inverts the links other content already declares: a case
  study's `playbook` entries, a learning path's `steps`, and a quiz question's
  `reference`. That is what fills the "Used in" column at the bottom of a resource page.

Both are rendered by `src/components/related/RelatedRail.tsx`, a server component, so none
of the scoring reaches the browser.

---

## Adding content

### A new SOP, workflow, template, automation guide, career guide or cheat sheet

1. Append a `DocResource` to the right array in `src/content/<domain>.ts`. Give it a
   kebab-case `id`, a 1–2 sentence plain-text `summary`, real `tags`, honest `minutes`,
   and a markdown `body`.
2. That is the whole job. The domain's `resourceRefs()` picks it up, `registry.ts`
   aggregates it, and the route, the index page, search, the sitemap and the cross-link
   rails all follow.
3. Regenerate `resource-index.ts` (see below) — the build will tell you if you forget.

### A new quiz question

Append a `QuizQuestion` to the right level array in `src/content/quizzes.ts`. Four
plausible choices, one correct `answerIndex`, an `explanation` that says *why*, and a
`reference` pointing at a route that exists. If the reference is a route no question has
cited before, add it to `reference-labels.ts` too — the build will name it if you forget.

### A new case study

Append a `CaseStudyDoc` to `src/content/case-studies.ts`. Build timeline rows with
`point(period, spend, revenue)` so ACoS is derived rather than typed, and list the SOPs,
workflows and templates the account actually used in `playbook` — those entries are what
make the study show up in the "Used in" column on each of those pages.

### A new interview question

Append an `InterviewEntry` to `src/content/interviews.ts`: category, level, question,
markdown `idealAnswer`, `keyPoints`, and `redFlags`/`followUps` where they apply.

### House style

The markdown in `../ppc-tools-for-va/` is the ground truth. Port it faithfully and do not
invent numbers that contradict it. New content keeps the same voice: written for Filipino
VAs, in English, practical, no hype, and with real ACoS/ROAS/CPC figures that are
internally consistent and arithmetically correct.

---

## Generated data files

Two files under `src/content/` are generated from the registry rather than hand-written.
Both carry a build-time assertion, so they cannot silently drift — but when you add or
rename content you do have to regenerate them.

**`src/content/resource-index.ts`** — temporarily append this to `src/app/robots.ts`,
run `npm run build`, then revert the file:

```ts
import { writeFileSync } from "node:fs";
import { allResources as _all } from "@/content/registry";
writeFileSync(
  "resource-index.json",
  JSON.stringify(
    _all.map((r) => ({
      id: r.id, kind: r.kind, title: r.title, summary: r.summary,
      href: r.href, minutes: r.minutes, level: r.level, tags: r.tags,
    })),
    null,
    2,
  ),
);
```

Then rewrite `resource-index.ts` from that JSON, keeping the existing header, interface and
lookup helpers. `assertResourceIndex()` verifies id, href, title, kind, minutes and level
for all 305 entries on the next build and names every mismatch.

**`src/content/reference-labels.ts`** — the same idea for the 54 routes quiz questions
cite. `assertReferenceIndex()` fails the build if a citation has no label, a label points
at a route nothing cites any more, or a title has drifted.

**`public/og.png`** — the social card is drawn by `src/app/opengraph-image.tsx`. With
`trailingSlash: true` that metadata route exports to `out/opengraph-image` with **no file
extension**, which static hosts serve as `application/octet-stream` and every card
validator rejects. So the card ships as a real file instead. After changing the artwork:

```bash
npm run build && cp out/opengraph-image public/og.png && npm run build
```

---

## Design tokens

Tokens are defined in `src/app/globals.css` and exposed to Tailwind through `@theme
inline`. **Use the token classes, never a raw hex.** Every token has a light and a dark
value; dark mode is class-based (`.dark` on `<html>`), toggled by `ThemeToggle`, persisted
in localStorage and applied by an inline script in `layout.tsx` before first paint so the
page never flashes the wrong palette.

### Surfaces and type

| Class | Token | Light | Dark |
|---|---|---|---|
| `bg-canvas` | `--canvas` | `#fbfaf8` | `#0c0f14` |
| `bg-surface` | `--surface` | `#ffffff` | `#12161d` |
| `bg-surface-2` | `--surface-2` | `#f3f1ec` | `#1a1f28` |
| `text-ink` | `--ink` | `#10141c` | `#eceff4` |
| `text-muted` | `--muted` | `#545c6b` | `#9aa5b5` |
| `text-faint` | `--faint` | `#666e7d` | `#7b8799` |
| `border-hairline` | `--hairline` | `#e4e0d8` | `#242b36` |
| `border-hairline-strong` | `--hairline-strong` | `#d3cec3` | `#333c4a` |

### Accents and metric semantics

| Role | Text | Fill | Tint | On-colour |
|---|---|---|---|---|
| Brand (deep emerald-teal) | `text-brand` | `bg-brand` | `bg-brand-soft` | `text-on-brand` |
| Ember (warm accent, sparingly) | `text-ember-ink` for small text, `text-ember` for icons | `bg-ember` | `bg-ember-soft` | `text-on-ember` |
| Good / Warn / Bad / Info | `text-good` … | `bg-good` … | `bg-good-soft` … | `text-on-good` … |

The seven tones are mapped once in `src/components/ui/tone.ts` (`TONE_TEXT`, `TONE_ICON`,
`TONE_SOFT_BG`, `TONE_BORDER`, `TONE_SOLID_BG`). Components pick a map rather than
inventing colours, so a token change propagates everywhere.

Every foreground/background pair above clears WCAG AA (4.5:1) in both themes. `--ember` is
the exception and is deliberately icon-and-fill only; `--ember-ink` is the AA-safe variant
for text.

### Type, radii, elevation

- `font-display` (Space Grotesk) for headings, default sans (Inter) for body, `font-mono`
  (JetBrains Mono) for metrics, formulas, code and numerals in stat blocks.
- `rounded-lg` for inputs and buttons, `rounded-xl` for cards, `rounded-2xl` for panels.
- Almost no shadow. Separation comes from `border-hairline` on `bg-surface`; `shadow-card`
  appears only on elevated and hovered cards.

### Primitives

`src/components/ui/` — `Accordion`, `Badge`, `Button`, `Callout`, `Card`, `Checkbox`,
`CopyButton`, `Dialog`, `EmptyState`, `Field`, `Input`, `Progress`, `SegmentedControl`,
`Select`, `Skeleton`, `StatTile`, `Table`, `Tabs`, `Textarea`, `Tooltip`.
`src/components/layout/` — `Header`, `Footer`, `Container`, `PageHeader`, `Section`,
`Breadcrumbs`, `ThemeToggle`, `MobileNav`, `Wordmark`.

---

## Accessibility and responsiveness

- Semantic landmarks on every page, exactly one `h1`, and no skipped heading levels.
- A visible `focus-visible` ring on every interactive element, defined once in the base
  layer so nothing can opt out by accident.
- Icon-only buttons carry an `aria-label`; decorative icons are `aria-hidden`.
- Every custom control is keyboard-operable: the tab sets support arrow keys, Home and
  End; the accordion and disclosure widgets are real buttons; the dialog is a native
  `<dialog>` so focus trapping and Escape come from the platform; the command palette runs
  on Cmd/Ctrl-K and `/`; the quiz runner answers on 1–4 and navigates on arrow keys.
- Every chart is mirrored by a spoken summary and a real data table, so no information
  exists only as an SVG.
- Wide tables sit in a focusable, labelled scroll region, so a keyboard user can reach the
  off-screen columns.
- The layout works at 360px with no horizontal page scroll anywhere. Tables, diagrams and
  code blocks get their own `overflow-x-auto` wells.
- `prefers-reduced-motion` is respected; touch targets are at least 44px.

---

## SEO

- `src/lib/site.ts` owns the origin, the shared card and `pageMetadata()` — the one
  builder every route uses. Each page gets a distinct title and description, a canonical
  URL, a matching Open Graph block and a `summary_large_image` Twitter card.
- `metadataBase` is set in `layout.tsx` from `NEXT_PUBLIC_SITE_URL`.
- `src/app/sitemap.ts` and `src/app/robots.ts` are generated from the registry, so a new
  resource is in the sitemap the moment its domain registers it. Routes that only render
  from localStorage (quiz results, the review queue, `/offline`) are excluded from both.
- `src/lib/structured-data.ts` builds the JSON-LD: `Organization`, `Person` and `WebSite`
  once in the root layout; `FAQPage` on `/interviews`; `Course` on each learning path;
  `Quiz` on each graded set; `SoftwareApplication` on each calculator; and `Article` plus
  `BreadcrumbList` on every long-form page. Nothing is emitted for a page it does not
  genuinely describe.

---

## Deployment

`npm run build` writes a complete static site to `out/`. Any static host will serve it.
Two build-time variables decide where the export believes it lives; both are read in
`src/lib/site.ts` and both are **inlined into the client bundles**, so neither can be
changed after the fact — moving the site means rebuilding it.

| Variable | Default | What it sets |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://ppc-academy.netlify.app` | The origin. Canonicals, `og:url`, `sitemap.xml`, `robots.txt`, JSON-LD `@id`s. |
| `NEXT_PUBLIC_BASE_PATH` | *(unset — served at the domain root)* | The sub-path. `basePath` and `assetPrefix` in `next.config.ts`, plus every hand-written URL through `withBasePath()`. |

`SITE_URL` is the two of them joined, so a canonical is always a real, reachable URL
whichever way the site is deployed.

Two things matter on every host:

- `next.config.ts` sets `trailingSlash: true`, so `/sops/daily-health-check/` is a real
  directory with an `index.html`. Hosts that redirect away from trailing slashes will
  cause an extra hop.
- `public/.nojekyll` is committed and copied into `out/`. Without it GitHub Pages runs a
  Jekyll pass that strips the `_next/` directory, and the site loads with no CSS or
  JavaScript at all.

`npm run build` also runs `postbuild` (`scripts/flatten-export-segments.mjs`). On Windows,
Next 16 writes each page's segment-prefetch files into nested folders
(`dashboard/bids/__next.dashboard/bids/__PAGE__.txt`). The client asks for the flat name
(`__next.dashboard.bids.__PAGE__.txt`), so every `<Link>` prefetch below the root returns
404 on a Windows-built `out/`. The script renames those files to the flat names. Linux
builds (CI, Vercel) are already flat, so there it does nothing. Running `next build`
directly skips this step.

### GitHub Pages — a project sub-path

This is the live deployment. `projectamazonph.github.io` is a user host serving this
repository as a **project** site, so the app lives under `/ppc-tools-for-va/` and that
prefix has to be baked in at build time:

```bash
NEXT_PUBLIC_BASE_PATH=/ppc-tools-for-va \
NEXT_PUBLIC_SITE_URL=https://projectamazonph.github.io \
npm run build
```

The export lands in `web/out/` and serves at
<https://projectamazonph.github.io/ppc-tools-for-va/>.

`.github/workflows/pages.yml` at the repository root does exactly that on every push
touching `web/**`, and on `workflow_dispatch`: checkout, `setup-node@v4` (Node 20, npm
cache keyed to `web/package-lock.json`), `npm ci` and `npm run build` in `./web` with the
two variables above, then `upload-pages-artifact` with `path: web/out` and `deploy-pages`.
The hand-written `site/` folder is still in the repository — it is just no longer what
gets published.

To check a sub-path build locally, every absolute URL in the export should carry the
prefix:

```bash
grep -rhoE '(src|href)="/[^"]*"' --include='*.html' out | grep -v '="/ppc-tools-for-va'
# prints nothing when the build is correct
```

Serving it needs the prefix too — `npx serve out` on its own 404s every asset:

```bash
mkdir -p /tmp/pages/ppc-tools-for-va && cp -r out/. /tmp/pages/ppc-tools-for-va/
npx serve /tmp/pages
```

One caveat no build flag fixes: a crawler only reads `/robots.txt` at the origin root, and
a project site can only write it to `/ppc-tools-for-va/robots.txt`. The rules inside it are
base-path aware and correct, but on a project page nothing ever reads them — including the
`Sitemap:` line, which is the only automatic discovery path the sitemap has. Crawl control
itself is not lost: every route the rules hold back also carries a `noindex` robots meta
tag, which is read from the page and does bite.

**Required after the first deploy** (neither is optional, and neither is something the
build can do):

1. In the repository settings, set **Pages → Build and deployment → Source** to
   *GitHub Actions*. Without it the workflow uploads an artifact that is never published.
2. Submit `https://projectamazonph.github.io/ppc-tools-for-va/sitemap.xml` by hand in
   Google Search Console and Bing Webmaster Tools, against a URL-prefix property for
   `https://projectamazonph.github.io/ppc-tools-for-va/`. If the
   `projectamazonph.github.io` user-site repository exists, adding the same `Sitemap:`
   line to *its* root `robots.txt` covers it permanently.

A custom domain removes the caveat entirely — the emitted `robots.txt` then sits at the
origin root and becomes authoritative.

### Netlify, Vercel or a custom domain — the domain root

Leave `NEXT_PUBLIC_BASE_PATH` **unset**. Empty means "root"; `next.config.ts` then omits
`basePath` and `assetPrefix` entirely rather than setting them to an empty string. Only
the origin changes:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example npm run build
```

Netlify:

```toml
# netlify.toml
[build]
  base = "web"
  command = "npm run build"
  publish = "out"

[build.environment]
  NEXT_PUBLIC_SITE_URL = "https://your-site.netlify.app"
```

No Next.js runtime plugin is needed — this is a plain static publish. Netlify serves
`out/` directly and handles the trailing-slash directories as-is.

Vercel: import the repository, set the root directory to `web`, and add
`NEXT_PUBLIC_SITE_URL` as an environment variable. Vercel detects Next.js and honours
`output: "export"`, deploying the contents of `out/` as static files. Nothing runs
server-side.

Anything else: `out/` is a plain directory of HTML, CSS, JS and assets — Cloudflare Pages,
S3 + CloudFront, Nginx or `npx serve out` all work. Make sure the host serves
`/sops/x/index.html` for `/sops/x/`, and `.webmanifest` as `application/manifest+json` if
you want the install prompt to fire.

### What the base path actually touches

Next rewrites `next/link` hrefs, `next/image` sources and `/_next/*` on its own. Nothing
else is automatic, so everything below routes through one helper — `withBasePath()` in
`src/lib/site.ts`. Add a new hand-written absolute URL and it belongs in this list.

| Reference | Handled in |
|---|---|
| `<link rel="icon">`, `apple-touch-icon`, `mask-icon`, the `.ico` | `src/app/layout.tsx` — declared explicitly, because Next does not apply `basePath` to an `app/favicon.ico` file convention |
| `<link rel="manifest">` | `src/app/layout.tsx` |
| Manifest `id`, `start_url`, `scope`, icon `src`, shortcut `url` | `src/app/manifest.ts` — a generated route, since a static `public/manifest.webmanifest` cannot be templated |
| Workbook download links (`/downloads/*.xlsx`, raw `<a>`) | `src/app/calculators/page.tsx`, `src/components/calc/CalculatorFrame.tsx` |
| Internal links inside markdown bodies (raw `<a>`) | `src/components/doc/Markdown.tsx` |
| Service-worker script URL and registration scope | `src/components/pwa/ServiceWorkerManager.tsx` |
| Cache Storage keys read back into app routes | `src/components/pwa/OfflineLibrary.tsx`, via `stripBasePath()` |
| Canonicals, `og:url`, sitemap entries, `robots.txt`, JSON-LD | `absoluteUrl()`, which builds on `SITE_URL` (origin + base path) |

### Service worker

`public/sw.js` caches the app shell and visited pages. It is registered by
`ServiceWorkerManager` and versioned by cache name, so a deploy invalidates the old cache
and the update toast offers a reload.

The file is copied to the export byte for byte and cannot be templated, so it works out
its own prefix at runtime from `self.registration.scope` (falling back to its own script
location). Every precached route, the offline fallback, and the `/_next/static`, icon and
download matching are all scoped to that prefix, and requests outside it are left alone —
on a GitHub Pages account host, a neighbouring project shares the origin.

### One loose end outside this folder

The repository root `README.md` still links
<https://projectamazonph.github.io/ppc-tools-for-va/> as the "PPC Tools Resource Hub" and
its stack table still names MkDocs and the hand-written `site/` folder. The URL is now
correct by accident rather than by description: it serves this Next.js app. Worth
rewriting the next time that file is touched.

---

## Credit

Built on the [PPC Tools for Virtual Assistants](https://github.com/projectamazonph/ppc-tools-for-va)
toolkit by **[Ryan Roland Dabao](https://linkedin.com/in/ryan-roland-dabao-55416187)** —
Amazon PPC Lead Manager in Iloilo City, Philippines, with 10+ years in remote eCommerce,
6+ years dedicated to Amazon Advertising, and $500K+/month in managed ad spend.

Every SOP, workflow, template, quiz question and case study in the source toolkit is his
work; the expansions written for this site follow his voice, his numbers and his teaching
order. The site exists to make that material something a VA can work through rather than
read.

- YouTube: [@RyanRolandDabao](https://youtube.com/@RyanRolandDabao)
- Coaching: [Project Amazon PH](https://projectamazonph-courses.netlify.app)

MIT licensed, like the toolkit it comes from.
