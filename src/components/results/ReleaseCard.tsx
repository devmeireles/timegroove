"use client";

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

  return (
    <article className="flex items-stretch gap-2 rounded-sm border border-(--color-border) bg-(--color-surface) p-3 transition-colors hover:border-(--color-border-strong)">
      <button
        type="button"
        onClick={onOpenDetail}
        aria-label={`View details for ${displayTitle}`}
        className="-m-1 flex min-w-0 flex-1 cursor-pointer items-stretch gap-4 rounded-sm p-1 text-left transition-colors hover:bg-surface-elevated/50 focus:outline-none focus-visible:bg-surface-elevated/60"
      >
        <Cover url={coverUrl} title={displayTitle} />

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

          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)">
            {release.genre.length > 0 ? <Chips items={release.genre} /> : null}
            {release.style.length > 0 ? (
              <Chips items={release.style} muted />
            ) : null}
          </span>
        </span>
      </button>

      <div
        className="flex shrink-0 flex-col items-end justify-center gap-2 pl-2"
        onClick={(event) => event.stopPropagation()}
      >
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
      <ExternalLinkIcon />
    </a>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 2 H2 V10 H10 V7" />
      <path d="M7 2 H10 V5" />
      <path d="M10 2 L5.5 6.5" />
    </svg>
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
        className="h-16 w-16 shrink-0 rounded-sm border border-(--color-border) object-cover"
      />
    );
  }
  return (
    <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
      no art
    </div>
  );
}

function Chips({ items, muted = false }: { items: string[]; muted?: boolean }) {
  return (
    <div className="flex flex-wrap gap-1">
      {items.slice(0, 4).map((item) => (
        <span
          key={item}
          className={
            "rounded-xs border px-1.5 py-0.5 " +
            (muted
              ? "border-(--color-border) text-(--color-foreground-subtle)"
              : "border-(--color-border-strong) text-(--color-foreground-muted)")
          }
        >
          {item}
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
          <UnavailableIcon />
        </button>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
          Resource not available
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
          <RetryIcon />
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
      {isThisPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <path d="M3 2 L10 6 L3 10 Z" fill="currentColor" />
    </svg>
  );
}

function UnavailableIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
      <path d="M4 3 L11 7 L4 11 Z" fill="currentColor" opacity="0.35" />
      <line
        x1="2"
        y1="12"
        x2="12"
        y2="2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function RetryIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 13 13"
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M11 6.5 A4.5 4.5 0 1 1 6.5 2"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M6.5 0.5 L6.5 3.5 L9.5 3.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
      <rect x="3" y="2" width="2" height="8" fill="currentColor" />
      <rect x="7" y="2" width="2" height="8" fill="currentColor" />
    </svg>
  );
}

function Spinner() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      aria-hidden="true"
      className="animate-spin"
    >
      <circle
        cx="6"
        cy="6"
        r="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="6 12"
      />
    </svg>
  );
}
