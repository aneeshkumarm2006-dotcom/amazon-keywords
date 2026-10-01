import {
  BookOpen,
  BookOpenCheck,
  Bot,
  Calculator,
  CircleGauge,
  CircleUser,
  ClipboardList,
  Compass,
  FileSpreadsheet,
  GraduationCap,
  Home,
  LayoutDashboard,
  Library,
  type LucideIcon,
  Map,
  MessageSquareQuote,
  Mic,
  Route,
  ScrollText,
  Search,
  Sparkles,
  Target,
  Terminal,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

/**
 * The single nav model. It drives the desktop mega-menu, the mobile drawer
 * and the footer columns, so a route only has to be described once.
 *
 * Later phases may APPEND a link to an existing group (or append a whole
 * group) — never restructure what is already here.
 */

export interface NavLink {
  label: string;
  href: string;
  /** One short line shown under the label in the mega-menu and drawer. */
  description: string;
  icon: LucideIcon;
  /** Optional tiny tag, e.g. "50 questions". */
  meta?: string;
}

export interface NavGroup {
  id: string;
  label: string;
  /** Shown at the top of the mega-menu panel. */
  description: string;
  links: NavLink[];
}

export const NAV: NavGroup[] = [
  {
    id: "train",
    label: "Train",
    description: "Test what you know, then prove it under interview pressure.",
    links: [
      {
        label: "Quizzes",
        href: "/quizzes",
        description: "126 questions across five difficulty levels, scored instantly.",
        icon: Target,
        meta: "126 questions",
      },
      {
        label: "Interview prep",
        href: "/interviews",
        description: "117 real PPC interview questions with ideal-answer guides.",
        icon: MessageSquareQuote,
        meta: "117 Q&As",
      },
      {
        label: "Mock interview",
        href: "/interviews/mock",
        description: "Timed questions, a typed answer box, then score yourself.",
        icon: Mic,
      },
      {
        label: "Case studies",
        href: "/case-studies",
        description: "Twelve accounts with before/after metrics and the exact fixes.",
        icon: TrendingUp,
        meta: "12 accounts",
      },
      {
        label: "Learning paths",
        href: "/paths",
        description: "Sequenced routes from first campaign to account lead.",
        icon: Route,
      },
    ],
  },
  {
    id: "operate",
    label: "Operate",
    description: "The day-to-day system: what to do, when, and in what order.",
    links: [
      {
        label: "SOPs",
        href: "/sops",
        description: "Eight standard operating procedures with decision rules.",
        icon: ClipboardList,
        meta: "8 SOPs",
      },
      {
        label: "Workflows",
        href: "/workflows",
        description: "Six process maps and decision trees you can follow live.",
        icon: Workflow,
        meta: "6 maps",
      },
      {
        label: "Templates",
        href: "/templates",
        description: "Campaign builds, reports, audits and client comms.",
        icon: FileSpreadsheet,
        meta: "7 templates",
      },
      {
        label: "Automation",
        href: "/automation",
        description: "Tool comparison, bid rules and the automation maturity model.",
        icon: Bot,
      },
      // PPC console — personal tool, data stays in the browser
      {
        label: "PPC Console",
        href: "/dashboard",
        description: "Upload search term reports, get harvest, negative and bid calls.",
        icon: CircleGauge,
        meta: "Personal",
      },
    ],
  },
  {
    id: "reference",
    label: "Reference",
    description: "Look it up fast — formulas, definitions, and the maths.",
    links: [
      {
        label: "Cheat sheets",
        href: "/cheat-sheets",
        description: "One-page references for match types, metrics and bid maths.",
        icon: ScrollText,
      },
      {
        label: "Glossary",
        href: "/glossary",
        description: "Every acronym a PPC specialist is expected to know cold.",
        icon: BookOpen,
      },
      {
        label: "Calculators",
        href: "/calculators",
        description: "ACoS, ROAS, break-even, bid and budget maths in the browser.",
        icon: Calculator,
        meta: "7 tools",
      },
      {
        label: "Scripts",
        href: "/scripts",
        description: "Copy-paste Google Sheets and reporting automation snippets.",
        icon: Terminal,
        meta: "14 assets",
      },
    ],
  },
  {
    id: "career",
    label: "Career",
    description: "Turn the skill into an offer, a rate, and a track record.",
    links: [
      {
        label: "Career guide",
        href: "/career",
        description: "VA to PPC specialist: levels, salaries, resume and portfolio.",
        icon: GraduationCap,
      },
      {
        label: "Progress",
        href: "/progress",
        description: "Your quiz scores, completed SOPs and path progress.",
        icon: LayoutDashboard,
      },
      {
        label: "Search",
        href: "/search",
        description: "Full-text search across every resource on the site.",
        icon: Search,
      },
      {
        label: "Contribute",
        href: "/contribute",
        description: "Add a case study, fix a number, or suggest a question.",
        icon: Users,
      },
      // phase 8 — community contributions
      {
        label: "Contribution guidelines",
        href: "/contribute/guidelines",
        description: "The bar each resource type has to clear, plus a pre-flight checklist.",
        icon: BookOpenCheck,
      },
      {
        label: "Public roadmap",
        href: "/contribute/roadmap",
        description: "What is shipped, what is in flight, and what you can claim today.",
        icon: Map,
      },
    ],
  },
];

/** Routes that get their own slot in the header outside the mega-menus. */
export const SEARCH_ROUTE = "/search";

/** Small set of links surfaced in the mobile drawer footer and the 404 page. */
export const QUICK_LINKS: NavLink[] = [
  {
    label: "Start the diagnostic quiz",
    href: "/quizzes",
    description: "Fifteen minutes to find out what you actually know.",
    icon: Target,
  },
  {
    label: "Browse every resource",
    href: "/search",
    description: "One search box across quizzes, SOPs, templates and case studies.",
    icon: Compass,
  },
  {
    label: "Read the daily health check SOP",
    href: "/sops",
    description: "The 15-minute routine every PPC account needs each morning.",
    icon: Sparkles,
  },
  {
    label: "Open the resource library",
    href: "/cheat-sheets",
    description: "Formulas, benchmarks and match-type references.",
    icon: Library,
  },
];

/** Flat list of every nav destination — handy for sitemaps and prefetching. */
export const ALL_NAV_LINKS: NavLink[] = NAV.flatMap((group) => group.links);

/** Find the nav group that owns a pathname, e.g. "/sops/daily" -> "operate". */
export function navGroupForPath(pathname: string): NavGroup | undefined {
  return NAV.find((group) =>
    group.links.some(
      (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
    ),
  );
}

/** Find the nav link that owns a pathname. */
export function navLinkForPath(pathname: string): NavLink | undefined {
  return ALL_NAV_LINKS.find(
    (link) => pathname === link.href || pathname.startsWith(`${link.href}/`),
  );
}

/** True when a header/drawer item should render as the current section. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ------------------------------------------------------------------ *
 * phase 10 — mobile tab bar
 * ------------------------------------------------------------------ */

export interface MobileTab {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Longer name for screen readers, when the two-word label is ambiguous. */
  ariaLabel: string;
  /** Route prefixes that also light this tab up. */
  matches: string[];
}

/**
 * The five destinations on the phone tab bar. Every route in the site maps to
 * exactly one of them via `matches`, so the bar always shows where you are.
 */
export const MOBILE_TABS: MobileTab[] = [
  {
    label: "Home",
    href: "/",
    icon: Home,
    ariaLabel: "Home",
    matches: [],
  },
  {
    label: "Learn",
    href: "/paths",
    icon: Library,
    ariaLabel: "Learn — paths, SOPs, workflows and references",
    matches: [
      "/paths",
      "/sops",
      "/workflows",
      "/templates",
      "/automation",
      "/cheat-sheets",
      "/glossary",
      "/case-studies",
      "/career",
      "/contribute",
    ],
  },
  {
    label: "Quiz",
    href: "/quizzes",
    icon: Target,
    ariaLabel: "Quiz — quizzes and interview practice",
    matches: ["/quizzes", "/interviews"],
  },
  {
    label: "Tools",
    href: "/calculators",
    icon: Calculator,
    ariaLabel: "Tools — calculators, scripts, search and the PPC console",
    matches: ["/calculators", "/scripts", "/search", "/dashboard"],
  },
  {
    label: "Me",
    href: "/progress",
    icon: CircleUser,
    ariaLabel: "Me — your progress and saved pages",
    matches: ["/progress", "/offline"],
  },
];

/** The tab that owns a pathname, falling back to Home on the index route. */
export function activeMobileTab(pathname: string): MobileTab | undefined {
  if (pathname === "/") return MOBILE_TABS[0];
  return MOBILE_TABS.find((tab) =>
    [tab.href, ...tab.matches].some(
      (prefix) => prefix !== "/" && (pathname === prefix || pathname.startsWith(`${prefix}/`)),
    ),
  );
}
