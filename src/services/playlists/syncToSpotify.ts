import "server-only";

import {
  findMappingsForReleases,
} from "@/repositories/reconciliationMappings";
import {
  getPlaylistSyncTarget,
  updatePlaylistSpotifySync,
} from "@/repositories/playlists";
import { getValidSpotifyToken, SpotifyAuthError } from "@/services/spotify/userAuth";
import {
  SpotifyPlaylistError,
  syncPlaylistTracksToSpotify,
} from "@/services/spotify/playlist";

export class PlaylistSyncError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PlaylistSyncError";
  }
}

export interface PlaylistSyncSummary {
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

function toSpotifyTrackUri(trackId: string): string | null {
  const trimmed = trackId.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("spotify:track:")) return trimmed;
  if (trimmed.startsWith("https://open.spotify.com/track/")) {
    const id = trimmed.split("/track/")[1]?.split("?")[0];
    return id ? `spotify:track:${id}` : null;
  }
  return `spotify:track:${trimmed}`;
}

export async function syncPlaylistToSpotify(
  userId: number,
  playlistId: number,
): Promise<PlaylistSyncSummary> {
  const playlist = await getPlaylistSyncTarget(userId, playlistId);
  if (!playlist) {
    throw new PlaylistSyncError("Playlist not found", 404);
  }

  const mappings = await findMappingsForReleases(
    playlist.items.map((item) => ({
      discogsId: item.discogsId,
      discogsType: item.discogsType,
    })),
  );
  const mappingByRelease = new Map(
    mappings.map((mapping) => [
      `${mapping.discogsId}:${mapping.discogsType}`,
      mapping,
    ]),
  );

  const trackUris: string[] = [];
  let mappedItems = 0;
  for (const item of playlist.items) {
    const mapping = mappingByRelease.get(`${item.discogsId}:${item.discogsType}`);
    const playableTrackUri = mapping?.spotifyTrackIds
      .map(toSpotifyTrackUri)
      .find((uri): uri is string => uri !== null);
    if (!playableTrackUri) continue;
    mappedItems += 1;
    trackUris.push(playableTrackUri);
  }

  const uniqueTrackUris = [...new Set(trackUris)];
  if (uniqueTrackUris.length === 0) {
    await updatePlaylistSpotifySync(userId, playlistId, {
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      spotifySyncStatus: "not-synced",
      spotifySyncedAt: null,
      spotifySyncError: "No mapped Spotify tracks available for this playlist yet",
    });

    return {
      playlistId: playlist.id,
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      status: "not-synced",
      totalItems: playlist.items.length,
      mappedItems,
      skippedItems: Math.max(playlist.items.length - mappedItems, 0),
      candidateTrackCount: 0,
      addedTrackCount: 0,
      skippedTrackCount: 0,
    };
  }

  let accessToken: string;
  try {
    const token = await getValidSpotifyToken(userId);
    accessToken = token.token;
  } catch (error) {
    await updatePlaylistSpotifySync(userId, playlistId, {
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      spotifySyncStatus: "sync-error",
      spotifySyncedAt: playlist.spotifySyncedAt,
      spotifySyncError: "Spotify account is not connected",
    });

    if (error instanceof SpotifyAuthError) {
      throw new PlaylistSyncError("Spotify account is not connected", 400);
    }
    throw error;
  }

  try {
    const syncResult = await syncPlaylistTracksToSpotify({
      accessToken,
      localPlaylistName: playlist.name,
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      trackUris: uniqueTrackUris,
    });

    const status: "synced" | "partially-synced" =
      mappedItems === playlist.items.length ? "synced" : "partially-synced";

    await updatePlaylistSpotifySync(userId, playlistId, {
      spotifyPlaylistId: syncResult.spotifyPlaylistId,
      spotifySyncStatus: status,
      spotifySyncedAt: new Date().toISOString(),
      spotifySyncError: null,
    });

    return {
      playlistId: playlist.id,
      spotifyPlaylistId: syncResult.spotifyPlaylistId,
      status,
      totalItems: playlist.items.length,
      mappedItems,
      skippedItems: Math.max(playlist.items.length - mappedItems, 0),
      candidateTrackCount: uniqueTrackUris.length,
      addedTrackCount: syncResult.addedTrackCount,
      skippedTrackCount: syncResult.skippedTrackCount,
    };
  } catch (error) {
    const message =
      error instanceof SpotifyPlaylistError
        ? "Failed to sync playlist with Spotify"
        : "Failed to sync playlist";

    await updatePlaylistSpotifySync(userId, playlistId, {
      spotifyPlaylistId: playlist.spotifyPlaylistId,
      spotifySyncStatus: "sync-error",
      spotifySyncedAt: playlist.spotifySyncedAt,
      spotifySyncError: message,
    });

    if (error instanceof SpotifyPlaylistError) {
      const status = error.status === 401 ? 400 : 502;
      throw new PlaylistSyncError(message, status);
    }
    throw error;
  }
}
