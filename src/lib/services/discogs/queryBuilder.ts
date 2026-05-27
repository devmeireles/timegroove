import type {
  DiscogsEntityType,
  DiscogsSearchFilters,
} from "@/types/discogs";
import { DISCOGS_ENTITY_TYPES } from "@/types/discogs";

const MAX_PER_PAGE = 100;
const DEFAULT_PER_PAGE = 50;

function isEntityType(value: unknown): value is DiscogsEntityType {
  return (
    typeof value === "string" &&
    (DISCOGS_ENTITY_TYPES as readonly string[]).includes(value)
  );
}

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
  const typeRaw = params.get("type");
  const filters: DiscogsSearchFilters = {
    q: pickString(params.get("q")),
    type: isEntityType(typeRaw) ? typeRaw : undefined,
    country: pickString(params.get("country")),
    year: pickString(params.get("year")),
    genre: pickString(params.get("genre")),
    style: pickString(params.get("style")),
    page: clampPage(params.get("page") ?? 1),
    per_page: clampPerPage(params.get("per_page") ?? DEFAULT_PER_PAGE),
  };
  return filters;
}

/**
 * Build the upstream Discogs URL. Only non-empty filters are appended; this
 * keeps generated URLs stable and cache-friendly.
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

  append("q", filters.q);
  append("type", filters.type);
  append("country", filters.country);
  append("year", filters.year);
  append("genre", filters.genre);
  append("style", filters.style);
  append("page", filters.page);
  append("per_page", filters.per_page);

  return url.toString();
}
