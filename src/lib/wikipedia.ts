"use client";

/**
 * Lightweight client-side Wikipedia summary fetcher.
 *
 * Uses two public REST endpoints, both CORS-enabled and unauthenticated:
 *   1. /w/rest.php/v1/search/page    → find the most relevant page title
 *   2. /api/rest_v1/page/summary/X   → fetch the page's extract + thumbnail
 *
 * We try the query as given first, then a "{query} album" fallback if the
 * first try produces a no-album disambiguation. Returns null when nothing
 * reasonable is found — the dialog renders an honest "no context yet" rather
 * than a misleading match.
 */

export interface WikipediaSummary {
  title: string;
  description: string | null;
  extract: string;
  url: string;
  thumbnail: { url: string; width: number; height: number } | null;
}

interface RawSearchPage {
  id: number;
  key: string;
  title: string;
  description: string | null;
}

interface RawSummary {
  title: string;
  description?: string;
  extract: string;
  type?: string;
  content_urls?: { desktop?: { page?: string } };
  thumbnail?: { source: string; width: number; height: number };
}

async function searchTopTitle(
  query: string,
  signal?: AbortSignal,
): Promise<string | null> {
  const url = `https://en.wikipedia.org/w/rest.php/v1/search/page?q=${encodeURIComponent(query)}&limit=3`;
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal,
  });
  if (!response.ok) return null;
  const data = (await response.json()) as { pages?: RawSearchPage[] };
  return data.pages?.[0]?.key ?? data.pages?.[0]?.title ?? null;
}

async function fetchSummary(
  title: string,
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  const response = await fetch(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`,
    { signal },
  );
  if (!response.ok) return null;
  const data = (await response.json()) as RawSummary;
  // Disambiguation pages have type "disambiguation" — skip them; the caller
  // can fall back to a more specific query.
  if (data.type === "disambiguation") return null;
  if (!data.extract) return null;
  return {
    title: data.title,
    description: data.description ?? null,
    extract: data.extract,
    url: data.content_urls?.desktop?.page ?? `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
    thumbnail: data.thumbnail
      ? {
          url: data.thumbnail.source,
          width: data.thumbnail.width,
          height: data.thumbnail.height,
        }
      : null,
  };
}

export async function fetchWikipediaSummary(
  query: string,
  signal?: AbortSignal,
): Promise<WikipediaSummary | null> {
  const trimmed = query.trim();
  if (trimmed === "") return null;

  for (const candidate of [trimmed, `${trimmed} album`]) {
    const title = await searchTopTitle(candidate, signal);
    if (!title) continue;
    const summary = await fetchSummary(title, signal);
    if (summary) return summary;
  }
  return null;
}
