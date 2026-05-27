/**
 * Types modeling the Discogs `/database/search` payload, plus a normalized
 * shape we surface to the UI. Discogs returns a loose, weakly-typed JSON
 * object; everything here is narrowed/cleaned at the service boundary so the
 * frontend never has to think about Discogs's inconsistencies.
 */

export type DiscogsEntityType = "release" | "master" | "artist" | "label";

export const DISCOGS_ENTITY_TYPES: readonly DiscogsEntityType[] = [
  "release",
  "master",
  "artist",
  "label",
] as const;

export interface DiscogsSearchFilters {
  q?: string;
  type?: DiscogsEntityType;
  country?: string;
  year?: string;
  genre?: string;
  style?: string;
  page?: number;
  per_page?: number;
}

export interface DiscogsPagination {
  page: number;
  pages: number;
  per_page: number;
  items: number;
  urls: {
    last?: string;
    next?: string;
    prev?: string;
    first?: string;
  };
}

/** Raw Discogs result — fields are best-effort, not all present on every row. */
export interface DiscogsRawResult {
  id: number;
  type: string;
  title?: string;
  year?: string | number;
  country?: string;
  label?: string[] | string;
  genre?: string[];
  style?: string[];
  format?: string[];
  thumb?: string;
  cover_image?: string;
  resource_url?: string;
  master_id?: number;
  master_url?: string;
  uri?: string;
  catno?: string;
  barcode?: string[];
  community?: {
    want?: number;
    have?: number;
  };
  [key: string]: unknown;
}

export interface DiscogsRawSearchResponse {
  pagination: DiscogsPagination;
  results: DiscogsRawResult[];
}

/**
 * Normalized release row served to the UI. Lists are always arrays (never a
 * bare string or undefined) so render code can map without guards.
 */
export interface NormalizedRelease {
  id: number;
  type: DiscogsEntityType | string;
  title: string | null;
  year: number | null;
  country: string | null;
  label: string[];
  genre: string[];
  style: string[];
  format: string[];
  thumb: string | null;
  coverImage: string | null;
  discogsUrl: string | null;
  masterId: number | null;
  catno: string | null;
}

export interface NormalizedSearchResponse {
  pagination: DiscogsPagination;
  results: NormalizedRelease[];
  query: DiscogsSearchFilters;
}

export interface DiscogsApiError {
  error: string;
  status: number;
}
