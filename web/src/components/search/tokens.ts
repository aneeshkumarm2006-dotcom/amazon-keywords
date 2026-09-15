import type { Level, Tone } from "@/types/content";

/**
 * Presentation tokens shared by the search surfaces.
 *
 * The level palette matches `components/doc/DocIndex`, so a level badge means
 * the same colour whether a reader is browsing SOPs or searching everything.
 */

export const LEVEL_TONE: Record<Level, Tone> = {
  beginner: "good",
  intermediate: "info",
  advanced: "warn",
  expert: "bad",
  scenario: "ember",
};

export const LEVEL_LABEL: Record<Level, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
  expert: "Expert",
  scenario: "Scenario",
};
