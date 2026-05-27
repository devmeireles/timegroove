import "server-only";

import type { Row } from "@libsql/client";

import { getDatabase } from "@/db/sqlite";

export interface AppUser {
  id: number;
  auth0Sub: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
  lastSeenAt: string;
}

function rowToUser(row: Row): AppUser {
  return {
    id: Number(row.id),
    auth0Sub: String(row.auth0_sub),
    email: (row.email as string | null) ?? null,
    displayName: (row.display_name as string | null) ?? null,
    avatarUrl: (row.avatar_url as string | null) ?? null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    lastSeenAt: String(row.last_seen_at),
  };
}

export async function findUserByAuth0Sub(sub: string): Promise<AppUser | null> {
  const db = await getDatabase();
  const result = await db.execute({
    sql: `SELECT * FROM app_users WHERE auth0_sub = ?`,
    args: [sub],
  });
  const row = result.rows[0];
  return row ? rowToUser(row) : null;
}

export interface UpsertUserInput {
  auth0Sub: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function upsertUser(input: UpsertUserInput): Promise<AppUser> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.execute({
    sql: `
      INSERT INTO app_users (
        auth0_sub, email, display_name, avatar_url, created_at, updated_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(auth0_sub) DO UPDATE SET
        email        = excluded.email,
        display_name = excluded.display_name,
        avatar_url   = excluded.avatar_url,
        updated_at   = excluded.updated_at,
        last_seen_at = excluded.last_seen_at
    `,
    args: [
      input.auth0Sub,
      input.email,
      input.displayName,
      input.avatarUrl,
      now,
      now,
      now,
    ],
  });

  const stored = await findUserByAuth0Sub(input.auth0Sub);
  if (!stored) {
    throw new Error("Failed to read back upserted user");
  }
  return stored;
}
