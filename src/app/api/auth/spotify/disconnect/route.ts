import { cookies } from "next/headers";
import { disconnectSpotify } from "@/services/spotify/userAuth";
import { findUserBySpotifyId } from "@/repositories/users";

/**
 * POST /api/auth/spotify/disconnect
 * Disconnects Spotify (removes session cookies).
 */
export async function POST() {
  try {
    const cookieStore = await cookies();
    const spotifyUserId = cookieStore.get("spotify_user_id")?.value;

    if (spotifyUserId) {
      const user = await findUserBySpotifyId(spotifyUserId);
      if (user) {
        await disconnectSpotify(user.id);
      }
    }

    cookieStore.delete("spotify_user_id");
    cookieStore.delete("spotify_display_name");
    cookieStore.delete("spotify_avatar_url");
    cookieStore.delete("spotify_oauth_state");

    return Response.json({ success: true });
  } catch (error) {
    console.error("Spotify disconnect error:", error);
    return Response.json(
      { error: "Failed to disconnect" },
      { status: 500 },
    );
  }
}
