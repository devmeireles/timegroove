import "server-only";

import { upsertUser } from "@/repositories/users";

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

export async function syncAuth0UserToDatabase(user: unknown): Promise<void> {
  if (!user || typeof user !== "object") return;

  const raw = user as {
    sub?: unknown;
    email?: unknown;
    name?: unknown;
    picture?: unknown;
  };

  const auth0Sub = asString(raw.sub);
  if (!auth0Sub) return;

  await upsertUser({
    auth0Sub,
    email: asString(raw.email),
    displayName: asString(raw.name),
    avatarUrl: asString(raw.picture),
  });
}
