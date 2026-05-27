import "server-only";

import {
  findArtist,
  saveArtist,
} from "@/repositories/discogsArtistDetails";
import { compactDiscogsArtistPayload } from "@/services/discogs/compact";
import type { NormalizedArtistDetail } from "@/types/discogs";
import { getArtistDetail } from "./client";
import { buildDiscogsUrl } from "./url";

/**
 * Cache-first fetcher for a Discogs artist. Backs the "About this artist"
 * section of the album detail dialog. Persisted in SQLite so we don't burn
 * Discogs's 60-req/min quota on repeat opens of the same artist.
 */
export async function getDiscogsArtist(
  artistId: number,
  signal?: AbortSignal,
): Promise<NormalizedArtistDetail> {
  const cached = await findArtist(artistId);
  if (cached) {
    return normalizeArtist(cached.rawPayload, artistId);
  }

  const fresh = await getArtistDetail(artistId, { signal });
  await saveArtist({ artistId, rawPayload: compactDiscogsArtistPayload(fresh) });
  return normalizeArtist(fresh, artistId);
}

// --- Normalization ---------------------------------------------------------

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string");
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

/**
 * Strip Discogs's BBCode-like markup from a `profile` string.
 *
 * Examples of the markup:
 *   [a=Tim Maia]            → "Tim Maia"
 *   [a123]                  → ""   (artist id refs have no inline text)
 *   [l=Polydor]             → "Polydor"
 *   [r=12345], [m=67890]    → ""   (id-only release/master refs)
 *   [b]bold[/b], [i]it[/i]  → keep content
 *   [url=http://x]text[/url]→ "text"
 *
 * We don't try to render rich links — the dialog shows a "Continue on
 * Discogs" link if the user wants the formatted version.
 */
function stripDiscogsMarkup(text: string): string {
  let out = text;
  // Named refs: [a=Name], [l=Label], [r=...], [m=...] → "Name"/"Label"
  out = out.replace(/\[[almrtg]=([^\]]+)\]/gi, "$1");
  // Id-only refs: [a123], [l456], [r789], [m12345] → drop
  out = out.replace(/\[[almrtg]\d+\]/gi, "");
  // [url=...]text[/url] → text
  out = out.replace(/\[url=[^\]]+\]([\s\S]*?)\[\/url\]/gi, "$1");
  // Formatting tags: [b], [i], [u], [s] (with closing variants)
  out = out.replace(/\[\/?(?:b|i|u|s)\]/gi, "");
  return out.trim();
}

function normalizeArtist(
  raw: unknown,
  fallbackId: number,
): NormalizedArtistDetail {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;
  const profileRaw = asString(r.profile);
  return {
    id: typeof r.id === "number" ? r.id : fallbackId,
    name: asString(r.name) ?? "",
    realName: asString(r.realname),
    profile: profileRaw ? stripDiscogsMarkup(profileRaw) : null,
    images: normalizeImages(r.images),
    urls: asStringArray(r.urls),
    nameVariations: asStringArray(r.namevariations),
    discogsUrl: buildDiscogsUrl(asString(r.uri)),
  };
}
