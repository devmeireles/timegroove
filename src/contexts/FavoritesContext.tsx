"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { redirectToLogin } from "@/lib/client/navigation";
import type { NormalizedRelease } from "@/types/discogs";

type DiscogsType = "release" | "master";

interface FavoritesContextValue {
  isFavorite: (release: NormalizedRelease) => boolean;
  isFavoritePending: (release: NormalizedRelease) => boolean;
  toggleFavorite: (release: NormalizedRelease) => Promise<void>;
}

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function getDiscogsType(release: NormalizedRelease): DiscogsType {
  return release.type === "master" ? "master" : "release";
}

function buildFavoriteKey(discogsId: number, discogsType: DiscogsType): string {
  return `${discogsType}:${discogsId}`;
}

function getReleaseFavoriteKey(release: NormalizedRelease): string {
  return buildFavoriteKey(release.id, getDiscogsType(release));
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
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
        if (controller.signal.aborted) return;
        if (!response.ok) {
          setFavoriteKeys(new Set());
          return;
        }

        const data = (await response.json()) as {
          favorites?: Array<{ discogsId: number; discogsType: DiscogsType }>;
        };

        const next = new Set<string>();
        for (const item of data.favorites ?? []) {
          next.add(buildFavoriteKey(item.discogsId, item.discogsType));
        }
        setFavoriteKeys(next);
      } catch {
        if (!controller.signal.aborted) setFavoriteKeys(new Set());
      }
    }

    void loadFavorites();
    return () => controller.abort();
  }, []);

  const toggleFavorite = useCallback(
    async (release: NormalizedRelease) => {
      const discogsType = getDiscogsType(release);
      const key = buildFavoriteKey(release.id, discogsType);
      if (favoritePending.has(key)) return;

      const currentlyFavorite = favoriteKeys.has(key);
      setFavoritePending((prev) => new Set(prev).add(key));
      setFavoriteKeys((prev) => {
        const next = new Set(prev);
        if (currentlyFavorite) next.delete(key);
        else next.add(key);
        return next;
      });

      try {
        const response = currentlyFavorite
          ? await fetch(
              `/api/favorites?discogsId=${release.id}&discogsType=${discogsType}`,
              { method: "DELETE" },
            )
          : await fetch("/api/favorites", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ release }),
            });

        if (response.status === 401) {
          redirectToLogin();
          throw new Error("Authentication required");
        }
        if (!response.ok) {
          throw new Error("Failed to update favorite");
        }
      } catch {
        setFavoriteKeys((prev) => {
          const next = new Set(prev);
          if (currentlyFavorite) next.add(key);
          else next.delete(key);
          return next;
        });
      } finally {
        setFavoritePending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [favoriteKeys, favoritePending],
  );

  const isFavorite = useCallback(
    (release: NormalizedRelease) => favoriteKeys.has(getReleaseFavoriteKey(release)),
    [favoriteKeys],
  );

  const isFavoritePending = useCallback(
    (release: NormalizedRelease) =>
      favoritePending.has(getReleaseFavoriteKey(release)),
    [favoritePending],
  );

  return (
    <FavoritesContext.Provider
      value={{ isFavorite, isFavoritePending, toggleFavorite }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavoritesContext(): FavoritesContextValue {
  const ctx = useContext(FavoritesContext);
  if (!ctx) {
    throw new Error("useFavoritesContext must be used inside <FavoritesProvider>");
  }
  return ctx;
}
