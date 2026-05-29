/**
 * Narrow TypeScript shapes for the Spotify Web API responses we consume.
 * Discogs returns weakly-typed JSON; Spotify is stricter but we still keep
 * fields optional where the API may omit them (e.g. preview_url).
 */

export interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

export interface SpotifyArtistRef {
  id: string;
  name: string;
  external_urls: { spotify: string };
  type: "artist";
  uri: string;
}

export interface SpotifyAlbum {
  id: string;
  name: string;
  album_type: "album" | "single" | "compilation";
  artists: SpotifyArtistRef[];
  release_date: string;                   // YYYY, YYYY-MM, or YYYY-MM-DD
  release_date_precision: "year" | "month" | "day";
  total_tracks: number;
  available_markets: string[];
  images: SpotifyImage[];
  external_urls: { spotify: string };
  href: string;
  uri: string;
  type: "album";
  popularity?: number;                    // present on detail fetch, not search
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artists: SpotifyArtistRef[];
  duration_ms: number;
  track_number: number;
  disc_number: number;
  preview_url: string | null;
  external_urls: { spotify: string };
  uri: string;
  type: "track";
}

export interface SpotifyAlbumTracksResponse {
  items: SpotifyTrack[];
  total: number;
  limit: number;
  offset: number;
  next: string | null;
  previous: string | null;
}

export interface SpotifySearchResponse {
  albums?: {
    items: SpotifyAlbum[];
    total: number;
    limit: number;
    offset: number;
  };
}

export interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number; // seconds
  refresh_token?: string; // Only present in Authorization Code flow
}
