"use client";

import { useQuery } from "@tanstack/react-query";

import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { queryKeys } from "@/lib/client/queryKeys";
import { fetchPlaylists } from "@/services/client/libraryApi";

interface PlaylistsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlaylistsDialog({ open, onClose }: PlaylistsDialogProps) {
  const {
    data: playlists = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.playlists.list(),
    queryFn: () => fetchPlaylists(),
    enabled: open,
  });

  return (
    <AccountDialogShell
      open={open}
      onClose={onClose}
      title="Playlists"
      ariaLabel="Your playlists"
      loading={isLoading}
      error={error instanceof Error ? error.message : null}
      loadingMessage="// loading playlists..."
      emptyMessage="// no playlists yet"
      isEmpty={playlists.length === 0}
    >
      <ul className="flex flex-col gap-2">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="flex items-center justify-between gap-3 rounded-sm border border-(--color-border) bg-(--color-surface) p-2"
          >
            <p className="truncate text-sm text-(--color-foreground)">
              {playlist.name}
            </p>
            <p className="shrink-0 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
              Updated {new Date(playlist.updatedAt).toLocaleDateString()}
            </p>
          </li>
        ))}
      </ul>
    </AccountDialogShell>
  );
}
