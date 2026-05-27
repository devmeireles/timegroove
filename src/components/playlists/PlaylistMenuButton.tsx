"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ListPlus, LoaderCircle, Plus, X } from "lucide-react";

import type { NormalizedRelease } from "@/types/discogs";

interface PlaylistMenuItem {
  id: number;
  name: string;
  includesRelease: boolean;
}

export function PlaylistMenuButton({
  release,
  direction = "down",
}: {
  release: NormalizedRelease;
  direction?: "down" | "up";
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistMenuItem[]>([]);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && !containerRef.current?.contains(target)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const loadPlaylists = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/playlists?discogsId=${release.id}&discogsType=${discogsType}`,
        { cache: "no-store" },
      );
      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load playlists");
      }
      const data = (await response.json()) as {
        playlists?: PlaylistMenuItem[];
      };
      setPlaylists(data.playlists ?? []);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not load playlists",
      );
    } finally {
      setLoading(false);
    }
  };

  const openMenu = async () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (!nextOpen) return;
    await loadPlaylists();
  };

  const toggleMembership = async (playlistId: number, include: boolean) => {
    if (pending) return;
    setPending(true);
    setError(null);

    setPlaylists((prev) =>
      prev.map((item) =>
        item.id === playlistId
          ? { ...item, includesRelease: include }
          : item,
      ),
    );

    try {
      const response = await fetch("/api/playlists", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playlistId,
          action: include ? "include" : "exclude",
          release,
        }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to update playlist");
      }
    } catch (requestError) {
      setPlaylists((prev) =>
        prev.map((item) =>
          item.id === playlistId
            ? { ...item, includesRelease: !include }
            : item,
        ),
      );
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not update playlist",
      );
    } finally {
      setPending(false);
    }
  };

  const createPlaylist = async () => {
    const trimmed = newName.trim();
    if (!trimmed || creating) return;
    setCreating(true);
    setError(null);
    try {
      const response = await fetch("/api/playlists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Could not create playlist");
      }

      const data = (await response.json()) as {
        playlist?: { id: number; name: string };
      };
      const createdPlaylist = data.playlist;
      if (createdPlaylist) {
        setPlaylists((prev) => [
          ...prev,
          {
            id: createdPlaylist.id,
            name: createdPlaylist.name,
            includesRelease: false,
          },
        ]);
      }
      setNewName("");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Could not create playlist",
      );
    } finally {
      setCreating(false);
    }
  };

  const hasMembership = playlists.some((item) => item.includesRelease);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => void openMenu()}
        className={
          "flex h-8 w-8 items-center justify-center rounded-full border transition-colors " +
          (hasMembership
            ? "border-(--color-accent) bg-accent/20 text-(--color-accent)"
            : "border-(--color-border) text-(--color-foreground-subtle) hover:border-(--color-border-strong) hover:text-(--color-foreground)")
        }
        aria-label="Add to playlist"
        title="Add to playlist"
      >
        <ListPlus size={12} aria-hidden="true" />
      </button>

      {open ? (
        <div
          className={
            "absolute right-0 z-40 w-60 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-2 shadow-2xl " +
            (direction === "up" ? "bottom-full mb-2" : "top-full mt-2")
          }
        >
          <p className="truncate px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
            playlists
          </p>

          {loading ? (
            <p className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)">
              loading...
            </p>
          ) : playlists.length === 0 ? (
            <p className="px-1 pb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)">
              no playlists yet
            </p>
          ) : (
            <ul className="mb-2 flex max-h-48 flex-col gap-1 overflow-y-auto">
              {playlists.map((playlist) => (
                <li key={playlist.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      void toggleMembership(
                        playlist.id,
                        !playlist.includesRelease,
                      )
                    }
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left text-xs text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-foreground)"
                    title={
                      playlist.includesRelease
                        ? "Remove from playlist"
                        : "Add to playlist"
                    }
                  >
                    <span className="truncate">{playlist.name}</span>
                    {playlist.includesRelease ? (
                      <Check
                        size={12}
                        aria-hidden="true"
                        className="text-(--color-accent)"
                      />
                    ) : (
                      <Plus size={12} aria-hidden="true" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {error ? (
            <p className="mb-2 px-1 font-mono text-[10px] uppercase tracking-[0.12em] text-red-400">
              {error}
            </p>
          ) : null}

          <div className="mt-1 flex items-center gap-1 border-t border-(--color-border) pt-2">
            <input
              value={newName}
              onChange={(event) => setNewName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  void createPlaylist();
                }
              }}
              placeholder="New playlist"
              className="h-8 min-w-0 flex-1 rounded-sm border border-(--color-border) bg-(--color-surface) px-2 text-xs text-(--color-foreground) outline-none transition-colors placeholder:text-(--color-foreground-subtle) focus:border-(--color-accent)"
            />
            <button
              type="button"
              onClick={() => void createPlaylist()}
              disabled={creating || newName.trim().length === 0}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-subtle) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground) disabled:opacity-50"
              aria-label="Create playlist"
              title="Create playlist"
            >
              {creating ? (
                <LoaderCircle
                  size={12}
                  aria-hidden="true"
                  className="animate-spin"
                />
              ) : (
                <Plus size={12} aria-hidden="true" />
              )}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-sm border border-(--color-border) text-(--color-foreground-subtle) transition-colors hover:border-(--color-border-strong) hover:text-(--color-foreground)"
              aria-label="Close playlist menu"
              title="Close"
            >
              <X size={12} aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}