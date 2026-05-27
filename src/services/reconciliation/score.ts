/**
 * Weighted scorer for Discogs↔Spotify candidate matching.
 *
 * Pure function — no I/O, no side effects. Easy to unit-test and tune.
 *
 * Weights (sum to 1.00):
 *   artist     0.40   most distinctive field
 *   album      0.35   second most distinctive
 *   year       0.15   tolerant: ±5y window
 *   trackCount 0.10   noisy (deluxe editions, bonus tracks) but useful
 *
 * Popularity is *not* part of the weighted sum — it's a small post-bonus
 * (max 0.05) used only as a tiebreaker between equally-scored candidates.
 * Loud but wrong is a known failure mode for popularity-weighted matchers.
 */

import { similarity } from "@/lib/text/similarity";
import type {
  DiscogsMatchInput,
  MatchScore,
  SpotifyCandidate,
} from "@/types/reconciliation";

export const SCORE_WEIGHTS = {
  artist: 0.4,
  album: 0.35,
  year: 0.15,
  trackCount: 0.1,
} as const;

/** Confidence threshold; below this we cache as `no-match`. */
export const MATCH_THRESHOLD = 0.72;

/**
 * Hard guardrails — independent of weighted total. If the artist is clearly
 * wrong (similarity < 0.7) we reject regardless of how well the title matches,
 * because "Title X by Wrong Artist" is almost always a cover or sampler.
 */
const HARD_REJECT_ARTIST_BELOW = 0.7;

const POPULARITY_BONUS_CAP = 0.05;
const YEAR_WINDOW = 5;
const NULL_FIELD_NEUTRAL = 0.5;

export function scoreCandidate(
  input: DiscogsMatchInput,
  candidate: SpotifyCandidate,
): MatchScore {
  const artistScore = computeArtistScore(input, candidate);
  const albumScore = similarity(input.title, candidate.name);
  const yearScore = computeYearScore(input.year, candidate.releaseYear);
  const trackScore = computeTrackCountScore(
    input.trackCount,
    candidate.trackCount,
  );

  const weightedTotal =
    SCORE_WEIGHTS.artist * artistScore +
    SCORE_WEIGHTS.album * albumScore +
    SCORE_WEIGHTS.year * yearScore +
    SCORE_WEIGHTS.trackCount * trackScore;

  const popularityBonus =
    candidate.popularity != null
      ? (candidate.popularity / 100) * POPULARITY_BONUS_CAP
      : 0;

  const hardReject = artistScore < HARD_REJECT_ARTIST_BELOW;

  return {
    artist: artistScore,
    album: albumScore,
    year: yearScore,
    trackCount: trackScore,
    popularityBonus,
    weightedTotal,
    passed: !hardReject && weightedTotal >= MATCH_THRESHOLD,
  };
}

/** Use the best artist match across all Spotify-listed artists on the
 * candidate — covers split releases and featured artists. */
function computeArtistScore(
  input: DiscogsMatchInput,
  candidate: SpotifyCandidate,
): number {
  if (input.artist == null) return NULL_FIELD_NEUTRAL;
  if (candidate.artists.length === 0) return 0;
  let best = 0;
  for (const artist of candidate.artists) {
    const sim = similarity(input.artist, artist.name);
    if (sim > best) best = sim;
  }
  return best;
}

function computeYearScore(
  discogsYear: number | null,
  candidateYear: number | null,
): number {
  if (discogsYear == null || candidateYear == null) return NULL_FIELD_NEUTRAL;
  const diff = Math.abs(discogsYear - candidateYear);
  if (diff > YEAR_WINDOW) return 0;
  return 1 - diff / YEAR_WINDOW;
}

function computeTrackCountScore(
  discogsTracks: number | null,
  candidateTracks: number,
): number {
  if (discogsTracks == null) return NULL_FIELD_NEUTRAL;
  if (discogsTracks <= 0 || candidateTracks <= 0) return 0;
  const diff = Math.abs(discogsTracks - candidateTracks);
  const denom = Math.max(discogsTracks, candidateTracks);
  return 1 - diff / denom;
}

/**
 * Final confidence including the popularity tiebreaker. Used for the cached
 * confidence value, not for the pass/fail decision (which lives in `passed`).
 */
export function totalConfidence(score: MatchScore): number {
  return Math.min(1, score.weightedTotal + score.popularityBonus);
}
