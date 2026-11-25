import express, { Router } from "express";
import { env } from "../config/env.js";
import * as controller from "../controllers/webhook.controller.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { deliveryIdParamsSchema, listDeliveriesQuerySchema } from "../validators/webhook.validators.js";

const router = Router();

// GitHub signs the exact raw request bytes; preserve the Buffer before verification.
router.post(
    "/github",
    express.raw({ type: "*/*", limit: env.WEBHOOK_BODY_LIMIT }),
    controller.receiveGitHubWebhook,
);

router.get(
    "/github/deliveries",
    authenticate,
    validate({ query: listDeliveriesQuerySchema }),
    controller.listGitHubDeliveries,
);

router.get(
    "/github/deliveries/:id",
    authenticate,
    validate({ params: deliveryIdParamsSchema }),
    controller.getGitHubDelivery,
);

router.post(
    "/github/deliveries/:id/sync-diff",
    authenticate,
    validate({ params: deliveryIdParamsSchema }),
    controller.syncGitHubDeliveryDiff,
);

export default router;
