import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";
import type { NormalizedRelease } from "@/types/discogs";

export interface FavoriteRecord {
  id: number;
  userId: number;
  discogsId: number;
  discogsType: "release" | "master";
  releaseTitle: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  coverUrl: string | null;
  createdAt: string;
}

function rowToFavorite(row: Row): FavoriteRecord {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    discogsId: Number(row.discogs_id),
    discogsType: row.discogs_type as "release" | "master",
    releaseTitle: (row.release_title as string | null) ?? null,
    releaseYear:
      typeof row.release_year === "number"
        ? row.release_year
        : row.release_year == null
          ? null
          : Number(row.release_year),
    releaseCountry: (row.release_country as string | null) ?? null,
    coverUrl: (row.cover_url as string | null) ?? null,
    createdAt: String(row.created_at),
  };
}

export async function listFavoritesForUser(
  userId: number,
): Promise<FavoriteRecord[]> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `
      SELECT *
      FROM app_user_favorites
      WHERE user_id = ?
      ORDER BY created_at DESC
    `,
    args: [userId],
  });
  return result.rows.map(rowToFavorite);
}

export async function addFavorite(
  userId: number,
  release: NormalizedRelease,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

  const coverUrl = release.coverImage ?? release.thumb ?? null;

  await db.execute({
    sql: `
      INSERT INTO app_user_favorites (
        user_id, discogs_id, discogs_type,
        release_title, release_year, release_country, cover_url,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(user_id, discogs_id, discogs_type) DO NOTHING
    `,
    args: [
      userId,
      release.id,
      discogsType,
      release.title,
      release.year,
      release.country,
      coverUrl,
      now,
    ],
  });
}

export async function removeFavorite(
  userId: number,
  discogsId: number,
  discogsType: "release" | "master",
): Promise<void> {
  const db = await getDatabase();
  await db.execute({
    sql: `
      DELETE FROM app_user_favorites
      WHERE user_id = ? AND discogs_id = ? AND discogs_type = ?
    `,
    args: [userId, discogsId, discogsType],
  });
}
