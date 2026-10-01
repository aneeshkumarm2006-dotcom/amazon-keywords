"use client";

import { CalendarClock, Flame, Pencil, Target, Trophy, Zap } from "lucide-react";
import { useCallback, useId, useState } from "react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { TONE_SOFT_BG, TONE_TEXT } from "@/components/ui/tone";
import {
  AVATAR_COLOURS,
  GOAL_ROLES,
  daysUntil,
  findGoalRole,
  profileInitials,
  setProfile,
  type AvatarColour,
  type ProgressOverview,
} from "@/lib/progress";
import { cn, formatDate, formatNumber } from "@/lib/utils";

import { LevelRing } from "./LevelRing";
import { useHydrated, useProfile } from "./useProgress";

const COLOUR_SWATCH: Record<AvatarColour, string> = {
  brand: "bg-brand",
  ember: "bg-ember",
  info: "bg-info",
  good: "bg-good",
  warn: "bg-warn",
  bad: "bg-bad",
};

const COLOUR_NAME: Record<AvatarColour, string> = {
  brand: "Emerald",
  ember: "Ember",
  info: "Blue",
  good: "Green",
  warn: "Amber",
  bad: "Red",
};

export interface ProfileHeaderProps {
  overview: ProgressOverview;
}

/**
 * The dashboard's identity block: who you are, what you are aiming at, and
 * how far through the current level you have got.
 *
 * "Who you are" is a name typed into this browser. There is no account, no
 * sign-in and nothing transmitted — which is worth saying on the surface
 * rather than burying it in a privacy note.
 */
export function ProfileHeader({ overview }: ProfileHeaderProps) {
  const profile = useProfile();
  const hydrated = useHydrated();
  const [open, setOpen] = useState(false);
  const formId = useId();

  const [draftName, setDraftName] = useState(profile.displayName);
  const [draftGoal, setDraftGoal] = useState(profile.goalRole);
  const [draftDate, setDraftDate] = useState(profile.targetDate);
  const [draftColour, setDraftColour] = useState<AvatarColour>(profile.avatarColour);

  // Seeded at open time rather than in an effect, so an abandoned edit never
  // lingers and the first open after hydration picks up the stored values.
  const openDialog = useCallback(() => {
    setDraftName(profile.displayName);
    setDraftGoal(profile.goalRole);
    setDraftDate(profile.targetDate);
    setDraftColour(profile.avatarColour);
    setOpen(true);
  }, [profile]);

  const save = useCallback(() => {
    setProfile({
      displayName: draftName.trim().slice(0, 40),
      goalRole: draftGoal,
      targetDate: draftDate,
      avatarColour: draftColour,
    });
    setOpen(false);
  }, [draftColour, draftDate, draftGoal, draftName]);

  const goal = findGoalRole(profile.goalRole);
  const countdown = daysUntil(profile.targetDate);
  const { level, streak, xp } = overview;
  const named = hydrated && profile.displayName.trim().length > 0;

  return (
    <>
      <section
        aria-labelledby="profile-heading"
        className="overflow-hidden rounded-2xl border border-hairline bg-surface"
      >
        <div className="flex flex-col gap-6 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <span
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-canvas",
                COLOUR_SWATCH[profile.avatarColour],
              )}
              aria-hidden="true"
            >
              {named ? profileInitials(profile.displayName) : "PPC"}
            </span>

            <div className="min-w-0">
              <p className="font-mono text-[0.6875rem] font-medium tracking-[0.14em] text-brand uppercase">
                Local profile · this browser only
              </p>
              <h2
                id="profile-heading"
                className="mt-1 text-2xl leading-tight font-bold text-ink sm:text-[1.75rem]"
              >
                {named ? profile.displayName : "Your progress"}
              </h2>

              <div className="mt-2.5 flex flex-wrap items-center gap-2">
                {goal ? (
                  <Badge tone="brand" variant="soft" icon={Target}>
                    Goal: {goal.label}
                  </Badge>
                ) : (
                  <Badge tone="neutral" variant="outline" icon={Target}>
                    No goal role set
                  </Badge>
                )}
                {countdown !== null ? (
                  <Badge
                    tone={countdown < 0 ? "neutral" : countdown <= 14 ? "ember" : "info"}
                    variant="soft"
                    icon={CalendarClock}
                  >
                    {countdown < 0
                      ? `Target passed ${formatDate(profile.targetDate)}`
                      : countdown === 0
                        ? "Target is today"
                        : `${countdown} day${countdown === 1 ? "" : "s"} to ${formatDate(profile.targetDate)}`}
                  </Badge>
                ) : null}
              </div>

              {goal ? (
                <p className="mt-2.5 max-w-xl text-[0.8125rem] leading-relaxed text-muted">
                  {goal.blurb} <span className="text-faint">{goal.salary}</span>
                </p>
              ) : (
                <p className="mt-2.5 max-w-xl text-[0.8125rem] leading-relaxed text-muted">
                  Add a name and a goal role and this page starts measuring the gap
                  between where you are and the rung you are aiming at.
                </p>
              )}

              <Button
                variant="secondary"
                size="sm"
                icon={Pencil}
                onClick={openDialog}
                className="mt-4"
              >
                {named ? "Edit profile" : "Set up your profile"}
              </Button>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-5 rounded-xl border border-hairline bg-canvas p-4 sm:gap-6">
            <LevelRing
              percent={level.percent}
              label={`L${level.tier.index}`}
              caption={level.next ? `${level.percent}%` : "Max"}
              tone={level.tier.tone}
              size={88}
              srLabel={`Level ${level.tier.index}, ${level.tier.name}. ${level.percent}% of the way to the next level.`}
            />
            <div className="min-w-0">
              <p className="font-display text-base leading-snug font-semibold text-ink">
                {level.tier.name}
              </p>
              <p className="mt-0.5 max-w-[16rem] text-[0.8125rem] leading-relaxed text-muted">
                {level.next
                  ? `${formatNumber(level.remaining)} XP to ${level.next.name}`
                  : "Top tier reached. Everything in the library, proven."}
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold",
                    TONE_SOFT_BG.brand,
                    TONE_TEXT.brand,
                  )}
                >
                  <Zap className="size-3" aria-hidden="true" />
                  <span className="tabular">{formatNumber(xp.total)} XP</span>
                </span>
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold",
                    streak.current > 0 ? TONE_SOFT_BG.ember : TONE_SOFT_BG.neutral,
                    streak.current > 0 ? TONE_TEXT.ember : TONE_TEXT.neutral,
                  )}
                >
                  <Flame className="size-3" aria-hidden="true" />
                  <span className="tabular">{streak.current} day streak</span>
                </span>
                {streak.longest > 0 ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[0.6875rem] font-semibold",
                      TONE_SOFT_BG.neutral,
                      TONE_TEXT.neutral,
                    )}
                  >
                    <Trophy className="size-3" aria-hidden="true" />
                    <span className="tabular">best {streak.longest}</span>
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title="Your profile"
        description="Stored in this browser under the ppc-academy namespace. Never sent anywhere, and included in your JSON export."
        footer={
          <>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={save}>Save profile</Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <Input
            id={`${formId}-name`}
            label="Display name"
            hint="Only you see this. It appears on your printed path certificates."
            value={draftName}
            maxLength={40}
            placeholder="e.g. Maria Santos"
            onChange={(event) => setDraftName(event.target.value)}
          />

          <Select
            id={`${formId}-goal`}
            label="Goal role"
            hint="The rung you are training for. Used to frame the gap on this page."
            placeholder="Not decided yet"
            value={draftGoal}
            options={GOAL_ROLES.map((role) => ({
              value: role.id,
              label: `${role.label} — ${role.salary}`,
            }))}
            onChange={(event) => setDraftGoal(event.target.value)}
          />

          <Input
            id={`${formId}-date`}
            type="date"
            label="Target date"
            hint="Optional. A date turns the goal into a countdown."
            value={draftDate}
            onChange={(event) => setDraftDate(event.target.value)}
          />

          <fieldset>
            <legend className="mb-2 text-[0.8125rem] font-medium text-ink">Avatar colour</legend>
            <div className="flex flex-wrap gap-2">
              {AVATAR_COLOURS.map((colour) => {
                const active = draftColour === colour;
                return (
                  <button
                    key={colour}
                    type="button"
                    onClick={() => setDraftColour(colour)}
                    aria-pressed={active}
                    className={cn(
                      "inline-flex min-h-11 items-center gap-2 rounded-lg border px-3 text-[0.8125rem] font-medium transition-colors",
                      "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                      active
                        ? "border-hairline-strong bg-surface-2 text-ink"
                        : "border-hairline bg-surface text-muted hover:border-hairline-strong hover:text-ink",
                    )}
                  >
                    <span
                      className={cn("size-4 rounded-full", COLOUR_SWATCH[colour])}
                      aria-hidden="true"
                    />
                    {COLOUR_NAME[colour]}
                  </button>
                );
              })}
            </div>
          </fieldset>
        </div>
      </Dialog>
    </>
  );
}
