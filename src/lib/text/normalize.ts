/**
 * Reusable text normalization for cross-source matching.
 *
 * "Racionais MC's", "Racionais MCs", "RACIONAIS MC'S" — all of these are the
 * same artist and must compare as equal. The pipeline is:
 *
 *   NFKD decompose  →  strip diacritics  →  lowercase  →
 *   collapse apostrophes  →  punct → space  →  squash whitespace
 *
 * Unicode-aware throughout so non-Latin scripts (Japanese, Cyrillic) survive.
 */

const COMBINING_MARKS = /[̀-ͯ]/g;
const APOSTROPHES = /['’ʼ`]/g;
const NON_ALNUM_UNICODE = /[^\p{L}\p{N}\s]+/gu;
const WHITESPACE_RUN = /\s+/g;

export function normalizeText(input: string): string {
  return input
    .normalize("NFKD")
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(APOSTROPHES, "")
    .replace(NON_ALNUM_UNICODE, " ")
    .replace(WHITESPACE_RUN, " ")
    .trim();
}

export function tokenize(input: string): string[] {
  const normalized = normalizeText(input);
  if (normalized === "") return [];
  return normalized.split(" ");
}

/**
 * Discogs search rows encode the artist + album in a single `title` string,
 * shaped as "Artist - Album Name". We split on the *first* " - " so that
 * "Artist - Album - Reissue Suffix" treats the suffix as part of the album.
 * Returns null artist when there's no separator (a label-only row, etc).
 */
export function splitDiscogsTitle(
  title: string,
): { artist: string | null; album: string } {
  const idx = title.indexOf(" - ");
  if (idx === -1) return { artist: null, album: title };
  return {
    artist: title.slice(0, idx).trim(),
    album: title.slice(idx + 3).trim(),
  };
}
