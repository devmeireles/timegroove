"use client";

import { useState } from "react";
import {
  MoreHorizontal,
  X,
  Trash2,
} from "lucide-react";

import { AlbumDetailDialog } from "@/components/details/AlbumDetailDialog";
import { PlaylistMenuButton } from "@/components/playlists/PlaylistMenuButton";
import { ReleaseCard } from "@/components/results/ReleaseCard";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useYoutubePlayerControllerContext } from "@/contexts/YoutubePlayerContext";
import { getReleaseDiscogsType, getReleaseIdentityKey } from "@/lib/discogs/releaseIdentity";
import type { PlayReleaseInput } from "@/hooks/useYoutubePlayer";
import type { EnrichedSpotify } from "@/types/reconciliation";

export const QUEUE_PANEL_WIDTH_PX = 360;

interface QueueDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function QueueDrawer({ open, onClose }: QueueDrawerProps) {
  const {
    queueItems,
    loadedRelease,
    isPlaying,
    resolveStatus,
    playRelease,
    removeFromQueue,
  } = useYoutubePlayerControllerContext();
  const [detailItem, setDetailItem] = useState<{
    release: PlayReleaseInput["release"];
    spotify: EnrichedSpotify | null;
  } | null>(null);

  const displayQueue: PlayReleaseInput[] = queueItems;

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
            {displayQueue.map((item) => {
              const key = getReleaseIdentityKey(item.release);
              const isCurrent =
                loadedRelease != null &&
                loadedRelease.id === item.release.id &&
                getReleaseDiscogsType(loadedRelease) ===
                  getReleaseDiscogsType(item.release);
              return (
                <li
                  key={key}
                  className="group relative"
                >
                  <ReleaseCard
                    release={item.release}
                    state={undefined}
                    spotifyOverride={item.spotify}
                    isLoaded={isCurrent}
                    isPlaying={isPlaying}
                    resolveStatus={resolveStatus.get(key)}
                    onPlay={() => {
                      void playRelease(item);
                    }}
                    onOpenDetail={() =>
                      setDetailItem({ release: item.release, spotify: item.spotify })
                    }
                  />

                  <DropdownMenu>
                    <DropdownMenuTrigger
                      className="absolute top-2 right-2 z-10 flex h-7 w-7 items-center justify-center rounded-full border border-(--color-border) bg-(--color-surface) text-(--color-foreground-subtle) opacity-0 transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) group-hover:opacity-100 group-focus-within:opacity-100"
                      aria-label="Queue item actions"
                      title="More"
                    >
                      <MoreHorizontal size={12} aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="end"
                      className="w-52 border border-(--color-border) bg-(--color-surface-elevated) p-1 text-(--color-foreground) shadow-2xl ring-0"
                    >
                      <DropdownMenuGroup>
                        <div className="px-1 py-1">
                          <PlaylistMenuButton
                            release={item.release}
                            direction="up"
                            variant="menu-item"
                          />
                        </div>
                        <DropdownMenuItem
                          disabled={isCurrent}
                          onClick={() => removeFromQueue(item)}
                          className="font-mono text-[10px] uppercase tracking-[0.14em]"
                        >
                          <Trash2 size={10} />
                          Remove from queue
                        </DropdownMenuItem>
                      </DropdownMenuGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  {isCurrent ? (
                    <p className="mt-1 px-2 font-mono text-[9px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                      Now playing
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <AlbumDetailDialog
        release={detailItem?.release ?? null}
        spotify={detailItem?.spotify ?? null}
        onClose={() => setDetailItem(null)}
      />
    </aside>
  );
}
