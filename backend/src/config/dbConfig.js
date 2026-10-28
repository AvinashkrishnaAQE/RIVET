import { Pool } from "pg";

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not set. Load it from backend/.env.local before importing dbConfig.");
}

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 10_000,
});

pool.on("error", (error) => {
    console.error("Unexpected error from an idle database client", {
        code: error.code,
        message: error.message,
    });
});

export async function executeQuery(query, params = []) {
    if (typeof query !== "string" || query.trim() === "") {
        throw new TypeError("Database query must be a non-empty string.");
    }

    if (!Array.isArray(params)) {
        throw new TypeError("Database query parameters must be provided as an array.");
    }

    try {
        const result = await pool.query(query, params);
        return result;
    } catch (error) {
        console.error("Database query failed", {
            code: error.code,
            message: error.message,
        });
        throw error;
    }
}