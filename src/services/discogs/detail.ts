import "server-only";

import {
  findEntityRawPayload,
  saveVideoResolution,
} from "@/repositories/discogsVideoResolutions";
import { extractYoutubeVideoId } from "@/services/youtube/resolveFromDiscogs";
import type {
  NormalizedDiscogsDetail,
  NormalizedTrack,
} from "@/types/discogs";
import { getMasterDetail, getReleaseDetail } from "./client";

/**
 * Cache-first fetcher for the full Discogs entity detail.
 *
 * Reuses the `discogs_video_resolutions` row keyed by (discogs_id,
 * discogs_type) so a release that's already had its YouTube video looked
 * up doesn't need a second Discogs API call. The shared row stores the
 * full payload — see `resolveFromDiscogs.ts` for the writer side.
 *
 * Backward-compat: rows written before the migration only stored
 * `{ videos: [...] }`. We detect that via the `tracklist` field; if it's
 * missing, we treat the cache as stale, refetch, and upgrade the row.
 */
export async function getDiscogsDetail(
  discogsId: number,
  discogsType: "release" | "master",
  signal?: AbortSignal,
): Promise<NormalizedDiscogsDetail> {
  const cached = await findEntityRawPayload(discogsId, discogsType);
  if (isFullDetailPayload(cached)) {
    return normalizeDetail(cached, discogsType);
  }

  const fresh =
    discogsType === "master"
      ? await getMasterDetail(discogsId, { signal })
      : await getReleaseDetail(discogsId, { signal });

  // Re-resolve the YouTube id from the fresh payload so we don't drop the
  // existing video resolution when upgrading a partial-cache row.
  const videoId = pickFirstYoutubeId(fresh);

  await saveVideoResolution({
    discogsId,
    discogsType,
    youtubeVideoId: videoId,
    rawPayload: fresh,
  });

  return normalizeDetail(fresh, discogsType);
}

function isFullDetailPayload(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    "tracklist" in (value as Record<string, unknown>)
  );
}

function pickFirstYoutubeId(payload: { videos?: unknown }): string | null {
  if (!Array.isArray(payload.videos)) return null;
  for (const video of payload.videos) {
    const uri = (video as { uri?: unknown }).uri;
    if (typeof uri !== "string") continue;
    const id = extractYoutubeVideoId(uri);
    if (id) return id;
  }
  return null;
}

// --- Normalization ---------------------------------------------------------

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
}

function normalizeArtists(value: unknown): Array<{ name: string }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const name = asString((entry as { name?: unknown })?.name);
      return name ? { name } : null;
    })
    .filter((v): v is { name: string } => v !== null);
}

function normalizeLabels(
  value: unknown,
): Array<{ name: string; catno: string | null }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const e = entry as { name?: unknown; catno?: unknown };
      const name = asString(e.name);
      if (!name) return null;
      return { name, catno: asString(e.catno) };
    })
    .filter(
      (v): v is { name: string; catno: string | null } => v !== null,
    );
}

function normalizeFormats(
  value: unknown,
): Array<{ name: string; descriptions: string[] }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const e = entry as { name?: unknown; descriptions?: unknown };
      const name = asString(e.name);
      if (!name) return null;
      return { name, descriptions: asStringArray(e.descriptions) };
    })
    .filter(
      (v): v is { name: string; descriptions: string[] } => v !== null,
    );
}

function normalizeTracklist(value: unknown): NormalizedTrack[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const e = entry as {
        position?: unknown;
        title?: unknown;
        duration?: unknown;
        type_?: unknown;
        type?: unknown;
      };
      const title = asString(e.title);
      if (!title) return null;
      return {
        position: asString(e.position) ?? "",
        title,
        duration: asString(e.duration) ?? "",
        type: asString(e.type_) ?? asString(e.type) ?? "track",
      };
    })
    .filter((v): v is NormalizedTrack => v !== null);
}

function normalizeCommunity(
  value: unknown,
): NormalizedDiscogsDetail["community"] {
  if (!value || typeof value !== "object") return null;
  const c = value as {
    have?: unknown;
    want?: unknown;
    rating?: { average?: unknown };
  };
  const have = typeof c.have === "number" ? c.have : 0;
  const want = typeof c.want === "number" ? c.want : 0;
  const rating =
    c.rating && typeof c.rating === "object" ? asNumber(c.rating.average) : null;
  if (have === 0 && want === 0 && rating == null) return null;
  return { have, want, rating };
}

function normalizeImages(
  value: unknown,
): Array<{ uri: string; type: string | null }> {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      const e = entry as { uri?: unknown; type?: unknown };
      const uri = asString(e.uri);
      if (!uri) return null;
      return { uri, type: asString(e.type) };
    })
    .filter((v): v is { uri: string; type: string | null } => v !== null);
}

function normalizeDetail(
  raw: Record<string, unknown> | { tracklist?: unknown } | object,
  discogsType: "release" | "master",
): NormalizedDiscogsDetail {
  const r = raw as Record<string, unknown>;
  const uri = asString(r.uri);
  return {
    id: typeof r.id === "number" ? r.id : 0,
    discogsType,
    title: asString(r.title) ?? "",
    artists: normalizeArtists(r.artists),
    year: asNumber(r.year),
    released: asString(r.released_formatted) ?? asString(r.released),
    country: asString(r.country),
    notes: asString(r.notes),
    labels: normalizeLabels(r.labels),
    formats: normalizeFormats(r.formats),
    genres: asStringArray(r.genres),
    styles: asStringArray(r.styles),
    tracklist: normalizeTracklist(r.tracklist),
    community: normalizeCommunity(r.community),
    images: normalizeImages(r.images),
    discogsUrl: uri ? `https://www.discogs.com${uri}` : null,
  };
}
