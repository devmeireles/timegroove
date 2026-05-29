"use client";

import { useId } from "react";

import { isDiscogsGenre, type DiscogsGenre } from "@/lib/discogs/genres";
import type { DiscogsSearchFilters } from "@/types/discogs";
import { AvatarMenu } from "@/components/auth/AvatarMenu";

import { FilterField } from "./FilterField";
import { GenreCombobox } from "./GenreCombobox";
import { TextInput } from "./TextInput";

interface FilterPanelProps {
  values: DiscogsSearchFilters;
  onChange: (next: DiscogsSearchFilters) => void;
  onSubmit: () => void;
  onReset: () => void;
  onRequestAbout?: () => void;
  onRequestSpotifySettings?: () => void;
  isLoading: boolean;
}

export function FilterPanel({
  values,
  onChange,
  onSubmit,
  onReset,
  onRequestAbout,
  onRequestSpotifySettings,
  isLoading,
}: FilterPanelProps) {
  const yearId = useId();

  const update = <K extends keyof DiscogsSearchFilters>(
    key: K,
    value: DiscogsSearchFilters[K],
  ) => {
    onChange({ ...values, [key]: value });
  };

  const currentGenre: DiscogsGenre | null =
    values.genre && isDiscogsGenre(values.genre) ? values.genre : null;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
      className="grid grid-cols-[auto_1fr_auto] items-end gap-6 px-6 py-3"
    >
      <div className="flex shrink-0 items-end pb-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.32em] text-(--color-accent)">
          Time&nbsp;Groove
        </span>
      </div>

      <div className="mx-auto flex items-end gap-6">
        <div className="h-9 w-px shrink-0 self-end bg-(--color-border)" />

        <div className="w-28 shrink-0">
          <FilterField label="Year" htmlFor={yearId}>
            <TextInput
              id={yearId}
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="any year"
              value={values.year ?? ""}
              onChange={(event) =>
                update("year", event.target.value || undefined)
              }
            />
          </FilterField>
        </div>

        <div className="w-56 shrink-0">
          <FilterField label="Genre">
            <GenreCombobox
              value={currentGenre}
              onChange={(next) => update("genre", next ?? undefined)}
              placement="bottom"
            />
          </FilterField>
        </div>

        <div className="flex shrink-0 items-center gap-2 pb-px">
          <button
            type="button"
            onClick={onReset}
            disabled={isLoading}
            className="rounded-sm border border-(--color-border) px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={isLoading || !values.country}
            className="rounded-sm bg-(--color-foreground) px-4 py-2 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-background) transition-opacity hover:opacity-90 disabled:opacity-50"
            title={
              !values.country
                ? "Click a country on the map to start"
                : "Year and genre are optional"
            }
          >
            {isLoading ? "Digging…" : "Re-run search"}
          </button>
        </div>
      </div>

      <div className="flex justify-end pb-px">
        <AvatarMenu
          onRequestAbout={onRequestAbout}
          onRequestSpotifySettings={onRequestSpotifySettings}
        />
      </div>
    </form>
  );
}
