"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  addFavorite,
  fetchFavorites,
  removeFavorite,
  type FavoriteItem,
} from "@/services/client/libraryApi";
import { queryKeys } from "@/lib/client/queryKeys";
import {
  buildFavoriteIdentityKey,
  getReleaseDiscogsType,
} from "@/lib/discogs/releaseIdentity";
import type { NormalizedRelease } from "@/types/discogs";

interface FavoritesContextValue {
  isFavorite: (release: NormalizedRelease) => boolean;
  isFavoritePending: (release: NormalizedRelease) => boolean;
  toggleFavorite: (release: NormalizedRelease) => Promise<void>;
}

export const FAVORITES_QUERY_KEY = queryKeys.favorites.all;

const FavoritesContext = createContext<FavoritesContextValue | null>(null);

function getReleaseFavoriteKey(release: NormalizedRelease): string {
  return buildFavoriteIdentityKey({
    discogsId: release.id,
    discogsType: getReleaseDiscogsType(release),
  });
}

function buildOptimisticFavorite(release: NormalizedRelease): FavoriteItem {
  const discogsType = getReleaseDiscogsType(release);
  return {
    id: -release.id,
    userId: 0,
    discogsId: release.id,
    discogsType,
    releaseTitle: release.title ?? null,
    releaseYear: release.year ?? null,
    releaseCountry: release.country ?? null,
    coverUrl: release.coverImage ?? release.thumb ?? null,
    createdAt: new Date().toISOString(),
  };
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [favoritePending, setFavoritePending] = useState<Set<string>>(new Set());

  const { data: favorites = [] } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: fetchFavorites,
  });

  const favoriteKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const item of favorites) {
      keys.add(
        buildFavoriteIdentityKey({
          discogsId: item.discogsId,
          discogsType: item.discogsType,
        }),
      );
    }
    return keys;
  }, [favorites]);

  const toggleFavorite = useCallback(
    async (release: NormalizedRelease) => {
      const discogsType = getReleaseDiscogsType(release);
      const key = buildFavoriteIdentityKey({
        discogsId: release.id,
        discogsType,
      });
      if (favoritePending.has(key)) return;

      const currentlyFavorite = favoriteKeys.has(key);
      const previous =
        queryClient.getQueryData<FavoriteItem[]>(FAVORITES_QUERY_KEY) ?? favorites;

      setFavoritePending((prev) => new Set(prev).add(key));
      queryClient.setQueryData<FavoriteItem[]>(
        FAVORITES_QUERY_KEY,
        currentlyFavorite
          ? previous.filter(
              (item) =>
                !(
                  item.discogsId === release.id && item.discogsType === discogsType
                ),
            )
          : [buildOptimisticFavorite(release), ...previous],
      );

      try {
        if (currentlyFavorite) {
          await removeFavorite(release.id, discogsType);
        } else {
          await addFavorite(release);
        }
      } catch {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, previous);
      } finally {
        setFavoritePending((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
      }
    },
    [favoriteKeys, favoritePending, favorites, queryClient],
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
