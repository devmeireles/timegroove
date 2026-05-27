import "server-only";

import { createClient, type Client } from "@libsql/client";

import { serverEnv } from "@/lib/env";

/**
 * Singleton Turso (libSQL) client. Lazy + async — the first `getDatabase()`
 * call opens the connection and runs the idempotent schema; subsequent
 * calls reuse the cached client. Concurrent first-callers share a single
 * init promise so we never run the schema twice.
 *
 * URL formats:
 *   libsql://my-db-org.turso.io   — hosted Turso (needs TURSO_AUTH_TOKEN)
 *   file:./time-groove.db         — local embedded libSQL (no token)
 *
 * Note: same module path as the previous better-sqlite3 setup so existing
 * imports keep working; the API just turned async.
 */

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS reconciliation_mappings (
  id                   INTEGER PRIMARY KEY AUTOINCREMENT,
  discogs_id           INTEGER NOT NULL,
  discogs_type         TEXT    NOT NULL CHECK(discogs_type IN ('release','master')),
  spotify_artist_id    TEXT,
  spotify_album_id     TEXT,
  spotify_track_ids    TEXT,
  confidence_score     REAL    NOT NULL DEFAULT 0,
  status               TEXT    NOT NULL CHECK(status IN ('matched','no-match','manual-override')),
  matched_at           TEXT    NOT NULL,
  raw_spotify_payload  TEXT,
  UNIQUE(discogs_id, discogs_type)
);

CREATE INDEX IF NOT EXISTS idx_mapping_status ON reconciliation_mappings(status);
CREATE INDEX IF NOT EXISTS idx_mapping_matched_at ON reconciliation_mappings(matched_at);

CREATE TABLE IF NOT EXISTS discogs_video_resolutions (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  discogs_id        INTEGER NOT NULL,
  discogs_type      TEXT    NOT NULL CHECK(discogs_type IN ('release','master')),
  youtube_video_id  TEXT,
  resolved_at       TEXT    NOT NULL,
  raw_payload       TEXT,
  UNIQUE(discogs_id, discogs_type)
);

CREATE INDEX IF NOT EXISTS idx_video_resolved_at ON discogs_video_resolutions(resolved_at);

CREATE TABLE IF NOT EXISTS discogs_artist_details (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  artist_id    INTEGER NOT NULL UNIQUE,
  raw_payload  TEXT    NOT NULL,
  fetched_at   TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_artist_fetched_at ON discogs_artist_details(fetched_at);
`;

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
  await client.executeMultiple(SCHEMA_SQL);
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
