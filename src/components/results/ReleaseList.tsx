"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { ListPlus, MoreHorizontal, Trash2 } from "lucide-react";

import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { PlaylistMenuButton } from "@/components/playlists/PlaylistMenuButton";
import { PaginationFooter } from "@/components/results/PaginationFooter";
import { ReconcileLoadingState } from "@/components/results/ReconcileLoadingState";
import { ReleaseCard } from "@/components/results/ReleaseCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYoutubePlayerControllerContext } from "@/contexts/YoutubePlayerContext";
import { useReconcile, type ReconcileState } from "@/hooks/useReconcile";
import {
  getReleaseDiscogsType,
  getReleaseIdentityKey,
} from "@/lib/discogs/releaseIdentity";
import type {
  NormalizedRelease,
  NormalizedSearchResponse,
} from "@/types/discogs";
import type { EnrichedSpotify } from "@/types/reconciliation";

interface ReleaseListProps {
  data: NormalizedSearchResponse;
  pagesLoaded: number;
  hasMore: boolean;
  isLoadingMore: boolean;
  onLoadMore: () => void;
}

function sortKey(state: ReconcileState | undefined): number {
  if (state && "enriched" in state) return state.enriched.confidence;
  return 0;
}

function isResolved(state: ReconcileState | undefined): boolean {
  return state !== undefined && state.status !== "loading";
}

export function ReleaseList({
  data,
  pagesLoaded,
  hasMore,
  isLoadingMore,
  onLoadMore,
}: ReleaseListProps) {
  const pageSize = Math.max(1, data.query.per_page || 10);
  const enrichment = useReconcile(data.results);
  const {
    containerRef: _ignoredContainer,
    loadedRelease,
    queueItems,
    isPlaying,
    resolveStatus,
    registerQueue,
    removeFromQueue,
    playRelease,
  } = useYoutubePlayerControllerContext();
  void _ignoredContainer;
  const [detailItem, setDetailItem] = useState<{
    release: NormalizedRelease;
    spotify: EnrichedSpotify | null;
  } | null>(null);

  const { allReconciled, resolved, total } = useMemo(() => {
    let count = 0;
    for (const release of data.results) {
      if (isResolved(enrichment.get(release.id))) count += 1;
    }
    return {
      allReconciled: count === data.results.length,
      resolved: count,
      total: data.results.length,
    };
  }, [data.results, enrichment]);

  const sorted = useMemo(() => {
    return data.results
      .map((release, index) => ({
        release,
        index,
        pageIndex: Math.floor(index / pageSize),
      }))
      .sort((a, b) => {
        if (a.pageIndex !== b.pageIndex) return a.pageIndex - b.pageIndex;
        const scoreA = sortKey(enrichment.get(a.release.id));
        const scoreB = sortKey(enrichment.get(b.release.id));
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.index - b.index;
      });
  }, [data.results, enrichment, pageSize]);

  const requestedRef = useRef(false);
  useEffect(() => {
    if (!isLoadingMore) requestedRef.current = false;
  }, [isLoadingMore]);

  const triggerLoadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || requestedRef.current) return;
    requestedRef.current = true;
    onLoadMore();
  }, [hasMore, isLoadingMore, onLoadMore]);

  // Sentinel observer: when the bottom marker enters view, request the next
  // page. Re-attaches on hasMore/isLoadingMore transitions so we don't fire
  // duplicate loadMore calls.
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line react-hooks/incompatible-library
  const rowVirtualizer = useVirtualizer({
    count: sorted.length + 1,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 116,
    overscan: 8,
    getItemKey: (index) =>
      index === sorted.length
        ? "pagination-footer"
        : getReleaseIdentityKey(sorted[index].release),
  });
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const root = scrollContainerRef.current;
    const node = sentinelRef.current;
    if (!root || !node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            triggerLoadMore();
            break;
          }
        }
      },
      { root, rootMargin: "0px 0px 200px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasMore, isLoadingMore, triggerLoadMore]);

  const handleScroll = useCallback(() => {
    if (!hasMore || isLoadingMore) return;
    const root = scrollContainerRef.current;
    if (!root) return;
    const distanceFromBottom = root.scrollHeight - root.scrollTop - root.clientHeight;
    if (distanceFromBottom <= 240) triggerLoadMore();
  }, [hasMore, isLoadingMore, triggerLoadMore]);

  // If the content doesn't overflow yet, eagerly fetch the next page so the
  // user doesn't get stuck with a non-scrollable list and an unseen sentinel.
  useEffect(() => {
    if (!hasMore || isLoadingMore) return;
    const root = scrollContainerRef.current;
    if (!root) return;
    if (root.scrollHeight <= root.clientHeight + 8) triggerLoadMore();
  }, [hasMore, isLoadingMore, sorted.length, triggerLoadMore]);

  if (data.results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 font-mono text-sm text-(--color-foreground-subtle)">
        {"// 0 results · try widening the year or removing genre"}
      </div>
    );
  }

  // Gate only on the very first page. Once cards are visible, subsequent
  // pages append inline with per-card loading states — no full-screen
  // takeover when the user scrolls for more.
  if (pagesLoaded <= 1 && !allReconciled) {
    return <ReconcileLoadingState resolved={resolved} total={total} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div
          className="relative w-full"
          style={{ height: `${rowVirtualizer.getTotalSize()}px` }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualItem) => {
            if (virtualItem.index === sorted.length) {
              return (
                <div
                  key={virtualItem.key}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualItem.index}
                  className="absolute top-0 left-0 w-full"
                  style={{ transform: `translateY(${virtualItem.start}px)` }}
                >
                  <PaginationFooter
                    hasMore={hasMore}
                    isLoadingMore={isLoadingMore}
                    sentinelRef={sentinelRef}
                  />
                </div>
              );
            }

            const { release } = sorted[virtualItem.index];
            const discogsType = getReleaseDiscogsType(release);
            const key = getReleaseIdentityKey(release);
            const reconcileState = enrichment.get(release.id);
            const enrichedSpotify =
              reconcileState && "enriched" in reconcileState
                ? reconcileState.enriched.spotify
                : null;
            const isLoaded =
              loadedRelease != null &&
              loadedRelease.id === release.id &&
              getReleaseDiscogsType(loadedRelease) === discogsType;
            const isQueued = queueItems.some(
              (item) => getReleaseIdentityKey(item.release) === key,
            );

            return (
              <div
                key={virtualItem.key}
                ref={rowVirtualizer.measureElement}
                data-index={virtualItem.index}
                className="group absolute top-0 left-0 w-full pb-3"
                style={{ transform: `translateY(${virtualItem.start}px)` }}
              >
                <ReleaseCard
                  key={key}
                  release={release}
                  state={reconcileState}
                  isLoaded={isLoaded}
                  isPlaying={isPlaying}
                  resolveStatus={resolveStatus.get(key)}
                  onPlay={() => {
                    const nextQueue = [
                      { release, spotify: enrichedSpotify },
                      ...queueItems.filter(
                        (item) => getReleaseIdentityKey(item.release) !== key,
                      ),
                    ];
                    registerQueue(nextQueue);
                    void playRelease({ release, spotify: enrichedSpotify });
                  }}
                  onOpenDetail={() =>
                    setDetailItem({ release, spotify: enrichedSpotify })
                  }
                />
                <DropdownMenu>
                  <DropdownMenuTrigger
                    className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-foreground-subtle) opacity-0 transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) group-hover:opacity-100 group-focus-within:opacity-100"
                    aria-label="Result item actions"
                    title="More"
                  >
                    <MoreHorizontal size={12} aria-hidden="true" />
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-52 border border-(--color-border) bg-(--color-surface-elevated) p-1 text-(--color-foreground) shadow-2xl ring-0"
                  >
                    <DropdownMenuGroup>
                      <DropdownMenuItem
                        disabled={isQueued}
                        onClick={() => {
                          if (isQueued) return;
                          registerQueue([
                            ...queueItems,
                            { release, spotify: enrichedSpotify },
                          ]);
                        }}
                        className="h-8 cursor-pointer justify-start gap-1.5 rounded-md px-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground) data-[highlighted]:bg-(--color-surface) data-[highlighted]:text-(--color-foreground) data-[popup-open]:bg-(--color-surface) data-[popup-open]:text-(--color-foreground)"
                      >
                        <ListPlus size={12} />
                        Add to queue
                      </DropdownMenuItem>
                      <div className="px-1 py-1">
                        <PlaylistMenuButton
                          release={release}
                          direction="up"
                          variant="menu-item"
                        />
                      </div>
                      <DropdownMenuItem
                        disabled={!isQueued || isLoaded}
                        onClick={() =>
                          removeFromQueue({ release, spotify: enrichedSpotify })
                        }
                        className="font-mono text-[10px] uppercase tracking-[0.14em]"
                      >
                        <Trash2 size={10} />
                        Remove from queue
                      </DropdownMenuItem>
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          })}
        </div>
      </div>
      <AlbumDetailDialog
        release={detailItem?.release ?? null}
        spotify={detailItem?.spotify ?? null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
