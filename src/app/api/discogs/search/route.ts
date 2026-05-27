import type { NextRequest } from "next/server";

import {
  DiscogsApiError,
  parseFiltersFromSearchParams,
  searchDiscogs,
} from "@/lib/services/discogs";

export async function GET(request: NextRequest) {
  const filters = parseFiltersFromSearchParams(request.nextUrl.searchParams);

  try {
    const data = await searchDiscogs(filters, { signal: request.signal });
    return Response.json(data);
  } catch (error) {
    if (error instanceof DiscogsApiError) {
      return Response.json(
        { error: error.message, status: error.status },
        { status: error.status === 401 ? 500 : error.status },
      );
    }
    if (error instanceof Error && error.message.includes("DISCOGS_TOKEN")) {
      return Response.json(
        { error: "Discogs credentials are not configured on the server.", status: 500 },
        { status: 500 },
      );
    }
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json({ error: message, status: 500 }, { status: 500 });
  }
}
