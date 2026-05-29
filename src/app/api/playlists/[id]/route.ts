import type { NextRequest } from "next/server";
import { cookies } from "next/headers";

import { findUserBySpotifyId } from "@/repositories/users";
import { getPlaylistDetailsForUser } from "@/repositories/playlists";
import {
  deletePlaylistEverywhere,
  PlaylistManagementError,
  renamePlaylistEverywhere,
} from "@/services/playlists/manage";

async function resolveCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const spotifyUserId = cookieStore.get("spotify_user_id")?.value;
  if (!spotifyUserId) return null;

  const user = await findUserBySpotifyId(spotifyUserId);
  return user?.id ?? null;
}

async function resolvePlaylistId(
  context: { params: Promise<{ id: string }> },
): Promise<number | null> {
  const { id } = await context.params;
  const playlistId = Number(id);
  return Number.isFinite(playlistId) && playlistId > 0 ? playlistId : null;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlistId = await resolvePlaylistId(context);
  if (!playlistId) {
    return Response.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  const playlist = await getPlaylistDetailsForUser(userId, playlistId);
  if (!playlist) {
    return Response.json({ error: "Playlist not found" }, { status: 404 });
  }

  return Response.json({ playlist });
}

interface RenamePlaylistBody {
  name?: unknown;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlistId = await resolvePlaylistId(context);
  if (!playlistId) {
    return Response.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  let body: RenamePlaylistBody;
  try {
    body = (await request.json()) as RenamePlaylistBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body.name !== "string" || body.name.trim().length === 0) {
    return Response.json(
      { error: "Body must include a non-empty `name` string" },
      { status: 400 },
    );
  }

  try {
    const playlist = await renamePlaylistEverywhere(
      userId,
      playlistId,
      body.name.trim(),
    );
    return Response.json({ playlist });
  } catch (error) {
    if (error instanceof PlaylistManagementError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to rename playlist:", error);
    return Response.json({ error: "Failed to rename playlist" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const playlistId = await resolvePlaylistId(context);
  if (!playlistId) {
    return Response.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  try {
    await deletePlaylistEverywhere(userId, playlistId);
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PlaylistManagementError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    console.error("Failed to delete playlist:", error);
    return Response.json({ error: "Failed to delete playlist" }, { status: 500 });
  }
}
