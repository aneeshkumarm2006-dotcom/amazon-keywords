"use client";

import { ArrowLeft, Calculator, Plus, RotateCcw, Save, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import {
  breakEvenFromUnits,
  GOAL_MULTIPLIERS,
  saveStore,
  targetForGoal,
  type GoalMode,
  type HarvestDestination,
  type Store,
} from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { count, pct, plural } from "./format";
import { FormSection, NumField } from "./FormBits";
import { useBulk, useStoreCounts } from "./hooks";
import { CURRENCIES, MARKETPLACE_OPTIONS, SERIES_COUNT, SERIES_NAMES, seriesBg } from "./markets";
import {
  MATCH_KEYS,
  RULE_GROUPS,
  adGroupOptions,
  defaultRulesDraft,
  draftToStore,
  parseLines,
  parseLoose,
  storeToDraft,
  type DraftErrors,
  type StoreDraft,
} from "./storeDraft";

const GOALS: { value: GoalMode; label: string }[] = [
  { value: "profit", label: "Profit" },
  { value: "growth", label: "Growth" },
  { value: "launch", label: "Launch" },
  { value: "liquidate", label: "Liquidate" },
];

const GOAL_NOTE: Record<GoalMode, string> = {
  profit: "Keep margin: target well under break-even.",
  growth: "Trade margin for volume: target near break-even.",
  launch: "Buy rank for a new product: above break-even on purpose (capped at 80%).",
  liquidate: "Clear stock: spend past break-even to move units.",
};

const DEST_MODES: { value: HarvestDestination["mode"]; label: string }[] = [
  { value: "source", label: "Source" },
  { value: "existing", label: "Existing ad group" },
  { value: "new-campaign", label: "New campaign" },
];

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "economics", label: "Economics" },
  { id: "rules", label: "Rules" },
  { id: "terms", label: "Term lists" },
  { id: "destination", label: "Harvest destination" },
];

export interface StoreEditorProps {
  store: Store;
  onBack: () => void;
  onDelete: (store: Store) => void;
}

/** Where the user tried to go with unsaved changes. */
type Leave = { kind: "back" } | { kind: "href"; href: string };

/**
 * Everything that shapes a store's recommendations. Drafts are strings until
 * Save, which validates the lot and writes one record; recommendations for
 * the store recompute from the saved version.
 */
export function StoreEditor({ store, onBack, onDelete }: StoreEditorProps) {
  const [draft, setDraft] = useState<StoreDraft>(() => storeToDraft(store));
  const [baseline, setBaseline] = useState<StoreDraft>(() => storeToDraft(store));
  const [errors, setErrors] = useState<DraftErrors>({});
  const [status, setStatus] = useState<{ tone: "success" | "danger" | "info"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [leave, setLeave] = useState<Leave | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const router = useRouter();

  const { bulk, loading: bulkLoading } = useBulk(store.id);
  const adGroups = useMemo(() => adGroupOptions(bulk), [bulk]);
  const { counts } = useStoreCounts(store.id);

  useEffect(() => {
    window.scrollTo({ top: 0 });
    headingRef.current?.focus();
  }, []);

  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(baseline), [draft, baseline]);

  // Unsaved edits live only in this component: ask before a console tab (or
  // any other in-app link) unmounts it, and let the browser ask before a
  // reload, a close or an external link.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = e.target instanceof Element ? e.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!a || (a.target && a.target !== "_self") || a.hasAttribute("download")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return; // a full page load: beforeunload asks
      if (url.pathname === window.location.pathname && url.search === window.location.search && url.hash) return; // the section links
      // Capture phase on document: Next's <Link> never sees the click.
      e.preventDefault();
      e.stopPropagation();
      setLeave({ kind: "href", href: `${url.pathname}${url.search}${url.hash}` });
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("click", onClick, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("click", onClick, true);
    };
  }, [dirty]);
  const set = (patch: Partial<StoreDraft>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setStatus(null);
  };
  const setRule = (key: keyof StoreDraft["rules"], value: string) => {
    setDraft((d) => ({ ...d, rules: { ...d.rules, [key]: value } }));
    setStatus(null);
  };
  const err = (path: string) => errors[path];

  /** True when the store was saved. */
  const save = async (): Promise<boolean> => {
    const res = draftToStore(draft, store, adGroups);
    setErrors(res.errors);
    if (!res.store) {
      const n = Object.keys(res.errors).length;
      setStatus({ tone: "danger", text: `${plural(n, "field needs", "fields need")} fixing before this can be saved.` });
      const first = Object.keys(res.errors)[0];
      const el = document.getElementById(fieldId(first));
      el?.focus();
      return false;
    }
    setSaving(true);
    try {
      await saveStore(res.store);
      const next = storeToDraft(res.store);
      setDraft(next);
      setBaseline(next);
      setStatus({
        tone: "success",
        text: `Saved at ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}. Recommendations for ${res.store.name} now use these settings.`,
      });
      return true;
    } catch (e) {
      setStatus({ tone: "danger", text: `Could not save: ${e instanceof Error ? e.message : String(e)}` });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const go = (to: Leave) => {
    if (to.kind === "back") onBack();
    else router.push(to.href);
  };
  const back = () => (dirty ? setLeave({ kind: "back" }) : onBack());
  const saveAndLeave = async () => {
    const to = leave;
    setLeave(null);
    if (to && (await save())) go(to);
  };
  const discardAndLeave = () => {
    const to = leave;
    setLeave(null);
    if (!to) return;
    setDraft(baseline);
    go(to);
  };

  const discard = () => {
    setDraft(baseline);
    setErrors({});
    setStatus({ tone: "info", text: "Changes discarded." });
  };

  /* ------------------------------------------------------------ economics */
  const be = parseLoose(draft.breakEven) / 100;
  const tg = parseLoose(draft.target) / 100;
  const suggestion = targetForGoal(be, draft.goal);
  const unitBe = breakEvenFromUnits({
    price: numOrUndef(draft.price),
    cogs: numOrUndef(draft.cogs),
    fbaFee: numOrUndef(draft.fbaFee),
    referralPct: numOrUndef(draft.referralPct) !== undefined ? (numOrUndef(draft.referralPct) as number) / 100 : undefined,
    otherCosts: numOrUndef(draft.otherCosts),
  });
  const aboveBe = Number.isFinite(be) && Number.isFinite(tg) && tg > be + 1e-9;
  const deliberate = draft.goal === "launch" || draft.goal === "liquidate";
  const currencyChanged = draft.currency !== baseline.currency;

  const currencies = Array.from(new Set([...CURRENCIES, draft.currency]));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={back} className="-ml-3 mb-2">
            Back to stores
          </Button>
          <h1 ref={headingRef} tabIndex={-1} className="text-2xl leading-tight font-bold text-ink outline-none sm:text-[1.75rem]">
            Edit {store.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {store.marketplace} · {store.currency}
            {counts ? ` · ${plural(counts.rows, "search term row")} · ${plural(counts.bulk, "bulk entity", "bulk entities")}` : ""}
            {store.demo ? " · demo store" : ""}
          </p>
        </div>
        <Button variant="ghost" icon={Trash2} onClick={() => onDelete(store)} className="-ml-4 self-start sm:ml-0 sm:self-auto">
          Delete store
        </Button>
      </div>

      <nav aria-label="Form sections" className="scroll-well -mx-1 flex gap-1 overflow-x-auto px-1 py-1">
        {SECTIONS.map((s) => (
          <a
            key={s.id}
            href={`#${s.id}`}
            className="inline-flex min-h-9 shrink-0 items-center rounded-full border border-hairline bg-surface px-3 text-[0.8125rem] font-medium text-muted hover:border-hairline-strong hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand [@media(pointer:coarse)]:min-h-11"
          >
            {s.label}
          </a>
        ))}
      </nav>

      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-6"
      >
        {/* ---------------------------------------------------------- basics */}
        <FormSection id="basics" title="Basics" description="Name, marketplace, currency and the colour used for this store everywhere in the console.">
          <div className="grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]">
            <Input
              id={fieldId("name")}
              label="Store name"
              value={draft.name}
              maxLength={60}
              required
              autoComplete="off"
              error={err("name")}
              onChange={(e) => set({ name: e.target.value })}
            />
            <Select
              id={fieldId("marketplace")}
              label="Marketplace"
              value={draft.marketplace}
              options={
                MARKETPLACE_OPTIONS.some((o) => o.value === draft.marketplace)
                  ? MARKETPLACE_OPTIONS
                  : [...MARKETPLACE_OPTIONS, { value: draft.marketplace, label: draft.marketplace }]
              }
              onChange={(e) => set({ marketplace: e.target.value })}
            />
            <Select
              id={fieldId("currency")}
              label="Currency"
              value={draft.currency}
              options={currencies.map((c) => ({ value: c, label: c }))}
              error={err("currency")}
              onChange={(e) => set({ currency: e.target.value })}
            />
          </div>
          {currencyChanged && (counts?.rows ?? 0) > 0 ? (
            <Callout variant="warn">
              <p>
                This store already has {plural(counts?.rows ?? 0, "row")} in {baseline.currency}. Changing the currency relabels those
                amounts; it does not convert them. Only change it if the store was set up with the wrong currency.
              </p>
            </Callout>
          ) : null}
          <fieldset className="min-w-0">
            <legend className="text-[0.8125rem] font-medium text-ink">Colour</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {Array.from({ length: SERIES_COUNT }, (_, i) => {
                const selected = draft.colorIndex === i;
                return (
                  <label
                    key={i}
                    className={cn(
                      "relative inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-3 text-[0.8125rem]",
                      "has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-brand",
                      selected ? "border-brand bg-brand-soft text-ink" : "border-hairline bg-surface text-muted hover:border-hairline-strong",
                    )}
                  >
                    <input
                      type="radio"
                      name={`color-${store.id}`}
                      value={i}
                      checked={selected}
                      onChange={() => set({ colorIndex: i })}
                      className="sr-only"
                    />
                    <span aria-hidden="true" className={cn("size-3.5 rounded-full", seriesBg(i))} />
                    {SERIES_NAMES[i]}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </FormSection>

        {/* ------------------------------------------------------- economics */}
        <FormSection
          id="economics"
          title="Economics"
          description="Break-even is the ceiling (all margin spent on ads); target is what the rules aim for."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              id={fieldId("breakEven")}
              label="Break-even ACoS"
              unit="%"
              value={draft.breakEven}
              onChange={(v) => set({ breakEven: v })}
              error={err("breakEven")}
              hint="(price − all costs) ÷ price. Toolkit default 32%."
            />
            <NumField
              id={fieldId("target")}
              label="Target ACoS"
              unit="%"
              value={draft.target}
              onChange={(v) => set({ target: v })}
              error={err("target")}
              hint="Harvest, bid and expensive-term rules compare against this. Default 30%."
            />
          </div>
          {aboveBe ? (
            <Callout variant={deliberate ? "info" : "warn"} title={deliberate ? "Target above break-even" : "Target is above break-even"}>
              <p>
                {pct(tg)} target vs {pct(be)} break-even:{" "}
                {deliberate
                  ? `fine for ${draft.goal === "launch" ? "a launch" : "liquidation"}, where each ad sale is allowed to lose money.`
                  : "every sale at target ACoS loses money. Lower the target, or switch the goal to Launch or Liquidate if that is the plan."}
              </p>
            </Callout>
          ) : null}

          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-ink" id="goal-label">
              Goal
            </p>
            <SegmentedControl options={GOALS} value={draft.goal} onChange={(goal) => set({ goal })} label="Goal" className="max-w-full overflow-x-auto" />
            <p className="text-xs text-muted">
              {GOAL_NOTE[draft.goal]}{" "}
              {Number.isFinite(suggestion) ? (
                <>
                  Suggested target: <strong className="tabular text-ink">{pct(suggestion)}</strong> ({GOAL_MULTIPLIERS[draft.goal]}×
                  break-even).{" "}
                  {Math.abs(suggestion - tg) > 0.0005 ? (
                    <button
                      type="button"
                      onClick={() => {
                        set({ target: String(Number((suggestion * 100).toFixed(2))) });
                        // This button turns into "In use.": keep focus on the field it filled.
                        requestAnimationFrame(() => document.getElementById(fieldId("target"))?.focus());
                      }}
                      className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand [@media(pointer:coarse)]:inline-flex [@media(pointer:coarse)]:min-h-11 [@media(pointer:coarse)]:items-center"
                    >
                      Use {pct(suggestion)}
                    </button>
                  ) : (
                    <span className="text-good">In use.</span>
                  )}
                </>
              ) : (
                "Enter a break-even to get a suggested target."
              )}
            </p>
          </div>

          <fieldset className="min-w-0 rounded-lg border border-hairline bg-canvas p-4">
            <legend className="px-1 text-[0.8125rem] font-medium text-ink">Unit economics (optional)</legend>
            <p className="mb-3 text-xs text-muted">Per unit, in {draft.currency}. Used to work out break-even for you.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <NumField id={fieldId("price")} label="Price" unit={draft.currency} value={draft.price} onChange={(v) => set({ price: v })} error={err("price")} />
              <NumField id={fieldId("cogs")} label="COGS" unit={draft.currency} value={draft.cogs} onChange={(v) => set({ cogs: v })} error={err("cogs")} />
              <NumField id={fieldId("fbaFee")} label="FBA fee" unit={draft.currency} value={draft.fbaFee} onChange={(v) => set({ fbaFee: v })} error={err("fbaFee")} />
              <NumField
                id={fieldId("referralPct")}
                label="Referral fee"
                unit="%"
                value={draft.referralPct}
                onChange={(v) => set({ referralPct: v })}
                error={err("referralPct")}
                placeholder="15"
              />
              <NumField
                id={fieldId("otherCosts")}
                label="Other costs"
                unit={draft.currency}
                value={draft.otherCosts}
                onChange={(v) => set({ otherCosts: v })}
                error={err("otherCosts")}
              />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink" aria-live="polite">
                {Number.isFinite(unitBe) ? (
                  unitBe > 0 ? (
                    <>
                      Break-even from these numbers: <strong className="tabular">{pct(unitBe)}</strong>
                    </>
                  ) : (
                    <span className="text-bad">These costs leave no margin ({pct(unitBe)}): ads cannot be profitable at this price.</span>
                  )
                ) : (
                  <span className="text-muted">Enter a price to compute break-even.</span>
                )}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={Calculator}
                // The long label wraps on a phone instead of pushing the page sideways.
                className="max-w-full py-1.5 text-left [&>span]:whitespace-normal [&>span]:leading-snug"
                disabled={!(Number.isFinite(unitBe) && unitBe > 0)}
                onClick={() => {
                  const beNext = Number((unitBe * 100).toFixed(2));
                  const t = targetForGoal(unitBe, draft.goal);
                  set({
                    breakEven: String(beNext),
                    ...(Number.isFinite(t) ? { target: String(Number((t * 100).toFixed(2))) } : {}),
                  });
                }}
              >
                Use as break-even (and suggested target)
              </Button>
            </div>
          </fieldset>
        </FormSection>

        {/* ------------------------------------------------------------ rules */}
        <FormSection
          id="rules"
          title="Rules"
          description="Thresholds the recommendation engine uses for this store. Percentages are typed as percent (20 = 20%)."
          actions={
            <Button
              variant="secondary"
              size="sm"
              icon={RotateCcw}
              onClick={() => {
                set(defaultRulesDraft(draft.currency));
                setStatus({ tone: "info", text: "Toolkit defaults loaded into the form. Press Save to keep them." });
              }}
            >
              Reset to toolkit defaults
            </Button>
          }
        >
          {RULE_GROUPS.map((g) => (
            <fieldset key={g.id} className="min-w-0 space-y-3">
              <legend className="font-display text-[0.9375rem] font-semibold text-ink">{g.title}</legend>
              <p className="-mt-1 text-xs text-muted">{g.description}</p>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {g.fields.map((f) => (
                  <NumField
                    key={f.key}
                    id={fieldId(`rules.${f.key}`)}
                    label={f.label}
                    unit={f.kind === "money" ? draft.currency : f.unit}
                    integer={f.kind === "int"}
                    value={draft.rules[f.key]}
                    onChange={(v) => setRule(f.key, v)}
                    error={err(`rules.${f.key}`)}
                    hint={f.hint}
                  />
                ))}
              </div>
              {g.toggles?.length ? (
                <div className="space-y-2.5">
                  {g.toggles.map((t) => (
                    <Checkbox
                      key={t.key}
                      id={fieldId(`toggles.${t.key}`)}
                      label={t.label}
                      hint={t.hint}
                      checked={draft.toggles[t.key]}
                      onChange={(e) => set({ toggles: { ...draft.toggles, [t.key]: e.target.checked } })}
                    />
                  ))}
                </div>
              ) : null}
              {g.id === "harvest" ? (
                <div>
                  <p className="text-[0.8125rem] font-medium text-ink">Match-type bid multipliers</p>
                  <p className="mb-2 text-xs text-muted">Bid-Calculator.xlsx: looser matches convert worse, so they bid lower. Defaults 100 / 85 / 70 / 60%.</p>
                  <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {MATCH_KEYS.map((m) => (
                      <NumField
                        key={m}
                        id={fieldId(`multipliers.${m}`)}
                        label={m[0].toUpperCase() + m.slice(1)}
                        unit="%"
                        value={draft.multipliers[m]}
                        onChange={(v) => set({ multipliers: { ...draft.multipliers, [m]: v } })}
                        error={err(`multipliers.${m}`)}
                      />
                    ))}
                  </div>
                </div>
              ) : null}
              {g.id === "bids" ? <LadderEditor draft={draft} errors={errors} onChange={(ladder) => set({ ladder })} /> : null}
            </fieldset>
          ))}
        </FormSection>

        {/* ------------------------------------------------------- term lists */}
        <FormSection id="terms" title="Term lists" description="One term per line. Matching is by whole words, case-insensitive.">
          <div className="grid gap-4 lg:grid-cols-3">
            <Textarea
              id={fieldId("brandTerms")}
              label={`Brand terms (${parseLines(draft.brandTerms).length})`}
              value={draft.brandTerms}
              rows={6}
              onChange={(e) => set({ brandTerms: e.target.value })}
              hint="Never negated; brand keywords are never paused or cut (SOP-03)."
              spellCheck={false}
            />
            <Textarea
              id={fieldId("competitorTerms")}
              label={`Competitor terms (${parseLines(draft.competitorTerms).length})`}
              value={draft.competitorTerms}
              rows={6}
              onChange={(e) => set({ competitorTerms: e.target.value })}
              hint="Never negated — conquesting decisions stay with you."
              spellCheck={false}
            />
            <Textarea
              id={fieldId("irrelevantWords")}
              label={`Irrelevant words (${parseLines(draft.irrelevantWords).length})`}
              value={draft.irrelevantWords}
              rows={6}
              onChange={(e) => set({ irrelevantWords: e.target.value })}
              hint="Negative phrase when a term contains one (“free” does not match “freezer”)."
              spellCheck={false}
            />
          </div>
        </FormSection>

        {/* ------------------------------------------------------ destination */}
        <FormSection
          id="destination"
          title="Harvest destination"
          description="Where new exact keywords from harvested search terms are created in the bulk export."
        >
          <SegmentedControl
            options={DEST_MODES}
            value={draft.destMode}
            onChange={(destMode) => set({ destMode })}
            label="Harvest destination"
            className="max-w-full overflow-x-auto"
          />
          {draft.destMode === "source" ? (
            <p className="text-sm text-muted">
              Each harvested term goes back into the campaign and ad group it came from, as an exact keyword. Terms from auto campaigns,
              which cannot hold keywords, go to a new exact harvest campaign instead, with the auto campaign&apos;s daily budget. Simple,
              but it mixes match types inside broad and phrase ad groups.
            </p>
          ) : null}
          {draft.destMode === "existing" ? (
            adGroups.length === 0 && !bulkLoading ? (
              <div className="space-y-3">
                <Select
                  id={fieldId("destAdGroup")}
                  label="Ad group"
                  value=""
                  disabled
                  placeholder="No ad groups available"
                  options={[]}
                  hint="Import a bulk file for this store to pick one of its ad groups (usually your exact-match campaign)."
                  error={err("destAdGroup")}
                />
                {draft.destSaved ? (
                  <p className="text-xs text-muted">
                    Currently saved: {draft.destSaved.campaignName} › {draft.destSaved.adGroupName}
                  </p>
                ) : null}
              </div>
            ) : (
              <Select
                id={fieldId("destAdGroup")}
                label="Ad group"
                value={draft.destAdGroup}
                placeholder={bulkLoading ? "Loading ad groups…" : "Choose an ad group…"}
                disabled={bulkLoading}
                error={err("destAdGroup")}
                hint={`${plural(adGroups.length, "ad group")} in the latest bulk file. Pick your exact-match campaign's ad group.`}
                options={[
                  ...adGroups.map((g) => ({
                    value: g.value,
                    label: `${g.campaignName} › ${g.adGroupName}${g.state && g.state !== "enabled" ? ` (${g.state})` : ""}`,
                  })),
                  ...(draft.destSaved && !adGroups.some((g) => g.value === draft.destAdGroup)
                    ? [{ value: draft.destAdGroup, label: `${draft.destSaved.campaignName} › ${draft.destSaved.adGroupName} (not in bulk file)` }]
                    : []),
                ]}
                onChange={(e) => set({ destAdGroup: e.target.value })}
              />
            )
          ) : null}
          {draft.destMode === "new-campaign" ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input
                id={fieldId("destProductLabel")}
                label="Product label"
                value={draft.destProductLabel}
                placeholder="e.g. Garlic Press"
                maxLength={60}
                error={err("destProductLabel")}
                hint="The export creates one exact campaign named after it (Template 1 naming)."
                onChange={(e) => set({ destProductLabel: e.target.value })}
              />
              <NumField
                id={fieldId("destBudget")}
                label="Daily budget"
                unit={draft.currency}
                value={draft.destBudget}
                onChange={(v) => set({ destBudget: v })}
                error={err("destBudget")}
                hint="For the new campaign."
              />
            </div>
          ) : null}
        </FormSection>

        {/* ------------------------------------------------------------ save bar */}
        <div className="sticky bottom-[var(--tab-bar-height)] z-30 -mx-4 border-t border-hairline bg-[var(--header-bg)] px-4 py-3 backdrop-blur-md sm:mx-0 sm:rounded-xl sm:border">
          <div className="flex flex-wrap items-center gap-3">
            <p className="min-w-0 flex-1 text-sm" aria-live="polite">
              {status ? (
                <span className={cn(status.tone === "success" ? "text-good" : status.tone === "danger" ? "text-bad" : "text-muted")}>{status.text}</span>
              ) : dirty ? (
                <span className="text-warn">Unsaved changes</span>
              ) : (
                <span className="text-muted">All changes saved.</span>
              )}
            </p>
            {dirty ? (
              <Button variant="ghost" icon={Undo2} onClick={discard} disabled={saving}>
                Discard
              </Button>
            ) : null}
            <Button type="submit" icon={Save} disabled={saving || !dirty}>
              {saving ? "Saving…" : "Save store"}
            </Button>
          </div>
        </div>
      </form>

      <Dialog
        open={leave !== null}
        onClose={() => setLeave(null)}
        title="Save your changes first?"
        description={`Your edits to ${store.name} are not saved yet.`}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setLeave(null)}>
              Keep editing
            </Button>
            <Button variant="secondary" icon={Undo2} onClick={discardAndLeave}>
              Discard
            </Button>
            <Button icon={Save} onClick={() => void saveAndLeave()} disabled={saving}>
              Save and leave
            </Button>
          </>
        }
      >
        <p>Leaving now throws away every change since the last save: rules, term lists, the ladder and the harvest destination.</p>
      </Dialog>
    </div>
  );
}

function fieldId(path: string): string {
  return `store-field-${path.replace(/[^a-zA-Z0-9]+/g, "-")}`;
}

function numOrUndef(raw: string): number | undefined {
  const n = parseLoose(raw);
  return Number.isFinite(n) ? n : undefined;
}

/* ------------------------------------------------------------------ ladder */

function LadderEditor({
  draft,
  errors,
  onChange,
}: {
  draft: StoreDraft;
  errors: DraftErrors;
  onChange: (ladder: StoreDraft["ladder"]) => void;
}) {
  const ladder = draft.ladder;
  const update = (i: number, patch: Partial<StoreDraft["ladder"][number]>) => onChange(ladder.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(ladder.filter((_, j) => j !== i));
  const add = () => {
    const bounded = ladder.slice(0, -1);
    const lastBound = bounded.length ? parseLoose(bounded[bounded.length - 1].upTo) : 0;
    // New rung sits just above the last bounded one and starts with its change.
    const prev = bounded[bounded.length - 1];
    const next = { upTo: String(Number(((Number.isFinite(lastBound) ? lastBound : 0) + 0.25).toFixed(2))), change: prev?.change ?? "0", flagPause: false };
    onChange([...bounded, next, ladder[ladder.length - 1] ?? { upTo: "", change: "-20", flagPause: true }]);
  };

  return (
    <div>
      <p className="text-[0.8125rem] font-medium text-ink">Bid ladder</p>
      <p className="mb-2 text-xs text-muted">
        SOP-03: compare ACoS with target and move the bid by the band. A rung applies while ACoS ÷ target is at or below its bound; the last
        rung covers everything above. {errors.ladder ? <span className="text-bad">{errors.ladder}</span> : null}
      </p>
      <div className="scroll-well relative overflow-x-auto rounded-lg border border-hairline">
        <table className="w-full min-w-[30rem] border-collapse text-left text-sm">
          <caption className="sr-only">Bid ladder rungs</caption>
          <thead className="bg-surface-2">
            <tr>
              <th scope="col" className="px-3 py-2 text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
                ACoS ÷ target up to
              </th>
              <th scope="col" className="px-3 py-2 text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
                Bid change
              </th>
              <th scope="col" className="px-3 py-2 text-[0.6875rem] font-semibold tracking-[0.06em] text-muted uppercase">
                Flag pause
              </th>
              <th scope="col" className="px-3 py-2">
                <span className="sr-only">Remove</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {ladder.map((rung, i) => {
              const last = i === ladder.length - 1;
              const upErr = errors[`ladder.${i}.upTo`];
              const chErr = errors[`ladder.${i}.change`];
              return (
                <tr key={i} className="align-top">
                  <td className="px-3 py-2">
                    {last ? (
                      <span className="flex min-h-11 items-center text-muted">Above {ladder.length > 1 ? `${ladder[i - 1].upTo || "…"}×` : "0×"}</span>
                    ) : (
                      <Input
                        id={fieldId(`ladder.${i}.upTo`)}
                        label={`Rung ${i + 1}: upper bound (× target)`}
                        hideLabel
                        value={rung.upTo}
                        inputMode="decimal"
                        suffix="×"
                        error={upErr}
                        onChange={(e) => update(i, { upTo: e.target.value })}
                        className="tabular"
                      />
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      id={fieldId(`ladder.${i}.change`)}
                      label={`Rung ${i + 1}: bid change (%)`}
                      hideLabel
                      value={rung.change}
                      inputMode="decimal"
                      suffix="%"
                      error={chErr}
                      onChange={(e) => update(i, { change: e.target.value })}
                      className="tabular"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <span className="flex min-h-11 items-center">
                      <Checkbox
                        id={fieldId(`ladder.${i}.flagPause`)}
                        label={<span className="sr-only">Rung {i + 1}: flag for pausing</span>}
                        checked={rung.flagPause}
                        onChange={(e) => update(i, { flagPause: e.target.checked })}
                      />
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {!last && ladder.length > 2 ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        icon={Trash2}
                        onClick={() => remove(i)}
                        aria-label={`Remove rung ${i + 1}`}
                        className="min-w-9 px-2 [@media(pointer:coarse)]:min-w-11"
                      >
                        <span className="sr-only">Remove</span>
                      </Button>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" icon={Plus} onClick={add} disabled={ladder.length >= 10}>
          Add rung
        </Button>
        <p className="text-xs text-faint">
          Defaults: &lt;0.5 +15% · ≤0.8 +8% · ≤1.2 hold · ≤1.5 −12% · ≤2 −20% · above −20% and flag pause (the first rung is strictly below its bound). Moves are still capped by the largest
          single move ({count(parseLoose(draft.rules.maxMove))}%).
        </p>
      </div>
    </div>
  );
}
