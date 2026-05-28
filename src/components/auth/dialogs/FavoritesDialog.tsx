"use client";

import { useEffect, useState } from "react";

import { CoverArt } from "@/components/common/CoverArt";
import { AccountDialogShell } from "@/components/auth/dialogs/AccountDialogShell";
import { redirectToLogin } from "@/lib/client/navigation";

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

interface FavoritesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function FavoritesDialog({ open, onClose }: FavoritesDialogProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();

    async function loadFavorites() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/favorites", {
          cache: "no-store",
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        if (response.status === 401) {
          redirectToLogin();
          return;
        }
        if (!response.ok) {
          throw new Error("Failed to load favorites");
        }
        const data = (await response.json()) as { favorites?: FavoriteItem[] };
        if (controller.signal.aborted) return;
        setFavorites(data.favorites ?? []);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error ? fetchError.message : "Unknown error",
        );
        setFavorites([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadFavorites();
    return () => controller.abort();
  }, [open]);

  return (
    <AccountDialogShell
      open={open}
      onClose={onClose}
      title="Favorites"
      ariaLabel="Your favorites"
      loading={loading}
      error={error}
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
