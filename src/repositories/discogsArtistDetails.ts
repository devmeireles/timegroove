import "server-only";

import { eq } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { discogsArtistDetails } from "@/db/schema";

export interface ArtistRecord {
  id: number;
  artistId: number;
  rawPayload: unknown;
  fetchedAt: string;
}

function rowToRecord(row: {
  id: number;
  artistId: number;
  rawPayload: string;
  fetchedAt: string;
}): ArtistRecord | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(row.rawPayload);
  } catch {
    return null;
  }
  return {
    id: row.id,
    artistId: row.artistId,
    rawPayload: parsed,
    fetchedAt: row.fetchedAt,
  };
}

export async function findArtist(
  artistId: number,
): Promise<ArtistRecord | null> {
  const db = await getOrm();
  const [row] = await db
    .select({
      id: discogsArtistDetails.id,
      artistId: discogsArtistDetails.artistId,
      rawPayload: discogsArtistDetails.rawPayload,
      fetchedAt: discogsArtistDetails.fetchedAt,
    })
    .from(discogsArtistDetails)
    .where(eq(discogsArtistDetails.artistId, artistId))
    .limit(1);

  return row ? rowToRecord(row) : null;
}

export interface SaveArtistInput {
  artistId: number;
  rawPayload: unknown;
}

export async function saveArtist(input: SaveArtistInput): Promise<void> {
  const db = await getOrm();
  const now = new Date().toISOString();

  await db
    .insert(discogsArtistDetails)
    .values({
      artistId: input.artistId,
      rawPayload: JSON.stringify(input.rawPayload),
      fetchedAt: now,
    })
    .onConflictDoUpdate({
      target: discogsArtistDetails.artistId,
      set: {
        rawPayload: JSON.stringify(input.rawPayload),
        fetchedAt: now,
      },
    });
}
