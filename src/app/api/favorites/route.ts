import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  addFavorite,
  listFavoritesForUser,
  removeFavorite,
} from "@/repositories/favorites";
import { findUserBySpotifyId } from "@/repositories/users";
import type { NormalizedRelease } from "@/types/discogs";

interface FavoriteBody {
  release?: unknown;
}

function isNormalizedRelease(value: unknown): value is NormalizedRelease {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<NormalizedRelease>;
  return typeof v.id === "number" && typeof v.type === "string";
}

async function resolveCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const spotifyUserId = cookieStore.get("spotify_user_id")?.value;
  if (!spotifyUserId) return null;

  const user = await findUserBySpotifyId(spotifyUserId);
  return user?.id ?? null;
}

export async function GET() {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const favorites = await listFavoritesForUser(userId);
  return Response.json({ favorites });
}

export async function POST(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: FavoriteBody;
  try {
    body = (await request.json()) as FavoriteBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNormalizedRelease(body.release)) {
    return Response.json(
      { error: "Body must include a `release` matching NormalizedRelease" },
      { status: 400 },
    );
  }

  await addFavorite(userId, body.release);
  return Response.json({ ok: true });
}

export async function DELETE(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const discogsIdRaw = request.nextUrl.searchParams.get("discogsId");
  const discogsTypeRaw = request.nextUrl.searchParams.get("discogsType");
  const discogsId = Number(discogsIdRaw);
  const discogsType: "release" | "master" =
    discogsTypeRaw === "master" ? "master" : "release";

  if (!Number.isFinite(discogsId) || discogsId <= 0) {
    return Response.json(
      { error: "discogsId query param must be a positive number" },
      { status: 400 },
    );
  }

  await removeFavorite(userId, Math.floor(discogsId), discogsType);
  return Response.json({ ok: true });
}
