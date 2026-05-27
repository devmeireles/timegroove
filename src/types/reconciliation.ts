/**
 * Types for the Discogs↔Spotify reconciliation layer.
 *
 * The mapping is the persistent unit (one row per Discogs id+type pair).
 * EnrichedRelease is the wire format the API returns to the frontend.
 */

import type { NormalizedRelease } from "./discogs";

export type MappingStatus = "matched" | "no-match" | "manual-override";

/** Minimal shape required to score a candidate. Built from a Discogs row. */
export interface DiscogsMatchInput {
  discogsId: number;
  discogsType: "release" | "master";
  artist: string | null;
  title: string;
  year: number | null;
  trackCount: number | null;
  /** Original Discogs combined title "Artist - Album". Kept for fallback. */
  rawDiscogsTitle: string | null;
}

export interface SpotifyCandidate {
  id: string;
  artists: Array<{ id: string; name: string }>;
  name: string;
  releaseYear: number | null;
  trackCount: number;
  popularity: number | null;
  availableMarkets: string[];
  images: Array<{ url: string; width: number | null; height: number | null }>;
  externalUrl: string;
}

export interface MatchScore {
  artist: number;
  album: number;
  year: number;
  trackCount: number;
  popularityBonus: number;
  weightedTotal: number;
  passed: boolean;
}

export interface ScoredCandidate {
  candidate: SpotifyCandidate;
  score: MatchScore;
}

export interface ReconciliationMapping {
  id: number;
  discogsId: number;
  discogsType: "release" | "master";
  spotifyArtistId: string | null;
  spotifyAlbumId: string | null;
  spotifyTrackIds: string[];
  confidenceScore: number;
  status: MappingStatus;
  matchedAt: string;
  rawSpotifyPayload: unknown | null;
}

export interface EnrichedSpotify {
  artistId: string | null;
  albumId: string | null;
  name: string | null;
  artists: Array<{ id: string; name: string }>;
  images: Array<{ url: string }>;
  externalUrl: string | null;
  popularity: number | null;
  /** Track ids + names — kept (cheap, useful for future playlist generation
   * and a track-listing UI). Playback comes from YouTube, not Spotify, so
   * preview URLs and durations are not collected. */
  tracks: Array<{ id: string; name: string }>;
}

export interface EnrichedRelease {
  discogs: NormalizedRelease;
  spotify: EnrichedSpotify | null;
  confidence: number;
  status: MappingStatus;
  /** Whether the result came from the cache (true) or a fresh Spotify call. */
  cached: boolean;
}
