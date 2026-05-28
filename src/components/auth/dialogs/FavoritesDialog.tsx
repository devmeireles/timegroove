"use client";

import { useQuery } from "@tanstack/react-query";

import { CoverArt } from "@/components/common/CoverArt";
import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { FAVORITES_QUERY_KEY } from "@/contexts/FavoritesContext";
import { fetchFavorites } from "@/services/client/libraryApi";

interface FavoritesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FavoritesDialog({ open, onClose }: FavoritesDialogProps) {
  const {
    data: favorites = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: fetchFavorites,
    enabled: open,
  });

  return (
    <AccountDialogShell
      open={open}
      onClose={onClose}
      title="Favorites"
      ariaLabel="Your favorites"
      loading={isLoading}
      error={error instanceof Error ? error.message : null}
      loadingMessage="// loading favorites..."
      emptyMessage="// no favorites yet"
      isEmpty={favorites.length === 0}
    >
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
    </AccountDialogShell>
  );
}
