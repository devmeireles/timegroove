"use client";

import { useCallback, useRef, useState } from "react";

import { FilterPanel } from "@/components/filters/FilterPanel";
import { Sidebar } from "@/components/layout/Sidebar";
import { ResultsPane } from "@/components/viewer/ResultsPane";
import {
  SearchRequestError,
  searchReleases,
} from "@/lib/services/discogs/clientApi";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

const INITIAL_FILTERS: DiscogsSearchFilters = {
  type: "release",
  per_page: 25,
  page: 1,
};

export default function HomePage() {
  const [filters, setFilters] =
    useState<DiscogsSearchFilters>(INITIAL_FILTERS);
  const [data, setData] = useState<NormalizedSearchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lastQuery, setLastQuery] = useState<DiscogsSearchFilters | null>(null);

  const inflight = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (next: DiscogsSearchFilters) => {
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
    void runSearch({ ...filters, page: 1 });
  }, [filters, runSearch]);

  const handleReset = useCallback(() => {
    inflight.current?.abort();
    setFilters(INITIAL_FILTERS);
    setData(null);
    setError(null);
    setLastQuery(null);
  }, []);

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar>
        <FilterPanel
          values={filters}
          onChange={setFilters}
          onSubmit={handleSubmit}
          onReset={handleReset}
          isLoading={isLoading}
        />
      </Sidebar>
      <ResultsPane
        data={data}
        isLoading={isLoading}
        error={error}
        lastQuery={lastQuery}
      />
    </div>
  );
}
