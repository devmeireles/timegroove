import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";
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

function rowToPlaylist(row: Row): PlaylistRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    name: String(row.name),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function rowToPlaylistWithMembership(row: Row): PlaylistWithMembership {
  return {
    ...rowToPlaylist(row),
    includesRelease: Number(row.includes_release ?? 0) > 0,
  };
}

export async function ensureDefaultPlaylist(userId: number): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO app_playlists (user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
      ON CONFLICT(user_id, name) DO NOTHING
    `,
    args: [userId, "My Playlist", now, now],
  });
}

export async function listPlaylistsForUser(
  userId: number,
  release?: { discogsId: number; discogsType: "release" | "master" },
): Promise<PlaylistWithMembership[]> {
  const db = await getDatabase();

  if (!release) {
    const result = await db.execute({
      sql: `
        SELECT p.*, 0 AS includes_release
        FROM app_playlists p
        WHERE p.user_id = ?
        ORDER BY LOWER(p.name) ASC, p.created_at ASC
      `,
      args: [userId],
    });
    return result.rows.map(rowToPlaylistWithMembership);
  }

  const result = await db.execute({
    sql: `
      SELECT
        p.*,
        CASE WHEN pi.id IS NULL THEN 0 ELSE 1 END AS includes_release
      FROM app_playlists p
      LEFT JOIN app_playlist_items pi
        ON pi.playlist_id = p.id
        AND pi.discogs_id = ?
        AND pi.discogs_type = ?
      WHERE p.user_id = ?
      ORDER BY LOWER(p.name) ASC, p.created_at ASC
    `,
    args: [release.discogsId, release.discogsType, userId],
  });

  return result.rows.map(rowToPlaylistWithMembership);
}

export async function createPlaylistForUser(
  userId: number,
  name: string,
): Promise<PlaylistRecord> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO app_playlists (user_id, name, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `,
    args: [userId, name, now, now],
  });

  const lookup = await db.execute({
    sql: `
      SELECT *
      FROM app_playlists
      WHERE user_id = ? AND name = ?
      LIMIT 1
    `,
    args: [userId, name],
  });
  const row = lookup.rows[0];
  if (!row) {
    throw new Error("Failed to read back created playlist");
  }
  return rowToPlaylist(row);
}

async function resolveOwnedPlaylistId(
  userId: number,
  playlistId: number,
): Promise<number | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `
      SELECT id
      FROM app_playlists
      WHERE id = ? AND user_id = ?
      LIMIT 1
    `,
    args: [playlistId, userId],
  });
  const row = result.rows[0];
  return row ? Number(row.id) : null;
}

export async function includeReleaseInPlaylist(
  userId: number,
  playlistId: number,
  release: NormalizedRelease,
): Promise<boolean> {
  const ownedPlaylistId = await resolveOwnedPlaylistId(userId, playlistId);
  if (!ownedPlaylistId) return false;

  const db = await getDatabase();
  const now = new Date().toISOString();
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

  await db.execute({
    sql: `
      INSERT INTO app_playlist_items (
        playlist_id, discogs_id, discogs_type,
        release_title, release_year, release_country, cover_url, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(playlist_id, discogs_id, discogs_type) DO NOTHING
    `,
    args: [
      ownedPlaylistId,
      release.id,
      discogsType,
      release.title,
      release.year,
      release.country,
      release.coverImage ?? release.thumb ?? null,
      now,
    ],
  });

  await db.execute({
    sql: `UPDATE app_playlists SET updated_at = ? WHERE id = ?`,
    args: [now, ownedPlaylistId],
  });

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

  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      DELETE FROM app_playlist_items
      WHERE playlist_id = ? AND discogs_id = ? AND discogs_type = ?
    `,
    args: [ownedPlaylistId, discogsId, discogsType],
  });
  await db.execute({
    sql: `UPDATE app_playlists SET updated_at = ? WHERE id = ?`,
    args: [now, ownedPlaylistId],
  });

  return true;
}