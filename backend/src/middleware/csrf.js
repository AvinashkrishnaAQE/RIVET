import crypto from "node:crypto";
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from "../utils/cookies.js";
import { ApiError } from "../utils/api-error.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Double-submit-cookie CSRF protection. A browser attaches auth cookies to
 * cross-site requests automatically, so a mutating request that relies on them
 * must also echo the readable `csrf_token` cookie in the `X-CSRF-Token` header --
 * something a page on another origin can neither read nor set.
 *
 * Not applied when there is nothing to forge:
 *   - safe methods (GET/HEAD/OPTIONS) never change state;
 *   - requests with an `Authorization` header (a cross-site page cannot add one
 *     without passing a CORS preflight);
 *   - requests carrying no auth cookies;
 *   - `exemptPaths`: endpoints used before a CSRF token exists (login, register, ...).
 */
export function csrfProtection({ exemptPaths = [] } = {}) {
    const exempt = new Set(exemptPaths);

    return (req, _res, next) => {
        if (SAFE_METHODS.has(req.method)) return next();
        if (exempt.has(req.path.replace(/\/+$/, ""))) return next();
        if (req.headers.authorization) return next();
        if (!req.cookies?.[ACCESS_COOKIE] && !req.cookies?.[REFRESH_COOKIE]) return next();

        const cookieToken = req.cookies?.[CSRF_COOKIE];
        const headerToken = req.get("x-csrf-token");

        if (!cookieToken || !headerToken) return next(ApiError.forbidden("CSRF token missing", "CSRF_MISSING"));

        // Hash both sides so the comparison is constant-time regardless of length.
        const digest = (value) => crypto.createHash("sha256").update(value).digest();
        if (!crypto.timingSafeEqual(digest(cookieToken), digest(headerToken))) {
            return next(ApiError.forbidden("CSRF token invalid", "CSRF_INVALID"));
        }

        next();
    };
}
