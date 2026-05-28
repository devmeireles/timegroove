import type { NormalizedRelease } from "@/types/discogs";

export type DiscogsReleaseType = "release" | "master";

export function toDiscogsReleaseType(
  type: string | null | undefined,
): DiscogsReleaseType {
  return type === "master" ? "master" : "release";
}

export function getReleaseDiscogsType(
  release: Pick<NormalizedRelease, "type">,
): DiscogsReleaseType {
  return toDiscogsReleaseType(release.type);
}

export function buildReleaseIdentityKey(input: {
  discogsId: number;
  discogsType: DiscogsReleaseType;
}): string {
  return `${input.discogsType}-${input.discogsId}`;
}

export function buildFavoriteIdentityKey(input: {
  discogsId: number;
  discogsType: DiscogsReleaseType;
}): string {
  return `${input.discogsType}:${input.discogsId}`;
}

export function getReleaseIdentityKey(
  release: Pick<NormalizedRelease, "id" | "type">,
): string {
  return buildReleaseIdentityKey({
    discogsId: release.id,
    discogsType: getReleaseDiscogsType(release),
  });
}
