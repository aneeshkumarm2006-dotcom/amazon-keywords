import type { Level, ResourceKind, Tone } from "@/types/content";

import {
  paths,
  type LearningPathDoc,
  type PathModule,
  type PathStepEntry,
} from "@/content/paths";
// The light index, not the registry: this module runs in the browser on every
// page that carries a progress control, and the registry pulls the whole
// content library in behind it.
import { indexByHref, indexById } from "@/content/resource-index";

import { TRACKED_IDS, TRACKED_KINDS, trackedResources } from "./progress-scope";
import {
  LEVEL_META as QUIZ_LEVEL_META,
  PASS_MARK as QUIZ_PASS_MARK,
  QUIZ_TOPICS,
  TOTAL_QUESTIONS,
  findQuestion,
  quizzes,
} from "@/content/quizzes";
import {
  PASS_MARK as INTERVIEW_PASS_MARK,
  TOTAL_INTERVIEW_QUESTIONS,
  findInterviewQuestion,
  questionsByCategory,
  type InterviewCategory,
} from "@/content/interviews";

import {
  dueReviewIds,
  getAttempts,
  getMastery,
  type MasteryMap,
} from "./quiz-progress";
import {
  getBookmarks as getInterviewBookmarks,
  getMockHistory,
  getPractised,
  weakCategories,
  type MockAttempt,
} from "./interview-progress";
import { dayKey, type QuizAttempt } from "./quiz-session";
import {
  STORAGE_PREFIX,
  THEME_STORAGE_KEY,
  storageGet,
  storageKey,
  storageKeys,
  storageRemove,
  storageSet,
} from "./storage";

/**
 * The unified progress layer.
 *
 * There is no account and no server. A "profile" is a record in localStorage
 * that belongs to the browser it was created in, is never transmitted, and
 * can be exported to a file and carried to another machine.
 *
 * This module owns five records of its own:
 *
 *   progress:profile      — display name, goal role, target date, avatar colour
 *   progress:completions  — resource/step id -> completion timestamp
 *   progress:bookmarks    — resource id -> saved timestamp
 *   progress:activity     — the append-only event log this layer writes
 *   progress:paths        — per learning path: when it was started and finished
 *
 * Everything else it reads from the phase-4 and phase-6 stores
 * (`quiz-progress.ts`, `interview-progress.ts`) rather than duplicating it.
 * XP, level, streak and the activity chart are always DERIVED, never stored,
 * so an export/import round trip can never disagree with the underlying data.
 *
 * Every function is plain and SSR-safe: they return empty values on the
 * server, so a server component may import the types and the constants. The
 * React bindings live in `components/progress/useProgress.ts`.
 */

/* ------------------------------------------------------------------ *
 * Keys
 * ------------------------------------------------------------------ */

export const PROFILE_KEY = "progress:profile";
export const COMPLETIONS_KEY = "progress:completions";
export const BOOKMARKS_KEY = "progress:bookmarks";
export const ACTIVITY_KEY = "progress:activity";
export const PATHS_KEY = "progress:paths";

/** The written log is capped; derived events are unbounded and free. */
const MAX_ACTIVITY = 300;

const DAY_MS = 24 * 60 * 60 * 1000;

/* ------------------------------------------------------------------ *
 * Profile
 * ------------------------------------------------------------------ */

export type AvatarColour = "brand" | "ember" | "info" | "good" | "warn" | "bad";

export const AVATAR_COLOURS: AvatarColour[] = [
  "brand",
  "ember",
  "info",
  "good",
  "warn",
  "bad",
];

export interface GoalRole {
  id: string;
  label: string;
  /** Monthly range from the source career guide, in Philippine pesos. */
  salary: string;
  /** Typical time to get there from the level below it. */
  timeline: string;
  blurb: string;
}

/**
 * The ladder from `career/VA-to-PPC-Specialist-Guide.md`. Salary ranges and
 * timelines are the source figures, unchanged.
 */
export const GOAL_ROLES: GoalRole[] = [
  {
    id: "ppc-junior",
    label: "PPC Junior / PPC Assistant",
    salary: "P25,000 - P40,000 / month",
    timeline: "6-12 months from general VA",
    blurb:
      "Pull the reports, flag the 15-clicks-no-orders keywords, watch budget pacing and support a senior on bids.",
  },
  {
    id: "ppc-specialist",
    label: "PPC Specialist",
    salary: "P40,000 - P65,000 / month",
    timeline: "12-18 months from PPC Junior",
    blurb:
      "Own campaigns end to end: structure, harvesting, bid decisions, negatives and the monthly client report.",
  },
  {
    id: "senior-specialist",
    label: "Senior PPC Specialist",
    salary: "P65,000 - P100,000 / month",
    timeline: "18-24 months from Specialist",
    blurb:
      "Own strategy for multiple accounts, set targets that hold up, and make restructure calls on inherited messes.",
  },
  {
    id: "ppc-manager",
    label: "PPC Manager / Lead",
    salary: "P80,000 - P150,000+ / month",
    timeline: "24+ months from Specialist",
    blurb:
      "Run a team and a book of accounts. Hiring, QA, escalation and the numbers the client's CFO asks about.",
  },
  {
    id: "freelance",
    label: "Freelance PPC consultant",
    salary: "Rate-based, typically $15-40 / hour",
    timeline: "After a portfolio of 3+ documented accounts",
    blurb:
      "Your own clients, your own rate card. Needs the portfolio, the case studies and the sales conversation.",
  },
];

export function findGoalRole(id: string): GoalRole | undefined {
  return GOAL_ROLES.find((role) => role.id === id);
}

export interface Profile {
  displayName: string;
  /** A `GoalRole.id`, or "" when the learner has not picked one. */
  goalRole: string;
  /** ISO yyyy-mm-dd, or "" for no target. */
  targetDate: string;
  avatarColour: AvatarColour;
  createdAt: number;
}

export const DEFAULT_PROFILE: Profile = {
  displayName: "",
  goalRole: "",
  targetDate: "",
  avatarColour: "brand",
  createdAt: 0,
};

export function getProfile(): Profile {
  const stored = storageGet<Partial<Profile> | null>(PROFILE_KEY, null);
  if (!stored || typeof stored !== "object") return DEFAULT_PROFILE;
  return {
    displayName: typeof stored.displayName === "string" ? stored.displayName : "",
    goalRole: typeof stored.goalRole === "string" ? stored.goalRole : "",
    targetDate: typeof stored.targetDate === "string" ? stored.targetDate : "",
    avatarColour: AVATAR_COLOURS.includes(stored.avatarColour as AvatarColour)
      ? (stored.avatarColour as AvatarColour)
      : "brand",
    createdAt: typeof stored.createdAt === "number" ? stored.createdAt : 0,
  };
}

/** Merge a partial update into the profile. Creates it on first write. */
export function setProfile(patch: Partial<Profile>): Profile {
  const current = getProfile();
  const next: Profile = {
    ...current,
    ...patch,
    createdAt: current.createdAt || Date.now(),
  };
  storageSet(PROFILE_KEY, next);
  return next;
}

/** "Maria Santos" -> "MS". Falls back to a neutral mark. */
export function profileInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "PPC";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/** Whole days from today to the target date. Negative once it has passed. */
export function daysUntil(targetDate: string, now = Date.now()): number | null {
  if (!targetDate) return null;
  const target = new Date(`${targetDate}T00:00:00`).getTime();
  if (Number.isNaN(target)) return null;
  const today = new Date(dayKey(now) + "T00:00:00").getTime();
  return Math.round((target - today) / DAY_MS);
}

/* ------------------------------------------------------------------ *
 * What can be marked complete
 * ------------------------------------------------------------------ */

export { TRACKED_IDS, TRACKED_KINDS, trackedResources };

function normaliseHref(href: string): string {
  const trimmed = href.split("#")[0].split("?")[0];
  return trimmed.length > 1 ? trimmed.replace(/\/+$/, "") : trimmed;
}

/**
 * The completion id for a route.
 *
 * A route that belongs to a registered resource uses that resource's id, so
 * reading an SOP from a learning path and reading it from the SOP index are
 * the same tick. Everything else — the mock interview, the review queue, a
 * hub page a path sends you to — gets a stable synthetic id.
 */
export function completionIdForHref(href: string): string {
  const normalised = normaliseHref(href);
  const resource = indexByHref(normalised);
  return resource ? resource.id : `route:${normalised}`;
}

/* ------------------------------------------------------------------ *
 * Completions
 * ------------------------------------------------------------------ */

export type CompletionMap = Record<string, number>;

const EMPTY_COMPLETIONS: CompletionMap = {};

export function getCompletions(): CompletionMap {
  const stored = storageGet<CompletionMap>(COMPLETIONS_KEY, EMPTY_COMPLETIONS);
  return stored && typeof stored === "object" ? stored : EMPTY_COMPLETIONS;
}

export function isComplete(id: string, completions = getCompletions()): boolean {
  return typeof completions[id] === "number";
}

export function completedAt(id: string, completions = getCompletions()): number | null {
  const value = completions[id];
  return typeof value === "number" ? value : null;
}

/**
 * Mark or unmark anything. Returns the state the id ended up in.
 * Marking writes an activity event; unmarking removes the matching one so
 * the log never claims credit for work that was undone.
 */
export function toggleComplete(id: string, label?: string, href?: string): boolean {
  const completions = { ...getCompletions() };
  const wasComplete = isComplete(id, completions);

  if (wasComplete) {
    delete completions[id];
    storageSet(COMPLETIONS_KEY, completions);
    removeActivity((event) => event.kind === "resource" && event.id === id);
    syncAllPathRecords();
    return false;
  }

  const now = Date.now();
  completions[id] = now;
  storageSet(COMPLETIONS_KEY, completions);

  const resource = indexById(id);
  pushActivity({
    id,
    kind: "resource",
    at: now,
    label: label ?? resource?.title ?? "Marked complete",
    detail: resource ? kindLabel(resource.kind) : "Step",
    href: href ?? resource?.href,
    xp: resourceXp(resource),
  });
  syncAllPathRecords();
  return true;
}

function kindLabel(kind: ResourceKind): string {
  switch (kind) {
    case "case-study":
      return "Case study";
    case "cheat-sheet":
      return "Cheat sheet";
    case "sop":
      return "SOP";
    default:
      return kind.charAt(0).toUpperCase() + kind.slice(1);
  }
}

/* ------------------------------------------------------------------ *
 * Bookmarks
 * ------------------------------------------------------------------ */

export type BookmarkMap = Record<string, number>;

const EMPTY_BOOKMARKS: BookmarkMap = {};

export function getBookmarkMap(): BookmarkMap {
  const stored = storageGet<BookmarkMap>(BOOKMARKS_KEY, EMPTY_BOOKMARKS);
  return stored && typeof stored === "object" ? stored : EMPTY_BOOKMARKS;
}

export function isBookmarked(id: string, bookmarks = getBookmarkMap()): boolean {
  return typeof bookmarks[id] === "number";
}

export function toggleBookmark(id: string, label?: string, href?: string): boolean {
  const bookmarks = { ...getBookmarkMap() };
  const wasSaved = isBookmarked(id, bookmarks);

  if (wasSaved) {
    delete bookmarks[id];
    storageSet(BOOKMARKS_KEY, bookmarks);
    removeActivity((event) => event.kind === "bookmark" && event.id === id);
    return false;
  }

  const now = Date.now();
  bookmarks[id] = now;
  storageSet(BOOKMARKS_KEY, bookmarks);

  const resource = indexById(id);
  pushActivity({
    id,
    kind: "bookmark",
    at: now,
    label: label ?? resource?.title ?? "Saved for later",
    detail: "Bookmarked",
    href: href ?? resource?.href,
    xp: 0,
  });
  return true;
}

export interface BookmarkRow {
  id: string;
  title: string;
  href: string;
  /** "SOP", "Case study", "Interview question"… */
  kindLabel: string;
  at: number;
  source: "resource" | "interview";
}

/**
 * Every bookmark the learner has, from this layer AND from the interview
 * bank, newest first. Two stores, one list — the dashboard should not make
 * the learner remember where they starred something.
 */
export function getBookmarks(): BookmarkRow[] {
  const rows: BookmarkRow[] = [];

  for (const [id, at] of Object.entries(getBookmarkMap())) {
    const resource = indexById(id);
    if (!resource) continue;
    rows.push({
      id,
      title: resource.title,
      href: resource.href,
      kindLabel: kindLabel(resource.kind),
      at,
      source: "resource",
    });
  }

  const interviewIds = getInterviewBookmarks();
  interviewIds.forEach((id, index) => {
    const question = findInterviewQuestion(id);
    if (!question) return;
    rows.push({
      id: `interview-${id}`,
      title: question.question,
      href: `/interviews/${id}`,
      kindLabel: `Interview · ${question.category}`,
      // The interview store keeps order, not timestamps: newest first.
      at: Number.MAX_SAFE_INTEGER - index,
      source: "interview",
    });
  });

  return rows.sort((a, b) => b.at - a.at);
}

/* ------------------------------------------------------------------ *
 * Activity log
 * ------------------------------------------------------------------ */

export type ActivityKind = "resource" | "quiz" | "interview" | "path" | "bookmark";

export interface ActivityEvent {
  /** The subject: a resource id, a quiz attempt id, a path id. */
  id: string;
  kind: ActivityKind;
  at: number;
  label: string;
  detail?: string;
  href?: string;
  xp: number;
}

const EMPTY_EVENTS: ActivityEvent[] = [];

/**
 * XP is recomputed on read rather than trusted from the record.
 *
 * A stored number would freeze the scoring rules at the moment the event was
 * written, so an old event would keep claiming points the current formula no
 * longer awards and the feed would disagree with the total.
 */
function scoreEvent(event: ActivityEvent): number {
  switch (event.kind) {
    case "resource":
      return resourceXp(indexById(event.id));
    case "path":
      return PATH_COMPLETION_XP;
    case "bookmark":
      return 0;
    default:
      return event.xp;
  }
}

function readActivity(): ActivityEvent[] {
  const stored = storageGet<ActivityEvent[]>(ACTIVITY_KEY, EMPTY_EVENTS);
  if (!Array.isArray(stored)) return EMPTY_EVENTS;
  return stored
    .filter((event) => event && typeof event.at === "number" && typeof event.id === "string")
    .map((event) => ({ ...event, xp: scoreEvent(event) }));
}

function pushActivity(event: ActivityEvent): void {
  storageSet(ACTIVITY_KEY, [event, ...readActivity()].slice(0, MAX_ACTIVITY));
}

function removeActivity(match: (event: ActivityEvent) => boolean): void {
  const current = readActivity();
  const next = current.filter((event) => !match(event));
  if (next.length !== current.length) storageSet(ACTIVITY_KEY, next);
}

function quizEvents(attempts: QuizAttempt[] = getAttempts()): ActivityEvent[] {
  return attempts.map((attempt) => ({
    id: attempt.id,
    kind: "quiz" as const,
    at: attempt.finishedAt,
    label: attempt.title,
    detail: `${attempt.score}% · ${attempt.correct}/${attempt.total} correct`,
    href: `/quizzes/${attempt.quizId}/results?attempt=${attempt.id}`,
    xp: quizXp(attempt),
  }));
}

function mockEvents(attempts: MockAttempt[] = getMockHistory()): ActivityEvent[] {
  return attempts.map((attempt) => ({
    id: attempt.id,
    kind: "interview" as const,
    at: attempt.finishedAt,
    label: `Mock interview · ${attempt.rows.length} questions`,
    detail: `${attempt.score}% self-assessed`,
    href: "/interviews/mock",
    xp: mockXp(attempt),
  }));
}

/** Every event, written and derived, newest first. */
export function getActivity(limit = 40): ActivityEvent[] {
  return [...readActivity(), ...quizEvents(), ...mockEvents()]
    .sort((a, b) => b.at - a.at)
    .slice(0, limit);
}

export interface DayActivity {
  /** Local calendar day, "2026-09-15". */
  day: string;
  /** Milliseconds at local midnight — for axis formatting. */
  timestamp: number;
  total: number;
  resources: number;
  quizzes: number;
  interviews: number;
  xp: number;
}

/**
 * A dense series with no gaps: one entry per day for the last `days` days,
 * oldest first, including days with nothing on them. A chart needs the zeros.
 */
export function getActivityByDay(days = 84, now = Date.now()): DayActivity[] {
  const buckets = new Map<string, DayActivity>();
  const midnight = new Date(now);
  midnight.setHours(0, 0, 0, 0);

  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(midnight.getTime() - offset * DAY_MS);
    const key = dayKey(date.getTime());
    buckets.set(key, {
      day: key,
      timestamp: date.getTime(),
      total: 0,
      resources: 0,
      quizzes: 0,
      interviews: 0,
      xp: 0,
    });
  }

  for (const event of [...readActivity(), ...quizEvents(), ...mockEvents()]) {
    const bucket = buckets.get(dayKey(event.at));
    if (!bucket) continue;
    bucket.total += 1;
    bucket.xp += event.xp;
    if (event.kind === "quiz") bucket.quizzes += 1;
    else if (event.kind === "interview") bucket.interviews += 1;
    else if (event.kind !== "bookmark") bucket.resources += 1;
  }

  return Array.from(buckets.values());
}

/** Every distinct day with at least one scoring event, oldest first. */
export function activeDays(): string[] {
  const days = new Set<string>();
  for (const event of readActivity()) {
    if (event.kind !== "bookmark") days.add(dayKey(event.at));
  }
  for (const attempt of getAttempts()) days.add(dayKey(attempt.finishedAt));
  for (const attempt of getMockHistory()) days.add(dayKey(attempt.finishedAt));
  return Array.from(days).sort();
}

/* ------------------------------------------------------------------ *
 * Streak
 * ------------------------------------------------------------------ */

export interface StreakSummary {
  /** Consecutive days up to today (or yesterday, if today is still empty). */
  current: number;
  longest: number;
  /** Distinct days with activity, all time. */
  total: number;
  lastDay: string | null;
  /** True once anything has been logged today. */
  todayDone: boolean;
}

export const EMPTY_STREAK_SUMMARY: StreakSummary = {
  current: 0,
  longest: 0,
  total: 0,
  lastDay: null,
  todayDone: false,
};

function dayDistance(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00`).getTime();
  const b = new Date(`${to}T00:00:00`).getTime();
  if (Number.isNaN(a) || Number.isNaN(b)) return Number.POSITIVE_INFINITY;
  return Math.round((b - a) / DAY_MS);
}

/**
 * The streak across everything, not just quizzes: reading an SOP counts.
 * Computed from the day set rather than stored, so it can never drift.
 */
export function getStreak(now = Date.now()): StreakSummary {
  const days = activeDays();
  if (days.length === 0) return EMPTY_STREAK_SUMMARY;

  let longest = 1;
  let run = 1;
  for (let index = 1; index < days.length; index += 1) {
    run = dayDistance(days[index - 1], days[index]) === 1 ? run + 1 : 1;
    if (run > longest) longest = run;
  }

  const today = dayKey(now);
  const lastDay = days[days.length - 1];
  const gap = dayDistance(lastDay, today);

  // A streak survives until the end of the next day; miss two and it resets.
  let current = 0;
  if (gap <= 1) {
    current = 1;
    for (let index = days.length - 1; index > 0; index -= 1) {
      if (dayDistance(days[index - 1], days[index]) !== 1) break;
      current += 1;
    }
  }

  return {
    current,
    longest: Math.max(longest, current),
    total: days.length,
    lastDay,
    todayDone: lastDay === today,
  };
}

/* ------------------------------------------------------------------ *
 * XP and levels
 * ------------------------------------------------------------------ */

/**
 * A resource is worth roughly its reading time, floored and capped.
 *
 * Deliberately modest next to a quiz attempt: ticking a checkbox is a claim
 * about what you read, whereas a score is evidence. Reading the whole library
 * is worth less than sitting the quizzes and the mocks.
 */
function resourceXp(resource: { minutes?: number } | undefined): number {
  const minutes = resource?.minutes ?? 5;
  return Math.min(20, Math.max(6, 4 + minutes));
}

function quizXp(attempt: QuizAttempt): number {
  return Math.round(attempt.score / 2) + (attempt.passed ? 25 : 0);
}

function mockXp(attempt: MockAttempt): number {
  return 20 + Math.round(attempt.score / 4);
}

/** XP for finishing a whole learning path, on top of its steps. */
export const PATH_COMPLETION_XP = 150;

/** XP for each distinct day of activity — the reward for showing up. */
export const DAILY_XP = 5;

export interface XpLine {
  label: string;
  detail: string;
  xp: number;
  tone: Tone;
}

export interface XpSummary {
  total: number;
  lines: XpLine[];
}

export function getXp(): XpSummary {
  const completions = getCompletions();
  const attempts = getAttempts();
  const mocks = getMockHistory();
  const paths = getPathRecords();
  const days = activeDays();

  const resourceTotal = Object.keys(completions).reduce(
    (sum, id) => sum + resourceXp(indexById(id)),
    0,
  );
  const quizTotal = attempts.reduce((sum, attempt) => sum + quizXp(attempt), 0);
  const mockTotal = mocks.reduce((sum, attempt) => sum + mockXp(attempt), 0);
  const pathTotal =
    Object.values(paths).filter((record) => record.completedAt !== null).length *
    PATH_COMPLETION_XP;
  const dayTotal = days.length * DAILY_XP;

  const lines: XpLine[] = [
    {
      label: "Completions",
      detail: `${Object.keys(completions).length} items ticked, resources and path steps`,
      xp: resourceTotal,
      tone: "brand",
    },
    {
      label: "Quiz attempts",
      detail: `${attempts.length} finished, scored on accuracy`,
      xp: quizTotal,
      tone: "info",
    },
    {
      label: "Mock interviews",
      detail: `${mocks.length} sat and self-assessed`,
      xp: mockTotal,
      tone: "ember",
    },
    {
      label: "Paths finished",
      detail: `${PATH_COMPLETION_XP} XP each`,
      xp: pathTotal,
      tone: "good",
    },
    {
      label: "Days active",
      detail: `${days.length} days, ${DAILY_XP} XP each`,
      xp: dayTotal,
      tone: "warn",
    },
  ];

  return {
    total: resourceTotal + quizTotal + mockTotal + pathTotal + dayTotal,
    lines,
  };
}

export interface LevelTier {
  index: number;
  name: string;
  blurb: string;
  /** Cumulative XP needed to reach this tier. */
  threshold: number;
  tone: Tone;
}

/** Named after the ladder in the source career guide. */
export const LEVEL_TIERS: LevelTier[] = [
  {
    index: 1,
    name: "Trainee",
    blurb: "Learning the vocabulary. Match types, ad types, the six metrics.",
    threshold: 0,
    tone: "neutral",
  },
  {
    index: 2,
    name: "PPC Assistant",
    blurb: "Pulling reports and flagging the obvious waste without being asked.",
    threshold: 120,
    tone: "info",
  },
  {
    index: 3,
    name: "PPC Junior",
    blurb: "Running the daily health check and harvesting from search terms.",
    threshold: 350,
    tone: "brand",
  },
  {
    index: 4,
    name: "PPC Specialist",
    blurb: "Owning campaigns end to end, including the monthly client report.",
    threshold: 700,
    tone: "brand",
  },
  {
    index: 5,
    name: "Senior Specialist",
    blurb: "Structure calls, TACoS thinking, and restructuring inherited accounts.",
    threshold: 1150,
    tone: "good",
  },
  {
    index: 6,
    name: "Account Lead",
    blurb: "Multiple accounts, targets that hold up, escalation handled calmly.",
    threshold: 1700,
    tone: "good",
  },
  {
    index: 7,
    name: "PPC Manager",
    blurb: "A team and a book of business. QA, hiring and the hard conversations.",
    threshold: 2300,
    tone: "ember",
  },
  {
    index: 8,
    name: "Head of PPC",
    blurb: "Everything in the library, proven. Now go and teach someone else.",
    threshold: 3000,
    tone: "ember",
  },
];

export interface LevelSummary {
  tier: LevelTier;
  next: LevelTier | null;
  xp: number;
  /** XP earned inside the current tier. */
  into: number;
  /** XP the current tier spans. Zero at the top tier. */
  span: number;
  /** XP still needed for the next tier. Zero at the top tier. */
  remaining: number;
  /** 0-100 through the current tier; 100 at the top tier. */
  percent: number;
}

export function getLevel(xp = getXp().total): LevelSummary {
  let tier = LEVEL_TIERS[0];
  for (const candidate of LEVEL_TIERS) {
    if (xp >= candidate.threshold) tier = candidate;
  }
  const next = LEVEL_TIERS.find((candidate) => candidate.threshold > xp) ?? null;
  const into = xp - tier.threshold;
  const span = next ? next.threshold - tier.threshold : 0;

  return {
    tier,
    next,
    xp,
    into,
    span,
    remaining: next ? next.threshold - xp : 0,
    percent: next ? Math.min(100, Math.round((into / span) * 100)) : 100,
  };
}

/* ------------------------------------------------------------------ *
 * Learning path records
 * ------------------------------------------------------------------ */

export interface PathRecord {
  startedAt: number;
  completedAt: number | null;
}

export type PathRecordMap = Record<string, PathRecord>;

const EMPTY_PATHS: PathRecordMap = {};

export function getPathRecords(): PathRecordMap {
  const stored = storageGet<PathRecordMap>(PATHS_KEY, EMPTY_PATHS);
  return stored && typeof stored === "object" ? stored : EMPTY_PATHS;
}

/**
 * Called by the path UI after every tick so the record tracks reality:
 * first tick starts the path, the last one stamps the certificate date, and
 * un-ticking a step un-stamps it.
 */
export function syncPathRecord(
  pathId: string,
  pathTitle: string,
  done: number,
  total: number,
): PathRecord | undefined {
  const records = { ...getPathRecords() };
  const existing = records[pathId];
  const now = Date.now();

  if (done === 0) {
    if (!existing) return undefined;
    delete records[pathId];
    storageSet(PATHS_KEY, records);
    removeActivity((event) => event.kind === "path" && event.id === pathId);
    return undefined;
  }

  const finished = total > 0 && done >= total;
  const next: PathRecord = {
    startedAt: existing?.startedAt ?? now,
    completedAt: finished ? (existing?.completedAt ?? now) : null,
  };
  records[pathId] = next;
  storageSet(PATHS_KEY, records);

  if (finished && !existing?.completedAt) {
    pushActivity({
      id: pathId,
      kind: "path",
      at: now,
      label: `Finished ${pathTitle}`,
      detail: `${total} steps complete`,
      href: `/paths/${pathId}`,
      xp: PATH_COMPLETION_XP,
    });
  } else if (!finished && existing?.completedAt) {
    removeActivity((event) => event.kind === "path" && event.id === pathId);
  }

  return next;
}

/* ------------------------------------------------------------------ *
 * Learning path progress
 * ------------------------------------------------------------------ */

export interface PathStepState {
  step: PathStepEntry;
  /** The id this step ticks — shared with the resource it points at. */
  completionId: string;
  complete: boolean;
  completedAt: number | null;
}

export interface PathModuleState {
  module: PathModule;
  steps: PathStepState[];
  done: number;
  total: number;
  percent: number;
  complete: boolean;
  /** Estimated minutes left in this module. */
  minutesLeft: number;
}

export interface PathProgress {
  path: LearningPathDoc;
  modules: PathModuleState[];
  done: number;
  total: number;
  percent: number;
  minutesLeft: number;
  complete: boolean;
  started: boolean;
  startedAt: number | null;
  completedAt: number | null;
  /** The first unfinished step, or null when the path is done. */
  nextStep: PathStepState | null;
}

export function getPathProgress(
  path: LearningPathDoc,
  completions = getCompletions(),
  records = getPathRecords(),
): PathProgress {
  const modules: PathModuleState[] = path.modules.map((entry) => {
    const steps: PathStepState[] = entry.steps.map((step) => {
      const completionId = completionIdForHref(step.href);
      return {
        step,
        completionId,
        complete: isComplete(completionId, completions),
        completedAt: completedAt(completionId, completions),
      };
    });

    const done = steps.filter((state) => state.complete).length;
    return {
      module: entry,
      steps,
      done,
      total: steps.length,
      percent: steps.length > 0 ? Math.round((done / steps.length) * 100) : 0,
      complete: steps.length > 0 && done === steps.length,
      minutesLeft: steps
        .filter((state) => !state.complete)
        .reduce((sum, state) => sum + state.step.minutes, 0),
    };
  });

  const all = modules.flatMap((entry) => entry.steps);
  const done = all.filter((state) => state.complete).length;
  const record = records[path.id];
  const complete = all.length > 0 && done === all.length;

  // A finished path always has a date, even if its record was lost or the
  // completions came in from an import: the last step's own timestamp is the
  // day the path was finished.
  const lastTick = all.reduce((latest, state) => Math.max(latest, state.completedAt ?? 0), 0);

  return {
    path,
    modules,
    done,
    total: all.length,
    percent: all.length > 0 ? Math.round((done / all.length) * 100) : 0,
    minutesLeft: all
      .filter((state) => !state.complete)
      .reduce((sum, state) => sum + state.step.minutes, 0),
    complete,
    started: done > 0,
    startedAt: record?.startedAt ?? null,
    completedAt: record?.completedAt ?? (complete && lastTick > 0 ? lastTick : null),
    nextStep: all.find((state) => !state.complete) ?? null,
  };
}

export function getAllPathProgress(): PathProgress[] {
  const completions = getCompletions();
  const records = getPathRecords();
  return paths.map((path) => getPathProgress(path, completions, records));
}

/**
 * Re-stamp every path record from the completion map.
 *
 * Completing one SOP can advance three paths at once, so this runs after
 * every completion change rather than only inside the path UI.
 */
export function syncAllPathRecords(): void {
  const completions = getCompletions();
  const records = getPathRecords();
  for (const path of paths) {
    const progress = getPathProgress(path, completions, records);
    syncPathRecord(path.id, path.title, progress.done, progress.total);
  }
}

/** Tick or untick one step of a path. Returns the state it ended up in. */
export function togglePathStep(step: PathStepEntry): boolean {
  return toggleComplete(completionIdForHref(step.href), step.title, step.href);
}

/** Tick every remaining step in a module — the "mark this week done" action. */
export function completeModule(entry: PathModuleState): void {
  for (const state of entry.steps) {
    if (!state.complete) {
      toggleComplete(state.completionId, state.step.title, state.step.href);
    }
  }
}

/* ------------------------------------------------------------------ *
 * Mastery and weak areas
 * ------------------------------------------------------------------ */

export interface TopicMastery {
  topic: string;
  /** Questions in the bank on this topic. */
  total: number;
  /** Questions answered at least once. */
  seen: number;
  /** Answered correctly twice in a row or better. */
  mastered: number;
  /** Lifetime correct / lifetime answers, as a percentage. */
  accuracy: number;
  /** Total answers given on this topic. */
  answers: number;
}

/**
 * Per-topic roll-up of the quiz mastery map. Only topics present in the bank
 * appear, in the controlled `QUIZ_TOPICS` order.
 */
export function getTopicMastery(mastery: MasteryMap = getMastery()): TopicMastery[] {
  const rows = new Map<string, TopicMastery>(
    QUIZ_TOPICS.map((topic) => [
      topic,
      { topic, total: 0, seen: 0, mastered: 0, accuracy: 0, answers: 0 },
    ]),
  );
  const tally = new Map<string, { correct: number; seen: number }>(
    QUIZ_TOPICS.map((topic) => [topic, { correct: 0, seen: 0 }]),
  );

  for (const quiz of quizzes) {
    for (const question of quiz.questions) {
      const row = rows.get(question.topic);
      if (!row) continue;
      // The mock exam re-uses questions from the graded sets: count once.
      if (quiz.id === "mock-exam") continue;
      row.total += 1;
    }
  }

  for (const [questionId, entry] of Object.entries(mastery)) {
    const question = findQuestion(questionId);
    if (!question) continue;
    const row = rows.get(question.topic);
    const counts = tally.get(question.topic);
    if (!row || !counts) continue;
    row.seen += 1;
    if (entry.streak >= 2) row.mastered += 1;
    counts.correct += entry.correct;
    counts.seen += entry.seen;
  }

  return QUIZ_TOPICS.map((topic) => {
    const row = rows.get(topic) as TopicMastery;
    const counts = tally.get(topic) ?? { correct: 0, seen: 0 };
    return {
      ...row,
      answers: counts.seen,
      accuracy: counts.seen > 0 ? Math.round((counts.correct / counts.seen) * 100) : 0,
    };
  }).filter((row) => row.total > 0);
}

export interface WeakArea {
  id: string;
  label: string;
  /** "Quiz topic" or "Interview category". */
  source: string;
  /** Accuracy or self-assessed score, 0-100. */
  score: number;
  /** How many answers the score is based on. */
  sample: number;
  /** Where to go to fix it. */
  href: string;
  action: string;
  why: string;
}

/** The quiz whose question set covers a topic most heavily. */
function bestQuizForTopic(topic: string): string {
  let bestId = "beginner";
  let bestCount = -1;
  for (const quiz of quizzes) {
    if (quiz.id === "mock-exam") continue;
    const count = quiz.questions.filter((question) => question.topic === topic).length;
    if (count > bestCount) {
      bestCount = count;
      bestId = quiz.id;
    }
  }
  return bestId;
}

/** The first question in a category the learner has not practised yet. */
function nextInterviewQuestion(category: InterviewCategory): string | undefined {
  const practised = new Set(getPractised().map((entry) => entry.id));
  const questions = questionsByCategory(category);
  const unpractised = questions.find((question) => !practised.has(question.id));
  return (unpractised ?? questions[0])?.id;
}

/**
 * Everything scoring below the pass mark, weakest first, with a link that
 * actually fixes it rather than a generic "go practise".
 */
export function getWeakAreas(limit = 6): WeakArea[] {
  const areas: WeakArea[] = [];

  for (const row of getTopicMastery()) {
    if (row.answers < 2 || row.accuracy >= QUIZ_PASS_MARK) continue;
    const quizId = bestQuizForTopic(row.topic);
    const quiz = quizzes.find((entry) => entry.id === quizId);
    areas.push({
      id: `topic-${row.topic}`,
      label: row.topic,
      source: "Quiz topic",
      score: row.accuracy,
      sample: row.answers,
      href: `/quizzes/${quizId}`,
      action: quiz ? `Redo ${quiz.title}` : "Practise this",
      why: `${row.accuracy}% lifetime accuracy across ${row.answers} answers — under the ${QUIZ_PASS_MARK}% pass mark.`,
    });
  }

  const mocks = getMockHistory();
  if (mocks.length > 0) {
    for (const bucket of weakCategories(mocks[0].rows)) {
      const questionId = nextInterviewQuestion(bucket.category);
      areas.push({
        id: `category-${bucket.category}`,
        label: bucket.category,
        source: "Interview category",
        score: bucket.percent,
        sample: bucket.answered,
        href: questionId ? `/interviews/${questionId}` : "/interviews",
        action: "Rehearse the answer",
        why: `Self-scored ${bucket.percent}% on ${bucket.answered} question${bucket.answered === 1 ? "" : "s"} in your last mock — under ${INTERVIEW_PASS_MARK}%.`,
      });
    }
  }

  return areas.sort((a, b) => a.score - b.score).slice(0, limit);
}

/* ------------------------------------------------------------------ *
 * Overview
 * ------------------------------------------------------------------ */

export interface ProgressOverview {
  resourcesCompleted: number;
  resourcesTotal: number;
  resourcePercent: number;
  minutesInvested: number;

  quizAttempts: number;
  quizzesPassed: number;
  bestQuizScore: number | null;
  averageQuizScore: number | null;
  questionsSeen: number;
  questionsTotal: number;
  dueForReview: number;

  mockInterviews: number;
  bestMockScore: number | null;
  interviewsPractised: number;
  interviewsTotal: number;

  bookmarks: number;
  pathsStarted: number;
  pathsCompleted: number;

  streak: StreakSummary;
  xp: XpSummary;
  level: LevelSummary;

  lastActiveAt: number | null;
  /** True when there is nothing at all to show yet. */
  empty: boolean;
}

export function getOverview(now = Date.now()): ProgressOverview {
  const completions = getCompletions();
  const completedIds = Object.keys(completions);
  const attempts = getAttempts();
  const mocks = getMockHistory();
  const mastery = getMastery();
  const paths = getPathRecords();
  const streak = getStreak(now);
  const xp = getXp();

  const minutes = completedIds.reduce((sum, id) => sum + (indexById(id)?.minutes ?? 0), 0);
  const quizMinutes = attempts.reduce((sum, attempt) => sum + attempt.durationMs / 60000, 0);
  const mockMinutes = mocks.reduce((sum, attempt) => sum + attempt.totalSeconds / 60, 0);

  const scores = attempts.map((attempt) => attempt.score);
  const passedQuizIds = new Set(
    attempts.filter((attempt) => attempt.passed).map((attempt) => attempt.quizId),
  );

  const pathRecords = Object.values(paths);
  const lastActive = [
    ...attempts.map((attempt) => attempt.finishedAt),
    ...mocks.map((attempt) => attempt.finishedAt),
    ...Object.values(completions),
  ].reduce<number | null>((latest, value) => (latest === null || value > latest ? value : latest), null);

  const trackedCompleted = completedIds.filter((id) => TRACKED_IDS.has(id)).length;

  return {
    resourcesCompleted: trackedCompleted,
    resourcesTotal: trackedResources.length,
    resourcePercent:
      trackedResources.length > 0
        ? Math.round((trackedCompleted / trackedResources.length) * 100)
        : 0,
    minutesInvested: Math.round(minutes + quizMinutes + mockMinutes),

    quizAttempts: attempts.length,
    quizzesPassed: passedQuizIds.size,
    bestQuizScore: scores.length > 0 ? Math.max(...scores) : null,
    averageQuizScore:
      scores.length > 0
        ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10
        : null,
    questionsSeen: Object.keys(mastery).length,
    questionsTotal: TOTAL_QUESTIONS,
    dueForReview: dueReviewIds(now).length,

    mockInterviews: mocks.length,
    bestMockScore: mocks.length > 0 ? Math.max(...mocks.map((attempt) => attempt.score)) : null,
    interviewsPractised: getPractised().length,
    interviewsTotal: TOTAL_INTERVIEW_QUESTIONS,

    bookmarks: Object.keys(getBookmarkMap()).length + getInterviewBookmarks().length,
    pathsStarted: pathRecords.length,
    pathsCompleted: pathRecords.filter((record) => record.completedAt !== null).length,

    streak,
    xp,
    level: getLevel(xp.total),

    lastActiveAt: lastActive,
    empty:
      completedIds.length === 0 &&
      attempts.length === 0 &&
      mocks.length === 0 &&
      pathRecords.length === 0,
  };
}

/** The empty overview, for the server render and the hydrating render. */
export const EMPTY_OVERVIEW: ProgressOverview = {
  resourcesCompleted: 0,
  resourcesTotal: trackedResources.length,
  resourcePercent: 0,
  minutesInvested: 0,
  quizAttempts: 0,
  quizzesPassed: 0,
  bestQuizScore: null,
  averageQuizScore: null,
  questionsSeen: 0,
  questionsTotal: TOTAL_QUESTIONS,
  dueForReview: 0,
  mockInterviews: 0,
  bestMockScore: null,
  interviewsPractised: 0,
  interviewsTotal: TOTAL_INTERVIEW_QUESTIONS,
  bookmarks: 0,
  pathsStarted: 0,
  pathsCompleted: 0,
  streak: EMPTY_STREAK_SUMMARY,
  xp: { total: 0, lines: [] },
  level: {
    tier: LEVEL_TIERS[0],
    next: LEVEL_TIERS[1],
    xp: 0,
    into: 0,
    span: LEVEL_TIERS[1].threshold,
    remaining: LEVEL_TIERS[1].threshold,
    percent: 0,
  },
  lastActiveAt: null,
  empty: true,
};

/* ------------------------------------------------------------------ *
 * Quiz score trend
 * ------------------------------------------------------------------ */

export interface ScorePoint {
  /** 1-based attempt number in chronological order. */
  index: number;
  at: number;
  day: string;
  score: number;
  title: string;
  /** Running average up to and including this attempt. */
  average: number;
}

/** Quiz attempts oldest first, with a running average for the trend line. */
export function getScoreTrend(limit = 20): ScorePoint[] {
  const attempts = [...getAttempts()].sort((a, b) => a.finishedAt - b.finishedAt).slice(-limit);
  let running = 0;

  return attempts.map((attempt, index) => {
    running += attempt.score;
    return {
      index: index + 1,
      at: attempt.finishedAt,
      day: dayKey(attempt.finishedAt),
      score: attempt.score,
      title: attempt.title,
      average: Math.round((running / (index + 1)) * 10) / 10,
    };
  });
}

/* ------------------------------------------------------------------ *
 * Level coverage (for the quiz mastery strip)
 * ------------------------------------------------------------------ */

export interface LevelCoverage {
  level: Level;
  label: string;
  tone: Tone;
  total: number;
  seen: number;
  percent: number;
}

export function getLevelCoverage(mastery: MasteryMap = getMastery()): LevelCoverage[] {
  const rows = new Map<Level, LevelCoverage>();
  for (const quiz of quizzes) {
    if (quiz.id === "mock-exam") continue;
    const meta = QUIZ_LEVEL_META[quiz.level];
    rows.set(quiz.level, {
      level: quiz.level,
      label: meta.label,
      tone: meta.tone,
      total: quiz.questions.length,
      seen: quiz.questions.filter((question) => Boolean(mastery[question.id])).length,
      percent: 0,
    });
  }
  return Array.from(rows.values()).map((row) => ({
    ...row,
    percent: row.total > 0 ? Math.round((row.seen / row.total) * 100) : 0,
  }));
}

/* ------------------------------------------------------------------ *
 * Export / import / reset
 * ------------------------------------------------------------------ */

export const EXPORT_FORMAT = "ppc-academy/progress";
export const EXPORT_VERSION = 1;

export interface ProgressExport {
  format: typeof EXPORT_FORMAT;
  version: number;
  exportedAt: string;
  /** Namespaced keys with the `ppc-academy:` prefix stripped. */
  data: Record<string, unknown>;
}

function unprefix(key: string): string {
  return key.startsWith(STORAGE_PREFIX) ? key.slice(STORAGE_PREFIX.length) : key;
}

/**
 * Everything this browser holds for PPC Academy — progress, quiz attempts,
 * interview mocks, feedback drafts — minus the theme, which belongs to the
 * device rather than the learner.
 */
export function exportAll(): ProgressExport {
  const data: Record<string, unknown> = {};
  for (const key of storageKeys()) {
    if (key === THEME_STORAGE_KEY) continue;
    const value = storageGet<unknown>(key, null);
    if (value !== null) data[unprefix(key)] = value;
  }

  return {
    format: EXPORT_FORMAT,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  };
}

/** Pretty-printed, ready for a download or the clipboard. */
export function exportAllJson(): string {
  return JSON.stringify(exportAll(), null, 2);
}

/** A filename that sorts chronologically: ppc-academy-progress-2026-09-15.json */
export function exportFilename(now = Date.now()): string {
  return `ppc-academy-progress-${dayKey(now)}.json`;
}

export interface ImportResult {
  ok: boolean;
  imported: number;
  error?: string;
  exportedAt?: string;
}

/**
 * Replace this browser's records with the contents of an export.
 *
 * Deliberately destructive for the keys present in the file — a half-merged
 * history would produce numbers that belong to nobody. Keys the file does
 * not mention are left alone, so importing an old progress-only file never
 * wipes a quiz history it predates.
 */
export function importAll(json: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, imported: 0, error: "That file is not valid JSON." };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, imported: 0, error: "That file does not contain a progress record." };
  }

  const candidate = parsed as Partial<ProgressExport>;
  if (candidate.format !== EXPORT_FORMAT) {
    return {
      ok: false,
      imported: 0,
      error: "That file was not exported by PPC Academy.",
    };
  }
  if (!candidate.data || typeof candidate.data !== "object") {
    return { ok: false, imported: 0, error: "The export is missing its data block." };
  }

  let imported = 0;
  for (const [key, value] of Object.entries(candidate.data)) {
    if (!key || key === unprefix(THEME_STORAGE_KEY)) continue;
    storageSet(storageKey(key), value);
    imported += 1;
  }

  return {
    ok: true,
    imported,
    exportedAt: typeof candidate.exportedAt === "string" ? candidate.exportedAt : undefined,
  };
}

/** Wipe every record, keeping only the theme choice. */
export function resetAll(): void {
  for (const key of storageKeys()) {
    if (key === THEME_STORAGE_KEY) continue;
    storageRemove(key);
  }
}

/* ------------------------------------------------------------------ *
 * Re-exports so a consumer only needs one import
 * ------------------------------------------------------------------ */

export { QUIZ_PASS_MARK, INTERVIEW_PASS_MARK };
export type { MasteryMap, MockAttempt, QuizAttempt };
