import "server-only";

import { splitDiscogsTitle } from "@/lib/text/normalize";
import {
  findMapping,
  upsertMapping,
} from "@/repositories/reconciliationMappings";
import {
  dedupe,
  pickBest,
  toCandidate,
} from "@/services/reconciliation/candidates";
import { totalConfidence } from "@/services/reconciliation/score";
import {
  SpotifyApiError,
  getAlbum,
  getAlbumTracks,
  searchAlbums,
} from "@/services/spotify/client";
import { buildSearchQueries } from "@/services/spotify/search";
import type { NormalizedRelease } from "@/types/discogs";
import type {
  DiscogsMatchInput,
  EnrichedRelease,
  EnrichedSpotify,
  ReconciliationMapping,
  ScoredCandidate,
} from "@/types/reconciliation";

interface ReconcileInput {
  release: NormalizedRelease;
  signal?: AbortSignal;
}

const inflightReconciliations = new Map<string, Promise<EnrichedRelease>>();

function compactEnrichedSpotify(payload: EnrichedSpotify): EnrichedSpotify {
  const firstImage = payload.images[0] ? [payload.images[0]] : [];
  return {
    artistId: payload.artistId,
    albumId: payload.albumId,
    name: payload.name,
    artists: payload.artists,
    images: firstImage,
    externalUrl: payload.externalUrl,
    popularity: payload.popularity,
    // Not used by the current UI; omit to shrink cache rows.
    tracks: [],
  };
}

/**
 * Public entry point. Returns an EnrichedRelease, either from cache or from
 * a freshly-scored Spotify match. The Discogs row is supplied by the caller
 * (the frontend has it from /api/discogs/search) so this layer never has to
 * round-trip the Discogs detail endpoint.
 */
export async function reconcileRelease({
  release,
  signal,
}: ReconcileInput): Promise<EnrichedRelease> {
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";
  const inflightKey = `${discogsType}:${release.id}`;

  const existing = inflightReconciliations.get(inflightKey);
  if (existing) return existing;

  const work = reconcileReleaseInternal({ release, signal }).finally(() => {
    inflightReconciliations.delete(inflightKey);
  });
  inflightReconciliations.set(inflightKey, work);
  return work;
}

async function reconcileReleaseInternal({
  release,
  signal,
}: ReconcileInput): Promise<EnrichedRelease> {
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

  const cached = await findMapping(release.id, discogsType);
  if (cached) {
    return hydrateFromCache(cached, release);
  }

  const matchInput = buildMatchInput(release, discogsType);
  const scored = await findBestSpotifyMatch(matchInput, signal);

  if (!scored) {
    await upsertMapping({
      discogsId: release.id,
      discogsType,
      spotifyArtistId: null,
      spotifyAlbumId: null,
      spotifyTrackIds: [],
      confidenceScore: 0,
      status: "no-match",
      rawSpotifyPayload: null,
    });
    return {
      discogs: release,
      spotify: null,
      confidence: 0,
      status: "no-match",
      cached: false,
    };
  }

  const enriched = await materializeSpotify(scored, signal);
  const confidence = totalConfidence(scored.score);

  await upsertMapping({
    discogsId: release.id,
    discogsType,
    spotifyArtistId: scored.candidate.artists[0]?.id ?? null,
    spotifyAlbumId: scored.candidate.id,
    spotifyTrackIds: enriched.tracks.map((t) => t.id),
    confidenceScore: confidence,
    status: "matched",
    rawSpotifyPayload: compactEnrichedSpotify(enriched),
  });

  return {
    discogs: release,
    spotify: enriched,
    confidence,
    status: "matched",
    cached: false,
  };
}

/**
 * Convert a NormalizedRelease (which carries the Discogs "Artist - Album"
 * combined title) into the structured match input the scorer expects.
 */
function buildMatchInput(
  release: NormalizedRelease,
  discogsType: "release" | "master",
): DiscogsMatchInput {
  const title = release.title ?? "";
  const { artist, album } = splitDiscogsTitle(title);

  return {
    discogsId: release.id,
    discogsType,
    artist,
    title: album,
    year: release.year,
    trackCount: null,
    rawDiscogsTitle: release.title,
  };
}

/**
 * Try each Spotify query in order; stop at the first one whose top
 * candidate clears the threshold. Each query asks for up to 10 candidates.
 */
async function findBestSpotifyMatch(
  input: DiscogsMatchInput,
  signal?: AbortSignal,
): Promise<ScoredCandidate | null> {
  const queries = buildSearchQueries(input);

  for (const query of queries) {
    try {
      const albums = await searchAlbums({ query, limit: 10, signal });
      if (albums.length === 0) continue;
      const candidates = dedupe(albums.map(toCandidate));
      const best = pickBest(input, candidates);
      if (best) return best;
    } catch (error) {
      if (
        error instanceof SpotifyApiError &&
        (error.status === 401 || error.status === 429)
      ) {
        throw error;
      }
      continue;
    }
  }
  return null;
}

/**
 * Resolve the chosen candidate into the wire shape: full album metadata +
 * track list with preview URLs. Track-list fetch is best-effort.
 */
async function materializeSpotify(
  scored: ScoredCandidate,
  signal?: AbortSignal,
): Promise<EnrichedSpotify> {
  const albumId = scored.candidate.id;

  const [albumDetail, tracks] = await Promise.all([
    getAlbum(albumId, signal).catch(() => null),
    getAlbumTracks(albumId, signal).catch(() => null),
  ]);

  const popularity =
    albumDetail?.popularity ?? scored.candidate.popularity ?? null;

  const trackList =
    tracks?.items.map((t) => ({ id: t.id, name: t.name })) ?? [];

  return {
    artistId: scored.candidate.artists[0]?.id ?? null,
    albumId,
    name: scored.candidate.name,
    artists: scored.candidate.artists,
    images: scored.candidate.images.map((i) => ({ url: i.url })),
    externalUrl: scored.candidate.externalUrl,
    popularity,
    tracks: trackList,
  };
}

function hydrateFromCache(
  mapping: ReconciliationMapping,
  release: NormalizedRelease,
): EnrichedRelease {
  if (mapping.status === "no-match") {
    return {
      discogs: release,
      spotify: null,
      confidence: 0,
      status: "no-match",
      cached: true,
    };
  }

  const payload =
    mapping.rawSpotifyPayload &&
    typeof mapping.rawSpotifyPayload === "object"
      ? (mapping.rawSpotifyPayload as EnrichedSpotify)
      : null;

  return {
    discogs: release,
    spotify: payload,
    confidence: mapping.confidenceScore,
    status: mapping.status,
    cached: true,
  };
}
