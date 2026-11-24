import { env } from "../config/env.js";
import { purgeExpired } from "../services/session.service.js";
import { logger } from "../utils/logger.js";

let timer;

async function run(attempt = 1) {
    try {
        const removed = await purgeExpired();
        if (removed.sessions || removed.resetTokens) logger.info(removed, "Purged expired auth records");
    } catch (error) {
        // Neon or cold-starting DBs might take a moment to wake up on the first connection after being idle
        if (attempt < 2) {
            logger.warn({ err: error }, "Auth cleanup job failed on initial attempt; retrying in 5 seconds...");
            setTimeout(() => void run(attempt + 1), 5000);
            return;
        }
        // A failed housekeeping pass must never take the server down; try again next interval.
        logger.error({ err: error }, "Auth cleanup job failed");
    }
}

/** Periodically deletes long-dead sessions and reset tokens. Safe to run on several instances. */
export function startCleanupJob() {
    if (timer) return;
    void run();
    timer = setInterval(run, env.CLEANUP_INTERVAL_MINUTES * 60_000);
    timer.unref(); // never keeps the process alive on its own
}

export function stopCleanupJob() {
    clearInterval(timer);
    timer = undefined;
}
