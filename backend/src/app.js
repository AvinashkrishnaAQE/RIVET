import compression from "compression";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";

import { env } from "./config/env.js";
import { correlationId } from "./middleware/correlation-id.js";
import { csrfProtection } from "./middleware/csrf.js";
import { errorHandler } from "./middleware/error-handler.js";
import { notFoundHandler } from "./middleware/not-found.js";
import { apiLimiter } from "./middleware/rate-limiter.js";
import healthRoutes from "./routes/health.routes.js";
import apiRoutes from "./routes/index.js";
import { ApiError } from "./utils/api-error.js";
import { logger } from "./utils/logger.js";

const API_V1 = "/api/v1";

const app = express();

// Number of proxy hops to trust for req.ip. Wrong in either direction breaks rate
// limiting: too low and every user shares the proxy's IP; too high and clients can
// spoof theirs via X-Forwarded-For. Set TRUST_PROXY to match the deployment.
app.set("trust proxy", env.TRUST_PROXY);
app.disable("x-powered-by");

// Request id first, so every later log line and error can carry it.
app.use(correlationId);

// This is a JSON API: it never serves HTML, so the browser is told to load nothing.
app.use(
    helmet({
        contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
        hsts: { maxAge: 31_536_000, includeSubDomains: true },
        referrerPolicy: { policy: "no-referrer" },
    }),
);

const allowedOrigins = new Set(env.corsOrigins);
app.use(
    cors({
        origin: (origin, callback) => {
            // No Origin header: curl, server-to-server, same-origin. CORS does not apply.
            if (!origin || allowedOrigins.has(origin)) return callback(null, true);
            callback(ApiError.forbidden(`Origin ${origin} is not allowed`, "CORS_FORBIDDEN"));
        },
        credentials: true,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token", "X-Request-Id"],
        exposedHeaders: ["X-Request-Id", "RateLimit", "RateLimit-Policy", "Retry-After"],
        maxAge: 600,
    }),
);

app.use(compression());

app.use(
    pinoHttp({
        logger,
        genReqId: (req) => req.correlationId,
        autoLogging: { ignore: (req) => req.url.startsWith("/api/health") || req.url.startsWith("/api/ready") },
        customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
        // Method and path only: query strings and bodies can carry secrets.
        serializers: {
            req: (req) => ({ id: req.id, method: req.method, url: req.url.split("?")[0] }),
            res: (res) => ({ statusCode: res.statusCode }),
        },
    }),
);

// Health endpoints sit outside versioning and rate limiting so probes always get through.
app.use("/api", healthRoutes);

app.use(express.json({ limit: env.JSON_BODY_LIMIT }));
app.use(cookieParser());

app.use("/api", apiLimiter);

// Endpoints a browser calls before it holds a CSRF token.
app.use(
    csrfProtection({
        exemptPaths: ["/auth/register", "/auth/login", "/auth/forgot-password", "/auth/reset-password"].map(
            (p) => `${API_V1}${p}`,
        ),
    }),
);

app.use(API_V1, apiRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
