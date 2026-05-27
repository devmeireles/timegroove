import "server-only";

/**
 * Construct effective Spotify search queries from a Discogs match input.
 *
 * Spotify's search syntax supports field qualifiers: `artist:"..."`,
 * `album:"..."`, `year:YYYY`. The qualifier form is *much* more reliable
 * than a bare bag-of-words query, especially for non-English titles.
 *
 * We emit a small list of progressively-relaxed queries; the orchestrator
 * stops at the first one that yields any candidates.
 */

import type { DiscogsMatchInput } from "@/types/reconciliation";

function quote(value: string): string {
  // Spotify accepts straight double quotes; escape any that appear in input.
  return `"${value.replace(/"/g, "")}"`;
}

export function buildSearchQueries(input: DiscogsMatchInput): string[] {
  const queries: string[] = [];

  if (input.artist && input.title) {
    queries.push(`artist:${quote(input.artist)} album:${quote(input.title)}`);

    if (input.year != null) {
      queries.push(
        `artist:${quote(input.artist)} album:${quote(input.title)} year:${input.year}`,
      );
    }
  }

  if (input.artist) {
    queries.push(`artist:${quote(input.artist)} ${input.title}`);
  }

  // Final fallback: bag-of-words on the full title (helps when artist parse
  // failed or the Discogs row has a label-only "title" string).
  queries.push(input.rawDiscogsTitle ?? input.title);

  return dedupePreservingOrder(queries);
}

function dedupePreservingOrder(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}
