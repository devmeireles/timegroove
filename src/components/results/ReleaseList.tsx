"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { ReconcileLoadingState } from "@/components/results/ReconcileLoadingState";
import { ReleaseCard } from "@/components/results/ReleaseCard";
import { useYoutubePlayerContext } from "@/contexts/YoutubePlayerContext";
import { useReconcile, type ReconcileState } from "@/hooks/useReconcile";
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
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [favoritePending, setFavoritePending] = useState<Set<string>>(new Set());
  const {
    containerRef: _ignoredContainer,
    loadedRelease,
    isPlaying,
    resolveStatus,
    playRelease,
  } = useYoutubePlayerContext();
  void _ignoredContainer;
  const [detailItem, setDetailItem] = useState<{
    release: NormalizedRelease;
    spotify: EnrichedSpotify | null;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    async function loadFavorites() {
      try {
        const response = await fetch("/api/favorites", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setFavoriteKeys(new Set());
          return;
        }
        const data = (await response.json()) as {
          favorites?: Array<{ discogsId: number; discogsType: "release" | "master" }>;
        };
        const next = new Set<string>();
        for (const item of data.favorites ?? []) {
          next.add(`${item.discogsType}:${item.discogsId}`);
        }
        setFavoriteKeys(next);
      } catch {
        setFavoriteKeys(new Set());
      }
    }
    void loadFavorites();
    return () => controller.abort();
  }, []);

  const toggleFavorite = useCallback(async (release: NormalizedRelease) => {
    const discogsType: "release" | "master" =
      release.type === "master" ? "master" : "release";
    const key = `${discogsType}:${release.id}`;
    if (favoritePending.has(key)) return;

    const currentlyFavorite = favoriteKeys.has(key);
    setFavoritePending((prev) => new Set(prev).add(key));
    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (currentlyFavorite) next.delete(key);
      else next.add(key);
      return next;
    });

    try {
      const response = currentlyFavorite
        ? await fetch(
            `/api/favorites?discogsId=${release.id}&discogsType=${discogsType}`,
            { method: "DELETE" },
          )
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ release }),
          });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        setFavoriteKeys((prev) => {
          const next = new Set(prev);
          if (currentlyFavorite) next.add(key);
          else next.delete(key);
          return next;
        });
      }
    } catch {
      setFavoriteKeys((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) next.add(key);
        else next.delete(key);
        return next;
      });
    } finally {
      setFavoritePending((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  }, [favoriteKeys, favoritePending]);

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
        className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4"
      >
        {sorted.map(({ release }) => {
          const discogsType: "release" | "master" =
            release.type === "master" ? "master" : "release";
          const key = `${discogsType}-${release.id}`;
          const reconcileState = enrichment.get(release.id);
          const enrichedSpotify =
            reconcileState && "enriched" in reconcileState
              ? reconcileState.enriched.spotify
              : null;
          const isLoaded =
            loadedRelease != null &&
            loadedRelease.id === release.id &&
            (loadedRelease.type === "master" ? "master" : "release") ===
              discogsType;
          return (
            <ReleaseCard
              key={key}
              release={release}
              state={reconcileState}
              isLoaded={isLoaded}
              isPlaying={isPlaying}
              isFavorite={favoriteKeys.has(`${discogsType}:${release.id}`)}
              isFavoritePending={favoritePending.has(`${discogsType}:${release.id}`)}
              onToggleFavorite={() => toggleFavorite(release)}
              resolveStatus={resolveStatus.get(key)}
              onPlay={() =>
                playRelease({ release, spotify: enrichedSpotify })
              }
              onOpenDetail={() =>
                setDetailItem({ release, spotify: enrichedSpotify })
              }
            />
          );
        })}

        <PaginationFooter
          hasMore={hasMore}
          isLoadingMore={isLoadingMore}
          sentinelRef={sentinelRef}
        />
      </div>
      <AlbumDetailDialog
        release={detailItem?.release ?? null}
        spotify={detailItem?.spotify ?? null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}

function PaginationFooter({
  hasMore,
  isLoadingMore,
  sentinelRef,
}: {
  hasMore: boolean;
  isLoadingMore: boolean;
  sentinelRef: React.RefObject<HTMLDivElement | null>;
}) {
  if (!hasMore) {
    return (
      <p className="px-2 py-4 text-center font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
        end of crate
      </p>
    );
  }
  return (
    <div
      ref={sentinelRef}
      className="flex items-center justify-center gap-2 px-2 py-4"
    >
      {isLoadingMore ? (
        <>
          <Spinner />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            loading more
          </span>
        </>
      ) : (
        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          scroll for more
        </span>
      )}
    </div>
  );
}

function Spinner() {
  return (
    <LoaderCircle
      size={12}
      aria-hidden="true"
      className="animate-spin text-(--color-accent)"
    />
  );
}
