"use client";

import { useState } from "react";
import { Pause, Play, X } from "lucide-react";

import { CoverArt } from "@/components/common/CoverArt";
import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { useYoutubePlayerContext } from "@/contexts/YoutubePlayerContext";
import { splitDiscogsTitle } from "@/lib/text/normalize";

/**
 * Docked bottom strip showing what's currently in the YouTube player.
 * Visual language stays close to ReleaseCard (cover + title + meta) but
 * drops the genre/style chips and gains play/pause + close controls.
 *
 * Renders nothing when no release is loaded.
 */
export function NowPlayingPane() {
  const { loadedRelease, loadedSpotify, isPlaying, togglePlay, stop } =
    useYoutubePlayerContext();
  const [detailOpen, setDetailOpen] = useState(false);

  if (!loadedRelease) return null;

  const { artist, album } = splitDiscogsTitle(loadedRelease.title ?? "");
  const coverUrl =
    loadedSpotify?.images[0]?.url ??
    loadedRelease.coverImage ??
    loadedRelease.thumb ??
    null;

  return (
    <div
      role="region"
      aria-label="Now playing"
      className="shrink-0 border-t border-(--color-border) bg-(--color-surface)"
    >
      <div className="flex items-stretch gap-4 px-6 py-3">
        <button
          type="button"
          onClick={() => setDetailOpen(true)}
          aria-label={`View details for ${album || loadedRelease.title || "Untitled"}`}
          className="-m-1 flex min-w-0 flex-1 items-stretch gap-4 rounded-sm p-1 text-left transition-colors hover:bg-surface-elevated/50 focus:outline-none focus-visible:bg-surface-elevated/60"
        >
          <CoverArt
            url={coverUrl}
            title={album || loadedRelease.title || "release"}
            imageClassName="h-14 w-14 shrink-0 rounded-sm border border-(--color-border) object-cover"
            fallbackClassName="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
          />

          <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
              Now playing
            </p>
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

        <div className="flex shrink-0 items-center gap-2">
          <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlay} />
          <CloseButton onClick={stop} />
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

function PlayPauseButton({
  isPlaying,
  onToggle,
}: {
  isPlaying: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={
        "flex h-10 w-10 items-center justify-center rounded-full transition-colors " +
        (isPlaying
          ? "bg-(--color-accent) text-(--color-background) ring-2 ring-accent/40"
          : "border border-(--color-accent) text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-background)")
      }
      aria-label={isPlaying ? "Pause" : "Play"}
      aria-pressed={isPlaying}
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? (
        <Pause size={14} fill="currentColor" aria-hidden="true" />
      ) : (
        <Play size={14} fill="currentColor" aria-hidden="true" />
      )}
    </button>
  );
}

function CloseButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 w-8 items-center justify-center rounded-full border border-(--color-border) text-(--color-foreground-subtle) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground)"
      aria-label="Stop and close"
      title="Stop"
    >
      <X size={12} aria-hidden="true" />
    </button>
  );
}
