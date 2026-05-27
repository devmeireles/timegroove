import "server-only";

import { getDatabase } from "@/db/sqlite";

export interface VideoResolution {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  /** YouTube video id (11 chars) or null when Discogs has no playable URL. */
  youtubeVideoId: string | null;
  resolvedAt: string;
}

interface ResolutionRow {
  id: number;
  discogs_id: number;
  discogs_type: "release" | "master";
  youtube_video_id: string | null;
  resolved_at: string;
  raw_payload: string | null;
}

function rowToResolution(row: ResolutionRow): VideoResolution {
  return {
    id: row.id,
    discogsId: row.discogs_id,
    discogsType: row.discogs_type,
    youtubeVideoId: row.youtube_video_id,
    resolvedAt: row.resolved_at,
  };
}

export function findVideoResolution(
  discogsId: number,
  discogsType: "release" | "master",
): VideoResolution | null {
  const db = getDatabase();
  const row = db
    .prepare<[number, string], ResolutionRow>(
      `SELECT * FROM discogs_video_resolutions WHERE discogs_id = ? AND discogs_type = ?`,
    )
    .get(discogsId, discogsType);
  return row ? rowToResolution(row) : null;
}

export interface SaveVideoResolutionInput {
  discogsId: number;
  discogsType: "release" | "master";
  youtubeVideoId: string | null;
  rawPayload: unknown | null;
}

export function saveVideoResolution(
  input: SaveVideoResolutionInput,
): VideoResolution {
  const db = getDatabase();
  const now = new Date().toISOString();

  db.prepare(
    `
    INSERT INTO discogs_video_resolutions (
      discogs_id, discogs_type, youtube_video_id, resolved_at, raw_payload
    ) VALUES (
      @discogsId, @discogsType, @youtubeVideoId, @resolvedAt, @rawPayload
    )
    ON CONFLICT(discogs_id, discogs_type) DO UPDATE SET
      youtube_video_id = excluded.youtube_video_id,
      resolved_at      = excluded.resolved_at,
      raw_payload      = excluded.raw_payload
    `,
  ).run({
    discogsId: input.discogsId,
    discogsType: input.discogsType,
    youtubeVideoId: input.youtubeVideoId,
    resolvedAt: now,
    rawPayload:
      input.rawPayload != null ? JSON.stringify(input.rawPayload) : null,
  });

  const stored = findVideoResolution(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted video resolution");
  }
  return stored;
}
