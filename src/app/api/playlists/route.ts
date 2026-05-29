import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import {
  listPlaylistsForUser,
  createPlaylistForUser,
  includeReleaseInPlaylist,
  excludeReleaseFromPlaylist,
} from "@/repositories/playlists";
import { findUserBySpotifyId } from "@/repositories/users";
import type { NormalizedRelease } from "@/types/discogs";

async function resolveCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const spotifyUserId = cookieStore.get("spotify_user_id")?.value;
  if (!spotifyUserId) return null;

  const user = await findUserBySpotifyId(spotifyUserId);
  return user?.id ?? null;
}

interface PlaylistsQueryParams {
  release?: {
    discogsId: number;
    discogsType: "release" | "master";
  };
}

interface CreatePlaylistBody {
  name?: unknown;
}

interface PlaylistActionBody {
  playlistId?: unknown;
  action?: unknown;
  release?: unknown;
  discogsId?: unknown;
  discogsType?: unknown;
}

function isNormalizedRelease(value: unknown): value is NormalizedRelease {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<NormalizedRelease>;
  return typeof v.id === "number" && typeof v.type === "string";
}

export async function GET(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const discogsId = searchParams.get("discogsId");
  const discogsType = searchParams.get("discogsType");

  let params: PlaylistsQueryParams | undefined;
  if (discogsId && discogsType) {
    const id = Number(discogsId);
    const type = discogsType === "master" ? "master" : "release";
    if (Number.isFinite(id) && id > 0) {
      params = { release: { discogsId: id, discogsType: type } };
    }
  }

  const playlists = await listPlaylistsForUser(userId, params?.release);
  return Response.json({ playlists });
}

export async function POST(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: CreatePlaylistBody;
  try {
    body = (await request.json()) as CreatePlaylistBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.name !== "string" || !body.name.trim()) {
    return Response.json(
      { error: "Body must include a non-empty `name` string" },
      { status: 400 },
    );
  }

  const playlist = await createPlaylistForUser(userId, body.name);
  return Response.json({ playlist });
}

export async function PATCH(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: PlaylistActionBody;
  try {
    body = (await request.json()) as PlaylistActionBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playlistId = Number(body.playlistId);
  if (!Number.isFinite(playlistId) || playlistId <= 0) {
    return Response.json(
      { error: "Body must include a valid `playlistId` number" },
      { status: 400 },
    );
  }

  const action = body.action === "exclude" ? "exclude" : "include";

  if (action === "include") {
    if (!isNormalizedRelease(body.release)) {
      return Response.json(
        { error: "Body must include a valid `release` object for include action" },
        { status: 400 },
      );
    }

    const success = await includeReleaseInPlaylist(
      userId,
      playlistId,
      body.release,
    );
    if (!success) {
      return Response.json(
        { error: "Failed to include release in playlist" },
        { status: 400 },
      );
    }
    return Response.json({ ok: true });
  }

  // Exclude release from playlist
  const fallbackDiscogsId = Number(body.discogsId);
  const discogsId = isNormalizedRelease(body.release)
    ? body.release.id
    : fallbackDiscogsId;
  const discogsType: "release" | "master" =
    isNormalizedRelease(body.release) && body.release.type === "master"
      ? "master"
      : body.discogsType === "master"
        ? "master"
        : "release";

  if (!Number.isFinite(discogsId) || discogsId <= 0) {
    return Response.json(
      { error: "Body must include a valid `discogsId` number" },
      { status: 400 },
    );
  }

  const success = await excludeReleaseFromPlaylist(
    userId,
    playlistId,
    discogsId,
    discogsType,
  );
  if (!success) {
    return Response.json(
      { error: "Failed to exclude release from playlist" },
      { status: 400 },
    );
  }
  return Response.json({ ok: true });
}
