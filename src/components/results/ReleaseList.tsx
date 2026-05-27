"use client";

import { useMemo } from "react";

import { ReleaseCard } from "@/components/results/ReleaseCard";
import { useReconcile, type ReconcileState } from "@/hooks/useReconcile";
import { useYoutubePlayer } from "@/hooks/useYoutubePlayer";
import type { NormalizedSearchResponse } from "@/types/discogs";

interface ReleaseListProps {
  data: NormalizedSearchResponse;
}

function sortKey(state: ReconcileState | undefined): number {
  if (state && "enriched" in state) return state.enriched.confidence;
  return 0;
}

export function ReleaseList({ data }: ReleaseListProps) {
  const enrichment = useReconcile(data.results);
  const {
    containerRef,
    loadedKey,
    isPlaying,
    resolveStatus,
    playRelease,
  } = useYoutubePlayer();

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

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-1 flex-col gap-3 overflow-y-auto px-4 py-4">
        {sorted.map(({ release }) => {
          const discogsType: "release" | "master" =
            release.type === "master" ? "master" : "release";
          const key = `${discogsType}-${release.id}`;
          return (
            <ReleaseCard
              key={`${release.type}-${release.id}`}
              release={release}
              state={enrichment.get(release.id)}
              isLoaded={loadedKey === key}
              isPlaying={isPlaying}
              resolveStatus={resolveStatus.get(key)}
              onPlay={() =>
                playRelease({ discogsId: release.id, discogsType })
              }
            />
          );
        })}
      </div>

      {/* Hidden host for the YouTube iframe. Positioned off-screen — the
          iframe still loads and the IFrame API can play audio because YouTube
          sets the right `allow` attributes on its iframe. */}
      <div
        ref={containerRef}
        className="pointer-events-none fixed"
        style={{
          left: -9999,
          top: 0,
          width: 320,
          height: 180,
          opacity: 0,
        }}
        aria-hidden="true"
      />
    </div>
  );
}
