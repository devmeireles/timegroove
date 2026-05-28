"use client";

import { useCallback, useMemo, useRef, useState } from "react";

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
  results: NormalizedRelease[];
  pagination: DiscogsPagination | null;
  query: DiscogsSearchFilters | null;
  pagesLoaded: number;
}

const EMPTY_QUEUE: QueueState = {
  results: [],
  pagination: null,
  query: null,
  pagesLoaded: 0,
};

export interface HomeShowcaseState {
  filters: DiscogsSearchFilters;
  setFilters: (next: DiscogsSearchFilters) => void;
  data: NormalizedSearchResponse | null;
  error: string | null;
  lastQuery: DiscogsSearchFilters | null;
  pagesLoaded: number;
  hasMore: boolean;
  isLoading: boolean;
  isLoadingMore: boolean;
  handleSubmit: () => void;
  handleReset: () => void;
  handleSelectCountry: (country: string) => void;
  loadMore: () => void;
  favoritesOpen: boolean;
  playlistsOpen: boolean;
  openFavorites: () => void;
  closeFavorites: () => void;
  openPlaylists: () => void;
  closePlaylists: () => void;
}

export function useHomeShowcaseState(): HomeShowcaseState {
  const [filters, setFilters] = useState<DiscogsSearchFilters>(INITIAL_FILTERS);
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

  const handleSelectCountry = useCallback(
    (country: string) => {
      const next: DiscogsSearchFilters = { ...filters, country, page: 1 };
      setFilters(next);
      void runSearch(next);
    },
    [filters, runSearch],
  );

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

  return {
    filters,
    setFilters,
    data,
    error,
    lastQuery: queue.query,
    pagesLoaded: queue.pagesLoaded,
    hasMore,
    isLoading,
    isLoadingMore,
    handleSubmit,
    handleReset,
    handleSelectCountry,
    loadMore,
    favoritesOpen,
    playlistsOpen,
    openFavorites: () => setFavoritesOpen(true),
    closeFavorites: () => setFavoritesOpen(false),
    openPlaylists: () => setPlaylistsOpen(true),
    closePlaylists: () => setPlaylistsOpen(false),
  };
}
