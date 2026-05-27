import type { NextRequest } from "next/server";

import { reconcileRelease } from "@/services/reconciliation/reconcile";
import { SpotifyApiError } from "@/services/spotify/client";
import type { NormalizedRelease } from "@/types/discogs";

interface RequestBody {
  release?: unknown;
}

/**
 * Lightweight runtime guard — the front-end may evolve faster than the
 * type definitions, and we don't want a bad payload to crash the route.
 */
function isNormalizedRelease(value: unknown): value is NormalizedRelease {
  if (!value || typeof value !== "object") return false;
  const v = value as Partial<NormalizedRelease>;
  return (
    typeof v.id === "number" &&
    (typeof v.type === "string" || v.type === undefined)
  );
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!isNormalizedRelease(body.release)) {
    return Response.json(
      { error: "Body must include a `release` matching NormalizedRelease" },
      { status: 400 },
    );
  }

  try {
    const enriched = await reconcileRelease({
      release: body.release,
      signal: request.signal,
    });
    return Response.json(enriched);
  } catch (error) {
    if (error instanceof SpotifyApiError) {
      // Bubble up auth/rate-limit signals; the client list can back off.
      const status = error.status === 401 ? 500 : error.status;
      return Response.json(
        { error: error.message, status: error.status },
        { status },
      );
    }
    if (error instanceof Error && /SPOTIFY_CLIENT/.test(error.message)) {
      return Response.json(
        {
          error: "Spotify credentials are not configured on the server.",
          status: 500,
        },
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message, status: 500 }, { status: 500 });
  }
}
