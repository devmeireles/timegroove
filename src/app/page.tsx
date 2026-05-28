"use client";

import { useCallback, useMemo, useRef, useState } from "react";

import { FavoritesDialog } from "@/components/auth/dialogs/FavoritesDialog";
import { PlaylistsDialog } from "@/components/auth/dialogs/PlaylistsDialog";
import { FilterPanel } from "@/components/filters/FilterPanel";
import { MainPane } from "@/components/layout/MainPane";
import { NowPlayingPane } from "@/components/results/NowPlayingPane";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { YoutubePlayerProvider } from "@/contexts/YoutubePlayerContext";
import {
  SearchRequestError,
  searchReleases,
} from "@/services/discogs/clientApi";
import type {
  DiscogsPagination,
  DiscogsSearchFilters,
  NormalizedRelease,
  NormalizedSearchResponse,
} from "@/types/discogs";

const INITIAL_FILTERS: DiscogsSearchFilters = {
  per_page: 10,
  page: 1,
};

interface QueueState {
  /** Accumulated across pages — page 1, then appended on scroll. */
  results: NormalizedRelease[];
  /** Pagination metadata from the *latest* page fetched. */
  pagination: DiscogsPagination | null;
  /** The query the queue was built for. Same identity across pagination,
   * changes on a fresh search. Used to key the list so its internal state
   * resets only when the search actually changes. */
  query: DiscogsSearchFilters | null;
  pagesLoaded: number;
}

const EMPTY_QUEUE: QueueState = {
  results: [],
  pagination: null,
  query: null,
  pagesLoaded: 0,
};

export default function HomePage() {
  const [filters, setFilters] =
    useState<DiscogsSearchFilters>(INITIAL_FILTERS);
  const [queue, setQueue] = useState<QueueState>(EMPTY_QUEUE);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);

  const inflight = useRef<AbortController | null>(null);

  const runSearch = useCallback(async (raw: DiscogsSearchFilters) => {
    const next: DiscogsSearchFilters = {
      ...raw,
      page: 1,
      per_page: INITIAL_FILTERS.per_page,
    };
    inflight.current?.abort();
    const controller = new AbortController();
    inflight.current = controller;

    setIsLoading(true);
    setError(null);

    try {
      const response = await searchReleases(next, controller.signal);
      if (controller.signal.aborted) return;
      setQueue({
        results: response.results,
        pagination: response.pagination,
        query: next,
        pagesLoaded: 1,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      const message =
        err instanceof SearchRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(message);
      setQueue(EMPTY_QUEUE);
    } finally {
      if (inflight.current === controller) {
        setIsLoading(false);
      }
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (isLoadingMore || isLoading) return;
    if (!queue.pagination || !queue.query) return;
    if (queue.pagesLoaded >= queue.pagination.pages) return;

    const nextPage = queue.pagesLoaded + 1;
    const nextFilters: DiscogsSearchFilters = {
      ...queue.query,
      page: nextPage,
      per_page: queue.pagination.per_page,
    };

    setIsLoadingMore(true);
    try {
      const response = await searchReleases(nextFilters);
      setQueue((prev) => {
        // Guard against a fresh search having reset the queue while this
        // request was in flight.
        if (prev.query !== queue.query) return prev;
        return {
          ...prev,
          results: [...prev.results, ...response.results],
          pagination: response.pagination,
          pagesLoaded: nextPage,
        };
      });
    } catch (err) {
      const message =
        err instanceof SearchRequestError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Unknown error";
      setError(message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, queue]);

  const handleSubmit = useCallback(() => {
    if (!filters.country) return;
    void runSearch({ ...filters, page: 1 });
  }, [filters, runSearch]);

  const handleReset = useCallback(() => {
    inflight.current?.abort();
    setFilters(INITIAL_FILTERS);
    setQueue(EMPTY_QUEUE);
    setError(null);
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

  /**
   * Synthesize a `NormalizedSearchResponse` for the downstream components.
   * `results` is the accumulated array; `pagination` is from the latest
   * page. Keeps the existing prop contract intact while letting us slice
   * pagination state above it.
   */
  const data: NormalizedSearchResponse | null = useMemo(() => {
    if (!queue.pagination || !queue.query) return null;
    return {
      results: queue.results,
      pagination: queue.pagination,
      query: queue.query,
    };
  }, [queue]);

  const hasMore = queue.pagination
    ? queue.pagesLoaded < queue.pagination.pages
    : false;

  return (
    <YoutubePlayerProvider>
      <FavoritesProvider>
        <div className="flex h-screen w-screen flex-col overflow-hidden">
          <div className="shrink-0 border-b border-(--color-border) bg-(--color-surface)">
            <FilterPanel
              values={filters}
              onChange={setFilters}
              onSubmit={handleSubmit}
              onReset={handleReset}
              onRequestFavorites={() => setFavoritesOpen(true)}
              onRequestPlaylists={() => setPlaylistsOpen(true)}
              isLoading={isLoading}
            />
          </div>
          <main className="min-h-0 flex-1 overflow-hidden">
            <MainPane
              data={data}
              error={error}
              lastQuery={queue.query}
              selectedCountry={filters.country ?? null}
              onSelectCountry={handleSelectCountry}
              pagesLoaded={queue.pagesLoaded}
              hasMore={hasMore}
              isLoadingMore={isLoadingMore}
              onLoadMore={loadMore}
            />
          </main>
          <NowPlayingPane />
          <FavoritesDialog
            open={favoritesOpen}
            onClose={() => setFavoritesOpen(false)}
          />
          <PlaylistsDialog
            open={playlistsOpen}
            onClose={() => setPlaylistsOpen(false)}
          />
        </div>
      </FavoritesProvider>
    </YoutubePlayerProvider>
  );
}
