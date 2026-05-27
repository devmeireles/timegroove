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

CREATE TABLE IF NOT EXISTS app_users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  auth0_sub    TEXT    NOT NULL UNIQUE,
  email        TEXT,
  display_name TEXT,
  avatar_url   TEXT,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  last_seen_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_app_users_email ON app_users(email);
CREATE INDEX IF NOT EXISTS idx_app_users_last_seen ON app_users(last_seen_at);

CREATE TABLE IF NOT EXISTS app_user_favorites (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL,
  discogs_id    INTEGER NOT NULL,
  discogs_type  TEXT    NOT NULL CHECK(discogs_type IN ('release','master')),
  release_title TEXT,
  release_year  INTEGER,
  release_country TEXT,
  cover_url     TEXT,
  created_at    TEXT    NOT NULL,
  UNIQUE(user_id, discogs_id, discogs_type),
  FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON app_user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_favorites_created ON app_user_favorites(created_at);

CREATE TABLE IF NOT EXISTS app_playlists (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL,
  name         TEXT    NOT NULL,
  created_at   TEXT    NOT NULL,
  updated_at   TEXT    NOT NULL,
  UNIQUE(user_id, name),
  FOREIGN KEY(user_id) REFERENCES app_users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlists_user ON app_playlists(user_id);
CREATE INDEX IF NOT EXISTS idx_playlists_updated ON app_playlists(updated_at);

CREATE TABLE IF NOT EXISTS app_playlist_items (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  playlist_id     INTEGER NOT NULL,
  discogs_id      INTEGER NOT NULL,
  discogs_type    TEXT    NOT NULL CHECK(discogs_type IN ('release','master')),
  release_title   TEXT,
  release_year    INTEGER,
  release_country TEXT,
  cover_url       TEXT,
  created_at      TEXT    NOT NULL,
  UNIQUE(playlist_id, discogs_id, discogs_type),
  FOREIGN KEY(playlist_id) REFERENCES app_playlists(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_playlist_items_playlist ON app_playlist_items(playlist_id);
CREATE INDEX IF NOT EXISTS idx_playlist_items_discogs ON app_playlist_items(discogs_id, discogs_type);
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
