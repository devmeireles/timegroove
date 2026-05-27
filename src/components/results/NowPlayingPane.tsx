"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart, LoaderCircle, Pause, Play, X } from "lucide-react";

import { CoverArt } from "@/components/common/CoverArt";
import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { PlaylistMenuButton } from "@/components/playlists/PlaylistMenuButton";
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
  const [favoriteKeys, setFavoriteKeys] = useState<Set<string>>(new Set());
  const [favoritePending, setFavoritePending] = useState<Set<string>>(new Set());

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

  const discogsType: "release" | "master" =
    loadedRelease?.type === "master" ? "master" : "release";
  const favoriteKey = loadedRelease ? `${discogsType}:${loadedRelease.id}` : "";
  const isFavorite = favoriteKeys.has(favoriteKey);
  const isFavoritePending = favoritePending.has(favoriteKey);

  const toggleFavorite = useCallback(async () => {
    if (!loadedRelease || favoritePending.has(favoriteKey)) return;

    const currentlyFavorite = favoriteKeys.has(favoriteKey);
    setFavoritePending((prev) => new Set(prev).add(favoriteKey));
    setFavoriteKeys((prev) => {
      const next = new Set(prev);
      if (currentlyFavorite) next.delete(favoriteKey);
      else next.add(favoriteKey);
      return next;
    });

    try {
      const response = currentlyFavorite
        ? await fetch(
            `/api/favorites?discogsId=${loadedRelease.id}&discogsType=${discogsType}`,
            { method: "DELETE" },
          )
        : await fetch("/api/favorites", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ release: loadedRelease }),
          });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        setFavoriteKeys((prev) => {
          const next = new Set(prev);
          if (currentlyFavorite) next.add(favoriteKey);
          else next.delete(favoriteKey);
          return next;
        });
      }
    } catch {
      setFavoriteKeys((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) next.add(favoriteKey);
        else next.delete(favoriteKey);
        return next;
      });
    } finally {
      setFavoritePending((prev) => {
        const next = new Set(prev);
        next.delete(favoriteKey);
        return next;
      });
    }
  }, [discogsType, favoriteKey, favoriteKeys, favoritePending, loadedRelease]);

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
          <FavoriteButton
            isFavorite={isFavorite}
            isPending={isFavoritePending}
            onToggle={toggleFavorite}
          />
          <PlaylistMenuButton release={loadedRelease} direction="up" />
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
