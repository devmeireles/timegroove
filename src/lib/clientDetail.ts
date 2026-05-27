"use client";

import type { NormalizedDiscogsDetail } from "@/types/discogs";

export class DetailRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "DetailRequestError";
  }
}

export async function fetchDiscogsDetail(
  discogsId: number,
  discogsType: "release" | "master",
  signal?: AbortSignal,
): Promise<NormalizedDiscogsDetail> {
  const response = await fetch("/api/discogs/detail", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ discogsId, discogsType }),
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
    throw new DetailRequestError(detail, response.status);
  }

  return (await response.json()) as NormalizedDiscogsDetail;
}
