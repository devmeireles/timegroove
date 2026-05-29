import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { appPlaylistItems, appPlaylists } from "@/db/schema";
import { getReleaseDiscogsType } from "@/lib/discogs/releaseIdentity";
import { findMappingsForReleases } from "@/repositories/reconciliationMappings";
import type { NormalizedRelease } from "@/types/discogs";

export interface PlaylistRecord {
  id: number;
  userId: number;
  name: string;
  spotifyPlaylistId: string | null;
  coverUrl?: string | null;
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
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistWithMembership extends PlaylistRecord {
  includesRelease: boolean;
}

export interface PlaylistSyncItem {
  discogsId: number;
  discogsType: "release" | "master";
  releaseTitle: string | null;
  coverUrl: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  createdAt: string;
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

function extractSpotifyCoverUrl(rawSpotifyPayload: unknown): string | null {
  if (!rawSpotifyPayload || typeof rawSpotifyPayload !== "object") return null;
  const payload = rawSpotifyPayload as { images?: Array<{ url?: unknown }> };
  const url = payload.images?.[0]?.url;
  return typeof url === "string" && url.length > 0 ? url : null;
}

export interface PlaylistSyncTarget extends PlaylistRecord {
  items: PlaylistSyncItem[];
}

export interface PlaylistDetailRecord extends PlaylistRecord {
  items: PlaylistSyncItem[];
}

export async function ensureDefaultPlaylist(userId: number): Promise<void> {
  const db = await getOrm();
  const now = new Date().toISOString();
  await db
    .insert(appPlaylists)
    .values({
      userId,
      name: "My Playlist",
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoNothing({ target: [appPlaylists.userId, appPlaylists.name] });
}

export async function listPlaylistsForUser(
  userId: number,
  release?: { discogsId: number; discogsType: "release" | "master" },
): Promise<PlaylistWithMembership[]> {
  const db = await getOrm();

  const playlists = await db
    .select({
      id: appPlaylists.id,
      userId: appPlaylists.userId,
      name: appPlaylists.name,
      spotifyPlaylistId: appPlaylists.spotifyPlaylistId,
      spotifySyncStatus: appPlaylists.spotifySyncStatus,
      spotifySyncedAt: appPlaylists.spotifySyncedAt,
      spotifySyncError: appPlaylists.spotifySyncError,
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    })
    .from(appPlaylists)
    .where(eq(appPlaylists.userId, userId))
    .orderBy(sql`lower(${appPlaylists.name})`, appPlaylists.createdAt);

  if (playlists.length === 0) {
    return [];
  }

  const playlistIds = playlists.map((playlist) => playlist.id);
  const playlistItems = await db
    .select({
      playlistId: appPlaylistItems.playlistId,
      discogsId: appPlaylistItems.discogsId,
      discogsType: appPlaylistItems.discogsType,
      releaseTitle: appPlaylistItems.releaseTitle,
      releaseYear: appPlaylistItems.releaseYear,
      releaseCountry: appPlaylistItems.releaseCountry,
      coverUrl: appPlaylistItems.coverUrl,
      createdAt: appPlaylistItems.createdAt,
    })
    .from(appPlaylistItems)
    .where(inArray(appPlaylistItems.playlistId, playlistIds));

  const totalItemsByPlaylist = new Map<number, number>();
  const releasesToResolve = new Map<string, { discogsId: number; discogsType: "release" | "master" }>();

  for (const item of playlistItems) {
    totalItemsByPlaylist.set(
      item.playlistId,
      (totalItemsByPlaylist.get(item.playlistId) ?? 0) + 1,
    );
    releasesToResolve.set(`${item.discogsId}:${item.discogsType}`, {
      discogsId: item.discogsId,
      discogsType: item.discogsType,
    });
  }

  const mappings = await findMappingsForReleases([...releasesToResolve.values()]);
  const mappingTrackIdsByRelease = new Map<string, string[]>();
  const coverUrlByRelease = new Map<string, string | null>();
  for (const mapping of mappings) {
    const key = `${mapping.discogsId}:${mapping.discogsType}`;
    if (mapping.spotifyTrackIds.length > 0) {
      mappingTrackIdsByRelease.set(key, mapping.spotifyTrackIds);
    }
    coverUrlByRelease.set(key, extractSpotifyCoverUrl(mapping.rawSpotifyPayload));
  }

  const mappedItemsByPlaylist = new Map<number, number>();
  const uniqueTracksByPlaylist = new Map<number, Set<string>>();
  const coverUrlByPlaylist = new Map<number, string | null>();
  for (const item of playlistItems) {
    const mappedTrackIds = mappingTrackIdsByRelease.get(
      `${item.discogsId}:${item.discogsType}`,
    );
    const playableTrackId = mappedTrackIds
      ?.map(toSpotifyTrackUri)
      .find((uri): uri is string => uri !== null);
    if (!playableTrackId) continue;

    mappedItemsByPlaylist.set(
      item.playlistId,
      (mappedItemsByPlaylist.get(item.playlistId) ?? 0) + 1,
    );

    const playlistTracks =
      uniqueTracksByPlaylist.get(item.playlistId) ?? new Set<string>();
    playlistTracks.add(playableTrackId);
    uniqueTracksByPlaylist.set(item.playlistId, playlistTracks);

    if (!coverUrlByPlaylist.has(item.playlistId)) {
      const coverUrl =
        coverUrlByRelease.get(`${item.discogsId}:${item.discogsType}`) ??
        item.coverUrl ??
        null;
      if (coverUrl) {
        coverUrlByPlaylist.set(item.playlistId, coverUrl);
      }
    }
  }

  if (!release) {
    return playlists.map((playlist) => ({
      ...playlist,
      includesRelease: false,
      coverUrl: coverUrlByPlaylist.get(playlist.id) ?? null,
      totalItemsCount: totalItemsByPlaylist.get(playlist.id) ?? 0,
      mappedItemsCount: mappedItemsByPlaylist.get(playlist.id) ?? 0,
      syncedTrackCount: uniqueTracksByPlaylist.get(playlist.id)?.size ?? 0,
    }));
  }

  const matches = await db
    .select({ playlistId: appPlaylistItems.playlistId })
    .from(appPlaylistItems)
    .where(
      and(
        inArray(appPlaylistItems.playlistId, playlistIds),
        eq(appPlaylistItems.discogsId, release.discogsId),
        eq(appPlaylistItems.discogsType, release.discogsType),
      ),
    );

  const includedSet = new Set(matches.map((match) => match.playlistId));
  return playlists.map((playlist) => ({
    ...playlist,
    includesRelease: includedSet.has(playlist.id),
    coverUrl: coverUrlByPlaylist.get(playlist.id) ?? null,
    totalItemsCount: totalItemsByPlaylist.get(playlist.id) ?? 0,
    mappedItemsCount: mappedItemsByPlaylist.get(playlist.id) ?? 0,
    syncedTrackCount: uniqueTracksByPlaylist.get(playlist.id)?.size ?? 0,
  }));
}

export async function getPlaylistDetailsForUser(
  userId: number,
  playlistId: number,
): Promise<PlaylistDetailRecord | null> {
  const playlist = await getPlaylistForUser(userId, playlistId);
  if (!playlist) return null;

  const db = await getOrm();
  const items = await db
    .select({
      discogsId: appPlaylistItems.discogsId,
      discogsType: appPlaylistItems.discogsType,
      releaseTitle: appPlaylistItems.releaseTitle,
      releaseYear: appPlaylistItems.releaseYear,
      releaseCountry: appPlaylistItems.releaseCountry,
      coverUrl: appPlaylistItems.coverUrl,
      createdAt: appPlaylistItems.createdAt,
    })
    .from(appPlaylistItems)
    .where(eq(appPlaylistItems.playlistId, playlist.id))
    .orderBy(appPlaylistItems.createdAt, appPlaylistItems.id);

  const mappings = await findMappingsForReleases(
    items.map((item) => ({
      discogsId: item.discogsId,
      discogsType: item.discogsType,
    })),
  );
  const coverUrlByRelease = new Map<string, string | null>();
  for (const mapping of mappings) {
    coverUrlByRelease.set(
      `${mapping.discogsId}:${mapping.discogsType}`,
      extractSpotifyCoverUrl(mapping.rawSpotifyPayload),
    );
  }

  return {
    ...playlist,
    coverUrl:
      items
        .map(
          (item) =>
            coverUrlByRelease.get(`${item.discogsId}:${item.discogsType}`) ??
            item.coverUrl ??
            null,
        )
        .find((url): url is string => url !== null) ?? null,
    items: items.map((item) => ({
      ...item,
      coverUrl:
        coverUrlByRelease.get(`${item.discogsId}:${item.discogsType}`) ??
        item.coverUrl ??
        null,
    })),
  };
}

export async function createPlaylistForUser(
  userId: number,
  name: string,
): Promise<PlaylistRecord> {
  const db = await getOrm();
  const now = new Date().toISOString();

  const [created] = await db
    .insert(appPlaylists)
    .values({ userId, name, createdAt: now, updatedAt: now })
    .returning({
      id: appPlaylists.id,
      userId: appPlaylists.userId,
      name: appPlaylists.name,
      spotifyPlaylistId: appPlaylists.spotifyPlaylistId,
      spotifySyncStatus: appPlaylists.spotifySyncStatus,
      spotifySyncedAt: appPlaylists.spotifySyncedAt,
      spotifySyncError: appPlaylists.spotifySyncError,
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    });

  if (!created) {
    throw new Error("Failed to read back created playlist");
  }
  return created;
}

export async function getPlaylistForUser(
  userId: number,
  playlistId: number,
): Promise<PlaylistRecord | null> {
  const db = await getOrm();
  const [playlist] = await db
    .select({
      id: appPlaylists.id,
      userId: appPlaylists.userId,
      name: appPlaylists.name,
      spotifyPlaylistId: appPlaylists.spotifyPlaylistId,
      spotifySyncStatus: appPlaylists.spotifySyncStatus,
      spotifySyncedAt: appPlaylists.spotifySyncedAt,
      spotifySyncError: appPlaylists.spotifySyncError,
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    })
    .from(appPlaylists)
    .where(and(eq(appPlaylists.id, playlistId), eq(appPlaylists.userId, userId)))
    .limit(1);

  return playlist ?? null;
}

export async function renamePlaylistForUser(
  userId: number,
  playlistId: number,
  name: string,
): Promise<PlaylistRecord | null> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return null;

  const db = await getOrm();
  const [updated] = await db
    .update(appPlaylists)
    .set({
      name,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appPlaylists.id, ownedPlaylistId))
    .returning({
      id: appPlaylists.id,
      userId: appPlaylists.userId,
      name: appPlaylists.name,
      spotifyPlaylistId: appPlaylists.spotifyPlaylistId,
      spotifySyncStatus: appPlaylists.spotifySyncStatus,
      spotifySyncedAt: appPlaylists.spotifySyncedAt,
      spotifySyncError: appPlaylists.spotifySyncError,
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    });

  return updated ?? null;
}

export async function deletePlaylistForUser(
  userId: number,
  playlistId: number,
): Promise<boolean> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return false;

  const db = await getOrm();
  await db.delete(appPlaylists).where(eq(appPlaylists.id, ownedPlaylistId));
  return true;
}

async function resolveOwnedPlaylistId(
  userId: number,
  playlistId: number,
): Promise<number | null> {
  const db = await getOrm();
  const [row] = await db
    .select({ id: appPlaylists.id })
    .from(appPlaylists)
    .where(and(eq(appPlaylists.id, playlistId), eq(appPlaylists.userId, userId)))
    .limit(1);
  return row?.id ?? null;
}

export async function includeReleaseInPlaylist(
  userId: number,
  playlistId: number,
  release: NormalizedRelease,
): Promise<boolean> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return false;

  const db = await getOrm();
  const now = new Date().toISOString();
  const discogsType = getReleaseDiscogsType(release);

  await db
    .insert(appPlaylistItems)
    .values({
      playlistId: ownedPlaylistId,
      discogsId: release.id,
      discogsType,
      releaseTitle: release.title,
      releaseYear: release.year,
      releaseCountry: release.country,
      coverUrl: release.coverImage ?? release.thumb ?? null,
      createdAt: now,
    })
    .onConflictDoNothing({
      target: [
        appPlaylistItems.playlistId,
        appPlaylistItems.discogsId,
        appPlaylistItems.discogsType,
      ],
    });

  await db
    .update(appPlaylists)
    .set({ updatedAt: now })
    .where(eq(appPlaylists.id, ownedPlaylistId));

  return true;
}

export async function excludeReleaseFromPlaylist(
  userId: number,
  playlistId: number,
  discogsId: number,
  discogsType: "release" | "master",
): Promise<boolean> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return false;

  const db = await getOrm();
  const now = new Date().toISOString();

  await db
    .delete(appPlaylistItems)
    .where(
      and(
        eq(appPlaylistItems.playlistId, ownedPlaylistId),
        eq(appPlaylistItems.discogsId, discogsId),
        eq(appPlaylistItems.discogsType, discogsType),
      ),
    );

  await db
    .update(appPlaylists)
    .set({ updatedAt: now })
    .where(eq(appPlaylists.id, ownedPlaylistId));

  return true;
}

export async function getPlaylistSyncTarget(
  userId: number,
  playlistId: number,
): Promise<PlaylistSyncTarget | null> {
  const db = await getOrm();
  const [playlist] = await db
    .select({
      id: appPlaylists.id,
      userId: appPlaylists.userId,
      name: appPlaylists.name,
      spotifyPlaylistId: appPlaylists.spotifyPlaylistId,
      spotifySyncStatus: appPlaylists.spotifySyncStatus,
      spotifySyncedAt: appPlaylists.spotifySyncedAt,
      spotifySyncError: appPlaylists.spotifySyncError,
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    })
    .from(appPlaylists)
    .where(and(eq(appPlaylists.id, playlistId), eq(appPlaylists.userId, userId)))
    .limit(1);

  if (!playlist) return null;

  const items = await db
    .select({
      discogsId: appPlaylistItems.discogsId,
      discogsType: appPlaylistItems.discogsType,
      releaseTitle: appPlaylistItems.releaseTitle,
      coverUrl: appPlaylistItems.coverUrl,
      releaseYear: appPlaylistItems.releaseYear,
      releaseCountry: appPlaylistItems.releaseCountry,
      createdAt: appPlaylistItems.createdAt,
    })
    .from(appPlaylistItems)
    .where(eq(appPlaylistItems.playlistId, playlist.id))
    .orderBy(appPlaylistItems.createdAt, appPlaylistItems.id);

  return { ...playlist, items };
}

interface PlaylistSpotifySyncUpdates {
  spotifyPlaylistId?: string | null;
  spotifySyncStatus: "not-synced" | "synced" | "partially-synced" | "sync-error";
  spotifySyncedAt?: string | null;
  spotifySyncError?: string | null;
}

export async function updatePlaylistSpotifySync(
  userId: number,
  playlistId: number,
  updates: PlaylistSpotifySyncUpdates,
): Promise<boolean> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return false;

  const db = await getOrm();
  await db
    .update(appPlaylists)
    .set({
      spotifyPlaylistId: updates.spotifyPlaylistId,
      spotifySyncStatus: updates.spotifySyncStatus,
      spotifySyncedAt: updates.spotifySyncedAt,
      spotifySyncError: updates.spotifySyncError,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appPlaylists.id, ownedPlaylistId));

  return true;
}
