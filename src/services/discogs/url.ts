/**
 * Build a full discogs.com URL from whatever the API returned in a `uri`
 * field. Discogs is inconsistent here:
 *
 *   - search rows (`/database/search`) return paths:    "/release/12345"
 *   - entity detail endpoints return absolute URLs:     "https://www.discogs.com/artist/..."
 *
 * Naively prepending the base resulted in the double-host bug:
 *   "https://www.discogs.com" + "https://www.discogs.com/artist/..."
 *
 * This helper handles both cases (plus a guard for the rare malformed
 * "https//..." with a missing colon some clients have seen).
 */

const BASE = "https://www.discogs.com";

export function buildDiscogsUrl(uri: string | null | undefined): string | null {
  if (typeof uri !== "string") return null;
  const trimmed = uri.trim();
  if (trimmed === "") return null;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  // Malformed scheme (missing colon) — repair before returning.
  if (/^https?\/\//i.test(trimmed)) {
    return trimmed.replace(/^(https?)\/\//i, "$1://");
  }

  if (trimmed.startsWith("/")) return `${BASE}${trimmed}`;
  return `${BASE}/${trimmed}`;
}
