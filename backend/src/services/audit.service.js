import { executeQuery } from "../config/dbConfig.js";
import { logger } from "../utils/logger.js";

/**
 * Appends a row to auth_events. Auditing must never break the request it
 * describes, so a failure is logged and swallowed.
 */
export async function recordAuthEvent(event, { userId = null, email = null, ip = null, userAgent = null, metadata = {} } = {}) {
    try {
        await executeQuery(
            `INSERT INTO auth_events (user_id, email, event, ip, user_agent, metadata)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [userId, email, event, ip, userAgent, JSON.stringify(metadata)],
        );
    } catch (error) {
        logger.error({ err: error, event }, "Failed to record auth event");
    }
}
