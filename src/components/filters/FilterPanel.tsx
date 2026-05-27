"use client";

import { useId } from "react";

import type {
  DiscogsEntityType,
  DiscogsSearchFilters,
} from "@/types/discogs";
import { DISCOGS_ENTITY_TYPES } from "@/types/discogs";

import { FilterField } from "./FilterField";
import { SegmentedSelect } from "./SegmentedSelect";
import { TextInput } from "./TextInput";

interface FilterPanelProps {
  values: DiscogsSearchFilters;
  onChange: (next: DiscogsSearchFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
  isLoading: boolean;
}

const TYPE_OPTIONS: readonly { value: DiscogsEntityType; label: string }[] =
  DISCOGS_ENTITY_TYPES.map((value) => ({
    value,
    label: value,
  }));

export function FilterPanel({
  values,
  onChange,
  onSubmit,
  onReset,
  isLoading,
}: FilterPanelProps) {
  const ids = {
    q: useId(),
    year: useId(),
    country: useId(),
    genre: useId(),
    style: useId(),
  };

  const update = <K extends keyof DiscogsSearchFilters>(
    key: K,
    value: DiscogsSearchFilters[K],
  ) => {
    onChange({ ...values, [key]: value });
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="flex h-full flex-col"
    >
      <header className="px-5 pt-6 pb-5">
        <h1 className="font-mono text-xs uppercase tracking-[0.32em] text-(--color-foreground-subtle)">
          Time&nbsp;Groove
        </h1>
        <p className="mt-1 text-lg leading-tight tracking-tight text-(--color-foreground)">
          A music time capsule.
        </p>
        <p className="mt-2 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          Dig the archive by place &amp; year
        </p>
      </header>

      <div className="border-t border-(--color-border)" />

      <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-5 py-5">
        <FilterField label="Query" htmlFor={ids.q} hint="Optional free text">
          <TextInput
            id={ids.q}
            placeholder="e.g. Tropicália, Sun Ra…"
            value={values.q ?? ""}
            onChange={(event) =>
              update("q", event.target.value || undefined)
            }
          />
        </FilterField>

        <FilterField label="Year" htmlFor={ids.year} hint="e.g. 1977">
          <TextInput
            id={ids.year}
            inputMode="numeric"
            pattern="[0-9]*"
            placeholder="1993"
            value={values.year ?? ""}
            onChange={(event) =>
              update("year", event.target.value || undefined)
            }
          />
        </FilterField>

        <FilterField label="Country" htmlFor={ids.country} hint="e.g. Brazil, Japan, US">
          <TextInput
            id={ids.country}
            placeholder="Brazil"
            value={values.country ?? ""}
            onChange={(event) =>
              update("country", event.target.value || undefined)
            }
          />
        </FilterField>

        <FilterField label="Genre" htmlFor={ids.genre} hint="e.g. Jazz, Funk / Soul">
          <TextInput
            id={ids.genre}
            placeholder="Jazz"
            value={values.genre ?? ""}
            onChange={(event) =>
              update("genre", event.target.value || undefined)
            }
          />
        </FilterField>

        <FilterField label="Style" htmlFor={ids.style} hint="e.g. Bossa Nova, Post-Punk">
          <TextInput
            id={ids.style}
            placeholder="Bossa Nova"
            value={values.style ?? ""}
            onChange={(event) =>
              update("style", event.target.value || undefined)
            }
          />
        </FilterField>

        <FilterField label="Type">
          <SegmentedSelect<DiscogsEntityType>
            name="type"
            value={values.type ?? "release"}
            options={TYPE_OPTIONS}
            onChange={(value) => update("type", value)}
          />
        </FilterField>
      </div>

      <div className="border-t border-(--color-border)" />

      <div className="grid grid-cols-3 gap-2 px-5 py-4">
        <button
          type="button"
          onClick={onReset}
          disabled={isLoading}
          className="col-span-1 rounded-sm border border-(--color-border) px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
        >
          Reset
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="col-span-2 rounded-sm bg-(--color-foreground) px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-background) transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {isLoading ? "Digging…" : "Search the crate"}
        </button>
      </div>
    </form>
  );
}
