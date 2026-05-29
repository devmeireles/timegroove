import { cookies } from "next/headers";

import { syncPlaylistToSpotify, PlaylistSyncError } from "@/services/playlists/syncToSpotify";
import { findUserBySpotifyId } from "@/repositories/users";

async function resolveCurrentUserId(): Promise<number | null> {
  const cookieStore = await cookies();
  const spotifyUserId = cookieStore.get("spotify_user_id")?.value;
  if (!spotifyUserId) return null;

  const user = await findUserBySpotifyId(spotifyUserId);
  return user?.id ?? null;
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const userId = await resolveCurrentUserId();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const playlistId = Number(id);
  if (!Number.isFinite(playlistId) || playlistId <= 0) {
    return Response.json({ error: "Invalid playlist id" }, { status: 400 });
  }

  try {
    const summary = await syncPlaylistToSpotify(userId, playlistId);
    return Response.json({ summary });
  } catch (error) {
    if (error instanceof PlaylistSyncError) {
      return Response.json({ error: error.message }, { status: error.status });
    }

    console.error("Playlist sync to Spotify failed:", error);
    return Response.json(
      { error: "Failed to sync playlist to Spotify" },
      { status: 500 },
    );
  }
}
