"use client";

import { redirectToLogin } from "@/lib/client/navigation";
import {
  getReleaseDiscogsType,
  type DiscogsReleaseType,
} from "@/lib/discogs/releaseIdentity";
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
  spotifyPlaylistId: string | null;
  coverUrl: string | null;
  spotifySyncStatus:
    | "not-synced"
    | "synced"
    | "partially-synced"
    | "sync-error"
    | null;
  spotifySyncedAt: string | null;
  spotifySyncError: string | null;
  syncedTrackCount?: number;
  mappedItemsCount?: number;
  totalItemsCount?: number;
  updatedAt: string;
}

export interface PlaylistMenuItem extends PlaylistItem {
  includesRelease: boolean;
}

export interface PlaylistDetailItem {
  discogsId: number;
  discogsType: DiscogsType;
  releaseTitle: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  coverUrl: string | null;
  createdAt: string;
}

export interface PlaylistDetail extends PlaylistItem {
  items: PlaylistDetailItem[];
}

async function ensureApiOk(response: Response, fallbackError: string) {
  if (response.status === 401) {
    return null; // Return null to indicate not authenticated (optional feature)
  }
  if (!response.ok) {
    let message = fallbackError;
    try {
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) message = payload.error;
      } else {
        const text = await response.text();
        if (text) message = text;
      }
    } catch {
      // Keep fallback message.
    }
    throw new Error(message);
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

export async function fetchPlaylist(playlistId: number): Promise<PlaylistDetail> {
  const response = await fetch(`/api/playlists/${playlistId}`, {
    cache: "no-store",
  });
  const checked = await ensureApiOk(response, "Failed to load playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }

  const data = (await checked.json()) as { playlist?: PlaylistDetail };
  if (!data.playlist) throw new Error("Failed to load playlist");
  return data.playlist;
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
  const body =
    input.action === "include"
      ? {
          playlistId: input.playlistId,
          action: input.action,
          release: input.release,
        }
      : {
          playlistId: input.playlistId,
          action: input.action,
          discogsId: input.release.id,
          discogsType: getReleaseDiscogsType(input.release),
        };

  const response = await fetch("/api/playlists", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const checked = await ensureApiOk(response, "Failed to update playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
}

export async function removePlaylistItem(input: {
  playlistId: number;
  discogsId: number;
  discogsType: DiscogsType;
}): Promise<void> {
  const response = await fetch("/api/playlists", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      playlistId: input.playlistId,
      action: "exclude",
      discogsId: input.discogsId,
      discogsType: input.discogsType,
    }),
  });
  const checked = await ensureApiOk(response, "Failed to update playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
}

export interface SyncPlaylistSummary {
  playlistId: number;
  spotifyPlaylistId: string | null;
  status: "not-synced" | "synced" | "partially-synced";
  totalItems: number;
  mappedItems: number;
  skippedItems: number;
  candidateTrackCount: number;
  addedTrackCount: number;
  skippedTrackCount: number;
}

export async function syncPlaylistToSpotify(
  playlistId: number,
): Promise<SyncPlaylistSummary> {
  const response = await fetch(`/api/playlists/${playlistId}/sync-to-spotify`, {
    method: "POST",
  });
  const checked = await ensureApiOk(response, "Failed to sync playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }

  const data = (await checked.json()) as {
    summary?: SyncPlaylistSummary;
    error?: string;
  };
  if (!data.summary) {
    throw new Error(data.error || "Failed to sync playlist");
  }

  return data.summary;
}

export async function renamePlaylist(
  playlistId: number,
  name: string,
): Promise<PlaylistItem> {
  const response = await fetch(`/api/playlists/${playlistId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  const checked = await ensureApiOk(response, "Failed to rename playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }

  const data = (await checked.json()) as {
    playlist?: PlaylistItem;
    error?: string;
  };
  if (!data.playlist) {
    throw new Error(data.error || "Failed to rename playlist");
  }
  return data.playlist;
}

export async function deletePlaylist(playlistId: number): Promise<void> {
  const response = await fetch(`/api/playlists/${playlistId}`, {
    method: "DELETE",
  });
  const checked = await ensureApiOk(response, "Failed to delete playlist");
  if (!checked) {
    redirectToLogin();
    throw new Error("Authentication required");
  }
}
