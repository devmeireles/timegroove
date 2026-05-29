import "server-only";

import {
  deletePlaylistForUser,
  getPlaylistForUser,
  renamePlaylistForUser,
  type PlaylistRecord,
} from "@/repositories/playlists";
import { SpotifyAuthError, getValidSpotifyToken } from "@/services/spotify/userAuth";
import {
  deleteSpotifyPlaylist,
  renameSpotifyPlaylist,
  SpotifyPlaylistError,
} from "@/services/spotify/playlist";

export class PlaylistManagementError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "PlaylistManagementError";
  }
}

function mapSpotifyFailure(action: "rename" | "delete", error: unknown): never {
  if (error instanceof SpotifyAuthError) {
    throw new PlaylistManagementError("Spotify account is not connected", 400);
  }
  if (error instanceof SpotifyPlaylistError) {
    throw new PlaylistManagementError(
      `Failed to ${action} playlist on Spotify`,
      error.status === 401 ? 400 : 502,
    );
  }
  throw error;
}

function mapRenameFailure(error: unknown): never {
  if (
    error instanceof Error &&
    error.message.includes("app_playlists_user_name_unique")
  ) {
    throw new PlaylistManagementError("Playlist name already exists", 409);
  }
  throw error;
}

export async function renamePlaylistEverywhere(
  userId: number,
  playlistId: number,
  name: string,
): Promise<PlaylistRecord> {
  const playlist = await getPlaylistForUser(userId, playlistId);
  if (!playlist) {
    throw new PlaylistManagementError("Playlist not found", 404);
  }

  if (playlist.spotifyPlaylistId) {
    try {
      const token = await getValidSpotifyToken(userId);
      await renameSpotifyPlaylist(token.token, playlist.spotifyPlaylistId, name);
    } catch (error) {
      mapSpotifyFailure("rename", error);
    }
  }

  try {
    const updated = await renamePlaylistForUser(userId, playlistId, name);
    if (!updated) {
      throw new PlaylistManagementError("Playlist not found", 404);
    }
    return updated;
  } catch (error) {
    mapRenameFailure(error);
  }
}

export async function deletePlaylistEverywhere(
  userId: number,
  playlistId: number,
): Promise<void> {
  const playlist = await getPlaylistForUser(userId, playlistId);
  if (!playlist) {
    throw new PlaylistManagementError("Playlist not found", 404);
  }

  if (playlist.spotifyPlaylistId) {
    try {
      const token = await getValidSpotifyToken(userId);
      await deleteSpotifyPlaylist(token.token, playlist.spotifyPlaylistId);
    } catch (error) {
      if (error instanceof SpotifyPlaylistError && error.status === 404) {
        // The Spotify playlist was already removed; continue deleting locally.
      } else {
        mapSpotifyFailure("delete", error);
      }
    }
  }

  const removed = await deletePlaylistForUser(userId, playlistId);
  if (!removed) {
    throw new PlaylistManagementError("Playlist not found", 404);
  }
}
