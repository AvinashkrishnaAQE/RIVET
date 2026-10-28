import * as authService from "../services/auth.service.js";
import { listUserSessions, revokeSession } from "../services/session.service.js";
import { ApiError } from "../utils/api-error.js";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookies, setAuthCookies } from "../utils/cookies.js";
import { getRequestMeta } from "../utils/request-meta.js";

/**
 * Controllers translate HTTP <-> services and nothing more: parse what the
 * validators already cleaned, call a service, set cookies, shape the response.
 * Business rules live in services/. Express 5 forwards a rejected promise to the
 * error handler, so there is no try/catch here.
 */

/** Browsers get the refresh token as an httpOnly cookie only; it never appears in a response body. */
function respondWithSession(res, status, { user, accessToken, expiresIn, refreshToken, refreshMaxAgeMs }) {
    setAuthCookies(res, { accessToken, refreshToken, refreshMaxAgeMs });
    res.status(status).json({ data: { user, accessToken, expiresIn } });
}

export async function register(req, res) {
    respondWithSession(res, 201, await authService.register(req.body, getRequestMeta(req)));
}

export async function login(req, res) {
    respondWithSession(res, 200, await authService.login(req.body, getRequestMeta(req)));
}

export async function refresh(req, res) {
    const refreshToken = req.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) throw ApiError.unauthorized("Refresh token missing", "INVALID_REFRESH_TOKEN");

    respondWithSession(res, 200, await authService.refresh(refreshToken, getRequestMeta(req)));
}

export async function logout(req, res) {
    const bearer = req.get("authorization")?.split(" ")[1];
    await authService.logout(
        { refreshToken: req.cookies?.[REFRESH_COOKIE], accessToken: bearer ?? req.cookies?.[ACCESS_COOKIE] },
        getRequestMeta(req),
    );
    clearAuthCookies(res);
    res.status(204).end();
}

export async function logoutAll(req, res) {
    await authService.logoutAll(req.user.id, getRequestMeta(req));
    clearAuthCookies(res);
    res.status(204).end();
}

export function me(req, res) {
    res.json({ data: { user: req.user } });
}

export async function changePassword(req, res) {
    await authService.changePassword(
        {
            userId: req.user.id,
            sessionId: req.sessionId,
            currentPassword: req.body.currentPassword,
            newPassword: req.body.newPassword,
        },
        getRequestMeta(req),
    );
    res.status(204).end();
}

export async function forgotPassword(req, res) {
    await authService.requestPasswordReset(req.body, getRequestMeta(req));
    // Same answer whether or not the email is registered.
    res.status(202).json({ data: { message: "If an account exists for that email, a reset link has been sent." } });
}

export async function resetPassword(req, res) {
    await authService.resetPassword(req.body, getRequestMeta(req));
    res.status(204).end();
}

export async function listSessions(req, res) {
    const sessions = await listUserSessions(req.user.id);
    res.json({ data: { sessions: sessions.map((s) => ({ ...s, current: s.id === req.sessionId })) } });
}

export async function revokeUserSession(req, res) {
    const { sessionId } = req.validated.params;
    const revoked = await revokeSession(sessionId, "revoked_by_user", { userId: req.user.id });
    if (!revoked) throw ApiError.notFound("Session");

    if (sessionId === req.sessionId) clearAuthCookies(res);
    res.status(204).end();
}
