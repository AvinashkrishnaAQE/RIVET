import { executeQuery, withTransaction } from "../config/dbConfig.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { recordAuthEvent } from "./audit.service.js";
import { sendPasswordResetEmail } from "./mailer.service.js";
import { hashPassword, needsRehash, verifyAgainstDummy, verifyPassword } from "./password.service.js";
import {
    REFRESH_MAX_AGE_MS,
    createSession,
    findSessionIdByRefreshToken,
    revokeSession,
    revokeUserSessions,
    rotateSession,
} from "./session.service.js";
import { generateOpaqueToken, hashToken, signAccessToken, verifyAccessToken } from "./token.service.js";

const PG_UNIQUE_VIOLATION = "23505";

const publicUser = (row) => ({ id: row.id, email: row.email, name: row.name, role: row.role });

function issueTokens({ user, sessionId, refreshToken }) {
    return {
        user: publicUser(user),
        accessToken: signAccessToken({ userId: user.id, sessionId }),
        expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
        refreshToken,
        refreshMaxAgeMs: REFRESH_MAX_AGE_MS,
    };
}

export async function register({ email, password, name }, meta) {
    // Hash before opening the transaction: it is deliberately slow and must not hold a connection.
    const passwordHash = await hashPassword(password);

    let result;
    try {
        result = await withTransaction(async (client) => {
            const { rows } = await client.query(
                `INSERT INTO users (email, password_hash, name)
                 VALUES ($1, $2, $3)
                 RETURNING id, email, name, role`,
                [email, passwordHash, name],
            );
            const user = rows[0];
            const session = await createSession({ userId: user.id, ...meta }, client);
            return { user, ...session };
        });
    } catch (error) {
        if (error.code === PG_UNIQUE_VIOLATION) {
            throw ApiError.conflict("An account with this email already exists", "EMAIL_TAKEN");
        }
        throw error;
    }

    await recordAuthEvent("register", { userId: result.user.id, email, ...meta });
    return issueTokens(result);
}

export async function login({ email, password }, meta) {
    const { rows } = await executeQuery(
        `SELECT id, email, name, role, status, password_hash, failed_login_attempts,
                (locked_until IS NOT NULL AND locked_until > now()) AS is_locked
         FROM users WHERE email = $1`,
        [email],
    );
    const user = rows[0];

    if (!user) {
        await verifyAgainstDummy(password);
        await recordAuthEvent("login_failed", { email, ...meta, metadata: { reason: "unknown_email" } });
        throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    if (user.is_locked) {
        await recordAuthEvent("login_blocked", { userId: user.id, email, ...meta, metadata: { reason: "locked" } });
        throw ApiError.tooManyRequests(
            "Too many failed attempts. Try again later or reset your password.",
            "ACCOUNT_LOCKED",
        );
    }

    if (!(await verifyPassword(user.password_hash, password))) {
        await registerFailedLogin(user.id);
        await recordAuthEvent("login_failed", { userId: user.id, email, ...meta, metadata: { reason: "bad_password" } });
        throw ApiError.unauthorized("Invalid email or password", "INVALID_CREDENTIALS");
    }

    // Only after the password is proven correct: telling an attacker an account is
    // disabled would confirm the email exists without them knowing the password.
    if (user.status !== "active") {
        await recordAuthEvent("login_blocked", { userId: user.id, email, ...meta, metadata: { reason: "disabled" } });
        throw ApiError.forbidden("This account has been disabled", "ACCOUNT_DISABLED");
    }

    // Transparently upgrade hashes made with weaker parameters.
    const upgradedHash = needsRehash(user.password_hash) ? await hashPassword(password) : null;

    const session = await createSession({ userId: user.id, ...meta });
    await executeQuery(
        `UPDATE users
         SET failed_login_attempts = 0, locked_until = NULL, last_login_at = now(),
             password_hash = COALESCE($2, password_hash)
         WHERE id = $1`,
        [user.id, upgradedHash],
    );

    await recordAuthEvent("login", { userId: user.id, email, ...meta, metadata: { sessionId: session.sessionId } });
    return issueTokens({ user, ...session });
}

/**
 * Counts a failed attempt in a single atomic statement (no read-modify-write race
 * between concurrent guesses) and locks the account at the threshold. Once a lock
 * has expired the next failure starts a fresh count of 1.
 */
async function registerFailedLogin(userId) {
    await executeQuery(
        `UPDATE users SET
             failed_login_attempts = CASE WHEN failed_login_attempts >= $2 THEN 1 ELSE failed_login_attempts + 1 END,
             locked_until = CASE
                 WHEN (CASE WHEN failed_login_attempts >= $2 THEN 1 ELSE failed_login_attempts + 1 END) >= $2
                 THEN now() + make_interval(mins => $3::int)
                 ELSE NULL
             END
         WHERE id = $1`,
        [userId, env.MAX_FAILED_LOGINS, env.LOCKOUT_MINUTES],
    );
}

export async function refresh(refreshToken, meta) {
    const outcome = await rotateSession(refreshToken, meta);

    if (outcome.status === "ok") {
        const { rows } = await executeQuery(`SELECT id, email, name, role FROM users WHERE id = $1`, [outcome.userId]);
        return issueTokens({ user: rows[0], sessionId: outcome.sessionId, refreshToken: outcome.refreshToken });
    }

    if (outcome.status === "reuse") {
        await recordAuthEvent("refresh_token_reuse", { userId: outcome.userId, ...meta, metadata: { sessionId: outcome.sessionId } });
    }

    throw ApiError.unauthorized(
        outcome.status === "expired" ? "Session expired, please sign in again" : "Invalid or expired session",
        "INVALID_REFRESH_TOKEN",
    );
}

/**
 * Ends the caller's session. Identified by the refresh token when there is one
 * (it outlives the 15-minute access token), otherwise by the access token's
 * signed session id. Idempotent: logging out twice is not an error.
 */
export async function logout({ refreshToken, accessToken }, meta) {
    let sessionId = null;
    let userId = null;

    if (refreshToken) sessionId = await findSessionIdByRefreshToken(refreshToken);

    if (!sessionId && accessToken) {
        try {
            const claims = verifyAccessToken(accessToken, { ignoreExpiration: true });
            sessionId = claims.sid;
            userId = claims.sub;
        } catch {
            // Unverifiable token: nothing to revoke.
        }
    }

    if (sessionId && (await revokeSession(sessionId, "logout", { userId }))) {
        await recordAuthEvent("logout", { ...meta, metadata: { sessionId } });
    }
}

export async function logoutAll(userId, meta) {
    const revoked = await revokeUserSessions(userId, "logout_all");
    await recordAuthEvent("logout_all", { userId, ...meta, metadata: { revoked } });
}

export async function changePassword({ userId, sessionId, currentPassword, newPassword }, meta) {
    const { rows } = await executeQuery(`SELECT email, password_hash FROM users WHERE id = $1`, [userId]);
    const user = rows[0];
    if (!user) throw ApiError.unauthorized();

    if (!(await verifyPassword(user.password_hash, currentPassword))) {
        await recordAuthEvent("password_change_failed", { userId, email: user.email, ...meta });
        throw ApiError.badRequest("Current password is incorrect", { code: "INVALID_CURRENT_PASSWORD" });
    }

    const passwordHash = await hashPassword(newPassword);

    await withTransaction(async (client) => {
        await client.query(
            `UPDATE users SET password_hash = $2, password_changed_at = now() WHERE id = $1`,
            [userId, passwordHash],
        );
        // Anyone holding an old session (a stolen laptop, say) is signed out; this one stays.
        await revokeUserSessions(userId, "password_changed", { exceptSessionId: sessionId }, client);
    });

    await recordAuthEvent("password_changed", { userId, email: user.email, ...meta });
}

/**
 * Always resolves the same way whether or not the email is registered, so the
 * endpoint cannot be used to enumerate accounts.
 */
export async function requestPasswordReset({ email }, meta) {
    const { rows } = await executeQuery(`SELECT id FROM users WHERE email = $1 AND status = 'active'`, [email]);
    const user = rows[0];

    if (!user) {
        await recordAuthEvent("password_reset_requested", { email, ...meta, metadata: { known: false } });
        return;
    }

    const token = generateOpaqueToken();

    await withTransaction(async (client) => {
        // Only the newest link works.
        await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`, [user.id]);
        await client.query(
            `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at, requested_ip)
             VALUES ($1, $2, now() + make_interval(mins => $3::int), $4)`,
            [user.id, hashToken(token), env.PASSWORD_RESET_TTL_MINUTES, meta.ip],
        );
    });

    await recordAuthEvent("password_reset_requested", { userId: user.id, email, ...meta, metadata: { known: true } });
    await sendPasswordResetEmail({ to: email, token });
}

export async function resetPassword({ token, newPassword }, meta) {
    const passwordHash = await hashPassword(newPassword);

    const userId = await withTransaction(async (client) => {
        // Single atomic claim: of two concurrent requests with the same token, one wins.
        const claimed = await client.query(
            `UPDATE password_reset_tokens SET used_at = now()
             WHERE token_hash = $1 AND used_at IS NULL AND expires_at > now()
             RETURNING user_id`,
            [hashToken(token)],
        );
        const id = claimed.rows[0]?.user_id;
        if (!id) return null;

        await client.query(
            `UPDATE users
             SET password_hash = $2, password_changed_at = now(),
                 failed_login_attempts = 0, locked_until = NULL
             WHERE id = $1`,
            [id, passwordHash],
        );
        await client.query(`DELETE FROM password_reset_tokens WHERE user_id = $1 AND used_at IS NULL`, [id]);
        await revokeUserSessions(id, "password_reset", {}, client);
        return id;
    });

    if (!userId) {
        await recordAuthEvent("password_reset_failed", { ...meta });
        throw ApiError.badRequest("This reset link is invalid or has expired", { code: "INVALID_RESET_TOKEN" });
    }

    await recordAuthEvent("password_reset", { userId, ...meta });
}
