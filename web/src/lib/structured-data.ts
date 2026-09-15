import { AUTHOR, OG_IMAGE, SITE_DESCRIPTION, SITE_NAME, SITE_URL, absoluteUrl } from "./site";

/**
 * JSON-LD builders.
 *
 * Structured data is only worth emitting where it describes something the
 * page genuinely is. Three schemas earn their place here:
 *
 *   - `Organization` + `WebSite`, once, in the root layout. They establish
 *     the publisher and the site search action for every other node to hang
 *     off via `@id`.
 *   - `FAQPage` on `/interviews`, where the page really is a list of
 *     questions with published answers.
 *   - `Course` on `/paths` and each `/paths/[id]`, where the page really is
 *     a sequenced syllabus with a stated outcome and a duration.
 *
 * Everything else gets `BreadcrumbList` (cheap, accurate) and — on long-form
 * documents — `Article`. No `Review`, no `AggregateRating`, no `Product`:
 * the site sells nothing and nobody has rated it.
 *
 * Every node is plain data. `JsonLd` in `src/components/seo/JsonLd.tsx`
 * serialises it; nothing here touches the DOM.
 */

/** Loose shape for a JSON-LD node. Values are whatever JSON allows. */
export type JsonLdNode = Record<string, unknown>;

const ORGANIZATION_ID = `${SITE_URL}/#organization`;
const WEBSITE_ID = `${SITE_URL}/#website`;
const AUTHOR_ID = `${SITE_URL}/#author`;

/** Strip markdown emphasis, links and code fences down to plain prose. */
export function toPlainProse(markdown: string, max = 5000): string {
  const text = markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s{0,3}[-*+]\s+/gm, "")
    .replace(/^\s{0,3}\|.*\|\s*$/gm, " ")
    .replace(/[*_`~]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text;
}

/* ------------------------------------------------------------------ *
 * Site-level nodes — emitted once, from the root layout
 * ------------------------------------------------------------------ */

/** The publisher. Referenced by `@id` from every other node. */
export function organizationNode(): JsonLdNode {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    logo: {
      "@type": "ImageObject",
      url: absoluteUrl("/icons/icon-512.png"),
      width: 512,
      height: 512,
    },
    founder: { "@id": AUTHOR_ID },
    knowsAbout: [
      "Amazon Advertising",
      "Sponsored Products",
      "Sponsored Brands",
      "Sponsored Display",
      "Pay-per-click advertising",
      "Advertising Cost of Sale",
      "Keyword research",
      "Virtual assistant training",
    ],
    sameAs: [AUTHOR.youtube, AUTHOR.linkedin, AUTHOR.coaching],
  };
}

/** The author, as a person, so `Article` and `Course` can both point at them. */
export function authorNode(): JsonLdNode {
  return {
    "@type": "Person",
    "@id": AUTHOR_ID,
    name: AUTHOR.name,
    jobTitle: AUTHOR.role,
    url: AUTHOR.linkedin,
    sameAs: [AUTHOR.linkedin, AUTHOR.youtube, AUTHOR.coaching],
    address: {
      "@type": "PostalAddress",
      addressLocality: "Iloilo City",
      addressCountry: "PH",
    },
  };
}

/**
 * The site itself, with the search action pointed at `/search?q=`.
 *
 * `/search` reads `q` from the query string on the client, so the target is
 * real: a crawler following it lands on a working results page.
 */
export function webSiteNode(): JsonLdNode {
  return {
    "@type": "WebSite",
    "@id": WEBSITE_ID,
    name: SITE_NAME,
    url: absoluteUrl("/"),
    description: SITE_DESCRIPTION,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${absoluteUrl("/search")}?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/** The `@graph` wrapper every emitted block uses. */
export function graph(nodes: JsonLdNode[]): JsonLdNode {
  return { "@context": "https://schema.org", "@graph": nodes };
}

/** Organization + Person + WebSite, for the root layout. */
export function siteGraph(): JsonLdNode {
  return graph([organizationNode(), authorNode(), webSiteNode()]);
}

/* ------------------------------------------------------------------ *
 * Page-level nodes
 * ------------------------------------------------------------------ */

export interface Crumb {
  name: string;
  /** Internal route. Omit on the final crumb — it is the current page. */
  path?: string;
}

/**
 * Breadcrumb trail. Home is prepended automatically, so callers pass only
 * the trail below it — the same list the visible `<Breadcrumbs>` renders.
 */
export function breadcrumbNode(trail: Crumb[], currentPath: string): JsonLdNode {
  const items = [{ name: "Home", path: "/" }, ...trail];

  return {
    "@type": "BreadcrumbList",
    "@id": `${absoluteUrl(currentPath)}#breadcrumbs`,
    itemListElement: items.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      ...(crumb.path ? { item: absoluteUrl(crumb.path) } : {}),
    })),
  };
}

export interface ArticleInput {
  title: string;
  description: string;
  path: string;
  /** Plain-text body, used for `wordCount` and `articleBody`. */
  body?: string;
  section?: string;
  keywords?: string[];
  published?: string;
  modified?: string;
  minutes?: number;
}

/**
 * A long-form document: an SOP, a workflow, a cheat sheet, a case study.
 *
 * `articleBody` is deliberately left out — repeating 20KB of prose in a
 * script tag doubles the page weight for no ranking benefit. `wordCount`
 * carries the same signal at a fraction of the bytes.
 */
export function articleNode({
  title,
  description,
  path,
  body,
  section,
  keywords,
  published,
  modified,
  minutes,
}: ArticleInput): JsonLdNode {
  const url = absoluteUrl(path);
  const words = body ? body.trim().split(/\s+/).filter(Boolean).length : undefined;

  return {
    "@type": "Article",
    "@id": `${url}#article`,
    headline: title,
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    inLanguage: "en",
    isAccessibleForFree: true,
    author: { "@id": AUTHOR_ID },
    publisher: { "@id": ORGANIZATION_ID },
    image: absoluteUrl(OG_IMAGE.url),
    ...(section ? { articleSection: section } : {}),
    ...(keywords && keywords.length > 0 ? { keywords: keywords.join(", ") } : {}),
    ...(published ? { datePublished: published } : {}),
    ...(modified ?? published ? { dateModified: modified ?? published } : {}),
    ...(words ? { wordCount: words } : {}),
    ...(minutes ? { timeRequired: `PT${Math.round(minutes)}M` } : {}),
  };
}

export interface FaqEntry {
  question: string;
  /** Plain text. Markdown is stripped by `toPlainProse` before it gets here. */
  answer: string;
}

/**
 * `FAQPage` for `/interviews`.
 *
 * This is the one page on the site where the schema is literally true: it is
 * a published list of questions, each with a written answer visible on the
 * page. Answers are trimmed — Google ignores anything past a few hundred
 * words and the full bank would be half a megabyte of JSON.
 */
export function faqNode(entries: FaqEntry[], path: string): JsonLdNode {
  return {
    "@type": "FAQPage",
    "@id": `${absoluteUrl(path)}#faq`,
    inLanguage: "en",
    publisher: { "@id": ORGANIZATION_ID },
    mainEntity: entries.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: { "@type": "Answer", text: entry.answer },
    })),
  };
}

export interface CourseInput {
  name: string;
  description: string;
  path: string;
  /** Total study time in minutes. */
  minutes: number;
  level?: string;
  /** What the learner can do afterwards. */
  outcomes?: string[];
  /** Ordered module names, emitted as `syllabusSections`. */
  modules?: { name: string; description?: string }[];
}

/**
 * `Course` for a learning path.
 *
 * Google's Course markup wants a provider, a free/paid signal and an
 * instance describing how the course is delivered. All three are honest
 * here: self-paced, online, free, no enrolment.
 */
export function courseNode({
  name,
  description,
  path,
  minutes,
  level,
  outcomes,
  modules,
}: CourseInput): JsonLdNode {
  const url = absoluteUrl(path);

  return {
    "@type": "Course",
    "@id": `${url}#course`,
    name,
    description,
    url,
    inLanguage: "en",
    provider: { "@id": ORGANIZATION_ID },
    author: { "@id": AUTHOR_ID },
    isAccessibleForFree: true,
    offers: {
      "@type": "Offer",
      price: 0,
      priceCurrency: "USD",
      category: "Free",
      availability: "https://schema.org/InStock",
    },
    ...(level ? { educationalLevel: level } : {}),
    ...(outcomes && outcomes.length > 0 ? { teaches: outcomes } : {}),
    ...(modules && modules.length > 0
      ? {
          syllabusSections: modules.map((module, index) => ({
            "@type": "Syllabus",
            position: index + 1,
            name: module.name,
            ...(module.description ? { description: module.description } : {}),
          })),
        }
      : {}),
    hasCourseInstance: {
      "@type": "CourseInstance",
      courseMode: "online",
      courseWorkload: `PT${Math.round(minutes)}M`,
    },
  };
}

/** A `Course` list — `/paths` is an `ItemList` of the four paths. */
export function itemListNode(
  items: { name: string; path: string }[],
  path: string,
  name: string,
): JsonLdNode {
  return {
    "@type": "ItemList",
    "@id": `${absoluteUrl(path)}#list`,
    name,
    numberOfItems: items.length,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}

/**
 * A `Quiz` node. Schema.org models a quiz as a `Quiz` (a `LearningResource`)
 * and that is exactly what these pages are: a graded set of questions with
 * an educational level and a completion time.
 */
export function quizNode(input: {
  name: string;
  description: string;
  path: string;
  questions: number;
  minutes: number;
  level?: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);

  return {
    "@type": "Quiz",
    "@id": `${url}#quiz`,
    name: input.name,
    description: input.description,
    url,
    inLanguage: "en",
    isAccessibleForFree: true,
    learningResourceType: "Quiz",
    educationalUse: "assessment",
    numberOfQuestions: input.questions,
    timeRequired: `PT${Math.round(input.minutes)}M`,
    provider: { "@id": ORGANIZATION_ID },
    ...(input.level ? { educationalLevel: input.level } : {}),
  };
}

/** A `SoftwareApplication` node for the browser calculators. */
export function calculatorNode(input: {
  name: string;
  description: string;
  path: string;
}): JsonLdNode {
  const url = absoluteUrl(input.path);

  return {
    "@type": "SoftwareApplication",
    "@id": `${url}#app`,
    name: input.name,
    description: input.description,
    url,
    applicationCategory: "BusinessApplication",
    operatingSystem: "Any browser",
    isAccessibleForFree: true,
    offers: { "@type": "Offer", price: 0, priceCurrency: "USD" },
    publisher: { "@id": ORGANIZATION_ID },
  };
}
