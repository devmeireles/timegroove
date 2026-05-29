import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

const url = process.env.TURSO_DATABASE_URL ?? "file:./time-groove.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({
  url,
  ...(authToken ? { authToken } : {}),
});

// Read migration files
const migrationsDir = "./drizzle";
const migrations = [
  { file: "0000_init_schema.sql", applied: true }, // Already applied
  { file: "0001_spotify_integration.sql", applied: false },
];

async function runMigration() {
  for (const migration of migrations) {
    if (migration.applied) {
      console.log(`⏭️  Skipping ${migration.file} (already applied)`);
      continue;
    }

    const sqlPath = path.join(migrationsDir, migration.file);
    if (!fs.existsSync(sqlPath)) {
      console.log(`⚠️  Migration file not found: ${sqlPath}`);
      continue;
    }

    const sql = fs.readFileSync(sqlPath, "utf-8");
    // Split by semicolon, filter empty statements
    const statements = sql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    console.log(`\n📝 Running ${migration.file} (${statements.length} statements)...`);

    for (let i = 0; i < statements.length; i++) {
      try {
        const stmt = statements[i];
        console.log(`  [${i + 1}/${statements.length}] ${stmt.substring(0, 50)}...`);
        await client.execute(stmt);
      } catch (err) {
        console.error(`❌ Statement ${i + 1} failed:`, err.message);
        throw err;
      }
    }

    console.log(`✅ ${migration.file} completed`);
  }

  console.log("\n✅ All migrations applied successfully!");
}

await runMigration();
client.close();
