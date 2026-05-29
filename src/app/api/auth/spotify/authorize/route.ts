import { serverEnv } from "@/lib/env";
import crypto from "crypto";
import { cookies } from "next/headers";

/**
 * POST /api/auth/spotify/authorize
 * Initiates Spotify OAuth flow by redirecting user to Spotify consent screen.
 */
export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const proto =
      request.headers.get("x-forwarded-proto") ||
      requestUrl.protocol.replace(":", "");
    const isSecure = proto === "https";

    // Generate state for CSRF protection
    const state = crypto.randomBytes(32).toString("hex");

    // Store state in secure HTTP-only cookie (valid for 10 minutes)
    const cookieStore = await cookies();
    cookieStore.set("spotify_oauth_state", state, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 10 * 60,
      path: "/",
    });

    // Build Spotify OAuth URL
    const params = new URLSearchParams({
      client_id: serverEnv.spotify.clientId,
      response_type: "code",
      redirect_uri: serverEnv.spotify.redirectUri,
      scope: "playlist-modify-public playlist-modify-private",
      state,
    });

    const spotifyAuthUrl = `${serverEnv.spotify.oauthAuthUrl}?${params.toString()}`;

    return Response.json({ authUrl: spotifyAuthUrl });
  } catch (error) {
    console.error("Spotify authorize error:", error);
    return Response.json(
      { error: "Failed to initiate Spotify authentication" },
      { status: 500 },
    );
  }
}
