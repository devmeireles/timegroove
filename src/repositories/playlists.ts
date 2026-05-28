import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { appPlaylistItems, appPlaylists } from "@/db/schema";
import type { NormalizedRelease } from "@/types/discogs";

export interface PlaylistRecord {
  id: number;
  userId: number;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface PlaylistWithMembership extends PlaylistRecord {
  includesRelease: boolean;
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
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    })
    .from(appPlaylists)
    .where(eq(appPlaylists.userId, userId))
    .orderBy(sql`lower(${appPlaylists.name})`, appPlaylists.createdAt);

  if (!release || playlists.length === 0) {
    return playlists.map((playlist) => ({ ...playlist, includesRelease: false }));
  }

  const playlistIds = playlists.map((playlist) => playlist.id);
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
  }));
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
      createdAt: appPlaylists.createdAt,
      updatedAt: appPlaylists.updatedAt,
    });

  if (!created) {
    throw new Error("Failed to read back created playlist");
  }
  return created;
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
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

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
