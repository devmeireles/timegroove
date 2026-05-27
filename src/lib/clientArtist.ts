"use client";

import type { NormalizedArtistDetail } from "@/types/discogs";

export class ArtistRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "ArtistRequestError";
  }
}

export async function fetchDiscogsArtist(
  artistId: number,
  signal?: AbortSignal,
): Promise<NormalizedArtistDetail> {
  const response = await fetch("/api/discogs/artist", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ artistId }),
    signal,
  });

  if (!response.ok) {
    let detail = `${response.status} ${response.statusText}`;
    try {
      const body = (await response.json()) as { error?: string };
      if (body?.error) detail = body.error;
    } catch {
      // ignore
    }
    throw new ArtistRequestError(detail, response.status);
  }

  return (await response.json()) as NormalizedArtistDetail;
}
