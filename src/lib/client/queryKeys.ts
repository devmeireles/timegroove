import type { DiscogsReleaseType } from "@/lib/discogs/releaseIdentity";

export const queryKeys = {
  favorites: {
    all: ["favorites"] as const,
  },
  playlists: {
    all: ["playlists"] as const,
    list: () => ["playlists", "all"] as const,
    forRelease: (discogsId: number, discogsType: DiscogsReleaseType) =>
      ["playlists", "release", discogsId, discogsType] as const,
  },
} as const;
