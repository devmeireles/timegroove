import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";

export interface ArtistRecord {
  id: number;
  artistId: number;
  rawPayload: unknown;
  fetchedAt: string;
}

function rowToRecord(row: Row): ArtistRecord | null {
  const rawPayload = row.raw_payload;
  if (typeof rawPayload !== "string") return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawPayload);
  } catch {
    return null;
  }
  return {
    id: Number(row.id),
    artistId: Number(row.artist_id),
    rawPayload: parsed,
    fetchedAt: row.fetched_at as string,
  };
}

export async function findArtist(
  artistId: number,
): Promise<ArtistRecord | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM discogs_artist_details WHERE artist_id = ?`,
    args: [artistId],
  });
  const row = result.rows[0];
  return row ? rowToRecord(row) : null;
}

export interface SaveArtistInput {
  artistId: number;
  rawPayload: unknown;
}

export async function saveArtist(input: SaveArtistInput): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();
  await db.execute({
    sql: `
      INSERT INTO discogs_artist_details (artist_id, raw_payload, fetched_at)
      VALUES (?, ?, ?)
      ON CONFLICT(artist_id) DO UPDATE SET
        raw_payload = excluded.raw_payload,
        fetched_at  = excluded.fetched_at
    `,
    args: [input.artistId, JSON.stringify(input.rawPayload), now],
  });
}
