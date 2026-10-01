"use client";

import { Calculator, Check, Pencil, Save, TriangleAlert, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { Callout } from "@/components/ui/Callout";
import { Dialog } from "@/components/ui/Dialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { GOAL_MULTIPLIERS, saveStore, type GoalMode, type Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { NumField } from "../FormBits";
import { money, pct } from "../format";
import { Jargon } from "../keywords/common";
import { amountText, checkEconomics, fromUnits, parseAmount, parsePercent, percentText } from "../work/calculator";

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

interface Draft {
  breakEven: string;
  target: string;
  goal: GoalMode;
  price: string;
  cogs: string;
  fbaFee: string;
  referralPct: string;
  otherCosts: string;
}

function draftFrom(store: Store): Draft {
  const e = store.economics;
  return {
    breakEven: percentText(e.breakEvenAcos),
    target: percentText(e.targetAcos),
    goal: e.goal,
    price: amountText(e.price),
    cogs: amountText(e.cogs),
    fbaFee: amountText(e.fbaFee),
    referralPct: e.referralPct !== undefined ? percentText(e.referralPct) : "",
    otherCosts: amountText(e.otherCosts),
  };
}

/**
 * Store economics: break-even ACoS, target ACoS and goal, with an inline
 * "work it out from unit economics" helper. Saves back to the store after a
 * confirmation that says what changes (every recommendation is recomputed).
 */
export function EconomicsCard({ store }: { store: Store }) {
  const uid = useId();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Draft>(() => draftFrom(store));
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const E = store.economics;
  const set = (patch: Partial<Draft>) => setDraft((d) => ({ ...d, ...patch }));
  // "Edit economics", "Cancel" and the form's submit button all unmount
  // themselves: move focus to what replaces them instead of losing it to
  // <body>. Runs after the confirm dialog (a child, so its effect runs first)
  // has closed; elements outside an open modal cannot take focus.
  const editId = `${uid}-edit`;
  const pendingFocus = useRef<string | null>(null);
  useEffect(() => {
    const id = pendingFocus.current;
    if (!id) return;
    pendingFocus.current = null;
    document.getElementById(id)?.focus();
  }, [editing, confirming]);
  const closeForm = () => {
    pendingFocus.current = editId;
    setEditing(false);
  };

  const be = parsePercent(draft.breakEven);
  const tg = parsePercent(draft.target);
  const check = checkEconomics({ breakEvenAcos: be, targetAcos: tg, goal: draft.goal });
  const units = useMemo(() => {
    const ref = parseAmount(draft.referralPct);
    return fromUnits(
      {
        price: parseAmount(draft.price),
        cogs: parseAmount(draft.cogs),
        fbaFee: parseAmount(draft.fbaFee),
        referralPct: ref !== undefined ? ref / 100 : undefined,
        otherCosts: parseAmount(draft.otherCosts),
      },
      draft.goal,
    );
  }, [draft]);
  const invalidUnits = [draft.price, draft.cogs, draft.fbaFee, draft.referralPct, draft.otherCosts].some((t) => Number.isNaN(parseAmount(t)));
  const canSave = !check.errors.breakEven && !check.errors.target && !invalidUnits;

  const next = {
    ...E,
    breakEvenAcos: Math.round(be * 10000) / 10000,
    targetAcos: Math.round(tg * 10000) / 10000,
    goal: draft.goal,
    price: parseAmount(draft.price),
    cogs: parseAmount(draft.cogs),
    fbaFee: parseAmount(draft.fbaFee),
    referralPct: parseAmount(draft.referralPct) !== undefined ? (parseAmount(draft.referralPct) as number) / 100 : undefined,
    otherCosts: parseAmount(draft.otherCosts),
  };
  const changes = [
    Math.abs(next.breakEvenAcos - E.breakEvenAcos) > 1e-6 && `Break-even ACoS ${pct(E.breakEvenAcos)} → ${pct(next.breakEvenAcos)}`,
    Math.abs(next.targetAcos - E.targetAcos) > 1e-6 && `Target ACoS ${pct(E.targetAcos)} → ${pct(next.targetAcos)}`,
    next.goal !== E.goal && `Goal ${E.goal} → ${next.goal}`,
    (next.price !== E.price || next.cogs !== E.cogs || next.fbaFee !== E.fbaFee || next.referralPct !== E.referralPct || next.otherCosts !== E.otherCosts) &&
      "Unit economics (price and costs) updated",
  ].filter(Boolean) as string[];

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveStore({ ...store, economics: next });
      setConfirming(false);
      closeForm();
      setNotice(`Saved. Recommendations and suggested bids for ${store.name} now use a ${pct(next.targetAcos)} target.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  };

  const headroom = E.breakEvenAcos - E.targetAcos;

  return (
    <section aria-labelledby={`${uid}-h`} className="rounded-xl border border-hairline bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-hairline px-4 py-3.5 sm:px-5">
        <div className="min-w-0 flex-[1_1_18rem]">
          <h2 id={`${uid}-h`} className="font-display text-base font-semibold text-ink">
            Store economics
          </h2>
          <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">
            Every bid on this page is worked back from these two numbers. The target must be at or below break-even for ad sales to make a
            profit.
          </p>
        </div>
        {!editing ? (
          <Button
            id={editId}
            variant="secondary"
            size="sm"
            icon={Pencil}
            onClick={() => {
              setDraft(draftFrom(store));
              setEditing(true);
              setNotice(null);
              pendingFocus.current = `${uid}-be`;
            }}
          >
            Edit economics
          </Button>
        ) : null}
      </header>

      {!editing ? (
        <div className="px-4 py-4 sm:px-5">
          <dl className="grid gap-px overflow-hidden rounded-lg border border-hairline bg-hairline sm:grid-cols-3">
            <div className="bg-surface px-4 py-3">
              <dt className="text-xs font-medium text-muted">
                <Jargon k="breakEven" />
              </dt>
              <dd className="mt-1 tabular text-xl font-semibold text-ink">{pct(E.breakEvenAcos)}</dd>
              <dd className="text-xs text-muted">Above this, an ad sale loses money.</dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="text-xs font-medium text-muted">
                <Jargon k="targetAcos" />
              </dt>
              <dd className={cn("mt-1 tabular text-xl font-semibold", headroom < -1e-9 ? "text-warn" : "text-ink")}>{pct(E.targetAcos)}</dd>
              <dd className="text-xs text-muted">
                {headroom >= 0 ? `${pct(headroom)} of price left as profit per ad sale.` : "Above break-even: each ad sale loses money."}
              </dd>
            </div>
            <div className="bg-surface px-4 py-3">
              <dt className="text-xs font-medium text-muted">Goal</dt>
              <dd className="mt-1 text-xl font-semibold text-ink capitalize">{E.goal}</dd>
              <dd className="text-xs text-muted">{GOAL_NOTE[E.goal]}</dd>
            </div>
          </dl>
          {E.price ? (
            <p className="mt-2 text-xs text-muted">
              Based on a {money(E.price, store.currency)} price
              {E.cogs !== undefined ? `, ${money(E.cogs, store.currency)} product cost` : ""}
              {E.fbaFee !== undefined ? `, ${money(E.fbaFee, store.currency)} FBA fee` : ""}
              {E.referralPct !== undefined ? `, ${pct(E.referralPct, 0)} referral` : ""}.
            </p>
          ) : null}
          {notice ? (
            <p role="status" className="mt-3 flex items-center gap-1.5 text-[0.8125rem] text-good">
              <Check className="size-4" aria-hidden="true" />
              {notice}
            </p>
          ) : null}
        </div>
      ) : (
        <form
          noValidate
          className="space-y-5 px-4 py-4 sm:px-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (canSave) setConfirming(true);
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <NumField
              id={`${uid}-be`}
              label="Break-even ACoS"
              unit="%"
              value={draft.breakEven}
              onChange={(v) => set({ breakEven: v })}
              error={check.errors.breakEven}
              hint="(price − all costs) ÷ price. Toolkit default 32%."
            />
            <NumField
              id={`${uid}-tg`}
              label="Target ACoS"
              unit="%"
              value={draft.target}
              onChange={(v) => set({ target: v })}
              error={check.errors.target}
              hint="What the rules aim for. Default 30%."
            />
          </div>
          {check.warnings.map((w) => (
            <Callout key={w} variant={draft.goal === "launch" || draft.goal === "liquidate" ? "info" : "warn"}>
              <p>{w}</p>
            </Callout>
          ))}
          <div className="space-y-2">
            <p className="text-[0.8125rem] font-medium text-ink">Goal</p>
            <div className="scroll-well max-w-full overflow-x-auto">
              <SegmentedControl options={GOALS} value={draft.goal} onChange={(goal) => set({ goal })} label="Goal" />
            </div>
            <p className="text-xs text-muted">
              {GOAL_NOTE[draft.goal]} Suggested target for this goal: {GOAL_MULTIPLIERS[draft.goal]}× break-even
              {Number.isFinite(be) ? ` = ${pct(draft.goal === "launch" ? Math.min(be * GOAL_MULTIPLIERS.launch, 0.8) : be * GOAL_MULTIPLIERS[draft.goal])}` : ""}.
            </p>
          </div>

          <fieldset className="min-w-0 rounded-lg border border-hairline bg-canvas p-4">
            <legend className="px-1 text-[0.8125rem] font-medium text-ink">Work it out from unit economics</legend>
            <p className="mb-3 text-xs leading-relaxed text-muted">
              Per unit, in {store.currency}. Break-even = (price − product cost − FBA fee − referral fee − other costs) ÷ price.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <NumField id={`${uid}-price`} label="Price" unit={store.currency} value={draft.price} onChange={(v) => set({ price: v })} />
              <NumField id={`${uid}-cogs`} label="Product cost" unit={store.currency} value={draft.cogs} onChange={(v) => set({ cogs: v })} />
              <NumField id={`${uid}-fba`} label="FBA fee" unit={store.currency} value={draft.fbaFee} onChange={(v) => set({ fbaFee: v })} />
              <NumField id={`${uid}-ref`} label="Referral fee" unit="%" placeholder="15" value={draft.referralPct} onChange={(v) => set({ referralPct: v })} />
              <NumField id={`${uid}-other`} label="Other costs" unit={store.currency} value={draft.otherCosts} onChange={(v) => set({ otherCosts: v })} />
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="text-sm text-ink" aria-live="polite">
                {invalidUnits ? (
                  <span className="text-bad">One of the amounts is not a number.</span>
                ) : Number.isFinite(units.breakEven) ? (
                  units.breakEven > 0 ? (
                    <>
                      Break-even <strong className="tabular">{pct(units.breakEven)}</strong> ({money(units.margin, store.currency)} margin per unit
                      before ads) · suggested target <strong className="tabular">{pct(units.suggestedTarget)}</strong>
                    </>
                  ) : (
                    <span className="text-bad">These costs leave no margin ({pct(units.breakEven)}): ads cannot be profitable at this price.</span>
                  )
                ) : (
                  <span className="text-muted">Enter a price to work out break-even.</span>
                )}
              </p>
              <Button
                variant="secondary"
                size="sm"
                icon={Calculator}
                disabled={!(Number.isFinite(units.breakEven) && units.breakEven > 0) || invalidUnits}
                onClick={() =>
                  set({
                    breakEven: percentText(units.breakEven),
                    ...(Number.isFinite(units.suggestedTarget) ? { target: percentText(units.suggestedTarget) } : {}),
                  })
                }
              >
                Use these numbers
              </Button>
            </div>
          </fieldset>

          <div className="flex flex-wrap gap-2">
            <Button type="submit" icon={Save} disabled={!canSave || !changes.length}>
              Save to {store.name}
            </Button>
            <Button variant="ghost" icon={X} onClick={closeForm}>
              Cancel
            </Button>
            {!changes.length ? <p className="self-center text-xs text-muted">No changes yet.</p> : null}
          </div>
        </form>
      )}

      <Dialog
        open={confirming}
        onClose={() => (saving ? undefined : setConfirming(false))}
        title={`Save new economics for ${store.name}?`}
        description="Every recommendation and suggested bid for this store is recalculated."
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => setConfirming(false)} disabled={saving}>
              Cancel
            </Button>
            <Button icon={Save} onClick={() => void save()} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </>
        }
      >
        <ul className="list-disc space-y-1 pl-5">
          {changes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        {check.warnings.length ? (
          <p className="mt-3 flex items-start gap-1.5 text-warn">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
            {check.warnings[0]}
          </p>
        ) : null}
        <p className="mt-3 text-muted">Decisions you already made are kept. You can change these again any time here or in Stores.</p>
        {error ? (
          <Callout variant="danger" className="mt-3">
            <p>{error}</p>
          </Callout>
        ) : null}
      </Dialog>
    </section>
  );
}
