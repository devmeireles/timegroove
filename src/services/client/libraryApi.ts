"use client";

import { redirectToLogin } from "@/lib/client/navigation";
import type { DiscogsReleaseType } from "@/lib/discogs/releaseIdentity";
import type { NormalizedRelease } from "@/types/discogs";

export type DiscogsType = DiscogsReleaseType;

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
    return null; // Return null to indicate not authenticated (optional feature)
  }
  if (!response.ok) {
    throw new Error(fallbackError);
  }
  return response;
}

export async function fetchFavorites(): Promise<FavoriteItem[]> {
  const response = await fetch("/api/favorites", { cache: "no-store" });
  const checked = await ensureApiOk(response, "Failed to load favorites");
  if (!checked) return []; // Return empty list if not authenticated
  const data = (await checked.json()) as { favorites?: FavoriteItem[] };
  return data.favorites ?? [];
}

export async function addFavorite(release: NormalizedRelease): Promise<void> {
  const response = await fetch("/api/favorites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ release }),
  });
  const checked = await ensureApiOk(response, "Failed to update favorite");
  if (!checked) {
    redirectToLogin(); // Require auth for write operations
    throw new Error("Authentication required");
  }
}

export async function removeFavorite(
  discogsId: number,
  discogsType: DiscogsType,
): Promise<void> {
  const response = await fetch(
    `/api/favorites?discogsId=${discogsId}&discogsType=${discogsType}`,
    { method: "DELETE" },
  );
  const checked = await ensureApiOk(response, "Failed to update favorite");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
}

export async function fetchPlaylists(
  release?: { discogsId: number; discogsType: DiscogsType },
): Promise<PlaylistMenuItem[]> {
  const params =
    release == null
      ? ""
      : `?discogsId=${release.discogsId}&discogsType=${release.discogsType}`;
  const response = await fetch(`/api/playlists${params}`, { cache: "no-store" });
  const checked = await ensureApiOk(response, "Failed to load playlists");
  if (!checked) return []; // Return empty list if not authenticated
  const data = (await checked.json()) as { playlists?: PlaylistMenuItem[] };
  return data.playlists ?? [];
}

export async function createPlaylist(name: string): Promise<PlaylistItem> {
  const response = await fetch("/api/playlists", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const checked = await ensureApiOk(response, "Could not create playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
  const data = (await checked.json()) as { playlist?: PlaylistItem };
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
  const checked = await ensureApiOk(response, "Failed to update playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
}
