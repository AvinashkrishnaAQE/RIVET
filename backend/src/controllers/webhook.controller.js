import * as webhookService from "../services/webhook.service.js";
import { ApiError } from "../utils/api-error.js";
import { githubHeadersSchema } from "../validators/webhook.validators.js";

function parseGitHubHeaders(req) {
    const result = githubHeadersSchema.safeParse({
        "x-github-event": req.get("x-github-event"),
        "x-github-delivery": req.get("x-github-delivery"),
        "x-github-hook-id": req.get("x-github-hook-id"),
    });

    if (result.success) return result.data;

    const details = {};
    for (const issue of result.error.issues) {
        const key = ["headers", ...issue.path].join(".");
        (details[key] ??= []).push(issue.message);
    }
    throw ApiError.badRequest("Missing or invalid GitHub webhook headers", details);
}

export async function receiveGitHubWebhook(req, res) {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);

    // Signature check runs before parsing so unauthenticated payloads are rejected early.
    webhookService.verifyGitHubSignature(rawBody, req.get("x-hub-signature-256"));

    const headers = parseGitHubHeaders(req);
    const payload = webhookService.parseGitHubPayload(rawBody, req.get("content-type"));
    const metadata = webhookService.extractDeliveryMetadata(req, headers, payload);

    const { deduplicated, delivery } = await webhookService.recordGitHubDelivery({
        ...metadata,
        payload,
    });

    res.status(200).json({
        data: {
            received: true,
            deduplicated,
            delivery,
            ...(delivery.event === "ping" && typeof payload.zen === "string" ? { zen: payload.zen } : {}),
        },
    });
}

export async function listGitHubDeliveries(req, res) {
    const result = await webhookService.listGitHubDeliveries(req.validated.query);
    res.json({ data: result });
}

export async function getGitHubDelivery(req, res) {
    const delivery = await webhookService.getGitHubDelivery(req.validated.params.id);
    if (!delivery) throw ApiError.notFound("Webhook delivery");
    res.json({ data: { delivery } });
}
