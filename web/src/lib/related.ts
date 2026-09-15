import { caseStudies, type CaseStudyDoc } from "@/content/case-studies";
import { paths, type LearningPathDoc } from "@/content/paths";
import { allQuizQuestions, quizzes } from "@/content/quizzes";
import { REFERENCE_LABELS } from "@/content/reference-labels";
import { KIND_ORDER, allResources, findByHref } from "@/content/registry";
import { RESOURCE_INDEX } from "@/content/resource-index";
import type { QuizQuestion, ResourceKind, ResourceRef } from "@/types/content";

/**
 * Cross-links between resources, derived — never hand-maintained.
 *
 * Two directions matter:
 *
 *   Forward   "what else should I read?"  -> `relatedResources`, scored on
 *             shared tags, kind and level across the whole registry.
 *   Backward  "where is this used?"       -> `usedIn`, which inverts the
 *             links other content already declares: the `playbook` entries
 *             on a case study, the `steps` on a learning path, and the
 *             `reference` on a quiz question.
 *
 * Every href returned here came out of the registry or out of content that
 * validates its own hrefs at module load, so nothing in this file can invent
 * a route that does not exist. The build-time link check in the README covers
 * the rest.
 */

/* ------------------------------------------------------------------ *
 * Normalisation
 * ------------------------------------------------------------------ */

/** Trailing slashes off, fragment off. `/sops/x/` and `/sops/x#y` are one page. */
export function normaliseHref(href: string): string {
  const [withoutHash] = href.split("#");
  const [withoutQuery] = withoutHash.split("?");
  if (withoutQuery.length <= 1) return "/";
  return withoutQuery.replace(/\/+$/, "");
}

/**
 * Do two hrefs name the same *target*?
 *
 * Fragment-sensitive on purpose. Glossary terms register as `/glossary#acos`,
 * so a page-level comparison would make every glossary citation look like a
 * citation of the glossary index. Query strings and trailing slashes are
 * still noise and get stripped.
 */
function sameTarget(a: string, b: string): boolean {
  const clean = (href: string) => {
    const [route, hash] = href.split("#");
    const [withoutQuery] = route.split("?");
    const trimmed = withoutQuery.length <= 1 ? "/" : withoutQuery.replace(/\/+$/, "");
    return hash ? `${trimmed}#${hash}` : trimmed;
  };
  return clean(a) === clean(b);
}

/** True when a ref is an anchor on a hub page rather than a page of its own. */
function isAnchorRef(resource: ResourceRef): boolean {
  return resource.href.includes("#");
}

/* ------------------------------------------------------------------ *
 * Forward: related resources
 * ------------------------------------------------------------------ */

export interface RelatedOptions {
  /** How many to return. */
  limit?: number;
  /** Never return more than this many of any one kind, so the list stays mixed. */
  perKind?: number;
  /** Restrict candidates to these kinds. */
  kinds?: ResourceKind[];
  /** Additional hrefs to leave out — usually ones already shown on the page. */
  exclude?: string[];
  /** Include glossary-style anchor refs. Off by default: they are not pages. */
  includeAnchors?: boolean;
}

export interface RelatedHit {
  resource: ResourceRef;
  score: number;
  /** The tags the two resources have in common, in the anchor's order. */
  sharedTags: string[];
}

const SCORE = {
  sharedTag: 3,
  sameKind: 1,
  sameLevel: 1,
  tagInTitle: 1,
} as const;

function lower(values: readonly string[]): Set<string> {
  return new Set(values.map((value) => value.toLowerCase()));
}

/**
 * Score every other registered resource against one anchor.
 *
 * Shared tags dominate, because tags are the only signal an author writes
 * deliberately. Kind and level are weak tie-breakers — a reader on an SOP
 * usually wants the workflow and the template next, not five more SOPs,
 * which is also why `perKind` caps each type.
 */
export function relatedResources(
  anchorHref: string,
  options: RelatedOptions = {},
): RelatedHit[] {
  const { limit = 6, perKind = 2, kinds, exclude = [], includeAnchors = false } = options;

  const anchor = findByHref(normaliseHref(anchorHref));
  if (!anchor) return [];

  const anchorTags = lower(anchor.tags);
  const blocked = new Set([normaliseHref(anchor.href), ...exclude.map(normaliseHref)]);

  const scored: RelatedHit[] = [];

  for (const candidate of allResources) {
    if (blocked.has(normaliseHref(candidate.href))) continue;
    if (!includeAnchors && isAnchorRef(candidate)) continue;
    if (kinds && !kinds.includes(candidate.kind)) continue;

    const sharedTags = anchor.tags.filter((tag) =>
      candidate.tags.some((other) => other.toLowerCase() === tag.toLowerCase()),
    );

    let score = sharedTags.length * SCORE.sharedTag;
    if (candidate.kind === anchor.kind) score += SCORE.sameKind;
    if (candidate.level && candidate.level === anchor.level) score += SCORE.sameLevel;

    const title = candidate.title.toLowerCase();
    if ([...anchorTags].some((tag) => tag.length > 3 && title.includes(tag))) {
      score += SCORE.tagInTitle;
    }

    if (score <= SCORE.sameKind + SCORE.sameLevel) continue; // no tag overlap at all
    scored.push({ resource: candidate, score, sharedTags });
  }

  scored.sort(
    (a, b) =>
      b.score - a.score ||
      KIND_ORDER.indexOf(a.resource.kind) - KIND_ORDER.indexOf(b.resource.kind) ||
      a.resource.title.localeCompare(b.resource.title),
  );

  const taken = new Map<ResourceKind, number>();
  const out: RelatedHit[] = [];

  for (const hit of scored) {
    const used = taken.get(hit.resource.kind) ?? 0;
    if (used >= perKind) continue;
    taken.set(hit.resource.kind, used + 1);
    out.push(hit);
    if (out.length >= limit) break;
  }

  // If the per-kind cap starved the list, top it up in score order.
  if (out.length < limit) {
    const already = new Set(out.map((hit) => hit.resource.href));
    for (const hit of scored) {
      if (already.has(hit.resource.href)) continue;
      out.push(hit);
      if (out.length >= limit) break;
    }
  }

  return out;
}

/* ------------------------------------------------------------------ *
 * Backward: where is this used?
 * ------------------------------------------------------------------ */

export interface CaseStudyUse {
  study: CaseStudyDoc;
  /** The study's own note on how it used this resource. */
  note: string;
  label: string;
}

/** Case studies whose playbook points at this route. */
export function caseStudiesUsing(href: string): CaseStudyUse[] {
  const out: CaseStudyUse[] = [];

  for (const study of caseStudies) {
    const entry = study.playbook.find((link) => sameTarget(link.href, href));
    if (entry) out.push({ study, note: entry.note, label: entry.label });
  }

  return out;
}

export interface PathUse {
  path: LearningPathDoc;
  /** 1-based position of this resource in the path. */
  position: number;
  /** The path's own line on why the step is there. */
  why: string;
}

/** Learning paths that schedule this route, and where in the sequence. */
export function pathsUsing(href: string): PathUse[] {
  const out: PathUse[] = [];

  for (const path of paths) {
    const step = path.steps.find((entry) => sameTarget(entry.href, href));
    if (step) out.push({ path, position: step.position, why: step.why });
  }

  return out;
}

export interface QuizUse {
  question: QuizQuestion;
  /** The quiz this question belongs to, for the link. */
  quizId: string;
  quizTitle: string;
}

/**
 * Quiz questions that cite this route in their explanation.
 *
 * A question can live in more than one quiz (the mock exam re-uses the level
 * sets), so the first quiz that contains it wins — that is the one a reader
 * should be sent to.
 */
export function quizQuestionsCiting(href: string): QuizUse[] {
  const out: QuizUse[] = [];
  const seen = new Set<string>();

  for (const question of allQuizQuestions) {
    if (!question.reference) continue;
    if (!sameTarget(question.reference, href)) continue;
    if (seen.has(question.id)) continue;
    seen.add(question.id);

    const quiz = quizzes.find((candidate) =>
      candidate.questions.some((entry) => entry.id === question.id),
    );
    if (!quiz) continue;
    out.push({ question, quizId: quiz.id, quizTitle: quiz.title });
  }

  return out;
}

export interface UsedIn {
  caseStudies: CaseStudyUse[];
  paths: PathUse[];
  quizQuestions: QuizUse[];
  /** True when any of the three has something in it. */
  any: boolean;
}

/** Everything that points *at* this route. */
export function usedIn(href: string): UsedIn {
  const studies = caseStudiesUsing(href);
  const pathUses = pathsUsing(href);
  const quizUses = quizQuestionsCiting(href);

  return {
    caseStudies: studies,
    paths: pathUses,
    quizQuestions: quizUses,
    any: studies.length > 0 || pathUses.length > 0 || quizUses.length > 0,
  };
}

/* ------------------------------------------------------------------ *
 * Reference resolution
 * ------------------------------------------------------------------ */

/**
 * Resolve a quiz question's `reference` to the resource it points at, so the
 * link can be labelled with a real title instead of "read the reference".
 *
 * Glossary references carry a fragment (`/glossary#acos`); those resolve to
 * the glossary ref itself, which is registered with the same href.
 */
export function resolveReference(reference: string): ResourceRef | undefined {
  return findByHref(reference) ?? findByHref(normaliseHref(reference));
}

/**
 * Check `src/content/reference-labels.ts` against the live registry.
 *
 * The quiz runner is a client component, so it reads reference titles from a
 * flat data table rather than importing the registry and shipping the whole
 * library to the browser. This is what stops that table going stale: it is
 * called from the quizzes hub, a server component, so a reference with no
 * label, a label for a route that no longer exists, or a title that no longer
 * matches all fail `npm run build` rather than shipping wrong text.
 */
export function assertReferenceIndex(): void {
  const problems: string[] = [];

  const cited = new Set(
    allQuizQuestions
      .map((question) => question.reference)
      .filter((reference): reference is string => Boolean(reference)),
  );

  for (const reference of cited) {
    const resource = resolveReference(reference);
    const label = REFERENCE_LABELS[reference];

    if (!resource) {
      problems.push(`${reference} is cited by a quiz question but is not a registered resource`);
      continue;
    }
    if (!label) {
      problems.push(`${reference} has no entry in REFERENCE_LABELS`);
      continue;
    }
    if (label.title !== resource.title) {
      problems.push(
        `${reference} is labelled "${label.title}" but the registry calls it "${resource.title}"`,
      );
    }
  }

  for (const href of Object.keys(REFERENCE_LABELS)) {
    if (!cited.has(href)) {
      problems.push(`${href} is in REFERENCE_LABELS but no quiz question cites it`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `reference-labels.ts is out of step with the registry:\n  - ${problems.join("\n  - ")}`,
    );
  }
}

/**
 * Check `src/content/resource-index.ts` against the live registry.
 *
 * Progress tracking reads titles and durations from that flat index rather
 * than the registry, because the registry carries every document body and
 * the progress controls ship on nearly every page. This is what keeps the
 * two in step: a resource added, renamed, retimed or moved without
 * regenerating the index fails `npm run build`.
 */
export function assertResourceIndex(): void {
  const problems: string[] = [];
  const indexed = new Map(RESOURCE_INDEX.map((entry) => [entry.id, entry]));

  for (const resource of allResources) {
    const entry = indexed.get(resource.id);
    if (!entry) {
      problems.push(`${resource.id} (${resource.href}) is missing from RESOURCE_INDEX`);
      continue;
    }
    if (entry.href !== resource.href) {
      problems.push(`${resource.id} is indexed at ${entry.href} but registered at ${resource.href}`);
    }
    if (entry.title !== resource.title) {
      problems.push(`${resource.id} is indexed as "${entry.title}" but registered as "${resource.title}"`);
    }
    if (entry.kind !== resource.kind) {
      problems.push(`${resource.id} is indexed as ${entry.kind} but registered as ${resource.kind}`);
    }
    if (entry.minutes !== resource.minutes) {
      problems.push(`${resource.id} is indexed at ${entry.minutes} min but registered at ${resource.minutes} min`);
    }
    if (entry.level !== resource.level) {
      problems.push(`${resource.id} is indexed as ${entry.level} but registered as ${resource.level}`);
    }
  }

  const registered = new Set(allResources.map((resource) => resource.id));
  for (const entry of RESOURCE_INDEX) {
    if (!registered.has(entry.id)) {
      problems.push(`${entry.id} is in RESOURCE_INDEX but no domain registers it`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `resource-index.ts is out of step with the registry — regenerate it (see README):\n  - ${problems.slice(0, 20).join("\n  - ")}${problems.length > 20 ? `\n  ...and ${problems.length - 20} more` : ""}`,
    );
  }
}
