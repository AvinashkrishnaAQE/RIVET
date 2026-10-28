import { ApiError } from "../utils/api-error.js";

/**
 * Validates request parts against Zod schemas. On success, `req.body` is replaced
 * with the parsed (trimmed, normalised, unknown-keys-stripped) value, and parsed
 * query/params are placed on `req.validated` -- Express 5 makes `req.query` a
 * read-only getter, so it cannot be overwritten.
 *
 *   router.post("/login", validate({ body: loginSchema }), handler)
 *
 * All problems across body, query and params are reported together, keyed by
 * path (e.g. "body.email"), as a 422 VALIDATION_ERROR.
 */
export function validate({ body, query, params }) {
    return (req, _res, next) => {
        const errors = {};
        req.validated = {};

        const check = (label, schema, value) => {
            const result = schema.safeParse(value);
            if (result.success) return result.data;

            for (const issue of result.error.issues) {
                const key = [label, ...issue.path].join(".");
                (errors[key] ??= []).push(issue.message);
            }
            return undefined;
        };

        if (body) {
            const parsed = check("body", body, req.body ?? {});
            if (parsed !== undefined) req.body = parsed;
        }
        if (query) {
            const parsed = check("query", query, req.query);
            if (parsed !== undefined) req.validated.query = parsed;
        }
        if (params) {
            const parsed = check("params", params, req.params);
            if (parsed !== undefined) req.validated.params = parsed;
        }

        if (Object.keys(errors).length > 0) return next(ApiError.validation(errors));
        next();
    };
}
