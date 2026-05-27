/**
 * Convert raw Spotify search hits into candidates ready for scoring, and
 * pick the best match.
 */

import { totalConfidence, scoreCandidate } from "./score";
import type { SpotifyAlbum } from "@/types/spotify";
import type {
  DiscogsMatchInput,
  ScoredCandidate,
  SpotifyCandidate,
} from "@/types/reconciliation";

/** Map a Spotify album JSON object to our candidate shape. */
export function toCandidate(album: SpotifyAlbum): SpotifyCandidate {
  return {
    id: album.id,
    artists: album.artists.map((a) => ({ id: a.id, name: a.name })),
    name: album.name,
    releaseYear: parseReleaseYear(album.release_date),
    trackCount: album.total_tracks,
    popularity: album.popularity ?? null,
    availableMarkets: album.available_markets,
    images: album.images.map((img) => ({
      url: img.url,
      width: img.width,
      height: img.height,
    })),
    externalUrl: album.external_urls.spotify,
  };
}

function parseReleaseYear(releaseDate: string): number | null {
  const year = Number.parseInt(releaseDate.slice(0, 4), 10);
  return Number.isFinite(year) ? year : null;
}

/**
 * Dedupe candidates by Spotify album id. Search occasionally returns the
 * same album twice (different market variants); we keep the first.
 */
export function dedupe(candidates: SpotifyCandidate[]): SpotifyCandidate[] {
  const seen = new Set<string>();
  const out: SpotifyCandidate[] = [];
  for (const c of candidates) {
    if (seen.has(c.id)) continue;
    seen.add(c.id);
    out.push(c);
  }
  return out;
}

/**
 * Score all candidates and return the best — but only if it passed the
 * threshold. Sorted by weighted total then popularity bonus (tiebreaker).
 */
export function pickBest(
  input: DiscogsMatchInput,
  candidates: SpotifyCandidate[],
): ScoredCandidate | null {
  if (candidates.length === 0) return null;

  const scored: ScoredCandidate[] = candidates.map((candidate) => ({
    candidate,
    score: scoreCandidate(input, candidate),
  }));

  scored.sort((a, b) => {
    const totalA = totalConfidence(a.score);
    const totalB = totalConfidence(b.score);
    if (totalB !== totalA) return totalB - totalA;
    return b.score.popularityBonus - a.score.popularityBonus;
  });

  const top = scored[0];
  return top && top.score.passed ? top : null;
}
