"use client";

import {
  AlertCircle,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";

import { CoverArt } from "@/components/common/CoverArt";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { splitDiscogsTitle } from "@/lib/text/normalize";
import type { NormalizedRelease } from "@/types/discogs";
import type { EnrichedSpotify } from "@/types/reconciliation";

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
  spotifyOverride?: EnrichedSpotify | null;
  onPlay: () => void;
  /** Opens the album detail dialog. Metadata area is clickable. */
  onOpenDetail: () => void;
}

export function ReleaseCard({
  release,
  state,
  isLoaded,
  isPlaying,
  resolveStatus,
  spotifyOverride,
  onPlay,
  onOpenDetail,
}: ReleaseCardProps) {
  const { artist, album } = splitDiscogsTitle(release.title ?? "");
  const spotify =
    spotifyOverride ?? (state && "enriched" in state ? state.enriched.spotify : null);
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
      <div className="group relative h-16 w-16 shrink-0">
        <CoverArt
          url={coverUrl}
          title={displayTitle}
          imageClassName="h-16 w-16 shrink-0 rounded-sm border border-(--color-border) object-cover"
          fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)"
        />
        <button
          type="button"
          onClick={onPlay}
          className="absolute inset-0 rounded-sm bg-black/0 transition-colors hover:bg-black/65 focus:bg-black/65"
          aria-label={isCurrentAndPlaying ? "Pause playback" : "Play release"}
          title={isCurrentAndPlaying ? "Pause" : "Play"}
        >
          <ThumbOverlayStatus
            resolveStatus={resolveStatus}
            isLoaded={isLoaded}
            isPlaying={isPlaying}
          />
        </button>
      </div>

      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`View details for ${displayTitle}`}
        className="-m-1 flex min-w-0 flex-1 cursor-pointer items-stretch gap-4 rounded-sm p-1 text-left transition-colors hover:bg-surface-elevated/50 focus:outline-none focus-visible:bg-surface-elevated/60"
      >
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
    </article>
  );
}

function ThumbOverlayStatus({
  resolveStatus,
  isLoaded,
  isPlaying,
}: {
  resolveStatus: ResolveStatus | undefined;
  isLoaded: boolean;
  isPlaying: boolean;
}) {
  if (resolveStatus === "resolving") {
    return (
      <span className="flex h-full items-center justify-center text-white/90">
        <LoadingSpinner size={14} />
      </span>
    );
  }
  if (resolveStatus === "no-video") {
    return (
      <span className="flex h-full items-center justify-center text-white/90">
        <AlertCircle size={16} aria-hidden="true" />
      </span>
    );
  }
  if (resolveStatus === "error") {
    return (
      <span className="flex h-full items-center justify-center text-red-200">
        <RotateCcw size={16} aria-hidden="true" />
      </span>
    );
  }

  const icon = isLoaded && isPlaying ? (
    <Pause size={16} fill="currentColor" aria-hidden="true" />
  ) : (
    <Play size={16} fill="currentColor" aria-hidden="true" />
  );

  return (
    <span
      className="flex h-full items-center justify-center text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100"
      aria-hidden="true"
    >
      {icon}
    </span>
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
