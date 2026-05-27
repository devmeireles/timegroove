import "server-only";

import Database, { type Database as DatabaseType } from "better-sqlite3";
import { existsSync, mkdirSync } from "node:fs";
import path from "node:path";

/**
 * Singleton SQLite connection. Created lazily so the database file isn't
 * touched at build time — Next 16 prerendering hits routes for analysis and
 * we don't want side effects in import-only code paths.
 *
 * Path is overridable via TIME_GROOVE_DB_PATH so tests / CI can point at
 * a temp file or :memory:.
 */

let cached: DatabaseType | null = null;

function defaultDbPath(): string {
  return process.env.TIME_GROOVE_DB_PATH ?? path.join(process.cwd(), "time-groove.db");
}

function ensureParentDir(filePath: string): void {
  if (filePath === ":memory:") return;
  const dir = path.dirname(path.resolve(filePath));
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

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
`;

export function getDatabase(): DatabaseType {
  if (cached) return cached;
  const dbPath = defaultDbPath();
  ensureParentDir(dbPath);

  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(SCHEMA_SQL);

  cached = db;
  return db;
}

/** Test/cleanup helper. */
export function closeDatabase(): void {
  if (cached) {
    cached.close();
    cached = null;
  }
}
