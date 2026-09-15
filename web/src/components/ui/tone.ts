import type { Tone } from "@/types/content";

/**
 * Token class maps for the seven semantic tones.
 * Components pick a map rather than inventing colours, so a token change in
 * `globals.css` propagates everywhere.
 */

/** Body-size text. Uses the AA-safe ember for small type. */
export const TONE_TEXT: Record<Tone, string> = {
  neutral: "text-muted",
  brand: "text-brand",
  ember: "text-ember-ink",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
};

/** Icons and display-size numerals, where the brighter ember is legible. */
export const TONE_ICON: Record<Tone, string> = {
  neutral: "text-faint",
  brand: "text-brand",
  ember: "text-ember",
  good: "text-good",
  warn: "text-warn",
  bad: "text-bad",
  info: "text-info",
};

/** Tinted fills for chips, wells and callouts. */
export const TONE_SOFT_BG: Record<Tone, string> = {
  neutral: "bg-surface-2",
  brand: "bg-brand-soft",
  ember: "bg-ember-soft",
  good: "bg-good-soft",
  warn: "bg-warn-soft",
  bad: "bg-bad-soft",
  info: "bg-info-soft",
};

/** Hairline borders that pick up the tone. */
export const TONE_BORDER: Record<Tone, string> = {
  neutral: "border-hairline",
  brand: "border-brand/30",
  ember: "border-ember/35",
  good: "border-good/30",
  warn: "border-warn/35",
  bad: "border-bad/30",
  info: "border-info/30",
};

/** Solid accent bars and rules. */
export const TONE_SOLID_BG: Record<Tone, string> = {
  neutral: "bg-hairline-strong",
  brand: "bg-brand",
  ember: "bg-ember",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
};

export const TONES: Tone[] = ["neutral", "brand", "ember", "good", "warn", "bad", "info"];
