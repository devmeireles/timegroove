import type { NextRequest } from "next/server";

import { DiscogsApiError } from "@/services/discogs";
import { getDiscogsDetail } from "@/services/discogs/detail";

interface RequestBody {
  discogsId?: unknown;
  discogsType?: unknown;
}

export async function POST(request: NextRequest) {
  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const discogsId =
    typeof body.discogsId === "number" && Number.isFinite(body.discogsId)
      ? body.discogsId
      : null;
  if (discogsId == null) {
    return Response.json(
      { error: "Body must include a numeric `discogsId`" },
      { status: 400 },
    );
  }

  const discogsType: "release" | "master" =
    body.discogsType === "master" ? "master" : "release";

  try {
    const detail = await getDiscogsDetail(
      discogsId,
      discogsType,
      request.signal,
    );
    return Response.json(detail);
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
