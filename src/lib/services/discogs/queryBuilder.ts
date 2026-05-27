import type { DiscogsSearchFilters } from "@/types/discogs";

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 50;

/**
 * The time-capsule app queries masters, not releases.
 *
 * `release.country` = pressing country of a physical record, which surfaces
 * imports and licensed reissues (e.g. an American funk LP pressed in Japan
 * for the local market shows up under country=Japan).
 *
 * `master.country` = country of the *first* release of the album, which is a
 * much stronger proxy for "this album originated here." Same trade for year:
 * master.year is the original release year, not the year of a specific
 * pressing. Tradeoff: many masters have null country and are excluded.
 */
export const SEARCH_TYPE = "master" as const;

function clampPerPage(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_PER_PAGE;
  return Math.min(Math.floor(n), MAX_PER_PAGE);
}

function clampPage(input: unknown): number {
  const n = Number(input);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.floor(n);
}

function pickString(input: unknown): string | undefined {
  if (typeof input !== "string") return undefined;
  const trimmed = input.trim();
  return trimmed === "" ? undefined : trimmed;
}

/**
 * Parse raw search-param input (from `request.nextUrl.searchParams`) into a
 * validated, narrow filter object. Unknown keys are dropped; bad values fall
 * back to safe defaults rather than throwing — search forms shouldn't 500
 * when someone types nonsense.
 */
export function parseFiltersFromSearchParams(
  params: URLSearchParams,
): DiscogsSearchFilters {
  return {
    country: pickString(params.get("country")),
    year: pickString(params.get("year")),
    genre: pickString(params.get("genre")),
    page: clampPage(params.get("page") ?? 1),
    per_page: clampPerPage(params.get("per_page") ?? DEFAULT_PER_PAGE),
  };
}

/**
 * Build the upstream Discogs URL. Only non-empty filters are appended; this
 * keeps generated URLs stable and cache-friendly. `type` is always `release`
 * — see SEARCH_TYPE above for the rationale.
 */
export function buildDiscogsSearchUrl(
  baseUrl: string,
  filters: DiscogsSearchFilters,
): string {
  const url = new URL("/database/search", baseUrl);
  const append = (key: string, value: string | number | undefined) => {
    if (value === undefined || value === null) return;
    const str = typeof value === "number" ? String(value) : value;
    if (str.trim() === "") return;
    url.searchParams.set(key, str);
  };

  append("type", SEARCH_TYPE);
  append("country", filters.country);
  append("year", filters.year);
  append("genre", filters.genre);
  append("page", filters.page);
  append("per_page", filters.per_page);

  return url.toString();
}
