import type {
  DiscogsRawResult,
  DiscogsRawSearchResponse,
  DiscogsSearchFilters,
  NormalizedRelease,
  NormalizedSearchResponse,
} from "@/types/discogs";
import { buildDiscogsUrl } from "./url";

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((v): v is string => typeof v === "string");
  }
  if (typeof value === "string" && value.trim() !== "") return [value];
  return [];
}

function asNumberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const n = Number.parseInt(value, 10);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function asStringOrNull(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Title comes back as `"Artist - Title"` for most rows. We keep it verbatim
 * for now; splitting can happen at the UI layer if needed later.
 */
export function normalizeResult(raw: DiscogsRawResult): NormalizedRelease {
  return {
    id: raw.id,
    type: typeof raw.type === "string" ? raw.type : "release",
    title: asStringOrNull(raw.title),
    year: asNumberOrNull(raw.year),
    country: asStringOrNull(raw.country),
    label: asStringArray(raw.label),
    genre: asStringArray(raw.genre),
    style: asStringArray(raw.style),
    format: asStringArray(raw.format),
    thumb: asStringOrNull(raw.thumb),
    coverImage: asStringOrNull(raw.cover_image),
    discogsUrl: buildDiscogsUrl(raw.uri),
    masterId: asNumberOrNull(raw.master_id),
    catno: asStringOrNull(raw.catno),
  };
}

export function normalizeSearchResponse(
  raw: DiscogsRawSearchResponse,
  query: DiscogsSearchFilters,
): NormalizedSearchResponse {
  return {
    pagination: raw.pagination,
    results: Array.isArray(raw.results) ? raw.results.map(normalizeResult) : [],
    query,
  };
}
