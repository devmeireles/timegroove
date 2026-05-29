"use client";

import { useState } from "react";

import { WorldMap } from "@/components/map/WorldMap";
import {
  PANEL_WIDTH_PX,
  ReopenButton,
  ResultsPanel,
} from "@/components/results/ResultsPanel";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

interface MainPaneProps {
  data: NormalizedSearchResponse | null;
  error: string | null;
  lastQuery: DiscogsSearchFilters | null;
  selectedCountry: string | null;
  onSelectCountry: (country: string) => void;
  rightInset?: number;
  /** How many pages of results have been fetched so far (1 = just the
   * initial page). Used by the list to decide whether to gate on the
   * full-screen reconcile loader. */
  pagesLoaded: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

/**
 * The map is the only surface — no view toggle, no JSON panel, no header.
 * Results live in the left-side overlay panel; nothing covers the map
 * otherwise. Error states surface as a docked banner inside the map area.
 */
export function MainPane({
  data,
  error,
  lastQuery,
  selectedCountry,
  onSelectCountry,
  rightInset = 0,
  pagesLoaded,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: MainPaneProps) {
  // Dismiss-per-response: storing the data identity the user dismissed for
  // means a new search response automatically re-opens the panel.
  const [dismissedFor, setDismissedFor] =
    useState<NormalizedSearchResponse | null>(null);
  const panelOpen = data != null && dismissedFor !== data;

  return (
    <section className="relative flex h-full flex-1 flex-col overflow-hidden bg-(--color-background)">
      <WorldMap
        selectedCountry={selectedCountry}
        onSelectCountry={onSelectCountry}
        leftInset={panelOpen ? PANEL_WIDTH_PX : 0}
        rightInset={rightInset}
      />

      {data && panelOpen ? (
        <ResultsPanel
          data={data}
          query={lastQuery}
          onClose={() => setDismissedFor(data)}
          pagesLoaded={pagesLoaded}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
        />
      ) : null}

      {data && !panelOpen ? (
        <ReopenButton
          count={data.pagination.items}
          onClick={() => setDismissedFor(null)}
        />
      ) : null}

      {error ? (
        <div className="absolute right-4 bottom-12 left-4 max-w-md">
          <ErrorBanner message={error} />
        </div>
      ) : null}
    </section>
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
