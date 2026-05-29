import { cookies } from "next/headers";

/**
 * GET /api/auth/profile
 * Returns current Spotify connection status with user info
 */
export async function GET() {
  try {
    const cookieStore = await cookies();
    const spotifyUserId = cookieStore.get("spotify_user_id")?.value;
    const displayName = cookieStore.get("spotify_display_name")?.value;
    const avatarUrl = cookieStore.get("spotify_avatar_url")?.value;

    return Response.json({
      spotifyUserId: spotifyUserId || null,
      displayName: displayName || null,
      avatarUrl: avatarUrl || null,
    });
  } catch (error) {
    console.error("Failed to fetch profile:", error);
    return Response.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
