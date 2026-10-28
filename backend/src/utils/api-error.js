/**
 * An error that is safe to show the client: it carries the HTTP status, a stable
 * machine-readable code, and a message written for the caller. Anything that is
 * not an ApiError is treated as an unexpected failure by the error handler.
 */
export class ApiError extends Error {
    constructor(statusCode, code, message, details) {
        super(message);
        this.name = "ApiError";
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        Error.captureStackTrace?.(this, this.constructor);
    }

    static badRequest(message, details) {
        return new ApiError(400, "BAD_REQUEST", message, details);
    }

    static unauthorized(message = "Authentication required", code = "UNAUTHORIZED") {
        return new ApiError(401, code, message);
    }

    static forbidden(message = "Insufficient permissions", code = "FORBIDDEN") {
        return new ApiError(403, code, message);
    }

    static notFound(resource = "Resource") {
        return new ApiError(404, "NOT_FOUND", `${resource} not found`);
    }

    static conflict(message, code = "CONFLICT") {
        return new ApiError(409, code, message);
    }

    static validation(details) {
        return new ApiError(422, "VALIDATION_ERROR", "Validation failed", details);
    }

    static tooManyRequests(message = "Too many requests, please try again later", code = "RATE_LIMITED") {
        return new ApiError(429, code, message);
    }
}

export default ApiError;
