import "server-only";

import { and, eq } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { discogsVideoResolutions } from "@/db/schema";

export interface VideoResolution {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  /** YouTube video id (11 chars) or null when Discogs has no playable URL. */
  youtubeVideoId: string | null;
  resolvedAt: string;
}

function rowToResolution(row: {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  youtubeVideoId: string | null;
  resolvedAt: string;
}): VideoResolution {
  return row;
}

export async function findVideoResolution(
  discogsId: number,
  discogsType: "release" | "master",
): Promise<VideoResolution | null> {
  const db = await getOrm();
  const [row] = await db
    .select({
      id: discogsVideoResolutions.id,
      discogsId: discogsVideoResolutions.discogsId,
      discogsType: discogsVideoResolutions.discogsType,
      youtubeVideoId: discogsVideoResolutions.youtubeVideoId,
      resolvedAt: discogsVideoResolutions.resolvedAt,
    })
    .from(discogsVideoResolutions)
    .where(
      and(
        eq(discogsVideoResolutions.discogsId, discogsId),
        eq(discogsVideoResolutions.discogsType, discogsType),
      ),
    )
    .limit(1);

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
  const db = await getOrm();
  const [row] = await db
    .select({ rawPayload: discogsVideoResolutions.rawPayload })
    .from(discogsVideoResolutions)
    .where(
      and(
        eq(discogsVideoResolutions.discogsId, discogsId),
        eq(discogsVideoResolutions.discogsType, discogsType),
      ),
    )
    .limit(1);

  if (!row) return null;
  if (typeof row.rawPayload !== "string") return null;
  try {
    return JSON.parse(row.rawPayload);
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
  const db = await getOrm();
  const now = new Date().toISOString();

  await db
    .insert(discogsVideoResolutions)
    .values({
      discogsId: input.discogsId,
      discogsType: input.discogsType,
      youtubeVideoId: input.youtubeVideoId,
      resolvedAt: now,
      rawPayload: input.rawPayload != null ? JSON.stringify(input.rawPayload) : null,
    })
    .onConflictDoUpdate({
      target: [
        discogsVideoResolutions.discogsId,
        discogsVideoResolutions.discogsType,
      ],
      set: {
        youtubeVideoId: input.youtubeVideoId,
        resolvedAt: now,
        rawPayload:
          input.rawPayload != null ? JSON.stringify(input.rawPayload) : null,
      },
    });

  const stored = await findVideoResolution(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted video resolution");
  }
  return stored;
}
