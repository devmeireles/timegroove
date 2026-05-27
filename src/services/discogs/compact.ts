import "server-only";

type RecordLike = Record<string, unknown>;

function asRecord(value: unknown): RecordLike {
  return value && typeof value === "object" ? (value as RecordLike) : {};
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}

function pickSingleImage(imagesRaw: unknown): Array<{ uri: string; type: string | null }> {
  if (!Array.isArray(imagesRaw)) return [];
  const images = imagesRaw
    .map((entry) => asRecord(entry))
    .map((img) => ({
      uri: asString(img.uri),
      type: asString(img.type),
    }))
    .filter((img): img is { uri: string; type: string | null } => img.uri != null);

  if (images.length === 0) return [];
  const primary = images.find((img) => img.type === "primary");
  return [primary ?? images[0]];
}

export function compactDiscogsDetailPayload(raw: unknown): RecordLike {
  const r = asRecord(raw);

  const artists = Array.isArray(r.artists)
    ? r.artists
        .map((entry) => asRecord(entry))
        .map((entry) => ({
          id: typeof entry.id === "number" ? entry.id : null,
          name: asString(entry.name),
        }))
        .filter((entry): entry is { id: number; name: string } => entry.id != null && entry.name != null)
    : [];

  const labels = Array.isArray(r.labels)
    ? r.labels
        .map((entry) => asRecord(entry))
        .map((entry) => ({
          name: asString(entry.name),
          catno: asString(entry.catno),
        }))
        .filter((entry): entry is { name: string; catno: string | null } => entry.name != null)
    : [];

  const formats = Array.isArray(r.formats)
    ? r.formats
        .map((entry) => asRecord(entry))
        .map((entry) => ({
          name: asString(entry.name),
          descriptions: asStringArray(entry.descriptions),
        }))
        .filter((entry): entry is { name: string; descriptions: string[] } => entry.name != null)
    : [];

  const tracklist = Array.isArray(r.tracklist)
    ? r.tracklist
        .map((entry) => asRecord(entry))
        .map((entry) => ({
          position: asString(entry.position) ?? "",
          title: asString(entry.title),
          duration: asString(entry.duration) ?? "",
          type_: asString(entry.type_) ?? asString(entry.type) ?? "track",
        }))
        .filter((entry): entry is { position: string; title: string; duration: string; type_: string } => entry.title != null)
    : [];

  const communityRaw = asRecord(r.community);
  const ratingRaw = asRecord(communityRaw.rating);
  const community = {
    have: typeof communityRaw.have === "number" ? communityRaw.have : 0,
    want: typeof communityRaw.want === "number" ? communityRaw.want : 0,
    rating: {
      average:
        typeof ratingRaw.average === "number"
          ? ratingRaw.average
          : typeof ratingRaw.average === "string"
            ? Number(ratingRaw.average)
            : null,
    },
  };

  return {
    id: typeof r.id === "number" ? r.id : null,
    title: asString(r.title) ?? "",
    year: typeof r.year === "number" ? r.year : null,
    released_formatted: asString(r.released_formatted),
    released: asString(r.released),
    country: asString(r.country),
    notes: asString(r.notes),
    uri: asString(r.uri),
    artists,
    labels,
    formats,
    genres: asStringArray(r.genres),
    styles: asStringArray(r.styles),
    tracklist,
    community,
    images: pickSingleImage(r.images),
  };
}

export function compactDiscogsArtistPayload(raw: unknown): RecordLike {
  const r = asRecord(raw);
  return {
    id: typeof r.id === "number" ? r.id : null,
    name: asString(r.name) ?? "",
    realname: asString(r.realname),
    profile: asString(r.profile),
    urls: asStringArray(r.urls),
    namevariations: asStringArray(r.namevariations),
    uri: asString(r.uri),
    images: pickSingleImage(r.images),
  };
}