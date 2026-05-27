"use client";

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
        <Cover url={coverUrl} title={album || loadedRelease.title || "release"} />

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

        <div className="flex shrink-0 items-center gap-2">
          <PlayPauseButton isPlaying={isPlaying} onToggle={togglePlay} />
          <CloseButton onClick={stop} />
        </div>
      </div>
    </div>
  );
}

function Cover({ url, title }: { url: string | null; title: string }) {
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={title}
        loading="lazy"
        className="h-14 w-14 shrink-0 rounded-sm border border-(--color-border) object-cover"
      />
    );
  }
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
      no art
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
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
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
      <svg
        width="12"
        height="12"
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        aria-hidden="true"
      >
        <path d="M3 3 L9 9 M9 3 L3 9" />
      </svg>
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3" y="2" width="2" height="8" fill="currentColor" />
      <rect x="7" y="2" width="2" height="8" fill="currentColor" />
    </svg>
  );
}
