import type { NextRequest } from "next/server";

import { auth0 } from "@/lib/auth0";
import {
  createPlaylistForUser,
  ensureDefaultPlaylist,
  excludeReleaseFromPlaylist,
  includeReleaseInPlaylist,
  listPlaylistsForUser,
} from "@/repositories/playlists";
import { findUserByAuth0Sub } from "@/repositories/users";
import type { NormalizedRelease } from "@/types/discogs";

interface CreatePlaylistBody {
  name?: unknown;
}

interface UpdatePlaylistBody {
  playlistId?: unknown;
  action?: unknown;
  release?: unknown;
}

function isNormalizedRelease(value: unknown): value is NormalizedRelease {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<NormalizedRelease>;
  return typeof v.id === "number" && typeof v.type === "string";
}

function parseDiscogsType(value: string | null): "release" | "master" {
  return value === "master" ? "master" : "release";
}

async function resolveCurrentUserId(): Promise<number | null> {
  const session = await auth0.getSession();
  const sub =
    session?.user && typeof session.user.sub === "string"
      ? session.user.sub
      : null;
  if (!sub) return null;
  const user = await findUserByAuth0Sub(sub);
  return user?.id ?? null;
}

export async function GET(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  await ensureDefaultPlaylist(userId);

  const discogsIdRaw = request.nextUrl.searchParams.get("discogsId");
  const discogsTypeRaw = request.nextUrl.searchParams.get("discogsType");

  const releaseFilter =
    discogsIdRaw == null
      ? undefined
      : {
          discogsId: Number(discogsIdRaw),
          discogsType: parseDiscogsType(discogsTypeRaw),
        };

  if (
    releaseFilter &&
    (!Number.isFinite(releaseFilter.discogsId) || releaseFilter.discogsId <= 0)
  ) {
    return Response.json(
      { error: "discogsId query param must be a positive number" },
      { status: 400 },
    );
  }

  const playlists = await listPlaylistsForUser(userId, releaseFilter);
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

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return Response.json(
      { error: "Body must include a non-empty `name`" },
      { status: 400 },
    );
  }
  if (name.length > 80) {
    return Response.json(
      { error: "Playlist name must be at most 80 characters" },
      { status: 400 },
    );
  }

  try {
    const playlist = await createPlaylistForUser(userId, name);
    return Response.json({ playlist });
  } catch {
    return Response.json(
      { error: "Playlist already exists or could not be created" },
      { status: 409 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: UpdatePlaylistBody;
  try {
    body = (await request.json()) as UpdatePlaylistBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const playlistId = Number(body.playlistId);
  const action = body.action;
  if (!Number.isFinite(playlistId) || playlistId <= 0) {
    return Response.json(
      { error: "Body must include a positive numeric `playlistId`" },
      { status: 400 },
    );
  }
  if (action !== "include" && action !== "exclude") {
    return Response.json(
      { error: "Body action must be `include` or `exclude`" },
      { status: 400 },
    );
  }

  if (!isNormalizedRelease(body.release)) {
    return Response.json(
      { error: "Body must include a `release` matching NormalizedRelease" },
      { status: 400 },
    );
  }

  const discogsType: "release" | "master" =
    body.release.type === "master" ? "master" : "release";

  const ok =
    action === "include"
      ? await includeReleaseInPlaylist(userId, Math.floor(playlistId), body.release)
      : await excludeReleaseFromPlaylist(
          userId,
          Math.floor(playlistId),
          body.release.id,
          discogsType,
        );

  if (!ok) {
    return Response.json(
      { error: "Playlist not found" },
      { status: 404 },
    );
  }

  return Response.json({ ok: true });
}