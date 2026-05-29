import "server-only";

import { serverEnv } from "@/lib/env";
import { delayMs, parseRetryAfterSeconds } from "@/services/http/retry";

export class SpotifyPlaylistError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamBody?: string,
  ) {
    super(message);
    this.name = "SpotifyPlaylistError";
  }
}

const MAX_RATE_LIMIT_RETRIES = 2;

async function spotifyUserFetch<T>(
  accessToken: string,
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const url = new URL(path, serverEnv.spotify.baseUrl).toString();

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init.headers ?? {}),
      },
      cache: "no-store",
    });

    if (response.status === 429) {
      if (attempt >= MAX_RATE_LIMIT_RETRIES) {
        const body = await response.text().catch(() => "");
        throw new SpotifyPlaylistError(
          `Spotify request rate-limited for ${path}`,
          response.status,
          body,
        );
      }
      const retryAfter = parseRetryAfterSeconds(
        response.headers.get("retry-after"),
      );
      await delayMs(retryAfter * 1000);
      continue;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SpotifyPlaylistError(
        `Spotify request failed for ${path}: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  }

  throw new SpotifyPlaylistError(`Spotify request failed for ${path}`, 429);
}

interface SpotifyPlaylistRef {
  id: string;
  name: string;
}

interface SpotifyPlaylistPage {
  items: SpotifyPlaylistRef[];
  next: string | null;
}

interface SpotifyCurrentUser {
  id: string;
}

interface SpotifyPlaylistTracksPage {
  items: Array<{ track: { uri: string | null } | null }>;
  next: string | null;
}

async function getCurrentSpotifyUserId(accessToken: string): Promise<string> {
  const profile = await spotifyUserFetch<SpotifyCurrentUser>(accessToken, "/v1/me");
  return profile.id;
}

async function findPlaylistByName(
  accessToken: string,
  name: string,
): Promise<string | null> {
  let nextPath = "/v1/me/playlists?limit=50";
  const normalizedName = name.trim().toLocaleLowerCase();

  while (nextPath) {
    const page = await spotifyUserFetch<SpotifyPlaylistPage>(accessToken, nextPath);
    const match = page.items.find(
      (item) => item.name.trim().toLocaleLowerCase() === normalizedName,
    );
    if (match) return match.id;

    nextPath = page.next
      ? new URL(page.next).pathname + new URL(page.next).search
      : "";
  }

  return null;
}

async function createPlaylist(
  accessToken: string,
  userId: string,
  name: string,
): Promise<string> {
  const created = await spotifyUserFetch<{ id: string }>(
    accessToken,
    `/v1/users/${encodeURIComponent(userId)}/playlists`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name,
        public: false,
        description: "Synced from Time Groove",
      }),
    },
  );

  return created.id;
}

export async function renameSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
  name: string,
): Promise<void> {
  await spotifyUserFetch<void>(
    accessToken,
    `/v1/playlists/${encodeURIComponent(playlistId)}`,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name }),
    },
  );
}

export async function deleteSpotifyPlaylist(
  accessToken: string,
  playlistId: string,
): Promise<void> {
  await spotifyUserFetch<void>(
    accessToken,
    `/v1/playlists/${encodeURIComponent(playlistId)}/followers`,
    {
      method: "DELETE",
    },
  );
}

async function listPlaylistTrackUris(
  accessToken: string,
  playlistId: string,
): Promise<Set<string>> {
  const uris = new Set<string>();
  let nextPath = `/v1/playlists/${encodeURIComponent(playlistId)}/tracks?limit=100&fields=items(track(uri)),next`;

  while (nextPath) {
    const page = await spotifyUserFetch<SpotifyPlaylistTracksPage>(
      accessToken,
      nextPath,
    );
    for (const item of page.items) {
      const uri = item.track?.uri;
      if (uri) uris.add(uri);
    }
    nextPath = page.next
      ? new URL(page.next).pathname + new URL(page.next).search
      : "";
  }

  return uris;
}

const SPOTIFY_TRACK_BATCH_SIZE = 100;

async function appendTracks(
  accessToken: string,
  playlistId: string,
  uris: string[],
): Promise<void> {
  for (let i = 0; i < uris.length; i += SPOTIFY_TRACK_BATCH_SIZE) {
    const chunk = uris.slice(i, i + SPOTIFY_TRACK_BATCH_SIZE);
    await spotifyUserFetch<{ snapshot_id: string }>(
      accessToken,
      `/v1/playlists/${encodeURIComponent(playlistId)}/tracks`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ uris: chunk }),
      },
    );
  }
}

export interface SyncPlaylistTracksInput {
  accessToken: string;
  localPlaylistName: string;
  spotifyPlaylistId: string | null;
  trackUris: string[];
}

export interface SyncPlaylistTracksResult {
  spotifyPlaylistId: string | null;
  addedTrackCount: number;
  skippedTrackCount: number;
}

export async function syncPlaylistTracksToSpotify({
  accessToken,
  localPlaylistName,
  spotifyPlaylistId,
  trackUris,
}: SyncPlaylistTracksInput): Promise<SyncPlaylistTracksResult> {
  const uniqueUris = [...new Set(trackUris)];
  if (uniqueUris.length === 0) {
    return {
      spotifyPlaylistId: spotifyPlaylistId ?? null,
      addedTrackCount: 0,
      skippedTrackCount: 0,
    };
  }

  let targetPlaylistId = spotifyPlaylistId;
  let isNewPlaylist = false;

  if (!targetPlaylistId) {
    targetPlaylistId = await findPlaylistByName(accessToken, localPlaylistName);

    if (!targetPlaylistId) {
      const spotifyUserId = await getCurrentSpotifyUserId(accessToken);
      targetPlaylistId = await createPlaylist(
        accessToken,
        spotifyUserId,
        localPlaylistName,
      );
      isNewPlaylist = true;
    }
  }

  const existingTrackUris = isNewPlaylist
    ? new Set<string>()
    : await listPlaylistTrackUris(accessToken, targetPlaylistId);
  const urisToAdd = uniqueUris.filter((uri) => !existingTrackUris.has(uri));

  if (urisToAdd.length > 0) {
    await appendTracks(accessToken, targetPlaylistId, urisToAdd);
  }

  return {
    spotifyPlaylistId: targetPlaylistId,
    addedTrackCount: urisToAdd.length,
    skippedTrackCount: uniqueUris.length - urisToAdd.length,
  };
}
