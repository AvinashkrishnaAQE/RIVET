// Entry point. Importing config/env.js first validates the environment, so a
// misconfigured deployment stops here with a clear message before anything else loads.
import http from "node:http";

import app from "./app.js";
import { checkDatabase, closePool, executeQuery } from "./config/dbConfig.js";
import { env } from "./config/env.js";
import { startCleanupJob, stopCleanupJob } from "./jobs/cleanup.js";
import { logger } from "./utils/logger.js";

const DB_CONNECT_ATTEMPTS = 3;

let server;
let shuttingDown = false;

/** Neon computes can be suspended; the first connection may need a moment to wake one. */
async function connectDatabase() {
    for (let attempt = 1; ; attempt += 1) {
        try {
            await checkDatabase();
            return;
        } catch (error) {
            if (attempt >= DB_CONNECT_ATTEMPTS) throw error;
            logger.warn({ err: error, attempt }, "Database not reachable yet, retrying");
            await new Promise((resolve) => setTimeout(resolve, attempt * 1000));
        }
    }
}

/** Fails fast, with the fix in the message, if migrations have not been applied. */
async function assertSchemaReady() {
    const { rows } = await executeQuery(
        "SELECT to_regclass('public.users') AS users, to_regclass('public.sessions') AS sessions",
    );
    if (!rows[0].users || !rows[0].sessions) {
        throw new Error("Database schema is missing. Run `npm run migrate` first.");
    }
}

async function shutdown(reason, exitCode = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ reason }, "Shutting down");

    // Last resort: if connections refuse to drain, exit anyway rather than hang a deploy.
    const forceExit = setTimeout(() => {
        logger.error("Graceful shutdown timed out, forcing exit");
        process.exit(1);
    }, env.SHUTDOWN_TIMEOUT_MS);
    forceExit.unref();

    try {
        stopCleanupJob();
        if (server?.listening) {
            await new Promise((resolve) => {
                server.close(resolve); // stop accepting; wait for in-flight requests
                server.closeIdleConnections(); // keep-alive sockets would otherwise stall close()
            });
            logger.info("HTTP server closed");
        }
        await closePool();
        logger.info("Database pool closed");
    } catch (error) {
        logger.error({ err: error }, "Error during shutdown");
        exitCode = 1;
    }

    process.exit(exitCode);
}

// A bug that escapes every handler leaves the process in an unknown state: log it,
// drain what we can, and exit non-zero so the supervisor restarts a clean instance.
process.on("uncaughtException", (error) => {
    logger.fatal({ err: error }, "Uncaught exception");
    void shutdown("uncaughtException", 1);
});
process.on("unhandledRejection", (reason) => {
    logger.fatal({ err: reason }, "Unhandled promise rejection");
    void shutdown("unhandledRejection", 1);
});
process.on("SIGTERM", () => void shutdown("SIGTERM"));
process.on("SIGINT", () => void shutdown("SIGINT"));

async function start() {
    await connectDatabase();
    logger.info("Database connected");
    await assertSchemaReady();

    server = http.createServer(app);

    // Above typical load-balancer idle timeouts (60s), so the LB closes idle
    // connections first instead of racing us and surfacing 502s.
    server.keepAliveTimeout = 65_000;
    server.headersTimeout = 66_000;
    server.requestTimeout = 30_000;

    server.on("error", (error) => {
        if (error.code === "EADDRINUSE") {
            logger.fatal({ port: env.PORT }, `Port ${env.PORT} is already in use`);
        } else {
            logger.fatal({ err: error }, "HTTP server error");
        }
        void shutdown("serverError", 1);
    });

    await new Promise((resolve) => server.listen(env.PORT, resolve));
    logger.info(`Server listening on port ${server.address().port} (${env.NODE_ENV})`);

    startCleanupJob();
}

start().catch((error) => {
    logger.fatal({ err: error }, "Failed to start server");
    void shutdown("startupFailure", 1);
});
