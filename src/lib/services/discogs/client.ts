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

async function discogsFetch<T>(
  url: string,
  { revalidate = 3600, signal }: FetchOptions = {},
): Promise<T> {
  const { token, userAgent } = serverEnv.discogs;

  const response = await fetch(url, {
    headers: {
      Authorization: `Discogs token=${token}`,
      "User-Agent": userAgent,
      Accept: "application/json",
    },
    next: { revalidate },
    signal,
  });

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

export async function searchDiscogs(
  filters: DiscogsSearchFilters,
  options?: FetchOptions,
): Promise<NormalizedSearchResponse> {
  const url = buildDiscogsSearchUrl(serverEnv.discogs.baseUrl, filters);
  const raw = await discogsFetch<DiscogsRawSearchResponse>(url, options);
  return normalizeSearchResponse(raw, filters);
}
