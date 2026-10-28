import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const JWT_OPTIONS = Object.freeze({
    algorithms: ["HS256"], // pinned: never trust the algorithm named in the token header
    issuer: env.JWT_ISSUER,
    audience: env.JWT_AUDIENCE,
});

/**
 * Short-lived access token. It names the user (`sub`) and the session (`sid`) it
 * belongs to; everything else (role, status) is read fresh from the database on
 * each request, so revoking a session or disabling a user takes effect at once.
 */
export function signAccessToken({ userId, sessionId }) {
    return jwt.sign({ sid: sessionId }, env.JWT_SECRET, {
        algorithm: "HS256",
        subject: userId,
        issuer: env.JWT_ISSUER,
        audience: env.JWT_AUDIENCE,
        expiresIn: env.ACCESS_TOKEN_TTL_SECONDS,
    });
}

/** Returns the verified claims, or throws a jsonwebtoken error (invalid / expired). */
export function verifyAccessToken(token, { ignoreExpiration = false } = {}) {
    const claims = jwt.verify(token, env.JWT_SECRET, { ...JWT_OPTIONS, ignoreExpiration });
    if (typeof claims !== "object" || !claims.sub || !claims.sid) {
        throw new jwt.JsonWebTokenError("Malformed token claims");
    }
    return claims;
}

/** 256 bits of randomness, URL-safe. Used for refresh and password-reset tokens. */
export function generateOpaqueToken() {
    return crypto.randomBytes(32).toString("base64url");
}

/**
 * Opaque tokens are stored as SHA-256 hashes, so a database leak does not yield
 * usable tokens. A fast hash is appropriate here (unlike passwords) because the
 * input is 256 bits of random data, not a guessable secret.
 */
export function hashToken(token) {
    return crypto.createHash("sha256").update(token).digest("hex");
}
