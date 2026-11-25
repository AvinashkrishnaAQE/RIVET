import { Router } from "express";
import authRoutes from "./auth.routes.js";
import webhookRoutes from "./webhook.routes.js";

/** Mounted at /api/v1 by app.js. Add each new feature router here. */
const router = Router();

router.use("/auth", authRoutes);
router.use("/webhooks", webhookRoutes);

export default router;
