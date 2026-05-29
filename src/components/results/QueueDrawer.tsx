"use client";

import { useMemo, useState } from "react";
import {
  MoreHorizontal,
  X,
  Trash2,
} from "lucide-react";

import { CoverArt } from "@/components/common/CoverArt";
import { PlaylistMenuButton } from "@/components/playlists/PlaylistMenuButton";
import { useYoutubePlayerControllerContext } from "@/contexts/YoutubePlayerContext";
import { splitDiscogsTitle } from "@/lib/text/normalize";
import type { PlayReleaseInput } from "@/hooks/useYoutubePlayer";

export const QUEUE_PANEL_WIDTH_PX = 360;

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const { queueItems, loadedRelease, loadedSpotify, playRelease, removeFromQueue } =
    useYoutubePlayerControllerContext();
  const [openMenuKey, setOpenMenuKey] = useState<string | null>(null);

  const displayQueue = useMemo<PlayReleaseInput[]>(() => {
    if (queueItems.length > 0) return queueItems;
    if (!loadedRelease) return [];
    return [{ release: loadedRelease, spotify: loadedSpotify }];
  }, [loadedRelease, loadedSpotify, queueItems]);

  const currentKey = loadedRelease
    ? `${loadedRelease.id}:${loadedRelease.type}`
    : null;

  if (!open) return null;

  return (
    <aside
      className="absolute top-16 right-0 bottom-24 z-20 flex flex-col border-l border-(--color-border) bg-surface/95 shadow-2xl backdrop-blur-md"
      style={{ width: QUEUE_PANEL_WIDTH_PX }}
      aria-label="Queue"
    >
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-(--color-border) px-4 py-3">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-(--color-foreground-subtle)">
            Queue
          </p>
          <p className="mt-0.5 truncate font-mono text-xs text-(--color-foreground)">
            {displayQueue.length.toLocaleString()} tracks
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close queue"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-(--color-foreground-subtle) transition-colors hover:bg-(--color-surface-elevated) hover:text-(--color-foreground)"
        >
          <X size={12} aria-hidden="true" />
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3">
        {displayQueue.length === 0 ? (
          <div className="flex h-full items-center justify-center px-2 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-(--color-foreground-subtle)">
            {"// queue is empty"}
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {displayQueue.map((item, index) => {
              const key = `${item.release.id}:${item.release.type}`;
              const isCurrent = key === currentKey;
              const isMenuOpen = openMenuKey === key;
              return (
                <li
                  key={key}
                  className="group rounded-sm border border-(--color-border) bg-(--color-surface) p-2 transition-colors hover:border-(--color-border-strong)"
                >
                  <div className="relative flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setOpenMenuKey(null);
                        void playRelease(item);
                      }}
                      className={
                        "flex min-w-0 flex-1 items-start gap-3 rounded-sm text-left transition-colors hover:bg-surface-elevated/50 " +
                        (isCurrent ? "ring-1 ring-accent/35" : "")
                      }
                    >
                      <CoverArt
                        url={resolveCoverUrl(item)}
                        title={resolveTitle(item)}
                        imageClassName="h-12 w-12 shrink-0 rounded-sm border border-(--color-border) object-cover"
                        fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[9px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)"
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-(--color-foreground)">
                          {resolveTitle(item)}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                          {resolveArtist(item)}
                        </p>
                        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                          {isCurrent ? "Now playing" : `Up next · ${index + 1}`}
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenMenuKey((value) => (value === key ? null : key))
                      }
                      className={
                        "mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border opacity-0 transition-colors group-hover:opacity-100 group-focus-within:opacity-100 " +
                        (isMenuOpen
                          ? "border-(--color-accent) text-(--color-accent)"
                          : "border-(--color-border) text-(--color-foreground-subtle) hover:border-(--color-border-strong) hover:text-(--color-foreground)")
                      }
                      aria-label="Queue item actions"
                      title="More"
                    >
                      <MoreHorizontal size={12} aria-hidden="true" />
                    </button>
                  </div>

                  {isMenuOpen ? (
                    <div className="mt-2 flex items-center gap-2 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-2">
                      <PlaylistMenuButton release={item.release} direction="up" />
                      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                        add to playlist
                      </span>
                      <button
                        type="button"
                        disabled={isCurrent}
                        onClick={() => {
                          removeFromQueue(item);
                          setOpenMenuKey(null);
                        }}
                        className="ml-auto flex items-center gap-1 rounded-sm border border-red-800/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:border-red-500 hover:text-red-200 disabled:opacity-40"
                        title={isCurrent ? "Current track stays in queue" : "Remove from queue"}
                      >
                        <Trash2 size={10} />
                        Remove
                      </button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </aside>
  );
}

function resolveTitle(item: PlayReleaseInput): string {
  const parsed = splitDiscogsTitle(item.release.title ?? "");
  return parsed.album ?? item.release.title ?? "Untitled";
}

function resolveArtist(item: PlayReleaseInput): string {
  const parsed = splitDiscogsTitle(item.release.title ?? "");
  const parts = [
    parsed.artist,
    item.release.year ? String(item.release.year) : null,
    item.release.country,
  ].filter((value): value is string => value != null && value.length > 0);
  return parts.length > 0 ? parts.join(" · ") : "Unknown artist";
}

function resolveCoverUrl(item: PlayReleaseInput): string | null {
  return (
    item.spotify?.images[0]?.url ??
    item.release.coverImage ??
    item.release.thumb ??
    null
  );
}
