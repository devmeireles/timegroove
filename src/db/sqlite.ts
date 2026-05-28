import "server-only";

import { createClient, type Client } from "@libsql/client";

import { serverEnv } from "@/lib/env";

/**
 * Singleton Turso (libSQL) client. Lazy + async.
 *
 * URL formats:
 *   libsql://my-db-org.turso.io   — hosted Turso (needs TURSO_AUTH_TOKEN)
 *   file:./time-groove.db         — local embedded libSQL (no token)
 *
 * Schema lifecycle is managed through Drizzle migrations.
 */

let cached: Client | null = null;
let initPromise: Promise<Client> | null = null;

async function connect(): Promise<Client> {
  const { url, authToken } = serverEnv.turso;
  const client = createClient({
    url,
    // libSQL ignores an empty token but errors on null when the URL is
    // hosted, so only pass it when set.
    ...(authToken ? { authToken } : {}),
  });
  return client;
}

export async function getDatabase(): Promise<Client> {
  if (cached) return cached;
  if (initPromise) return initPromise;
  initPromise = connect()
    .then((c) => {
      cached = c;
      return c;
    })
    .catch((err) => {
      // Reset so the next call retries the connect rather than always
      // returning the same rejected promise.
      initPromise = null;
      throw err;
    });
  return initPromise;
}

/** Test/cleanup helper. */
export function closeDatabase(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
  initPromise = null;
}
