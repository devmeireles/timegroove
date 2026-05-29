import "server-only";

import { eq } from "drizzle-orm";
import { serverEnv } from "@/lib/env";
import { decryptToken, encryptToken } from "@/lib/crypto";
import { getOrm } from "@/db/orm";
import { appUsers } from "@/db/schema";
import type { SpotifyTokenResponse } from "@/types/spotify";

export class SpotifyAuthError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "SpotifyAuthError";
  }
}

/**
 * Exchange Spotify authorization code for access and refresh tokens.
 * Returns tokens and user profile info.
 */
export async function exchangeCodeForTokens(
  code: string,
): Promise<{
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}> {
  const response = await fetch(serverEnv.spotify.authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${serverEnv.spotify.clientId}:${serverEnv.spotify.clientSecret}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: serverEnv.spotify.redirectUri,
    }).toString(),
  });

  if (!response.ok) {
    throw new SpotifyAuthError(
      `Failed to exchange code for tokens: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const tokenData = (await response.json()) as SpotifyTokenResponse;

  // Get current user info
  const userResponse = await fetch(`${serverEnv.spotify.baseUrl}/v1/me`, {
    headers: {
      Authorization: `Bearer ${tokenData.access_token}`,
    },
  });

  if (!userResponse.ok) {
    throw new SpotifyAuthError(
      "Failed to fetch Spotify user profile",
      userResponse.status,
    );
  }

  const userData = (await userResponse.json()) as { id: string };

  if (!tokenData.refresh_token) {
    throw new SpotifyAuthError(
      "Failed to get refresh token from Spotify",
    );
  }

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresIn: tokenData.expires_in,
    userId: userData.id,
  };
}

/**
 * Get full Spotify user profile (name, image, email)
 */
export async function getSpotifyUserProfile(accessToken: string): Promise<{
  id: string;
  display_name: string | null;
  images?: Array<{ url: string }>;
  email?: string;
}> {
  const response = await fetch(`${serverEnv.spotify.baseUrl}/v1/me`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new SpotifyAuthError(
      "Failed to fetch Spotify user profile",
      response.status,
    );
  }

  return response.json() as Promise<{
    id: string;
    display_name: string | null;
    images?: Array<{ url: string }>;
    email?: string;
  }>;
}

/**
 * Refresh a Spotify access token using the refresh token.
 */
export async function refreshAccessToken(
  refreshToken: string,
): Promise<{ accessToken: string; expiresIn: number; refreshToken?: string }> {
  const response = await fetch(serverEnv.spotify.authUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(
        `${serverEnv.spotify.clientId}:${serverEnv.spotify.clientSecret}`,
      ).toString("base64")}`,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }).toString(),
  });

  if (!response.ok) {
    throw new SpotifyAuthError(
      `Failed to refresh token: ${response.status} ${response.statusText}`,
      response.status,
    );
  }

  const tokenData = (await response.json()) as SpotifyTokenResponse;
  return {
    accessToken: tokenData.access_token,
    expiresIn: tokenData.expires_in,
    refreshToken: tokenData.refresh_token,
  };
}

export interface StoredSpotifyAuth {
  userId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}

/**
 * Get valid Spotify access token for a user, refreshing if necessary.
 */
export async function getValidSpotifyToken(
  userId: number,
): Promise<{ token: string; expiresAt: number }> {
  const db = await getOrm();
  const user = await db.query.appUsers.findFirst({
    where: eq(appUsers.id, userId),
  });

  if (!user || !user.spotifyAccessToken || !user.spotifyRefreshToken) {
    throw new SpotifyAuthError("User not connected to Spotify");
  }

  const expiresAt = user.spotifyTokenExpiresAt
    ? parseInt(user.spotifyTokenExpiresAt, 10)
    : 0;
  const now = Date.now();
  const buffer = 5 * 60 * 1000; // 5 minute buffer

  // Token is still valid
  if (expiresAt - buffer > now) {
    const decrypted = decryptToken(user.spotifyAccessToken);
    return { token: decrypted, expiresAt };
  }

  // Token expired, refresh it
  const decryptedRefresh = decryptToken(user.spotifyRefreshToken);
  try {
    const { accessToken, expiresIn, refreshToken } =
      await refreshAccessToken(decryptedRefresh);
    const newExpiresAt = Date.now() + expiresIn * 1000;

    const encrypted = encryptToken(accessToken);
    const updates: {
      spotifyAccessToken: string;
      spotifyTokenExpiresAt: string;
      spotifyRefreshToken?: string;
      updatedAt: string;
    } = {
      spotifyAccessToken: encrypted,
      spotifyTokenExpiresAt: newExpiresAt.toString(),
      updatedAt: new Date().toISOString(),
    };

    if (refreshToken) {
      updates.spotifyRefreshToken = encryptToken(refreshToken);
    }

    await db.update(appUsers).set(updates).where(eq(appUsers.id, userId));

    return { token: accessToken, expiresAt: newExpiresAt };
  } catch {
    // If refresh fails, clear the tokens
    await db
      .update(appUsers)
      .set({
        spotifyUserId: null,
        spotifyAccessToken: null,
        spotifyRefreshToken: null,
        spotifyTokenExpiresAt: null,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(appUsers.id, userId));

    throw new SpotifyAuthError("Failed to refresh Spotify token");
  }
}

/**
 * Store Spotify credentials for a user.
 */
export async function storeSpotifyCredentials(
  userId: number,
  spotifyUserId: string,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): Promise<void> {
  const db = await getOrm();
  const expiresAt = Date.now() + expiresIn * 1000;

  const encryptedAccess = encryptToken(accessToken);
  const encryptedRefresh = encryptToken(refreshToken);

  await db
    .update(appUsers)
    .set({
      spotifyUserId,
      spotifyAccessToken: encryptedAccess,
      spotifyRefreshToken: encryptedRefresh,
      spotifyTokenExpiresAt: expiresAt.toString(),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appUsers.id, userId));
}

/**
 * Disconnect Spotify from user account.
 */
export async function disconnectSpotify(userId: number): Promise<void> {
  const db = await getOrm();
  await db
    .update(appUsers)
    .set({
      spotifyUserId: null,
      spotifyAccessToken: null,
      spotifyRefreshToken: null,
      spotifyTokenExpiresAt: null,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(appUsers.id, userId));
}
