import type { NextRequest } from "next/server";

import { DiscogsApiError } from "@/services/discogs";
import { getDiscogsArtist } from "@/services/discogs/artist";

interface RequestBody {
  artistId?: unknown;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const artistId =
    typeof body.artistId === "number" && Number.isFinite(body.artistId)
      ? body.artistId
      : null;
  if (artistId == null) {
    return Response.json(
      { error: "Body must include a numeric `artistId`" },
      { status: 400 },
    );
  }

  try {
    const artist = await getDiscogsArtist(artistId, request.signal);
    return Response.json(artist);
  } catch (error) {
    if (error instanceof DiscogsApiError) {
      return Response.json(
        { error: error.message, status: error.status },
        { status: error.status },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message }, { status: 500 });
  }
}
