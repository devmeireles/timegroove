import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";

export interface VideoResolution {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  /** YouTube video id (11 chars) or null when Discogs has no playable URL. */
  youtubeVideoId: string | null;
  resolvedAt: string;
}

function rowToResolution(row: Row): VideoResolution {
  return {
    id: Number(row.id),
    discogsId: Number(row.discogs_id),
    discogsType: row.discogs_type as "release" | "master",
    youtubeVideoId: (row.youtube_video_id as string | null) ?? null,
    resolvedAt: row.resolved_at as string,
  };
}

export async function findVideoResolution(
  discogsId: number,
  discogsType: "release" | "master",
): Promise<VideoResolution | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM discogs_video_resolutions WHERE discogs_id = ? AND discogs_type = ?`,
    args: [discogsId, discogsType],
  });
  const row = result.rows[0];
  return row ? rowToResolution(row) : null;
}

/**
 * Read the cached raw_payload as the structured JSON it was written as.
 * Used by the album-detail flow to reuse the same cache row as video
 * resolution (which writes the full Discogs detail there). Returns null
 * when the row is missing or the payload isn't parseable.
 */
export async function findEntityRawPayload(
  discogsId: number,
  discogsType: "release" | "master",
): Promise<unknown | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT raw_payload FROM discogs_video_resolutions WHERE discogs_id = ? AND discogs_type = ?`,
    args: [discogsId, discogsType],
  });
  const row = result.rows[0];
  if (!row) return null;
  const payload = row.raw_payload;
  if (typeof payload !== "string") return null;
  try {
    return JSON.parse(payload);
  } catch {
    return null;
  }
}

export interface SaveVideoResolutionInput {
  discogsId: number;
  discogsType: "release" | "master";
  youtubeVideoId: string | null;
  rawPayload: unknown | null;
}

export async function saveVideoResolution(
  input: SaveVideoResolutionInput,
): Promise<VideoResolution> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO discogs_video_resolutions (
        discogs_id, discogs_type, youtube_video_id, resolved_at, raw_payload
      ) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(discogs_id, discogs_type) DO UPDATE SET
        youtube_video_id = excluded.youtube_video_id,
        resolved_at      = excluded.resolved_at,
        raw_payload      = excluded.raw_payload
    `,
    args: [
      input.discogsId,
      input.discogsType,
      input.youtubeVideoId,
      now,
      input.rawPayload != null ? JSON.stringify(input.rawPayload) : null,
    ],
  });

  const stored = await findVideoResolution(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted video resolution");
  }
  return stored;
}
