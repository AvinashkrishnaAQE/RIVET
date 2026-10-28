import crypto from "node:crypto";
import { env } from "../config/env.js";

export const ACCESS_COOKIE = "accessToken";
export const REFRESH_COOKIE = "refreshToken";
export const CSRF_COOKIE = "csrf_token";

// The refresh token is only ever needed by the auth endpoints, so the browser is
// told not to attach it to any other request.
const REFRESH_COOKIE_PATH = "/api/v1/auth";

function baseOptions() {
    return {
        secure: env.cookieSecure,
        sameSite: env.cookieSameSite,
        ...(env.COOKIE_DOMAIN && { domain: env.COOKIE_DOMAIN }),
    };
}

/** Sets the access token, refresh token and CSRF cookies for a freshly issued session. */
export function setAuthCookies(res, { accessToken, refreshToken, refreshMaxAgeMs }) {
    const base = baseOptions();

    res.cookie(ACCESS_COOKIE, accessToken, {
        ...base,
        httpOnly: true,
        path: "/",
        maxAge: env.ACCESS_TOKEN_TTL_SECONDS * 1000,
    });

    res.cookie(REFRESH_COOKIE, refreshToken, {
        ...base,
        httpOnly: true,
        path: REFRESH_COOKIE_PATH,
        maxAge: refreshMaxAgeMs,
    });

    // Double-submit CSRF token: deliberately readable by JavaScript so the frontend
    // can echo it back in the X-CSRF-Token header.
    res.cookie(CSRF_COOKIE, crypto.randomBytes(32).toString("hex"), {
        ...base,
        httpOnly: false,
        path: "/",
        maxAge: refreshMaxAgeMs,
    });
}

export function clearAuthCookies(res) {
    const base = baseOptions();
    res.clearCookie(ACCESS_COOKIE, { ...base, httpOnly: true, path: "/" });
    res.clearCookie(REFRESH_COOKIE, { ...base, httpOnly: true, path: REFRESH_COOKIE_PATH });
    res.clearCookie(CSRF_COOKIE, { ...base, httpOnly: false, path: "/" });
}
