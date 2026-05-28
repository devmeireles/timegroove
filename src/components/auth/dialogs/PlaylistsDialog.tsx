"use client";

import { useEffect, useState } from "react";

import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { redirectToLogin } from "@/lib/client/navigation";

interface PlaylistItem {
  id: number;
  name: string;
  updatedAt: string;
}

interface PlaylistsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function PlaylistsDialog({ open, onClose }: PlaylistsDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function loadPlaylists() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/playlists", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load playlists");
        }
        const data = (await response.json()) as { playlists?: PlaylistItem[] };
        if (controller.signal.aborted) return;
        setPlaylists(data.playlists ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "Unknown error",
        );
        setPlaylists([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadPlaylists();
    return () => controller.abort();
  }, [open]);

  return (
    <AccountDialogShell
      open={open}
      onClose={onClose}
      title="Playlists"
      ariaLabel="Your playlists"
      loading={loading}
      error={error}
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
