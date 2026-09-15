import {
  BookOpen,
  ChartColumn,
  Drama,
  LayoutGrid,
  MessageSquareQuote,
  SlidersHorizontal,
  Stethoscope,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { CATEGORY_META, type InterviewCategory } from "@/content/interviews";

/**
 * UI-layer resolution for the interview domain.
 *
 * The content module stores icons as lucide export names so it stays free of
 * component imports and can be read by anything (search indexing, the
 * registry, a future export script). This is the one place those names become
 * components.
 */

const ICONS: Record<string, LucideIcon> = {
  BookOpen,
  LayoutGrid,
  SlidersHorizontal,
  ChartColumn,
  Wrench,
  Users,
  Stethoscope,
  MessageSquareQuote,
  Drama,
};

/**
 * Resolved once at module scope rather than per render, so a component read
 * out of this record is a static reference and never looks like a component
 * created during render.
 */
export const CATEGORY_ICONS = Object.fromEntries(
  Object.values(CATEGORY_META).map((meta) => [
    meta.category,
    ICONS[meta.iconName] ?? MessageSquareQuote,
  ]),
) as Record<InterviewCategory, LucideIcon>;

export function categoryIcon(category: InterviewCategory): LucideIcon {
  return CATEGORY_ICONS[category] ?? MessageSquareQuote;
}

/** 95 -> "1:35". Used by the mock timer and the report. */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

/** 95 -> "1 min 35 sec", for prose rather than a ticking readout. */
export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe < 60) return `${safe} sec`;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return seconds === 0 ? `${minutes} min` : `${minutes} min ${seconds} sec`;
}
