import { ApiError } from "../utils/api-error.js";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

// PostgreSQL error classes worth translating instead of reporting as a 500.
const PG_UNIQUE_VIOLATION = "23505";
const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_INVALID_TEXT_REPRESENTATION = "22P02"; // e.g. a malformed uuid

/** Maps any thrown value to { status, code, message, details? }. */
function normalise(err) {
    if (err instanceof ApiError) {
        return { status: err.statusCode, code: err.code, message: err.message, details: err.details };
    }

    // express.json(): malformed JSON / body too large / unsupported charset.
    if (err?.type === "entity.parse.failed") {
        return { status: 400, code: "INVALID_JSON", message: "Request body is not valid JSON" };
    }
    if (err?.type === "entity.too.large") {
        return { status: 413, code: "PAYLOAD_TOO_LARGE", message: "Request body is too large" };
    }

    if (err?.code === PG_UNIQUE_VIOLATION) {
        return { status: 409, code: "CONFLICT", message: "A record with this value already exists" };
    }
    if (err?.code === PG_FOREIGN_KEY_VIOLATION || err?.code === PG_INVALID_TEXT_REPRESENTATION) {
        return { status: 400, code: "BAD_REQUEST", message: "Invalid reference or identifier" };
    }

    // Any other error that already carries a 4xx status (from middleware libraries).
    const status = err?.status ?? err?.statusCode;
    if (Number.isInteger(status) && status >= 400 && status < 500) {
        return { status, code: "BAD_REQUEST", message: err.message };
    }

    return { status: 500, code: "INTERNAL_ERROR", message: "An unexpected error occurred" };
}

// Express identifies error middleware by its four-argument signature: keep `_next`.
export function errorHandler(err, req, res, _next) {
    if (res.headersSent) return _next(err);

    const { status, code, message, details } = normalise(err);
    const context = { requestId: req.correlationId, method: req.method, path: req.path, status, code };

    if (status >= 500) {
        // Request bodies are deliberately not logged: they carry passwords.
        logger.error({ ...context, err }, "Unhandled error");
    } else {
        logger.warn({ ...context, message }, "Request failed");
    }

    if (status === 401) res.set("WWW-Authenticate", "Bearer");

    res.status(status).json({
        error: {
            code,
            message,
            ...(details !== undefined && { details }),
            requestId: req.correlationId,
            // Stack traces help in development and are an information leak anywhere else.
            ...(status >= 500 && !env.isProduction && { stack: err?.stack }),
        },
    });
}
