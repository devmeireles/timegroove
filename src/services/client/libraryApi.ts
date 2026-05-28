"use client";

import { redirectToLogin } from "@/lib/client/navigation";
import type { NormalizedRelease } from "@/types/discogs";

export type DiscogsType = "release" | "master";

export interface FavoriteItem {
  id: number;
  userId: number;
  discogsId: number;
  discogsType: DiscogsType;
  releaseTitle: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  coverUrl: string | null;
  createdAt: string;
}

export interface PlaylistItem {
  id: number;
  name: string;
  updatedAt: string;
}

export interface PlaylistMenuItem extends PlaylistItem {
  includesRelease: boolean;
}

async function ensureApiOk(response: Response, fallbackError: string) {
  if (response.status === 401) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
  if (!response.ok) {
    throw new Error(fallbackError);
  }
}

export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const response = await fetch("/api/favorites", { cache: "no-store" });
  await ensureApiOk(response, "Failed to load favorites");
  const data = (await response.json()) as { favorites?: FavoriteItem[] };
  return data.favorites ?? [];
}

export async function addFavorite(release: NormalizedRelease): Promise<void> {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ release }),
  });
  await ensureApiOk(response, "Failed to update favorite");
}

export async function removeFavorite(
  discogsId: number,
  discogsType: DiscogsType,
): Promise<void> {
  const response = await fetch(
    `/api/favorites?discogsId=${discogsId}&discogsType=${discogsType}`,
    { method: "DELETE" },
  );
  await ensureApiOk(response, "Failed to update favorite");
}

export async function fetchPlaylists(
  release?: { discogsId: number; discogsType: DiscogsType },
): Promise<PlaylistMenuItem[]> {
  const params =
    release == null
      ? ""
      : `?discogsId=${release.discogsId}&discogsType=${release.discogsType}`;
  const response = await fetch(`/api/playlists${params}`, { cache: "no-store" });
  await ensureApiOk(response, "Failed to load playlists");
  const data = (await response.json()) as { playlists?: PlaylistMenuItem[] };
  return data.playlists ?? [];
}

export async function createPlaylist(name: string): Promise<PlaylistItem> {
  const response = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  await ensureApiOk(response, "Could not create playlist");
  const data = (await response.json()) as { playlist?: PlaylistItem };
  if (!data.playlist) throw new Error("Could not create playlist");
  return data.playlist;
}

export async function updatePlaylistMembership(input: {
  playlistId: number;
  action: "include" | "exclude";
  release: NormalizedRelease;
}): Promise<void> {
  const response = await fetch("/api/playlists", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  await ensureApiOk(response, "Failed to update playlist");
}
