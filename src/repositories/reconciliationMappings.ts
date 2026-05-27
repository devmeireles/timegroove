import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";
import type {
  MappingStatus,
  ReconciliationMapping,
} from "@/types/reconciliation";

function rowToMapping(row: Row): ReconciliationMapping {
  const trackIdsRaw = row.spotify_track_ids;
  const trackIds =
    typeof trackIdsRaw === "string"
      ? (JSON.parse(trackIdsRaw) as string[])
      : [];

  const payloadRaw = row.raw_spotify_payload;
  const payload =
    typeof payloadRaw === "string" ? JSON.parse(payloadRaw) : null;

  return {
    id: Number(row.id),
    discogsId: Number(row.discogs_id),
    discogsType: row.discogs_type as "release" | "master",
    spotifyArtistId: (row.spotify_artist_id as string | null) ?? null,
    spotifyAlbumId: (row.spotify_album_id as string | null) ?? null,
    spotifyTrackIds: trackIds,
    confidenceScore: Number(row.confidence_score),
    status: row.status as MappingStatus,
    matchedAt: row.matched_at as string,
    rawSpotifyPayload: payload,
  };
}

export async function findMapping(
  discogsId: number,
  discogsType: "release" | "master",
): Promise<ReconciliationMapping | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM reconciliation_mappings WHERE discogs_id = ? AND discogs_type = ?`,
    args: [discogsId, discogsType],
  });
  const row = result.rows[0];
  return row ? rowToMapping(row) : null;
}

export interface UpsertMappingInput {
  discogsId: number;
  discogsType: "release" | "master";
  spotifyArtistId: string | null;
  spotifyAlbumId: string | null;
  spotifyTrackIds: string[];
  confidenceScore: number;
  status: MappingStatus;
  rawSpotifyPayload: unknown | null;
}

export async function upsertMapping(
  input: UpsertMappingInput,
): Promise<ReconciliationMapping> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO reconciliation_mappings (
        discogs_id, discogs_type, spotify_artist_id, spotify_album_id,
        spotify_track_ids, confidence_score, status, matched_at, raw_spotify_payload
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(discogs_id, discogs_type) DO UPDATE SET
        spotify_artist_id   = excluded.spotify_artist_id,
        spotify_album_id    = excluded.spotify_album_id,
        spotify_track_ids   = excluded.spotify_track_ids,
        confidence_score    = excluded.confidence_score,
        status              = excluded.status,
        matched_at          = excluded.matched_at,
        raw_spotify_payload = excluded.raw_spotify_payload
    `,
    args: [
      input.discogsId,
      input.discogsType,
      input.spotifyArtistId,
      input.spotifyAlbumId,
      JSON.stringify(input.spotifyTrackIds),
      input.confidenceScore,
      input.status,
      now,
      input.rawSpotifyPayload != null
        ? JSON.stringify(input.rawSpotifyPayload)
        : null,
    ],
  });

  const stored = await findMapping(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted mapping");
  }
  return stored;
}
