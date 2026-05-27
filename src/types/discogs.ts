/**
 * Types modeling the Discogs `/database/search` payload, plus a normalized
 * shape we surface to the UI. Discogs returns a loose, weakly-typed JSON
 * object; everything here is narrowed/cleaned at the service boundary so the
 * frontend never has to think about Discogs's inconsistencies.
 */

/**
 * Discogs supports release/master/artist/label, but the time-capsule premise
 * (records pressed in country X during year Y) only makes sense for physical
 * releases — masters are country-agnostic, artists/labels aren't listenable.
 * The server locks the search to `release`; the type is kept here for
 * downstream normalization and future entity-detail endpoints.
 */
export type DiscogsEntityType = "release" | "master" | "artist" | "label";

export interface DiscogsSearchFilters {
  country?: string;
  year?: string;
  genre?: string;
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

/**
 * One row in a release's tracklist. `type` is usually "track" but can be
 * "heading" (a side label like "Side A") or "index" (a sub-listing). We
 * keep heading rows in the array so the UI can render section breaks.
 */
export interface NormalizedTrack {
  position: string;
  title: string;
  duration: string;
  type: string;
}

/**
 * Full release/master detail used by the album detail dialog. Built from
 * Discogs's `/releases/:id` and `/masters/:id` endpoints, then cached in
 * SQLite alongside the YouTube video id.
 */
export interface NormalizedDiscogsDetail {
  id: number;
  discogsType: "release" | "master";
  title: string;
  artists: Array<{ name: string }>;
  year: number | null;
  released: string | null;
  country: string | null;
  notes: string | null;
  labels: Array<{ name: string; catno: string | null }>;
  formats: Array<{ name: string; descriptions: string[] }>;
  genres: string[];
  styles: string[];
  tracklist: NormalizedTrack[];
  community: {
    have: number;
    want: number;
    rating: number | null;
  } | null;
  images: Array<{ uri: string; type: string | null }>;
  discogsUrl: string | null;
}
