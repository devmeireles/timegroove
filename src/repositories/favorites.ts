import "server-only";

import { and, desc, eq } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { appUserFavorites } from "@/db/schema";
import type { NormalizedRelease } from "@/types/discogs";

export interface FavoriteRecord {
  id: number;
  userId: number;
  discogsId: number;
  discogsType: "release" | "master";
  releaseTitle: string | null;
  releaseYear: number | null;
  releaseCountry: string | null;
  coverUrl: string | null;
  createdAt: string;
}

export async function listFavoritesForUser(
  userId: number,
): Promise<FavoriteRecord[]> {
  const db = await getOrm();
  return db
    .select({
      id: appUserFavorites.id,
      userId: appUserFavorites.userId,
      discogsId: appUserFavorites.discogsId,
      discogsType: appUserFavorites.discogsType,
      releaseTitle: appUserFavorites.releaseTitle,
      releaseYear: appUserFavorites.releaseYear,
      releaseCountry: appUserFavorites.releaseCountry,
      coverUrl: appUserFavorites.coverUrl,
      createdAt: appUserFavorites.createdAt,
    })
    .from(appUserFavorites)
    .where(eq(appUserFavorites.userId, userId))
    .orderBy(desc(appUserFavorites.createdAt));
}

export async function addFavorite(
  userId: number,
  release: NormalizedRelease,
): Promise<void> {
  const db = await getOrm();
  const now = new Date().toISOString();
  const discogsType: "release" | "master" =
    release.type === "master" ? "master" : "release";

  const coverUrl = release.coverImage ?? release.thumb ?? null;

  await db
    .insert(appUserFavorites)
    .values({
      userId,
      discogsId: release.id,
      discogsType,
      releaseTitle: release.title,
      releaseYear: release.year,
      releaseCountry: release.country,
      coverUrl,
      createdAt: now,
    })
    .onConflictDoNothing({
      target: [
        appUserFavorites.userId,
        appUserFavorites.discogsId,
        appUserFavorites.discogsType,
      ],
    });
}

export async function removeFavorite(
  userId: number,
  discogsId: number,
  discogsType: "release" | "master",
): Promise<void> {
  const db = await getOrm();
  await db
    .delete(appUserFavorites)
    .where(
      and(
        eq(appUserFavorites.userId, userId),
        eq(appUserFavorites.discogsId, discogsId),
        eq(appUserFavorites.discogsType, discogsType),
      ),
    );
}
