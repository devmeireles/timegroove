"use client";

import { X } from "lucide-react";

import { ReleaseList } from "@/components/results/ReleaseList";
import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

interface ResultsPanelProps {
  data: NormalizedSearchResponse;
  query: DiscogsSearchFilters | null;
  onClose: () => void;
  pagesLoaded: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

export const PANEL_WIDTH_PX = 400;

/**
 * Right-side overlay panel containing the reconciled queue. Rendered inside
 * the map view rather than as its own surface so the user keeps the map
 * context while browsing results.
 */
export function ResultsPanel({
  data,
  query,
  onClose,
  pagesLoaded,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ResultsPanelProps) {
  // Stable key on the search identity (not page number) so the list resets
  // its reconciliation state on a fresh search but survives pagination.
  const listKey = `${query?.country ?? ""}|${query?.year ?? ""}|${query?.genre ?? ""}`;
  return (
    <aside
      className="absolute top-0 right-0 bottom-0 z-10 flex flex-col border-l border-(--color-border) bg-surface/95 shadow-2xl backdrop-blur-md"
      style={{ width: PANEL_WIDTH_PX }}
      aria-label="Releases queue"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-(--color-border) px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            Queue
          </p>
          <p
            className="mt-0.5 truncate font-mono text-xs text-(--color-foreground)"
            title={formatQuery(query)}
          >
            {data.pagination.items.toLocaleString()} releases
            {query ? ` · ${formatQuery(query)}` : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--color-foreground-subtle) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1">
        <ReleaseList
          key={listKey}
          data={data}
          pagesLoaded={pagesLoaded}
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          onLoadMore={onLoadMore}
        />
      </div>
    </aside>
  );
}

interface ReopenButtonProps {
  count: number;
  onClick: () => void;
}

export function ReopenButton({ count, onClick }: ReopenButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-9 left-4 z-10 flex items-center gap-2 rounded-sm border border-(--color-border) bg-surface/85 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-muted) backdrop-blur-sm transition-colors hover:border-(--color-accent-muted) hover:text-(--color-accent)"
    >
      <span>Open queue</span>
      <span className="text-(--color-accent)">·</span>
      <span>{count.toLocaleString()}</span>
    </button>
  );
}

function formatQuery(query: DiscogsSearchFilters | null): string {
  if (!query) return "";
  const parts: string[] = [];
  if (query.country) parts.push(query.country);
  if (query.year) parts.push(query.year);
  if (query.genre) parts.push(query.genre);
  return parts.join(" · ");
}
