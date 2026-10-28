import { pool, withTransaction } from "../config/dbConfig.js";
import { env } from "../config/env.js";
import { generateOpaqueToken, hashToken } from "./token.service.js";

const DAY_MS = 24 * 60 * 60 * 1000;

export const REFRESH_MAX_AGE_MS = env.REFRESH_TOKEN_TTL_DAYS * DAY_MS;

/**
 * Creates a session and its first refresh token. Pass a transaction `client` to
 * make session creation part of a larger unit of work (registration).
 * The plain refresh token is returned once and never stored.
 */
export async function createSession({ userId, ip, userAgent }, db = pool) {
    const refreshToken = generateOpaqueToken();

    const { rows } = await db.query(
        `INSERT INTO sessions (user_id, refresh_token_hash, user_agent, ip, expires_at, absolute_expires_at)
         VALUES ($1, $2, $3, $4,
                 LEAST(now() + make_interval(days => $5::int), now() + make_interval(days => $6::int)),
                 now() + make_interval(days => $6::int))
         RETURNING id`,
        [userId, hashToken(refreshToken), userAgent, ip, env.REFRESH_TOKEN_TTL_DAYS, env.SESSION_MAX_AGE_DAYS],
    );

    return { sessionId: rows[0].id, refreshToken };
}

/**
 * Exchanges a refresh token for a new one (rotation). Each token works exactly
 * once. Returns an outcome object rather than throwing so that a revocation
 * triggered by detected theft is committed, not rolled back with the error:
 *
 *   ok       -> { status, userId, sessionId, refreshToken }
 *   invalid  -> unknown or revoked token
 *   expired  -> idle or absolute lifetime elapsed
 *   inactive -> the user was disabled; the session is revoked
 *   race     -> an already-rotated token seen within the grace window (two tabs
 *               refreshing at once); rejected but the session survives
 *   reuse    -> an already-rotated token seen after the grace window: treated as
 *               theft, the whole session is revoked
 */
export async function rotateSession(presentedToken, { ip, userAgent }) {
    const presentedHash = hashToken(presentedToken);

    return withTransaction(async (client) => {
        const { rows } = await client.query(
            `SELECT s.id, s.user_id, s.refresh_token_hash, s.revoked_at,
                    (s.expires_at <= now() OR s.absolute_expires_at <= now()) AS expired,
                    EXTRACT(EPOCH FROM (now() - s.rotated_at)) AS seconds_since_rotation,
                    u.status AS user_status
             FROM sessions s
             JOIN users u ON u.id = s.user_id
             WHERE s.refresh_token_hash = $1 OR s.prev_refresh_token_hash = $1
             FOR UPDATE OF s`,
            [presentedHash],
        );

        const session = rows[0];
        if (!session || session.revoked_at) return { status: "invalid" };

        const base = { userId: session.user_id, sessionId: session.id };
        if (session.expired) return { status: "expired", ...base };

        if (session.refresh_token_hash !== presentedHash) {
            if (Number(session.seconds_since_rotation) <= env.REFRESH_REUSE_GRACE_SECONDS) {
                return { status: "race", ...base };
            }
            await revokeSession(session.id, "refresh_token_reuse", {}, client);
            return { status: "reuse", ...base };
        }

        if (session.user_status !== "active") {
            await revokeSession(session.id, "user_inactive", {}, client);
            return { status: "inactive", ...base };
        }

        const refreshToken = generateOpaqueToken();
        await client.query(
            `UPDATE sessions
             SET prev_refresh_token_hash = refresh_token_hash,
                 refresh_token_hash      = $2,
                 rotated_at              = now(),
                 last_used_at            = now(),
                 expires_at              = LEAST(now() + make_interval(days => $3::int), absolute_expires_at),
                 ip                      = $4,
                 user_agent              = $5
             WHERE id = $1`,
            [session.id, hashToken(refreshToken), env.REFRESH_TOKEN_TTL_DAYS, ip, userAgent],
        );

        return { status: "ok", ...base, refreshToken };
    });
}

/**
 * Loads what `authenticate` needs: the session must be live and its user active.
 * One query per request keeps logout, "log out everywhere" and account disabling
 * effective immediately instead of after the access token expires.
 */
export async function getAuthContext(sessionId, userId) {
    const { rows } = await pool.query(
        `SELECT u.id, u.email, u.name, u.role
         FROM sessions s
         JOIN users u ON u.id = s.user_id
         WHERE s.id = $1
           AND s.user_id = $2
           AND s.revoked_at IS NULL
           AND s.expires_at > now()
           AND s.absolute_expires_at > now()
           AND u.status = 'active'`,
        [sessionId, userId],
    );
    return rows[0] ?? null;
}

/** Finds the session a refresh token belongs to (current or just-rotated), if still live. */
export async function findSessionIdByRefreshToken(refreshToken) {
    const hash = hashToken(refreshToken);
    const { rows } = await pool.query(
        `SELECT id FROM sessions
         WHERE (refresh_token_hash = $1 OR prev_refresh_token_hash = $1) AND revoked_at IS NULL`,
        [hash],
    );
    return rows[0]?.id ?? null;
}

/** Revokes one session. With `userId`, only if it belongs to that user. Returns whether anything changed. */
export async function revokeSession(sessionId, reason, { userId = null } = {}, db = pool) {
    const { rowCount } = await db.query(
        `UPDATE sessions
         SET revoked_at = now(), revoked_reason = $2
         WHERE id = $1 AND revoked_at IS NULL AND ($3::uuid IS NULL OR user_id = $3)`,
        [sessionId, reason, userId],
    );
    return rowCount > 0;
}

/** Revokes every live session for a user, optionally keeping one (the caller's own). */
export async function revokeUserSessions(userId, reason, { exceptSessionId = null } = {}, db = pool) {
    const { rowCount } = await db.query(
        `UPDATE sessions
         SET revoked_at = now(), revoked_reason = $2
         WHERE user_id = $1 AND revoked_at IS NULL AND ($3::uuid IS NULL OR id <> $3)`,
        [userId, reason, exceptSessionId],
    );
    return rowCount;
}

export async function listUserSessions(userId) {
    const { rows } = await pool.query(
        `SELECT id, user_agent AS "userAgent", ip, created_at AS "createdAt",
                last_used_at AS "lastUsedAt", expires_at AS "expiresAt"
         FROM sessions
         WHERE user_id = $1 AND revoked_at IS NULL
           AND expires_at > now() AND absolute_expires_at > now()
         ORDER BY last_used_at DESC`,
        [userId],
    );
    return rows;
}

/** Housekeeping: removes long-dead sessions and used/expired reset tokens. Returns counts. */
export async function purgeExpired() {
    const sessions = await pool.query(
        `DELETE FROM sessions
         WHERE expires_at < now() - interval '7 days'
            OR absolute_expires_at < now() - interval '7 days'
            OR revoked_at < now() - interval '30 days'`,
    );
    const resetTokens = await pool.query(
        `DELETE FROM password_reset_tokens
         WHERE expires_at < now() - interval '1 day' OR used_at < now() - interval '1 day'`,
    );
    return { sessions: sessions.rowCount, resetTokens: resetTokens.rowCount };
}
