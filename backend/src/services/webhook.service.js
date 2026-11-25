import crypto from "node:crypto";
import { executeQuery } from "../config/dbConfig.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

const SIGNATURE_PREFIX = "sha256=";
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;

const SAFE_GITHUB_HEADERS = [
    "x-github-event",
    "x-github-delivery",
    "x-github-hook-id",
    "x-github-hook-installation-target-id",
    "x-github-hook-installation-target-type",
    "user-agent",
];

const DELIVERY_SUMMARY_COLUMNS = `
    id,
    delivery_id AS "deliveryId",
    event,
    action,
    hook_id AS "hookId",
    repository,
    sender,
    ref,
    status,
    received_at AS "receivedAt",
    processed_at AS "processedAt"
`;

function formatDeliverySummary(row) {
    return {
        ...row,
        hookId: row.hookId === null || row.hookId === undefined ? null : Number(row.hookId),
    };
}

function formatDeliveryDetail(row) {
    return {
        ...formatDeliverySummary(row),
        signatureVerified: row.signatureVerified,
        payload: row.payload,
        headers: row.headers,
    };
}

/**
 * Verifies GitHub's `X-Hub-Signature-256` HMAC-SHA256 signature over the exact
 * raw body bytes using constant-time comparison. Fails closed if the server
 * secret is not configured.
 */
export function verifyGitHubSignature(rawBody, signatureHeader, secret = env.GITHUB_WEBHOOK_SECRET) {
    if (!secret) {
        throw new ApiError(503, "WEBHOOK_NOT_CONFIGURED", "GitHub webhook secret is not configured");
    }

    if (!Buffer.isBuffer(rawBody)) {
        throw ApiError.badRequest("Webhook request body must be raw bytes");
    }

    if (typeof signatureHeader !== "string" || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
        throw ApiError.unauthorized("Missing or malformed webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    }

    const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
    if (!SHA256_HEX_RE.test(providedHex)) {
        throw ApiError.unauthorized("Malformed webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    }

    const expectedDigest = crypto.createHmac("sha256", secret).update(rawBody).digest();
    const providedDigest = Buffer.from(providedHex, "hex");

    if (!crypto.timingSafeEqual(expectedDigest, providedDigest)) {
        throw ApiError.unauthorized("Webhook signature verification failed", "INVALID_WEBHOOK_SIGNATURE");
    }
}

/**
 * Parses a verified GitHub webhook body supporting both `application/json`
 * and `application/x-www-form-urlencoded` (`payload=<json>`).
 */
export function parseGitHubPayload(rawBody, contentType = "") {
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
        throw ApiError.badRequest("Webhook payload cannot be empty");
    }

    const mediaType = String(contentType).split(";")[0].trim().toLowerCase();
    let jsonText;

    if (mediaType === "application/x-www-form-urlencoded") {
        const params = new URLSearchParams(rawBody.toString("utf8"));
        jsonText = params.get("payload");
        if (!jsonText) {
            throw ApiError.badRequest("Form-encoded webhook must include a 'payload' field");
        }
    } else if (mediaType === "" || mediaType === "application/json" || mediaType.endsWith("+json")) {
        jsonText = rawBody.toString("utf8");
    } else {
        throw new ApiError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Unsupported webhook content type; expected application/json or application/x-www-form-urlencoded",
        );
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw ApiError.badRequest("Webhook body is not valid JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw ApiError.badRequest("Webhook payload must be a JSON object");
    }

    return parsed;
}

function extractRef(payload) {
    const candidates = [
        payload.ref,
        payload.pull_request?.head?.ref,
        payload.workflow_run?.head_branch,
        payload.check_suite?.head_branch,
        payload.release?.tag_name,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return null;
}

function extractSafeHeaders(req) {
    const collected = {};
    for (const name of SAFE_GITHUB_HEADERS) {
        const value = req.get(name);
        if (value !== undefined && value !== "") collected[name] = value;
    }
    return collected;
}

export function extractDeliveryMetadata(req, parsedHeaders, payload) {
    const hookIdFromPayload = Number.isInteger(payload.hook_id) && payload.hook_id > 0 ? payload.hook_id : null;

    return {
        deliveryId: parsedHeaders["x-github-delivery"],
        event: parsedHeaders["x-github-event"],
        hookId: parsedHeaders["x-github-hook-id"] ?? hookIdFromPayload,
        action: typeof payload.action === "string" && payload.action.trim() ? payload.action.trim() : null,
        repository: typeof payload.repository?.full_name === "string" ? payload.repository.full_name : null,
        sender: typeof payload.sender?.login === "string" ? payload.sender.login : null,
        ref: extractRef(payload),
        headers: extractSafeHeaders(req),
    };
}

/**
 * Persists a verified GitHub webhook delivery idempotently by `delivery_id`.
 * Retries carrying an already-recorded `X-GitHub-Delivery` return `{ deduplicated: true }`.
 */
export async function recordGitHubDelivery({
    deliveryId,
    event,
    action,
    hookId,
    repository,
    sender,
    ref,
    payload,
    headers,
}) {
    const { rows } = await executeQuery(
        `INSERT INTO github_webhook_deliveries (
            delivery_id, event, action, hook_id, repository, sender, ref,
            signature_verified, status, payload, headers, processed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'processed', $8::jsonb, $9::jsonb, now())
         ON CONFLICT (delivery_id) DO NOTHING
         RETURNING ${DELIVERY_SUMMARY_COLUMNS}`,
        [
            deliveryId,
            event,
            action,
            hookId,
            repository,
            sender,
            ref,
            JSON.stringify(payload),
            JSON.stringify(headers),
        ],
    );

    if (rows.length > 0) {
        const delivery = formatDeliverySummary(rows[0]);
        logger.info(
            {
                deliveryId: delivery.deliveryId,
                event: delivery.event,
                action: delivery.action,
                repository: delivery.repository,
                sender: delivery.sender,
                deduplicated: false,
            },
            "GitHub webhook delivery recorded",
        );
        return { deduplicated: false, delivery };
    }

    const existing = await executeQuery(
        `SELECT ${DELIVERY_SUMMARY_COLUMNS}
         FROM github_webhook_deliveries
         WHERE delivery_id = $1`,
        [deliveryId],
    );

    const delivery = formatDeliverySummary(existing.rows[0]);
    logger.info(
        {
            deliveryId: delivery.deliveryId,
            event: delivery.event,
            repository: delivery.repository,
            deduplicated: true,
        },
        "Duplicate GitHub webhook delivery ignored",
    );
    return { deduplicated: true, delivery };
}

export async function listGitHubDeliveries({ event, repository, status, limit, offset }) {
    const conditions = [];
    const params = [];

    if (event) {
        params.push(event);
        conditions.push(`event = $${params.length}`);
    }
    if (repository) {
        params.push(repository);
        conditions.push(`repository = $${params.length}`);
    }
    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;

    const [countResult, listResult] = await Promise.all([
        executeQuery(`SELECT count(*)::int AS total FROM github_webhook_deliveries ${whereClause}`, params),
        executeQuery(
            `SELECT ${DELIVERY_SUMMARY_COLUMNS}
             FROM github_webhook_deliveries
             ${whereClause}
             ORDER BY received_at DESC, id DESC
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            [...params, limit, offset],
        ),
    ]);

    return {
        deliveries: listResult.rows.map(formatDeliverySummary),
        pagination: {
            total: countResult.rows[0].total,
            limit,
            offset,
        },
    };
}

export async function getGitHubDelivery(idOrDeliveryId) {
    const { rows } = await executeQuery(
        `SELECT ${DELIVERY_SUMMARY_COLUMNS},
                signature_verified AS "signatureVerified",
                payload,
                headers
         FROM github_webhook_deliveries
         WHERE id::text = $1 OR delivery_id = $1
         LIMIT 1`,
        [idOrDeliveryId],
    );

    return rows[0] ? formatDeliveryDetail(rows[0]) : null;
}
