"use client";

import { useMemo, useState } from "react";

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
}

function sortKey(state: ReconcileState | undefined): number {
  if (state && "enriched" in state) return state.enriched.confidence;
  return 0;
}

function isResolved(state: ReconcileState | undefined): boolean {
  return state !== undefined && state.status !== "loading";
}

export function ReleaseList({ data }: ReleaseListProps) {
  const enrichment = useReconcile(data.results);
  const { loadedRelease, isPlaying, resolveStatus, playRelease } =
    useYoutubePlayerContext();
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
      .map((release, index) => ({ release, index }))
      .sort((a, b) => {
        const scoreA = sortKey(enrichment.get(a.release.id));
        const scoreB = sortKey(enrichment.get(b.release.id));
        if (scoreB !== scoreA) return scoreB - scoreA;
        return a.index - b.index;
      });
  }, [data.results, enrichment]);

  if (data.results.length === 0) {
    return (
      <div className="flex h-full items-center justify-center px-6 font-mono text-sm text-(--color-foreground-subtle)">
        {"// 0 results · try widening the year or removing genre"}
      </div>
    );
  }

  // Hold the cards until every row has either matched or failed-to-match.
  // Keeps the list from re-sorting/flashing as reconciliations land.
  if (!allReconciled) {
    return <ReconcileLoadingState resolved={resolved} total={total} />;
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
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
      </div>
      <AlbumDetailDialog
        release={detailItem?.release ?? null}
        spotify={detailItem?.spotify ?? null}
        onClose={() => setDetailItem(null)}
      />
    </div>
  );
}
