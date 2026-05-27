"use client";

import { useState } from "react";

import { WorldMap } from "@/components/map/WorldMap";
import { ResultsPane } from "@/components/viewer/ResultsPane";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

type ViewMode = "map" | "json";

interface MainPaneProps {
  data: NormalizedSearchResponse | null;
  isLoading: boolean;
  error: string | null;
  lastQuery: DiscogsSearchFilters | null;
  selectedCountry: string | null;
  onSelectCountry: (country: string) => void;
}

export function MainPane({
  data,
  isLoading,
  error,
  lastQuery,
  selectedCountry,
  onSelectCountry,
}: MainPaneProps) {
  const [mode, setMode] = useState<ViewMode>("map");

  return (
    <section className="flex h-full flex-1 flex-col bg-(--color-background)">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-(--color-border) px-6 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <div className="font-mono text-[11px] uppercase tracking-[0.32em] text-(--color-accent)">
            Time&nbsp;Groove
          </div>
          <div className="h-5 w-px bg-(--color-border)" />
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
              {mode === "map" ? "Atlas" : "Response"}
            </p>
            <p
              className="mt-0.5 truncate font-mono text-[11px] text-(--color-foreground-muted)"
              title={formatQuerySummary(lastQuery)}
            >
              {formatQuerySummary(lastQuery)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isLoading ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-accent)">
              Loading…
            </span>
          ) : null}
          {data ? (
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
              {data.pagination.items.toLocaleString()} hits
            </span>
          ) : null}
          <ModeToggle value={mode} onChange={setMode} />
        </div>
      </header>

      <div className="relative flex-1 overflow-hidden">
        {mode === "map" ? (
          <div className="h-full w-full overflow-hidden">
            <WorldMap
              selectedCountry={selectedCountry}
              onSelectCountry={onSelectCountry}
            />
            {error ? (
              <div className="absolute right-4 bottom-12 left-4 max-w-md">
                <ErrorBanner message={error} />
              </div>
            ) : null}
          </div>
        ) : (
          <div className="h-full overflow-auto px-6 py-5">
            <ResultsPane
              data={data}
              isLoading={isLoading}
              error={error}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function ModeToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (next: ViewMode) => void;
}) {
  const options: { value: ViewMode; label: string }[] = [
    { value: "map", label: "Map" },
    { value: "json", label: "JSON" },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="View mode"
      className="flex items-center rounded-sm border border-(--color-border) bg-(--color-surface) p-0.5"
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={
              "rounded-xs px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] transition-colors " +
              (active
                ? "bg-(--color-foreground) text-(--color-background)"
                : "text-(--color-foreground-muted) hover:text-(--color-foreground)")
            }
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-sm border border-red-900/50 bg-red-950/60 px-4 py-3 font-mono text-[12px] text-red-300 shadow-2xl backdrop-blur-sm">
      <p className="font-semibold text-[10px] uppercase tracking-[0.18em] text-red-400">
        Request failed
      </p>
      <p className="mt-1 whitespace-pre-wrap">{message}</p>
    </div>
  );
}

function formatQuerySummary(query: DiscogsSearchFilters | null): string {
  if (!query) return "no query yet";
  const parts = Object.entries(query)
    .filter(([, v]) => v !== undefined && v !== "" && v !== null)
    .map(([k, v]) => `${k}=${v}`);
  return parts.length === 0 ? "no filters" : parts.join("  ·  ");
}
