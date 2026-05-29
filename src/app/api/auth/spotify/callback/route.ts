import { cookies } from "next/headers";
import {
  exchangeCodeForTokens,
  getSpotifyUserProfile,
  storeSpotifyCredentials,
} from "@/services/spotify/userAuth";
import { upsertSpotifyUser } from "@/repositories/users";

/**
 * GET /api/auth/spotify/callback
 * Handles OAuth callback from Spotify (no Auth0 required).
 */
export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const proto =
    request.headers.get("x-forwarded-proto") || requestUrl.protocol.replace(":", "");
  const host =
    request.headers.get("x-forwarded-host") ||
    request.headers.get("host") ||
    requestUrl.host;
  const origin = `${proto}://${host}`;
  const isSecure = proto === "https";
  const getRedirectUrl = (params: string) =>
    new URL(`/?${params}`, origin).toString();

  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.log("🔴 Spotify returned error:", error);
      return Response.redirect(
        getRedirectUrl(`spotify_error=${encodeURIComponent(error)}`),
      );
    }

    if (!code || !state) {
      console.error("Missing code or state");
      return Response.redirect(
        getRedirectUrl("spotify_error=missing_code_or_state"),
      );
    }

    // Verify state parameter
    const cookieStore = await cookies();
    const storedState = cookieStore.get("spotify_oauth_state")?.value;

    if (!storedState || storedState !== state) {
      console.error("State mismatch or missing stored state");
      return Response.redirect(
        getRedirectUrl("spotify_error=invalid_state"),
      );
    }

    // Clear the state cookie
    cookieStore.delete("spotify_oauth_state");

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code);
    const { accessToken, refreshToken, expiresIn, userId: spotifyUserId } = tokens;

    // Fetch user profile
    const profile = await getSpotifyUserProfile(accessToken);

    // Store user in database
    const user = await upsertSpotifyUser({
      spotifyUserId,
      email: profile.email,
      displayName: profile.display_name || profile.email || "Spotify User",
      avatarUrl: profile.images?.[0]?.url,
    });

    await storeSpotifyCredentials(
      user.id,
      spotifyUserId,
      accessToken,
      refreshToken,
      expiresIn,
    );

    // Store lightweight session info in cookies
    cookieStore.set("spotify_user_id", spotifyUserId, {
      httpOnly: true,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    cookieStore.set("spotify_display_name", profile.display_name || profile.email || "", {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      path: "/",
    });

    cookieStore.set("spotify_avatar_url", profile.images?.[0]?.url || "", {
      httpOnly: false,
      secure: isSecure,
      sameSite: "lax",
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
    });

    const redirectUrl = getRedirectUrl("spotify_connected=true");
    return Response.redirect(redirectUrl);
  } catch {
    return Response.redirect(
      getRedirectUrl("spotify_error=callback_error"),
    );
  }
}
