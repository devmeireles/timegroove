"use client";

import { useCallback, useRef, useState } from "react";

import { FilterPanel } from "@/components/filters/FilterPanel";
import { MainPane } from "@/components/layout/MainPane";
import { NowPlayingPane } from "@/components/results/NowPlayingPane";
import { YoutubePlayerProvider } from "@/contexts/YoutubePlayerContext";
import {
  SearchRequestError,
  searchReleases,
} from "@/services/discogs/clientApi";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

const INITIAL_FILTERS: DiscogsSearchFilters = {
  per_page: 10,
  page: 1,
};

/**
 * Country-only searches against the Discogs catalog (no year, no genre) can
 * surface tens of thousands of releases for big music nations. Cap them
 * tighter to keep reconciliation costs in check and the queue legible.
 * Once the user narrows by year or genre, we open the result set back up.
 */
function effectivePerPage(filters: DiscogsSearchFilters): number {
  const hasNarrowingFilter = Boolean(filters.year || filters.genre);
  return hasNarrowingFilter ? 25 : 10;
}

export default function HomePage() {
  const [filters, setFilters] =
    useState<DiscogsSearchFilters>(INITIAL_FILTERS);
  const [data, setData] = useState<NormalizedSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<DiscogsSearchFilters | null>(null);

  const inflight = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (raw: DiscogsSearchFilters) => {
    const next: DiscogsSearchFilters = {
      ...raw,
      per_page: effectivePerPage(raw),
    };
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setIsLoading(true);
    setError(null);
    setLastQuery(next);

    try {
      const response = await searchReleases(next, controller.signal);
      if (controller.signal.aborted) return;
      setData(response);
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof SearchRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(message);
      setData(null);
    } finally {
      if (inflight.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!filters.country) return;
    void runSearch({ ...filters, page: 1 });
  }, [filters, runSearch]);

  const handleReset = useCallback(() => {
    inflight.current?.abort();
    setFilters(INITIAL_FILTERS);
    setData(null);
    setError(null);
    setLastQuery(null);
  }, []);

  // Clicking a country on the map sets the filter AND auto-submits, since
  // map interaction is meant to feel like exploration, not form filling.
  const handleSelectCountry = useCallback(
    (country: string) => {
      const next: DiscogsSearchFilters = { ...filters, country, page: 1 };
      setFilters(next);
      void runSearch(next);
    },
    [filters, runSearch],
  );

  return (
    <YoutubePlayerProvider>
      <div className="flex h-screen w-screen flex-col overflow-hidden">
        <div className="shrink-0 border-b border-(--color-border) bg-(--color-surface)">
          <FilterPanel
            values={filters}
            onChange={setFilters}
            onSubmit={handleSubmit}
            onReset={handleReset}
            isLoading={isLoading}
          />
        </div>
        <main className="min-h-0 flex-1 overflow-hidden">
          <MainPane
            data={data}
            error={error}
            lastQuery={lastQuery}
            selectedCountry={filters.country ?? null}
            onSelectCountry={handleSelectCountry}
          />
        </main>
        <NowPlayingPane />
      </div>
    </YoutubePlayerProvider>
  );
}
