import "server-only";

import { drizzle, type LibSQLDatabase } from "drizzle-orm/libsql";

import { getDatabase } from "@/db/sqlite";
import { dbSchema } from "@/db/schema";

let cachedOrm: LibSQLDatabase<typeof dbSchema> | null = null;

export async function getOrm() {
  if (cachedOrm) return cachedOrm;
  const client = await getDatabase();
  cachedOrm = drizzle(client, { schema: dbSchema });
  return cachedOrm;
}
