import "server-only";

import { and, eq, inArray } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { reconciliationMappings } from "@/db/schema";
import type {
  MappingStatus,
  ReconciliationMapping,
} from "@/types/reconciliation";

function rowToMapping(row: {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  spotifyArtistId: string | null;
  spotifyAlbumId: string | null;
  spotifyTrackIds: string | null;
  confidenceScore: number;
  status: "matched" | "no-match" | "manual-override";
  matchedAt: string;
  rawSpotifyPayload: string | null;
}): ReconciliationMapping {
  const trackIds =
    typeof row.spotifyTrackIds === "string"
      ? (JSON.parse(row.spotifyTrackIds) as string[])
      : [];

  const payload =
    typeof row.rawSpotifyPayload === "string"
      ? JSON.parse(row.rawSpotifyPayload)
      : null;

  return {
    id: row.id,
    discogsId: row.discogsId,
    discogsType: row.discogsType,
    spotifyArtistId: row.spotifyArtistId,
    spotifyAlbumId: row.spotifyAlbumId,
    spotifyTrackIds: trackIds,
    confidenceScore: row.confidenceScore,
    status: row.status as MappingStatus,
    matchedAt: row.matchedAt,
    rawSpotifyPayload: payload,
  };
}

export async function findMapping(
  discogsId: number,
  discogsType: "release" | "master",
): Promise<ReconciliationMapping | null> {
  const db = await getOrm();
  const [row] = await db
    .select({
      id: reconciliationMappings.id,
      discogsId: reconciliationMappings.discogsId,
      discogsType: reconciliationMappings.discogsType,
      spotifyArtistId: reconciliationMappings.spotifyArtistId,
      spotifyAlbumId: reconciliationMappings.spotifyAlbumId,
      spotifyTrackIds: reconciliationMappings.spotifyTrackIds,
      confidenceScore: reconciliationMappings.confidenceScore,
      status: reconciliationMappings.status,
      matchedAt: reconciliationMappings.matchedAt,
      rawSpotifyPayload: reconciliationMappings.rawSpotifyPayload,
    })
    .from(reconciliationMappings)
    .where(
      and(
        eq(reconciliationMappings.discogsId, discogsId),
        eq(reconciliationMappings.discogsType, discogsType),
      ),
    )
    .limit(1);

  return row ? rowToMapping(row) : null;
}

export async function findMappingsForReleases(
  releases: Array<{ discogsId: number; discogsType: "release" | "master" }>,
): Promise<ReconciliationMapping[]> {
  if (releases.length === 0) return [];

  const db = await getOrm();
  const discogsIds = [...new Set(releases.map((release) => release.discogsId))];
  const discogsTypes = [
    ...new Set(releases.map((release) => release.discogsType)),
  ] as Array<"release" | "master">;
  const wantedKeys = new Set(
    releases.map((release) => `${release.discogsId}:${release.discogsType}`),
  );

  const rows = await db
    .select({
      id: reconciliationMappings.id,
      discogsId: reconciliationMappings.discogsId,
      discogsType: reconciliationMappings.discogsType,
      spotifyArtistId: reconciliationMappings.spotifyArtistId,
      spotifyAlbumId: reconciliationMappings.spotifyAlbumId,
      spotifyTrackIds: reconciliationMappings.spotifyTrackIds,
      confidenceScore: reconciliationMappings.confidenceScore,
      status: reconciliationMappings.status,
      matchedAt: reconciliationMappings.matchedAt,
      rawSpotifyPayload: reconciliationMappings.rawSpotifyPayload,
    })
    .from(reconciliationMappings)
    .where(
      and(
        inArray(reconciliationMappings.discogsId, discogsIds),
        inArray(reconciliationMappings.discogsType, discogsTypes),
      ),
    );

  return rows
    .filter((row) => wantedKeys.has(`${row.discogsId}:${row.discogsType}`))
    .map(rowToMapping);
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
  const db = await getOrm();
  const now = new Date().toISOString();

  await db
    .insert(reconciliationMappings)
    .values({
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
    })
    .onConflictDoUpdate({
      target: [reconciliationMappings.discogsId, reconciliationMappings.discogsType],
      set: {
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
      },
    });

  const stored = await findMapping(input.discogsId, input.discogsType);
  if (!stored) {
    throw new Error("Failed to read back upserted mapping");
  }
  return stored;
}
