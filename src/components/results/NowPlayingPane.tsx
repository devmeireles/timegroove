"use client";

import { useState } from "react";
import {
  SkipBack,
  SkipForward,
} from "lucide-react";

import { CloseIconButton } from "@/components/common/CloseIconButton";
import { CoverArt } from "@/components/common/CoverArt";
import { FavoriteToggleButton } from "@/components/common/FavoriteToggleButton";
import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { PlaylistMenuButton } from "@/components/playlists/PlaylistMenuButton";
import { PlayPauseButton } from "@/components/results/PlayPauseButton";
import { useFavoritesContext } from "@/contexts/FavoritesContext";
import {
  useYoutubePlayerControllerContext,
  useYoutubePlayerTimingContext,
} from "@/contexts/YoutubePlayerContext";
import { splitDiscogsTitle } from "@/lib/text/normalize";

/**
 * Docked bottom strip showing what's currently in the YouTube player.
 * Three zones: left = track info, center = transport + seek bar,
 * right = library controls.
 */
export function NowPlayingPane() {
  const {
    loadedRelease,
    loadedSpotify,
    isPlaying,
    togglePlay,
    playPrevious,
    playNext,
    seekToProgress,
    stop,
  } = useYoutubePlayerControllerContext();
  const { currentTimeSec, durationSec } = useYoutubePlayerTimingContext();

  const [detailOpen, setDetailOpen] = useState(false);
  const { isFavorite, isFavoritePending, toggleFavorite } = useFavoritesContext();

  if (!loadedRelease) return null;

  const { artist, album } = splitDiscogsTitle(loadedRelease.title ?? "");
  const coverUrl =
    loadedSpotify?.images[0]?.url ??
    loadedRelease.coverImage ??
    loadedRelease.thumb ??
    null;

  const progress =
    durationSec > 0
      ? Math.min(1, Math.max(0, currentTimeSec / durationSec))
      : 0;

  return (
    <div
      role="region"
      aria-label="Now playing"
      className="shrink-0 border-t border-(--color-border) bg-(--color-surface)"
    >
      <div className="grid grid-cols-1 items-center gap-3 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_minmax(340px,560px)_minmax(0,1fr)] sm:gap-4 sm:px-6">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={`View details for ${album || loadedRelease.title || "Untitled"}`}
          className="-m-1 flex min-w-0 items-stretch gap-4 rounded-sm p-1 text-left transition-colors hover:bg-surface-elevated/50 focus:outline-none focus-visible:bg-surface-elevated/60"
        >
          <CoverArt
            url={coverUrl}
            title={album || loadedRelease.title || "release"}
            imageClassName="h-14 w-14 shrink-0 rounded-sm border border-(--color-border) object-cover"
            fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <h3 className="truncate text-sm text-(--color-foreground)">
              {album || loadedRelease.title || "Untitled"}
            </h3>
            <p className="truncate font-mono text-[11px] text-(--color-foreground-muted)">
              {artist ?? "Unknown artist"}
              {loadedRelease.year ? ` · ${loadedRelease.year}` : ""}
              {loadedRelease.country ? ` · ${loadedRelease.country}` : ""}
            </p>
          </div>
        </button>

        <div className="flex min-w-0 flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <TrackJumpButton direction="previous" onClick={playPrevious} />
            <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlay} />
            <TrackJumpButton direction="next" onClick={playNext} />
          </div>

          <div className="flex w-full items-center gap-2">
            <span className="w-10 text-right font-mono text-[10px] text-(--color-foreground-subtle)">
              {formatDuration(currentTimeSec)}
            </span>
            <input
              type="range"
              min={0}
              max={1000}
              value={Math.round(progress * 1000)}
              onChange={(event) => {
                const ratio = Number(event.target.value) / 1000;
                seekToProgress(ratio);
              }}
              className="h-1 w-full cursor-pointer accent-(--color-accent)"
              aria-label="Seek track position"
            />
            <span className="w-10 font-mono text-[10px] text-(--color-foreground-subtle)">
              {formatDuration(durationSec)}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2">
          <FavoriteToggleButton
            isFavorite={isFavorite(loadedRelease)}
            isPending={isFavoritePending(loadedRelease)}
            onToggle={() => void toggleFavorite(loadedRelease)}
          />
          <PlaylistMenuButton release={loadedRelease} direction="up" />
          <CloseIconButton onClick={stop} ariaLabel="Stop and close" title="Stop" />
        </div>
      </div>

      <AlbumDetailDialog
        release={detailOpen ? loadedRelease : null}
        spotify={detailOpen ? loadedSpotify : null}
        onClose={() => setDetailOpen(false)}
      />
    </div>
  );
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

function TrackJumpButton({
  direction,
  onClick,
}: {
  direction: "previous" | "next";
  onClick: () => void;
}) {
  const isPrevious = direction === "previous";
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-foreground-subtle) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground)"
      aria-label={isPrevious ? "Previous track" : "Next track"}
      title={isPrevious ? "Previous track" : "Next track"}
    >
      {isPrevious ? (
        <SkipBack size={12} aria-hidden="true" />
      ) : (
        <SkipForward size={12} aria-hidden="true" />
      )}
    </button>
  );
}
