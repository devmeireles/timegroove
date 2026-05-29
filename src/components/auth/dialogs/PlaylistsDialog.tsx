"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";

import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { queryKeys } from "@/lib/client/queryKeys";
import {
  deletePlaylist,
  fetchPlaylists,
  renamePlaylist,
  syncPlaylistToSpotify,
  type PlaylistItem,
} from "@/services/client/libraryApi";

interface PlaylistsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlaylistsDialog({ open, onClose }: PlaylistsDialogProps) {
  const queryClient = useQueryClient();
  const [editingPlaylistId, setEditingPlaylistId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmPlaylistId, setDeleteConfirmPlaylistId] = useState<
    number | null
  >(null);
  const {
    data: playlists = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: queryKeys.playlists.list(),
    queryFn: () => fetchPlaylists(),
    enabled: open,
  });

  const syncMutation = useMutation({
    mutationFn: (playlistId: number) => syncPlaylistToSpotify(playlistId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const renameMutation = useMutation({
    mutationFn: (input: { playlistId: number; name: string }) =>
      renamePlaylist(input.playlistId, input.name),
    onSuccess: () => {
      setEditingPlaylistId(null);
      setEditingName("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (playlistId: number) => deletePlaylist(playlistId),
    onSuccess: () => {
      setDeleteConfirmPlaylistId(null);
      if (editingPlaylistId != null) {
        setEditingPlaylistId(null);
        setEditingName("");
      }
      void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const mutationError = [syncMutation.error, renameMutation.error, deleteMutation.error]
    .find((error) => error instanceof Error);
  const actionError = mutationError instanceof Error ? mutationError.message : null;
  const isAnyMutationPending =
    syncMutation.isPending || renameMutation.isPending || deleteMutation.isPending;

  function getStatusLabel(playlist: PlaylistItem): string {
    switch (playlist.spotifySyncStatus) {
      case "synced":
        return "Synced";
      case "partially-synced":
        return "Partial";
      case "sync-error":
        return "Error";
      default:
        return "Not Synced";
    }
  }

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
      {actionError ? (
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-red-400">
          {actionError}
        </p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {playlists.map((playlist) => (
          <li
            key={playlist.id}
            className="rounded-sm border border-(--color-border) bg-(--color-surface) p-2"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {editingPlaylistId === playlist.id ? (
                  <div className="mb-1 flex items-center gap-1">
                    <input
                      value={editingName}
                      onChange={(event) => setEditingName(event.target.value)}
                      className="h-7 w-full max-w-56 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) px-2 text-xs text-(--color-foreground) outline-none transition-colors focus:border-(--color-accent)"
                      placeholder="Playlist name"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        renameMutation.mutate({
                          playlistId: playlist.id,
                          name: editingName.trim(),
                        })
                      }
                      disabled={isAnyMutationPending || editingName.trim().length === 0}
                      className="flex h-7 w-7 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                      title="Save"
                      aria-label="Save playlist name"
                    >
                      {renameMutation.isPending &&
                      renameMutation.variables?.playlistId === playlist.id ? (
                        <LoaderCircle size={11} className="animate-spin" />
                      ) : (
                        <Check size={11} />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPlaylistId(null);
                        setEditingName("");
                      }}
                      disabled={isAnyMutationPending}
                      className="flex h-7 w-7 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                      title="Cancel"
                      aria-label="Cancel rename"
                    >
                      <X size={11} />
                    </button>
                  </div>
                ) : (
                  <p className="truncate text-sm text-(--color-foreground)">
                    {playlist.name}
                  </p>
                )}
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                  {getStatusLabel(playlist)}
                  {playlist.spotifySyncedAt
                    ? ` • ${new Date(playlist.spotifySyncedAt).toLocaleDateString()}`
                    : ""}
                </p>
                <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                  {`Synced tracks: ${playlist.syncedTrackCount ?? 0} • Mapped: ${playlist.mappedItemsCount ?? 0}/${playlist.totalItemsCount ?? 0}`}
                </p>
                {playlist.spotifySyncError ? (
                  <p className="mt-1 text-xs text-red-400">
                    {playlist.spotifySyncError}
                  </p>
                ) : null}
              </div>

              <div className="flex shrink-0 flex-col gap-1">
                <button
                  type="button"
                  disabled={isAnyMutationPending}
                  onClick={() => syncMutation.mutate(playlist.id)}
                  className="rounded-sm border border-(--color-border) px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                >
                  {syncMutation.isPending && syncMutation.variables === playlist.id ? (
                    <span className="flex items-center gap-1">
                      <LoaderCircle size={11} className="animate-spin" />
                      Syncing
                    </span>
                  ) : (
                    "Sync to Spotify"
                  )}
                </button>
                <button
                  type="button"
                  disabled={isAnyMutationPending}
                  onClick={() => {
                    setDeleteConfirmPlaylistId(null);
                    setEditingPlaylistId(playlist.id);
                    setEditingName(playlist.name);
                  }}
                  className="flex items-center justify-center gap-1 rounded-sm border border-(--color-border) px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                  title="Rename playlist"
                >
                  <Pencil size={10} />
                  Rename
                </button>
                <button
                  type="button"
                  disabled={isAnyMutationPending}
                  onClick={() => {
                    if (deleteConfirmPlaylistId === playlist.id) {
                      deleteMutation.mutate(playlist.id);
                      return;
                    }
                    setEditingPlaylistId(null);
                    setEditingName("");
                    setDeleteConfirmPlaylistId(playlist.id);
                  }}
                  className="flex items-center justify-center gap-1 rounded-sm border border-red-800/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:border-red-500 hover:text-red-200 disabled:opacity-50"
                  title="Delete playlist"
                >
                  {deleteMutation.isPending &&
                  deleteMutation.variables === playlist.id ? (
                    <LoaderCircle size={11} className="animate-spin" />
                  ) : (
                    <Trash2 size={10} />
                  )}
                  {deleteConfirmPlaylistId === playlist.id
                    ? "Confirm delete"
                    : "Delete"}
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </AccountDialogShell>
  );
}
