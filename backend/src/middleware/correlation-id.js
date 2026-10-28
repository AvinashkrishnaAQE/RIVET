import { randomUUID } from "node:crypto";

// Upstream proxies may supply their own id. It ends up in logs and a response
// header, so accept it only if it is short and plain; anything else could be used
// to inject fake log lines or oversized headers.
const SAFE_REQUEST_ID = /^[\w.-]{8,64}$/;

/**
 * Gives every request an id for tracing it across logs and services: the caller's
 * `x-request-id` when it is well-formed, a fresh UUID otherwise. Echoed back in
 * the response header and, on errors, in the body.
 */
export function correlationId(req, res, next) {
    const incoming = req.get("x-request-id");
    req.correlationId = incoming && SAFE_REQUEST_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader("x-request-id", req.correlationId);
    next();
}
