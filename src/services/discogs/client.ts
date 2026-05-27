import "server-only";

import { serverEnv } from "@/lib/env";
import type {
  DiscogsRawSearchResponse,
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";
import { buildDiscogsSearchUrl } from "./queryBuilder";
import { normalizeSearchResponse } from "./normalize";

export class DiscogsApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly upstreamBody?: string,
  ) {
    super(message);
    this.name = "DiscogsApiError";
  }
}

interface FetchOptions {
  /** Cache lifetime in seconds. Defaults to 1h — search results for past
   * years are effectively immutable; recent years drift slowly. */
  revalidate?: number;
  signal?: AbortSignal;
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

async function discogsFetch<T>(
  url: string,
  { revalidate = 3600, signal }: FetchOptions = {},
): Promise<T> {
  const { token, userAgent } = serverEnv.discogs;

  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        Authorization: `Discogs token=${token}`,
        "User-Agent": userAgent,
        Accept: "application/json",
      },
      next: { revalidate },
      signal,
    });

    if (response.status === 429) {
      if (attempt >= MAX_RATE_LIMIT_RETRIES) {
        const body = await response.text().catch(() => "");
        throw new DiscogsApiError(
          `Discogs API rate-limited after retries: ${response.status} ${response.statusText}`,
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

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new DiscogsApiError(
        `Discogs API responded with ${response.status} ${response.statusText}`,
        response.status,
        body,
      );
    }

    return (await response.json()) as T;
  }

  throw new DiscogsApiError("Discogs API failed after retries", 429);
}

export async function searchDiscogs(
  filters: DiscogsSearchFilters,
  options?: FetchOptions,
): Promise<NormalizedSearchResponse> {
  const url = buildDiscogsSearchUrl(serverEnv.discogs.baseUrl, filters);
  const raw = await discogsFetch<DiscogsRawSearchResponse>(url, options);
  return normalizeSearchResponse(raw, filters);
}

/**
 * Discogs video entry on a release/master detail payload. `uri` typically
 * points at a YouTube watch URL but may also be Vimeo or other providers —
 * callers should filter to what they can play.
 */
export interface DiscogsVideoEntry {
  uri: string;
  title?: string;
  description?: string;
  duration?: number;
  embed?: boolean;
}

interface DiscogsEntityDetail {
  id: number;
  title?: string;
  year?: number;
  videos?: DiscogsVideoEntry[];
}

/** Fetch a release's full detail payload, including community-curated videos. */
export async function getReleaseDetail(
  id: number,
  options?: FetchOptions,
): Promise<DiscogsEntityDetail> {
  const url = new URL(`/releases/${id}`, serverEnv.discogs.baseUrl).toString();
  return discogsFetch<DiscogsEntityDetail>(url, options);
}

/** Fetch a master's full detail payload. */
export async function getMasterDetail(
  id: number,
  options?: FetchOptions,
): Promise<DiscogsEntityDetail> {
  const url = new URL(`/masters/${id}`, serverEnv.discogs.baseUrl).toString();
  return discogsFetch<DiscogsEntityDetail>(url, options);
}

/**
 * Fetch an artist's full detail payload (bio in `profile`, photos in
 * `images`, external links in `urls`). Loose-typed because Discogs's
 * artist response is shape-rich and we only consume a subset.
 */
export async function getArtistDetail(
  id: number,
  options?: FetchOptions,
): Promise<Record<string, unknown>> {
  const url = new URL(`/artists/${id}`, serverEnv.discogs.baseUrl).toString();
  return discogsFetch<Record<string, unknown>>(url, options);
}
