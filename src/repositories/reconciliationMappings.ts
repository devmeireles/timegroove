import "server-only";

import { getDatabase } from "@/db/sqlite";
import type {
  MappingStatus,
  ReconciliationMapping,
} from "@/types/reconciliation";

interface MappingRow {
  id: number;
  discogs_id: number;
  discogs_type: "release" | "master";
  spotify_artist_id: string | null;
  spotify_album_id: string | null;
  spotify_track_ids: string | null;
  confidence_score: number;
  status: MappingStatus;
  matched_at: string;
  raw_spotify_payload: string | null;
}

function rowToMapping(row: MappingRow): ReconciliationMapping {
  return {
    id: row.id,
    discogsId: row.discogs_id,
    discogsType: row.discogs_type,
    spotifyArtistId: row.spotify_artist_id,
    spotifyAlbumId: row.spotify_album_id,
    spotifyTrackIds: row.spotify_track_ids
      ? (JSON.parse(row.spotify_track_ids) as string[])
      : [],
    confidenceScore: row.confidence_score,
    status: row.status,
    matchedAt: row.matched_at,
    rawSpotifyPayload: row.raw_spotify_payload
      ? JSON.parse(row.raw_spotify_payload)
      : null,
  };
}

export function findMapping(
  discogsId: number,
  discogsType: "release" | "master",
): ReconciliationMapping | null {
  const db = getDatabase();
  const row = db
    .prepare<[number, string], MappingRow>(
      `SELECT * FROM reconciliation_mappings WHERE discogs_id = ? AND discogs_type = ?`,
    )
    .get(discogsId, discogsType);
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

export function upsertMapping(
  input: UpsertMappingInput,
): ReconciliationMapping {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO reconciliation_mappings (
      discogs_id, discogs_type, spotify_artist_id, spotify_album_id,
      spotify_track_ids, confidence_score, status, matched_at, raw_spotify_payload
    ) VALUES (
      @discogsId, @discogsType, @spotifyArtistId, @spotifyAlbumId,
      @spotifyTrackIds, @confidenceScore, @status, @matchedAt, @rawSpotifyPayload
    )
    ON CONFLICT(discogs_id, discogs_type) DO UPDATE SET
      spotify_artist_id   = excluded.spotify_artist_id,
      spotify_album_id    = excluded.spotify_album_id,
      spotify_track_ids   = excluded.spotify_track_ids,
      confidence_score    = excluded.confidence_score,
      status              = excluded.status,
      matched_at          = excluded.matched_at,
      raw_spotify_payload = excluded.raw_spotify_payload
    `,
  ).run({
    discogsId: input.discogsId,
    discogsType: input.discogsType,
    spotifyArtistId: input.spotifyArtistId,
    spotifyAlbumId: input.spotifyAlbumId,
    spotifyTrackIds: JSON.stringify(input.spotifyTrackIds),
    confidenceScore: input.confidenceScore,
    status: input.status,
    matchedAt: now,
    rawSpotifyPayload:
      input.rawSpotifyPayload != null
        ? JSON.stringify(input.rawSpotifyPayload)
        : null,
  });

  const stored = findMapping(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted mapping");
  }
  return stored;
}
