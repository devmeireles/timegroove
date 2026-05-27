import "server-only";

import { serverEnv } from "@/lib/env";
import type {
  SpotifyAlbum,
  SpotifyAlbumTracksResponse,
  SpotifySearchResponse,
  SpotifyTokenResponse,
} from "@/types/spotify";

export class SpotifyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamBody?: string,
  ) {
    super(message);
    this.name = "SpotifyApiError";
  }
}

/**
 * In-process token cache. Refreshed when within REFRESH_LEEWAY_MS of expiry
 * so concurrent callers don't see a transient 401.
 */
let cachedToken: { value: string; expiresAt: number } | null = null;
let inflightTokenRequest: Promise<string> | null = null;
const REFRESH_LEEWAY_MS = 60_000;

async function fetchAccessToken(): Promise<string> {
  const { clientId, clientSecret, baseUrl, authUrl } = serverEnv.spotify;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64",
  );

  const response = await fetch(authUrl, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new SpotifyApiError(
      `Spotify token request failed: ${response.status} ${response.statusText}`,
      response.status,
      body,
    );
  }

  const payload = (await response.json()) as SpotifyTokenResponse;
  cachedToken = {
    value: payload.access_token,
    expiresAt: Date.now() + payload.expires_in * 1000,
  };
  // Touch baseUrl so the env binding is exercised; the URL is consumed by
  // callers, not here.
  void baseUrl;
  return payload.access_token;
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt - REFRESH_LEEWAY_MS > Date.now()) {
    return cachedToken.value;
  }
  if (inflightTokenRequest) return inflightTokenRequest;

  inflightTokenRequest = fetchAccessToken().finally(() => {
    inflightTokenRequest = null;
  });
  return inflightTokenRequest;
}

interface FetchOptions {
  signal?: AbortSignal;
  revalidate?: number;
}

const MAX_RATE_LIMIT_RETRIES = 2;
const DEFAULT_RETRY_AFTER_SECONDS = 1;

function parseRetryAfterSeconds(value: string | null): number {
  if (!value) return DEFAULT_RETRY_AFTER_SECONDS;
  const asNumber = Number(value);
  if (Number.isFinite(asNumber) && asNumber > 0) {
    return Math.max(DEFAULT_RETRY_AFTER_SECONDS, asNumber);
  }
  const retryAt = Date.parse(value);
  if (Number.isFinite(retryAt)) {
    const seconds = Math.ceil((retryAt - Date.now()) / 1000);
    return Math.max(DEFAULT_RETRY_AFTER_SECONDS, seconds);
  }
  return DEFAULT_RETRY_AFTER_SECONDS;
}

async function delayMs(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function spotifyFetch<T>(
  pathAndQuery: string,
  { signal, revalidate = 86_400 }: FetchOptions = {},
): Promise<T> {
  const url = new URL(pathAndQuery, serverEnv.spotify.baseUrl);

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const token = await getAccessToken();
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
      next: { revalidate },
      signal,
    });

    if (response.status === 429) {
      if (attempt >= MAX_RATE_LIMIT_RETRIES) {
        const body = await response.text().catch(() => "");
        throw new SpotifyApiError(
          `Spotify ${pathAndQuery} rate-limited after retries: ${response.status} ${response.statusText}`,
          response.status,
          body,
        );
      }
      const retryAfter = parseRetryAfterSeconds(
        response.headers.get("retry-after"),
      );
      await delayMs(retryAfter * 1000);
      continue;
    }

    if (response.status === 401) {
      // Token may have expired between our leeway check and the upstream's
      // clock; one-shot retry with a fresh token before bailing.
      cachedToken = null;
      const retryToken = await getAccessToken();
      const retry = await fetch(url.toString(), {
        headers: {
          Authorization: `Bearer ${retryToken}`,
          Accept: "application/json",
        },
        next: { revalidate },
        signal,
      });
      if (!retry.ok) {
        const body = await retry.text().catch(() => "");
        throw new SpotifyApiError(
          `Spotify ${pathAndQuery} failed after token refresh: ${retry.status} ${retry.statusText}`,
          retry.status,
          body,
        );
      }
      return (await retry.json()) as T;
    }

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new SpotifyApiError(
        `Spotify ${pathAndQuery} failed: ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return (await response.json()) as T;
  }

  throw new SpotifyApiError(
    `Spotify ${pathAndQuery} failed after retries`,
    429,
  );
}

export interface SearchAlbumsParams {
  query: string;
  limit?: number;
  market?: string;
  signal?: AbortSignal;
}

export async function searchAlbums({
  query,
  limit = 10,
  market,
  signal,
}: SearchAlbumsParams): Promise<SpotifyAlbum[]> {
  const params = new URLSearchParams({
    q: query,
    type: "album",
    limit: String(Math.min(50, Math.max(1, limit))),
  });
  if (market) params.set("market", market);

  const response = await spotifyFetch<SpotifySearchResponse>(
    `/v1/search?${params.toString()}`,
    { signal },
  );
  return response.albums?.items ?? [];
}

/** Full album payload, needed for `popularity` (not exposed by search). */
export async function getAlbum(
  albumId: string,
  signal?: AbortSignal,
): Promise<SpotifyAlbum> {
  return spotifyFetch<SpotifyAlbum>(`/v1/albums/${albumId}`, { signal });
}

export async function getAlbumTracks(
  albumId: string,
  signal?: AbortSignal,
): Promise<SpotifyAlbumTracksResponse> {
  return spotifyFetch<SpotifyAlbumTracksResponse>(
    `/v1/albums/${albumId}/tracks?limit=50`,
    { signal },
  );
}
