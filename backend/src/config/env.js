import { z } from "zod";

/**
 * Validates every environment variable once, at startup, and exposes the typed
 * result as `env`. A misconfigured deployment fails immediately with a readable
 * message instead of misbehaving on the first request that needs the value.
 *
 * Imported by everything that reads configuration -- nothing else should touch
 * process.env directly.
 */

const positiveInt = (fallback) => z.coerce.number().int().positive().default(fallback);

const booleanString = z
    .enum(["true", "false", "1", "0"])
    .transform((value) => value === "true" || value === "1");

const schema = z.object({
    // Core
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(0).max(65535).default(5000),
    LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).optional(),
    // Number of reverse proxies in front of the app (req.ip / rate limiting depend on it).
    TRUST_PROXY: z.coerce.number().int().min(0).default(0),

    // Database
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DATABASE_URL_POOLED: z.string().min(1).optional(),
    DB_POOL_MAX: positiveInt(10),
    DB_IDLE_TIMEOUT_MS: positiveInt(30_000),
    DB_CONNECTION_TIMEOUT_MS: positiveInt(10_000),
    DB_STATEMENT_TIMEOUT_MS: positiveInt(30_000),

    // HTTP
    // Comma-separated list of browser origins allowed to call the API with credentials.
    CORS_ORIGINS: z.string().default("http://localhost:3000"),
    FRONTEND_URL: z.string().default("http://localhost:3000"),
    JSON_BODY_LIMIT: z.string().default("100kb"),
    SHUTDOWN_TIMEOUT_MS: positiveInt(15_000),

    // Tokens and sessions
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters (try: openssl rand -base64 48)"),
    JWT_ISSUER: z.string().min(1).default("aviyash-api"),
    JWT_AUDIENCE: z.string().min(1).default("aviyash-web"),
    ACCESS_TOKEN_TTL_SECONDS: positiveInt(15 * 60),
    REFRESH_TOKEN_TTL_DAYS: positiveInt(30),
    SESSION_MAX_AGE_DAYS: positiveInt(90),
    // A rotated refresh token presented again within this window is treated as a
    // concurrent-tab race (rejected, session kept) rather than theft (session revoked).
    REFRESH_REUSE_GRACE_SECONDS: positiveInt(10),
    PASSWORD_RESET_TTL_MINUTES: positiveInt(30),

    // Cookies
    COOKIE_DOMAIN: z.string().min(1).optional(),
    COOKIE_SECURE: booleanString.optional(),
    // 'none' is required only when the frontend and API sit on different registrable domains.
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),

    // Password hashing (argon2id). Defaults follow OWASP guidance.
    ARGON2_MEMORY_KIB: positiveInt(65_536),
    ARGON2_TIME_COST: positiveInt(3),
    ARGON2_PARALLELISM: positiveInt(1),

    // Brute-force protection
    MAX_FAILED_LOGINS: positiveInt(5),
    LOCKOUT_MINUTES: positiveInt(15),
    API_RATE_LIMIT: positiveInt(120),
    AUTH_RATE_LIMIT: positiveInt(20),

    // Session housekeeping
    CLEANUP_INTERVAL_MINUTES: positiveInt(60),
});

function load() {
    const result = schema.safeParse(process.env);

    if (!result.success) {
        const details = result.error.issues
            .map((issue) => `  - ${issue.path.join(".") || "(root)"}: ${issue.message}`)
            .join("\n");
        // The logger depends on this module, so report with console.
        console.error(`Environment validation failed:\n${details}`);
        process.exit(1);
    }

    const data = result.data;
    const isProduction = data.NODE_ENV === "production";

    return Object.freeze({
        ...data,
        isProduction,
        isTest: data.NODE_ENV === "test",
        corsOrigins: data.CORS_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean),
        cookieSecure: data.COOKIE_SECURE ?? isProduction,
        // Browsers reject SameSite=None cookies that are not Secure.
        cookieSameSite: data.COOKIE_SAME_SITE,
    });
}

export const env = load();

if (env.cookieSameSite === "none" && !env.cookieSecure) {
    console.error("Environment validation failed:\n  - COOKIE_SAME_SITE=none requires secure cookies (COOKIE_SECURE=true)");
    process.exit(1);
}
