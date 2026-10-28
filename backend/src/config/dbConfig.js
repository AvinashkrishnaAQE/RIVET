import pg from "pg";
import { env } from "./env.js";
import { logger } from "../utils/logger.js";

// TIMESTAMP WITHOUT TIME ZONE (OID 1114) is parsed by node-postgres in the *local*
// timezone, silently shifting values on any server not running in UTC. Treat them
// as UTC. (The auth schema uses timestamptz, which is unaffected; this protects
// any timestamp column added later.)
pg.types.setTypeParser(1114, (value) => new Date(`${value.replace(" ", "T")}Z`));

// The application uses the pooled (PgBouncer) endpoint when one is configured;
// migrations use DATABASE_URL directly. Both are safe here because every query is
// parameterised and no session state is relied upon outside a transaction.
export const pool = new pg.Pool({
    connectionString: env.DATABASE_URL_POOLED ?? env.DATABASE_URL,
    max: env.DB_POOL_MAX,
    idleTimeoutMillis: env.DB_IDLE_TIMEOUT_MS,
    connectionTimeoutMillis: env.DB_CONNECTION_TIMEOUT_MS,
    statement_timeout: env.DB_STATEMENT_TIMEOUT_MS,
    keepAlive: true,
    application_name: "aviyash-backend",
});

// Without a listener, an error on an idle client (e.g. the server restarted) is an
// unhandled 'error' event and kills the process. The pool evicts the client itself.
pool.on("error", (error) => {
    logger.error({ err: error }, "Idle database client error");
});

/** Runs a single parameterised query on the pool. */
export async function executeQuery(query, params = []) {
    if (typeof query !== "string" || query.trim() === "") {
        throw new TypeError("Database query must be a non-empty string.");
    }
    if (!Array.isArray(params)) {
        throw new TypeError("Database query parameters must be provided as an array.");
    }

    return pool.query(query, params);
}

/**
 * Runs `work(client)` inside a transaction: commits when it resolves, rolls back
 * (and rethrows) when it rejects. Use `client.query` for every statement inside.
 */
export async function withTransaction(work) {
    const client = await pool.connect();
    try {
        await client.query("BEGIN");
        const result = await work(client);
        await client.query("COMMIT");
        return result;
    } catch (error) {
        await client.query("ROLLBACK").catch((rollbackError) => {
            logger.error({ err: rollbackError }, "Transaction rollback failed");
        });
        throw error;
    } finally {
        client.release();
    }
}

/** Resolves when the database answers a trivial query; used at startup and by /ready. */
export async function checkDatabase() {
    await pool.query("SELECT 1");
}

export async function closePool() {
    await pool.end();
}
