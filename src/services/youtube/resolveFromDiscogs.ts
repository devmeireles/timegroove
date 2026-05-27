import "server-only";

import { getMasterDetail, getReleaseDetail } from "@/services/discogs";
import type { DiscogsVideoEntry } from "@/services/discogs";
import {
  findVideoResolution,
  saveVideoResolution,
} from "@/repositories/discogsVideoResolutions";

/**
 * Discogs releases & masters carry a community-curated `videos[]` field with
 * URLs to YouTube (most common), Vimeo, or other providers. We surface the
 * first YouTube video for playback.
 *
 * Resolution flow:
 *   cache hit  → return cached videoId (may be null = known dead end)
 *   cache miss → fetch detail → extract first YouTube id → cache + return
 *
 * Null results are cached too so we don't repeatedly hammer Discogs for
 * releases that genuinely have no playable video.
 */

const YOUTUBE_URL_PATTERN =
  /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;

export function extractYoutubeVideoId(url: string): string | null {
  const match = url.match(YOUTUBE_URL_PATTERN);
  return match ? match[1] : null;
}

function firstYoutubeVideoId(videos: DiscogsVideoEntry[] | undefined): string | null {
  if (!videos) return null;
  for (const video of videos) {
    if (typeof video.uri !== "string") continue;
    const id = extractYoutubeVideoId(video.uri);
    if (id) return id;
  }
  return null;
}

export interface ResolveResult {
  videoId: string | null;
  cached: boolean;
}

export async function resolveYoutubeFromDiscogs(
  discogsId: number,
  discogsType: "release" | "master",
  signal?: AbortSignal,
): Promise<ResolveResult> {
  const cached = findVideoResolution(discogsId, discogsType);
  if (cached) {
    return { videoId: cached.youtubeVideoId, cached: true };
  }

  let detail: Awaited<ReturnType<typeof getReleaseDetail>> | null = null;
  try {
    detail =
      discogsType === "master"
        ? await getMasterDetail(discogsId, { signal })
        : await getReleaseDetail(discogsId, { signal });
  } catch (err) {
    // Don't poison the cache on transient Discogs failures; return null
    // without persisting so the next click retries.
    if (err instanceof Error && err.name === "AbortError") {
      return { videoId: null, cached: false };
    }
    throw err;
  }

  const videoId = firstYoutubeVideoId(detail.videos);

  // Cache the entire detail payload (not just `videos`) so the album-detail
  // dialog can reuse this row without an extra Discogs API call.
  saveVideoResolution({
    discogsId,
    discogsType,
    youtubeVideoId: videoId,
    rawPayload: detail,
  });

  return { videoId, cached: false };
}
