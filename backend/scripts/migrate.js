// Applies SQL files from ../migrations in filename order, once each.
//
// Uses DATABASE_URL (the direct, non-pooled connection): the advisory lock below
// is session-scoped and does not survive a transaction-mode pooler.
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const MIGRATIONS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "migrations");
const LOCK_KEY = 7_424_001; // arbitrary constant: serialises concurrent migrators

if (!process.env.DATABASE_URL) {
    console.error("DATABASE_URL is not set.");
    process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });

try {
    await client.connect();
    await client.query("SELECT pg_advisory_lock($1)", [LOCK_KEY]);
    await client.query(`
        CREATE TABLE IF NOT EXISTS schema_migrations (
            name       text        PRIMARY KEY,
            applied_at timestamptz NOT NULL DEFAULT now()
        )
    `);

    const applied = new Set((await client.query("SELECT name FROM schema_migrations")).rows.map((r) => r.name));
    const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith(".sql")).sort();

    let count = 0;
    for (const file of files) {
        if (applied.has(file)) continue;

        const sql = await readFile(path.join(MIGRATIONS_DIR, file), "utf8");
        console.log(`Applying ${file} ...`);
        try {
            await client.query("BEGIN");
            await client.query(sql);
            await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [file]);
            await client.query("COMMIT");
            count += 1;
        } catch (error) {
            await client.query("ROLLBACK");
            throw new Error(`Migration ${file} failed: ${error.message}`, { cause: error });
        }
    }

    console.log(count === 0 ? "Database is up to date." : `Applied ${count} migration(s).`);
} catch (error) {
    console.error(error.message);
    process.exitCode = 1;
} finally {
    await client.end().catch(() => {});
}
