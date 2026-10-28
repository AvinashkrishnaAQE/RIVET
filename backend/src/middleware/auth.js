import { getAuthContext } from "../services/session.service.js";
import { verifyAccessToken } from "../services/token.service.js";
import { ApiError } from "../utils/api-error.js";
import { ACCESS_COOKIE } from "../utils/cookies.js";

/** Pulls the access token from `Authorization: Bearer ...`, else from the cookie. */
function extractToken(req) {
    const header = req.get("authorization");
    if (header) {
        const [scheme, value, ...rest] = header.split(" ");
        if (scheme.toLowerCase() !== "bearer" || !value || rest.length > 0) {
            throw ApiError.unauthorized("Malformed Authorization header", "INVALID_TOKEN");
        }
        return value;
    }
    return req.cookies?.[ACCESS_COOKIE] ?? null;
}

/**
 * Requires a valid signed access token AND a live session for an active user.
 * Sets `req.user` ({ id, email, name, role }) and `req.sessionId`.
 *
 * The role comes from the database, not the token, so demoting a user or
 * revoking their session applies immediately.
 */
export async function authenticate(req, _res, next) {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();

    let claims;
    try {
        claims = verifyAccessToken(token);
    } catch (error) {
        // The client keys off this code to know when to call /auth/refresh.
        if (error.name === "TokenExpiredError") throw ApiError.unauthorized("Access token expired", "TOKEN_EXPIRED");
        throw ApiError.unauthorized("Invalid access token", "INVALID_TOKEN");
    }

    const user = await getAuthContext(claims.sid, claims.sub);
    if (!user) throw ApiError.unauthorized("Session is no longer valid", "SESSION_INVALID");

    req.user = user;
    req.sessionId = claims.sid;
    next();
}

/** Authenticates when credentials are supplied, passes anonymous requests through. */
export async function optionalAuth(req, res, next) {
    if (!req.get("authorization") && !req.cookies?.[ACCESS_COOKIE]) return next();
    return authenticate(req, res, next);
}

/** Use after `authenticate`: allows only users whose role is one of `roles`. */
export function requireRole(...roles) {
    return (req, _res, next) => {
        if (!req.user) return next(ApiError.unauthorized());
        if (!roles.includes(req.user.role)) {
            return next(ApiError.forbidden("You do not have permission to perform this action"));
        }
        next();
    };
}
