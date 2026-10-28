import { ApiError } from "../utils/api-error.js";

export function notFoundHandler(req, _res, next) {
    next(new ApiError(404, "NOT_FOUND", `Cannot ${req.method} ${req.path}`));
}
