"use client";

import { ChevronDown, CircleUserRound } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { CoverArt } from "@/components/common/CoverArt";
import { Dialog } from "@/components/details/Dialog";

interface AuthUser {
  email?: string;
  name?: string;
}

interface FavoriteItem {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  releaseTitle: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  coverUrl: string | null;
  createdAt: string;
}

interface PlaylistItem {
  id: number;
  name: string;
  updatedAt: string;
}

export function AvatarMenu() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [favoritesOpen, setFavoritesOpen] = useState(false);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [favoritesError, setFavoritesError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [playlistsOpen, setPlaylistsOpen] = useState(false);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [playlists, setPlaylists] = useState<PlaylistItem[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProfile() {
      try {
        const response = await fetch("/auth/profile", {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setUser(null);
          return;
        }
        const profile = (await response.json()) as AuthUser;
        setUser(profile);
      } catch {
        setUser(null);
      }
    }

    void loadProfile();
    return () => controller.abort();
  }, []);

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

  const label = useMemo(() => {
    if (!user) return "Guest";
    return user.email ?? user.name ?? "User";
  }, [user]);

  const openFavorites = async () => {
    setOpen(false);
    setFavoritesOpen(true);
    setFavoritesLoading(true);
    setFavoritesError(null);
    try {
      const response = await fetch("/api/favorites", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load favorites");
      }
      const data = (await response.json()) as { favorites?: FavoriteItem[] };
      setFavorites(data.favorites ?? []);
    } catch (error) {
      setFavoritesError(error instanceof Error ? error.message : "Unknown error");
      setFavorites([]);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const openPlaylists = async () => {
    setOpen(false);
    setPlaylistsOpen(true);
    setPlaylistsLoading(true);
    setPlaylistsError(null);
    try {
      const response = await fetch("/api/playlists", { cache: "no-store" });
      if (response.status === 401) {
        window.location.href = "/auth/login";
        return;
      }
      if (!response.ok) {
        throw new Error("Failed to load playlists");
      }
      const data = (await response.json()) as { playlists?: PlaylistItem[] };
      setPlaylists(data.playlists ?? []);
    } catch (error) {
      setPlaylistsError(error instanceof Error ? error.message : "Unknown error");
      setPlaylists([]);
    } finally {
      setPlaylistsLoading(false);
    }
  };

  return (
    <>
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 items-center gap-1.5 px-1 text-(--color-foreground-muted) transition-colors hover:text-(--color-foreground)"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Open user menu"
        >
          <CircleUserRound size={19} aria-hidden="true" />
          <ChevronDown size={12} aria-hidden="true" />
        </button>

        {open ? (
          <div
            role="menu"
            className="absolute top-full right-0 z-30 mt-2 min-w-48 rounded-sm border border-(--color-border) bg-(--color-surface-elevated) p-1 shadow-2xl"
          >
            <p className="truncate px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle)">
              {label}
            </p>
            <div className="my-1 h-px bg-(--color-border)" />

            {!user ? (
              <>
                <a
                  role="menuitem"
                  href="/auth/login"
                  className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
                >
                  Login
                </a>
                <a
                  role="menuitem"
                  href="/auth/login?screen_hint=signup"
                  className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
                >
                  Signup
                </a>
              </>
            ) : (
              <>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openFavorites}
                  className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
                >
                  Favorites
                </button>
                <button
                  type="button"
                  role="menuitem"
                  onClick={openPlaylists}
                  className="block w-full rounded-sm px-2 py-1.5 text-left font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
                >
                  Playlists
                </button>
                <a
                  role="menuitem"
                  href="/auth/logout"
                  className="block rounded-sm px-2 py-1.5 font-mono text-[11px] uppercase tracking-[0.12em] text-(--color-foreground-muted) transition-colors hover:bg-(--color-surface) hover:text-(--color-accent)"
                >
                  Logout
                </a>
              </>
            )}
          </div>
        ) : null}
      </div>

      <Dialog
        open={favoritesOpen}
        onClose={() => setFavoritesOpen(false)}
        ariaLabel="Your favorites"
      >
        <div className="flex max-h-[80vh] flex-col">
          <header className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--color-accent)">
              Favorites
            </h2>
            <button
              type="button"
              onClick={() => setFavoritesOpen(false)}
              className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle) hover:text-(--color-foreground)"
            >
              Close
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-4">
            {favoritesLoading ? (
              <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
                {"// loading favorites..."}
              </p>
            ) : favoritesError ? (
              <p className="font-mono text-[11px] text-red-400">{favoritesError}</p>
            ) : favorites.length === 0 ? (
              <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
                {"// no favorites yet"}
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {favorites.map((item) => (
                  <li
                    key={`${item.discogsType}-${item.discogsId}`}
                    className="flex items-center gap-3 rounded-sm border border-(--color-border) bg-(--color-surface) p-2"
                  >
                    <CoverArt
                      url={item.coverUrl}
                      title={item.releaseTitle ?? "Untitled"}
                      imageClassName="h-10 w-10 shrink-0 rounded-sm border border-(--color-border) object-cover"
                      fallbackClassName="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm border border-dashed border-(--color-border) bg-(--color-background) font-mono text-[9px] uppercase tracking-[0.12em] text-(--color-foreground-subtle)"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-(--color-foreground)">
                        {item.releaseTitle ?? "Untitled"}
                      </p>
                      <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-(--color-foreground-subtle)">
                        {item.releaseYear ?? "year n/a"}
                        {item.releaseCountry ? ` · ${item.releaseCountry}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Dialog>

      <Dialog
        open={playlistsOpen}
        onClose={() => setPlaylistsOpen(false)}
        ariaLabel="Your playlists"
      >
        <div className="flex max-h-[80vh] flex-col">
          <header className="flex items-center justify-between border-b border-(--color-border) px-5 py-3">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-(--color-accent)">
              Playlists
            </h2>
            <button
              type="button"
              onClick={() => setPlaylistsOpen(false)}
              className="rounded-sm px-2 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-(--color-foreground-subtle) hover:text-(--color-foreground)"
            >
              Close
            </button>
          </header>

          <div className="overflow-y-auto px-5 py-4">
            {playlistsLoading ? (
              <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
                {"// loading playlists..."}
              </p>
            ) : playlistsError ? (
              <p className="font-mono text-[11px] text-red-400">{playlistsError}</p>
            ) : playlists.length === 0 ? (
              <p className="font-mono text-[11px] text-(--color-foreground-subtle)">
                {"// no playlists yet"}
              </p>
            ) : (
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
            )}
          </div>
        </div>
      </Dialog>
    </>
  );
}
