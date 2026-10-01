"use client";

import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { createStore, type Store } from "@/lib/ppc";
import { cn } from "@/lib/utils";

import { newId } from "./format";
import { CURRENCIES, MARKETPLACE_OPTIONS, currencyForMarketplace, marketplaceByCode, nextColorIndex } from "./markets";

export interface NewStoreDraft {
  name: string;
  marketplace: string;
  currency: string;
  /** Once the user picks a currency, a marketplace change stops overwriting it. */
  currencyTouched: boolean;
}

/** Draft pre-filled from a file's currency / country when known. */
export function draftFromHint(hint: { currency?: string; country?: string } = {}): NewStoreDraft {
  const mp = marketplaceByCode(hint.country)?.code ?? MARKETPLACE_OPTIONS.find((o) => currencyForMarketplace(o.value) === hint.currency)?.value ?? "US";
  const currency = (hint.currency ?? currencyForMarketplace(mp) ?? "USD").toUpperCase();
  return { name: `My ${mp} store`, marketplace: mp, currency, currencyTouched: Boolean(hint.currency) };
}

export function validateDraft(d: NewStoreDraft): { name?: string; currency?: string } {
  const errors: { name?: string; currency?: string } = {};
  if (!d.name.trim()) errors.name = "Give the store a name.";
  else if (d.name.trim().length > 60) errors.name = "Keep the name under 60 characters.";
  if (!/^[A-Z]{3}$/.test(d.currency.trim().toUpperCase())) errors.currency = "Use a 3-letter currency code, e.g. USD.";
  return errors;
}

/** Build a Store from a draft (toolkit defaults for rules / economics). */
export function storeFromDraft(d: NewStoreDraft, existing: Pick<Store, "colorIndex">[]): Store {
  return createStore({
    id: newId("store"),
    name: d.name.trim(),
    marketplace: d.marketplace,
    currency: d.currency.trim().toUpperCase(),
    colorIndex: nextColorIndex(existing.map((s) => s.colorIndex)),
  });
}

export interface NewStoreFieldsProps {
  idPrefix: string;
  draft: NewStoreDraft;
  onChange: (draft: NewStoreDraft) => void;
  errors?: { name?: string; currency?: string };
  /** Extra currency to offer (e.g. the one a file reports). */
  extraCurrency?: string;
  className?: string;
}

/** Name, marketplace and currency for a new store. Currency follows the marketplace until edited. */
export function NewStoreFields({ idPrefix, draft, onChange, errors, extraCurrency, className }: NewStoreFieldsProps) {
  const currencies = Array.from(new Set([...CURRENCIES, draft.currency, ...(extraCurrency ? [extraCurrency] : [])].filter(Boolean)));
  return (
    <div className={cn("grid gap-4 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,0.8fr)]", className)}>
      <Input
        id={`${idPrefix}-name`}
        label="Store name"
        value={draft.name}
        maxLength={60}
        required
        autoComplete="off"
        error={errors?.name}
        onChange={(e) => onChange({ ...draft, name: e.target.value })}
      />
      <Select
        id={`${idPrefix}-marketplace`}
        label="Marketplace"
        value={draft.marketplace}
        options={MARKETPLACE_OPTIONS}
        onChange={(e) => {
          const marketplace = e.target.value;
          const currency = draft.currencyTouched ? draft.currency : (currencyForMarketplace(marketplace) ?? draft.currency);
          const autoName = /^My [A-Z]{2} store$/.test(draft.name);
          onChange({ ...draft, marketplace, currency, name: autoName ? `My ${marketplace} store` : draft.name });
        }}
      />
      <Select
        id={`${idPrefix}-currency`}
        label="Currency"
        value={draft.currency}
        options={currencies.map((c) => ({ value: c, label: c }))}
        error={errors?.currency}
        hint={draft.currencyTouched ? undefined : "Follows the marketplace"}
        onChange={(e) => onChange({ ...draft, currency: e.target.value, currencyTouched: true })}
      />
    </div>
  );
}
