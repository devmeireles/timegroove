import "server-only";

import { eq } from "drizzle-orm";

import { getOrm } from "@/db/orm";
import { appUsers } from "@/db/schema";

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

export async function findUserByAuth0Sub(sub: string): Promise<AppUser | null> {
  const db = await getOrm();
  const [row] = await db
    .select({
      id: appUsers.id,
      auth0Sub: appUsers.auth0Sub,
      email: appUsers.email,
      displayName: appUsers.displayName,
      avatarUrl: appUsers.avatarUrl,
      createdAt: appUsers.createdAt,
      updatedAt: appUsers.updatedAt,
      lastSeenAt: appUsers.lastSeenAt,
    })
    .from(appUsers)
    .where(eq(appUsers.auth0Sub, sub))
    .limit(1);

  return row ?? null;
}

export interface UpsertUserInput {
  auth0Sub: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export async function upsertUser(input: UpsertUserInput): Promise<AppUser> {
  const db = await getOrm();
  const now = new Date().toISOString();

  await db
    .insert(appUsers)
    .values({
      auth0Sub: input.auth0Sub,
      email: input.email,
      displayName: input.displayName,
      avatarUrl: input.avatarUrl,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    })
    .onConflictDoUpdate({
      target: appUsers.auth0Sub,
      set: {
        email: input.email,
        displayName: input.displayName,
        avatarUrl: input.avatarUrl,
        updatedAt: now,
        lastSeenAt: now,
      },
    });

  const stored = await findUserByAuth0Sub(input.auth0Sub);
  if (!stored) {
    throw new Error("Failed to read back upserted user");
  }
  return stored;
}
