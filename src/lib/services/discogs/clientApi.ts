/**
 * Browser-side wrapper around our own /api/discogs/search route. Lives apart
 * from the server client so a client component never accidentally imports
 * "server-only" code.
 */

import type {
  DiscogsSearchFilters,
  NormalizedSearchResponse,
} from "@/types/discogs";

export class SearchRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "SearchRequestError";
  }
}

function toSearchParams(filters: DiscogsSearchFilters): URLSearchParams {
  const params = new URLSearchParams();
  const entries: [string, unknown][] = [
    ["country", filters.country],
    ["year", filters.year],
    ["genre", filters.genre],
    ["page", filters.page],
    ["per_page", filters.per_page],
  ];
  for (const [key, value] of entries) {
    if (value === undefined || value === null || value === "") continue;
    params.set(key, String(value));
  }
  return params;
}

export async function searchReleases(
  filters: DiscogsSearchFilters,
  signal?: AbortSignal,
): Promise<NormalizedSearchResponse> {
  const params = toSearchParams(filters);
  const response = await fetch(`/api/discogs/search?${params.toString()}`, {
    signal,
    headers: { Accept: "application/json" },
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // body wasn't JSON; keep the status line
    }
    throw new SearchRequestError(detail, response.status);
  }

  return (await response.json()) as NormalizedSearchResponse;
}
