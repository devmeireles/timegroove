"use client";

import {
  AlertCircle,
  ExternalLink,
  Heart,
  LoaderCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { CoverArt } from "@/components/common/CoverArt";
import { splitDiscogsTitle } from "@/lib/text/normalize";
import type { NormalizedRelease } from "@/types/discogs";

import type { ReconcileState } from "@/hooks/useReconcile";
import type { ResolveStatus } from "@/hooks/useYoutubePlayer";

interface ReleaseCardProps {
  release: NormalizedRelease;
  state: ReconcileState | undefined;
  /** True when this release is the one currently loaded in the player. */
  isLoaded: boolean;
  /** Player's global play/pause state (only meaningful when isLoaded). */
  isPlaying: boolean;
  /** Lookup status for this card's YouTube video. Undefined = never tried. */
  resolveStatus: ResolveStatus | undefined;
  isFavorite: boolean;
  isFavoritePending: boolean;
  onToggleFavorite: () => void;
  onPlay: () => void;
  /** Opens the album detail dialog. Cover + title + metadata are clickable. */
  onOpenDetail: () => void;
}

export function ReleaseCard({
  release,
  state,
  isLoaded,
  isPlaying,
  resolveStatus,
  isFavorite,
  isFavoritePending,
  onToggleFavorite,
  onPlay,
  onOpenDetail,
}: ReleaseCardProps) {
  const { artist, album } = splitDiscogsTitle(release.title ?? "");
  const spotify =
    state && "enriched" in state ? state.enriched.spotify : null;
  const coverUrl =
    spotify?.images[0]?.url ??
    release.coverImage ??
    release.thumb ??
    null;
  const displayTitle = album || release.title || "Untitled";
  const isCurrentRelease = isLoaded;
  const isCurrentAndPlaying = isLoaded && isPlaying;

  return (
    <article
      className={
        "flex items-stretch gap-2 rounded-sm border bg-(--color-surface) p-3 transition-colors " +
        (isCurrentAndPlaying
          ? "border-(--color-accent) ring-1 ring-accent/45"
          : isCurrentRelease
            ? "border-(--color-accent-muted)"
            : "border-(--color-border) hover:border-(--color-border-strong)")
      }
    >
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`View details for ${displayTitle}`}
        className="-m-1 flex min-w-0 flex-1 cursor-pointer items-stretch gap-4 rounded-sm p-1 text-left transition-colors hover:bg-surface-elevated/50 focus:outline-none focus-visible:bg-surface-elevated/60"
      >
        <CoverArt
          url={coverUrl}
          title={displayTitle}
          imageClassName="h-16 w-16 shrink-0 rounded-sm border border-(--color-border) object-cover"
          fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
        />

        <span className="flex min-w-0 flex-1 flex-col justify-between gap-2">
          <span className="block min-w-0">
            <span className="block truncate text-sm text-(--color-foreground)">
              {displayTitle}
            </span>
            <span className="block truncate font-mono text-[11px] text-(--color-foreground-muted)">
              {artist ?? "Unknown artist"}
              {release.year ? ` · ${release.year}` : ""}
              {release.country ? ` · ${release.country}` : ""}
            </span>
          </span>

          <TagLine genres={release.genre} styles={release.style} />
        </span>
      </button>

      <div
        className="flex shrink-0 flex-col items-end justify-center gap-2 pl-2"
        onClick={(event) => event.stopPropagation()}
      >
        <FavoriteButton
          isFavorite={isFavorite}
          isPending={isFavoritePending}
          onToggle={onToggleFavorite}
        />
        <PlayButton
          state={state}
          isLoaded={isLoaded}
          isPlaying={isPlaying}
          resolveStatus={resolveStatus}
          onPlay={onPlay}
        />
        {spotify?.externalUrl ? (
          <SpotifyLink url={spotify.externalUrl} />
        ) : null}
      </div>
    </article>
  );
}

function FavoriteButton({
  isFavorite,
  isPending,
  onToggle,
}: {
  isFavorite: boolean;
  isPending: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={isPending}
      className={
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors " +
        (isFavorite
          ? "border-pink-500/60 bg-pink-500/20 text-pink-400"
          : "border-(--color-border) text-(--color-foreground-subtle) hover:border-(--color-border-strong) hover:text-(--color-foreground)") +
        (isPending ? " opacity-60" : "")
      }
      aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
      title={isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {isPending ? (
        <LoaderCircle size={12} aria-hidden="true" className="animate-spin" />
      ) : (
        <Heart
          size={12}
          aria-hidden="true"
          fill={isFavorite ? "currentColor" : "none"}
        />
      )}
    </button>
  );
}

function SpotifyLink({ url }: { url: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="flex items-center gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle) transition-colors hover:text-(--color-accent)"
      title="Open album on Spotify"
    >
      <span>spotify</span>
      <ExternalLink size={10} aria-hidden="true" />
    </a>
  );
}

/**
 * Bordered tag chips. Genres get a sharper border + brighter text; styles
 * sit one notch quieter. Long values (e.g. "Folk, World, & Country") stay
 * on their own chip and wrap inside it via `wrap-break-word` rather than
 * stretching the row — keeps the flex-wrap layout balanced.
 */
function TagLine({ genres, styles }: { genres: string[]; styles: string[] }) {
  const items = [
    ...genres.slice(0, 2).map((text) => ({ text, kind: "genre" as const })),
    ...styles.slice(0, 3).map((text) => ({ text, kind: "style" as const })),
  ];
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-1 font-mono text-[10px] uppercase tracking-[0.12em]">
      {items.map((item, i) => (
        <span
          key={`${item.kind}-${item.text}-${i}`}
          className={
            "rounded-xs border px-1.5 py-0.5 wrap-break-word " +
            (item.kind === "genre"
              ? "border-(--color-border-strong) text-(--color-foreground-muted)"
              : "border-(--color-border) text-(--color-foreground-subtle)")
          }
        >
          {item.text}
        </span>
      ))}
    </div>
  );
}

function PlayButton({
  state,
  isLoaded,
  isPlaying,
  resolveStatus,
  onPlay,
}: {
  state: ReconcileState | undefined;
  isLoaded: boolean;
  isPlaying: boolean;
  resolveStatus: ResolveStatus | undefined;
  onPlay: () => void;
}) {
  if (state?.status === "loading" || resolveStatus === "resolving") {
    return (
      <button
        type="button"
        disabled
        className="flex h-9 w-9 items-center justify-center rounded-full border border-(--color-border) text-(--color-foreground-subtle) opacity-50"
        aria-label={
          resolveStatus === "resolving" ? "Looking up video" : "Matching"
        }
      >
        <Spinner />
      </button>
    );
  }

  if (resolveStatus === "no-video") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled
          className="flex h-9 w-9 items-center justify-center rounded-full border border-dashed border-(--color-border-strong) text-(--color-foreground-subtle)"
          aria-label="No video available"
          title="Discogs has no playable video for this release"
        >
          <AlertCircle size={14} aria-hidden="true" />
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          Unavailable
        </span>
      </div>
    );
  }

  if (resolveStatus === "error") {
    return (
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onPlay}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-red-900/70 bg-red-950/30 text-red-400 transition-colors hover:border-red-700 hover:bg-red-950/50"
          aria-label="Retry"
          title="Lookup failed — click to retry"
        >
          <RotateCcw size={13} aria-hidden="true" />
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-red-400">
          retry
        </span>
      </div>
    );
  }

  const isThisPlaying = isLoaded && isPlaying;

  return (
    <button
      type="button"
      onClick={onPlay}
      className={
        "flex h-9 w-9 items-center justify-center rounded-full transition-colors " +
        (isThisPlaying
          ? "bg-(--color-accent) text-(--color-background) ring-2 ring-accent/40"
          : isLoaded
            ? "border border-(--color-accent) text-(--color-accent)"
            : "border border-(--color-accent-muted) text-(--color-accent) hover:bg-(--color-accent) hover:text-(--color-background)")
      }
      aria-label={isThisPlaying ? "Pause" : "Play"}
      aria-pressed={isThisPlaying}
      title={isThisPlaying ? "Pause" : isLoaded ? "Resume" : "Play"}
    >
      {isThisPlaying ? (
        <Pause size={12} fill="currentColor" aria-hidden="true" />
      ) : (
        <Play size={12} fill="currentColor" aria-hidden="true" />
      )}
    </button>
  );
}

function Spinner() {
  return (
    <LoaderCircle size={12} aria-hidden="true" className="animate-spin" />
  );
}
