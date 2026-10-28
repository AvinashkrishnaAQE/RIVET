import { ipKeyGenerator, rateLimit } from "express-rate-limit";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/api-error.js";

// NOTE: the default store is in-process memory. That is correct for a single
// instance; with several instances behind a load balancer each keeps its own
// counters (so the effective limit is multiplied). Add a shared store (Redis via
// `rate-limit-redis`) when scaling out. The per-account lockout in the database is
// shared across instances regardless.

function limiter({ name, windowMs, limit, ...options }) {
    return rateLimit({
        windowMs,
        limit,
        standardHeaders: true,
        legacyHeaders: false,
        handler: (req, _res, next) => {
            logger.warn({ limiter: name, ip: req.ip, path: req.path, method: req.method }, "Rate limit exceeded");
            next(ApiError.tooManyRequests());
        },
        ...options,
    });
}

/** Baseline for the whole API, per client IP. */
export const apiLimiter = limiter({
    name: "api",
    windowMs: 60_000,
    limit: env.API_RATE_LIMIT,
    skip: (req) => req.path.startsWith("/health") || req.path.startsWith("/ready"),
});

/** Tight per-IP limit on credential endpoints (login, register, reset, ...). */
export const authLimiter = limiter({
    name: "auth",
    windowMs: 60_000,
    limit: env.AUTH_RATE_LIMIT,
});

const normaliseEmail = (value) => String(value ?? "").trim().toLowerCase().slice(0, 254);

/**
 * Per-email limit on *failed* logins, independent of source IP, so spreading
 * guesses across many IPs does not help. Sized to match the database lockout
 * threshold so an unknown email and a real one behave identically. Mount after
 * body validation so malformed requests do not consume the budget.
 */
export const loginAccountLimiter = limiter({
    name: "login-account",
    windowMs: env.LOCKOUT_MINUTES * 60_000,
    limit: env.MAX_FAILED_LOGINS,
    skipSuccessfulRequests: true,
    keyGenerator: (req) => (req.body?.email ? `email:${normaliseEmail(req.body.email)}` : ipKeyGenerator(req.ip)),
});

/** Per-email limit on reset emails, so the endpoint cannot be used to spam an inbox. */
export const passwordResetLimiter = limiter({
    name: "password-reset",
    windowMs: 60 * 60_000,
    limit: 5,
    keyGenerator: (req) => (req.body?.email ? `email:${normaliseEmail(req.body.email)}` : ipKeyGenerator(req.ip)),
});
