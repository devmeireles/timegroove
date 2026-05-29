"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  LoaderCircle,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { CoverArt } from "@/components/common/CoverArt";
import { queryKeys } from "@/lib/client/queryKeys";
import {
  deletePlaylist,
  fetchPlaylist,
  fetchPlaylists,
  removePlaylistItem,
  renamePlaylist,
  syncPlaylistToSpotify,
  type PlaylistDetail,
  type PlaylistItem,
} from "@/services/client/libraryApi";

interface PlaylistsDialogProps {
  open: boolean;
  onClose: () => void;
}

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

export function PlaylistsDialog({ open, onClose }: PlaylistsDialogProps) {
  const queryClient = useQueryClient();
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(
    null,
  );
  const [editingPlaylistId, setEditingPlaylistId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [deleteConfirmPlaylistId, setDeleteConfirmPlaylistId] = useState<
    number | null
  >(null);

  const handleClose = () => {
    setSelectedPlaylistId(null);
    setEditingPlaylistId(null);
    setEditingName("");
    setDeleteConfirmPlaylistId(null);
    onClose();
  };

  const playlistsQuery = useQuery({
    queryKey: queryKeys.playlists.list(),
    queryFn: () => fetchPlaylists(),
    enabled: open,
  });

  const detailQuery = useQuery({
    queryKey:
      selectedPlaylistId == null
        ? queryKeys.playlists.detail(0)
        : queryKeys.playlists.detail(selectedPlaylistId),
    queryFn: () => fetchPlaylist(selectedPlaylistId ?? 0),
    enabled: open && selectedPlaylistId != null,
  });

  const currentPlaylist: PlaylistDetail | null =
    selectedPlaylistId == null ? null : detailQuery.data ?? null;

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
      setSelectedPlaylistId(null);
      setEditingPlaylistId(null);
      setEditingName("");
      void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (input: {
      playlistId: number;
      discogsId: number;
      discogsType: "release" | "master";
    }) =>
      removePlaylistItem({
        playlistId: input.playlistId,
        discogsId: input.discogsId,
        discogsType: input.discogsType,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.playlists.all });
    },
  });

  const playlists = playlistsQuery.data ?? [];
  const detailLoading = selectedPlaylistId != null && detailQuery.isLoading;
  const loading = selectedPlaylistId == null ? playlistsQuery.isLoading : detailLoading;
  const error = selectedPlaylistId == null ? playlistsQuery.error : detailQuery.error;

  const mutationError = [
    syncMutation.error,
    renameMutation.error,
    deleteMutation.error,
    removeItemMutation.error,
  ].find((value) => value instanceof Error);

  const actionError =
    mutationError instanceof Error ? mutationError.message : null;
  const isAnyMutationPending =
    syncMutation.isPending ||
    renameMutation.isPending ||
    deleteMutation.isPending ||
    removeItemMutation.isPending;

  const title = selectedPlaylistId == null ? "Playlists" : "Playlist";
  const emptyMessage =
    selectedPlaylistId == null ? "// no playlists yet" : "// no tracks yet";
  const isEmpty =
    selectedPlaylistId == null
      ? playlists.length === 0
      : currentPlaylist?.items.length === 0;

  const selectedPlaylist = useMemo(() => {
    if (selectedPlaylistId == null) return null;
    return (
      playlistsQuery.data?.find((playlist) => playlist.id === selectedPlaylistId) ??
      null
    );
  }, [playlistsQuery.data, selectedPlaylistId]);

  const displayPlaylist = currentPlaylist ?? selectedPlaylist;

  return (
    <AccountDialogShell
      open={open}
      onClose={handleClose}
      title={title}
      ariaLabel="Your playlists"
      loading={loading}
      error={error instanceof Error ? error.message : null}
      loadingMessage={
        selectedPlaylistId == null ? "// loading playlists..." : "// loading playlist..."
      }
      emptyMessage={emptyMessage}
      isEmpty={isEmpty}
    >
      {actionError ? (
        <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.12em] text-red-400">
          {actionError}
        </p>
      ) : null}

      {selectedPlaylistId == null ? (
        <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {playlists.map((playlist) => (
            <li key={playlist.id}>
              <button
                type="button"
                className="group flex h-full w-full flex-col rounded-sm border border-(--color-border) bg-(--color-surface) p-2 text-left transition-colors hover:border-(--color-border-strong) hover:bg-(--color-surface-elevated)"
                onClick={() => {
                  setDeleteConfirmPlaylistId(null);
                  setEditingPlaylistId(null);
                  setEditingName("");
                  setSelectedPlaylistId(playlist.id);
                }}
                onPointerEnter={() => {
                  void queryClient.prefetchQuery({
                    queryKey: queryKeys.playlists.detail(playlist.id),
                    queryFn: () => fetchPlaylist(playlist.id),
                  });
                }}
                onFocus={() => {
                  void queryClient.prefetchQuery({
                    queryKey: queryKeys.playlists.detail(playlist.id),
                    queryFn: () => fetchPlaylist(playlist.id),
                  });
                }}
              >
                <CoverArt
                  url={playlist.coverUrl}
                  title={playlist.name}
                  imageClassName="aspect-square w-full rounded-sm border border-(--color-border) object-cover"
                  fallbackClassName="flex aspect-square w-full items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[9px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)"
                />

                <div className="mt-2 min-w-0">
                  <p className="truncate text-sm text-(--color-foreground)">
                    {playlist.name}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                    {getStatusLabel(playlist)}
                    {playlist.spotifySyncedAt
                      ? ` • ${new Date(playlist.spotifySyncedAt).toLocaleDateString()}`
                      : ""}
                  </p>
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                    {`Synced tracks: ${playlist.syncedTrackCount ?? 0}`}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setSelectedPlaylistId(null)}
            className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground)"
            aria-label="Back to playlists"
            title="Back"
          >
            <ArrowLeft size={12} />
          </button>

          <div className="flex items-start gap-3 rounded-sm border border-(--color-border) bg-(--color-surface) p-3">
            <div className="min-w-0 flex-1">
              {editingPlaylistId === selectedPlaylistId ? (
                <div className="flex items-center gap-1">
                  <input
                    value={editingName}
                    onChange={(event) => setEditingName(event.target.value)}
                    className="h-8 w-full rounded-sm border border-(--color-border) bg-(--color-surface-elevated) px-2 text-xs text-(--color-foreground) outline-none transition-colors focus:border-(--color-accent)"
                    placeholder="Playlist name"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      renameMutation.mutate({
                        playlistId: selectedPlaylistId,
                        name: editingName.trim(),
                      })
                    }
                    disabled={isAnyMutationPending || editingName.trim().length === 0}
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                    title="Save"
                    aria-label="Save playlist name"
                  >
                    {renameMutation.isPending ? (
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
                    className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
                    title="Cancel"
                    aria-label="Cancel rename"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <p className="truncate text-sm text-(--color-foreground)">
                  {displayPlaylist?.name}
                </p>
              )}
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                {displayPlaylist ? getStatusLabel(displayPlaylist) : ""}
                {displayPlaylist?.spotifySyncedAt
                  ? ` • ${new Date(displayPlaylist.spotifySyncedAt).toLocaleDateString()}`
                  : ""}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                {`Synced tracks: ${displayPlaylist?.syncedTrackCount ?? 0} • Mapped: ${displayPlaylist?.mappedItemsCount ?? 0}/${displayPlaylist?.totalItemsCount ?? 0}`}
              </p>
            </div>

            <div className="flex shrink-0 flex-col gap-1">
              <button
                type="button"
                disabled={isAnyMutationPending}
                onClick={() => syncMutation.mutate(selectedPlaylistId)}
                className="rounded-sm border border-(--color-border) px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-muted) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
              >
                {syncMutation.isPending &&
                syncMutation.variables === selectedPlaylistId ? (
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
                  setEditingPlaylistId(selectedPlaylistId);
                  setEditingName(displayPlaylist?.name ?? "");
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
                  if (deleteConfirmPlaylistId === selectedPlaylistId) {
                    deleteMutation.mutate(selectedPlaylistId);
                    return;
                  }
                  setDeleteConfirmPlaylistId(selectedPlaylistId);
                }}
                className="flex items-center justify-center gap-1 rounded-sm border border-red-800/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:border-red-500 hover:text-red-200 disabled:opacity-50"
                title="Delete playlist"
              >
                {deleteMutation.isPending &&
                deleteMutation.variables === selectedPlaylistId ? (
                  <LoaderCircle size={11} className="animate-spin" />
                ) : (
                  <Trash2 size={10} />
                )}
                {deleteConfirmPlaylistId === selectedPlaylistId
                  ? "Confirm delete"
                  : "Delete"}
              </button>
            </div>
          </div>

          <div className="rounded-sm border border-(--color-border) bg-(--color-surface) p-2">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                tracks
              </p>
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                {currentPlaylist?.items.length ?? 0}
              </p>
            </div>

            <ul className="flex max-h-[52vh] flex-col gap-2 overflow-y-auto pr-1">
              {currentPlaylist?.items.map((item) => (
                <li
                  key={`${item.discogsType}-${item.discogsId}`}
                  className="flex items-center gap-3 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-2"
                >
                  <CoverArt
                    url={item.coverUrl}
                    title={item.releaseTitle ?? "Untitled"}
                    imageClassName="h-12 w-12 shrink-0 rounded-sm border border-(--color-border) object-cover"
                    fallbackClassName="flex h-12 w-12 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[9px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-(--color-foreground)">
                      {item.releaseTitle ?? "Untitled"}
                    </p>
                    <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                      {item.releaseYear ?? "year n/a"}
                      {item.releaseCountry ? ` • ${item.releaseCountry}` : ""}
                    </p>
                  </div>

                  <button
                    type="button"
                    disabled={isAnyMutationPending}
                    onClick={() =>
                      window.confirm(
                        "Remove this release from the playlist?",
                      ) &&
                      removeItemMutation.mutate({
                        playlistId: selectedPlaylistId,
                        discogsId: item.discogsId,
                        discogsType: item.discogsType,
                      })
                    }
                    className="flex shrink-0 items-center gap-1 rounded-sm border border-red-800/60 px-2 py-1 font-mono text-[10px] uppercase tracking-[0.14em] text-red-300 transition-colors hover:border-red-500 hover:text-red-200 disabled:opacity-50"
                    title="Remove from playlist"
                  >
                    {removeItemMutation.isPending &&
                    removeItemMutation.variables?.discogsId === item.discogsId &&
                    removeItemMutation.variables?.discogsType === item.discogsType ? (
                      <LoaderCircle size={11} className="animate-spin" />
                    ) : (
                      <X size={10} />
                    )}
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </AccountDialogShell>
  );
}
