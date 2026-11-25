import { z } from "zod";

export const githubHeadersSchema = z.object({
    "x-github-event": z.string().trim().min(1, "X-GitHub-Event header is required").max(100),
    "x-github-delivery": z.string().trim().min(1, "X-GitHub-Delivery header is required").max(128),
    "x-github-hook-id": z.preprocess(
        (val) => (val === undefined || val === "" ? undefined : val),
        z.coerce.number().int().positive("X-GitHub-Hook-ID must be a positive integer").optional(),
    ),
});

export const listDeliveriesQuerySchema = z.object({
    event: z.string().trim().min(1).max(100).optional(),
    repository: z.string().trim().min(1).max(200).optional(),
    status: z.enum(["processed", "ignored", "failed"]).optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
});

export const deliveryIdParamsSchema = z.object({
    id: z.string().trim().min(1, "Delivery id is required").max(128),
});
