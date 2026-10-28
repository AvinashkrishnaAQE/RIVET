import { Router } from "express";
import { checkDatabase } from "../config/dbConfig.js";
import { logger } from "../utils/logger.js";

const router = Router();

/** Liveness: the process is up and the event loop is responsive. No dependencies checked. */
router.get("/health", (_req, res) => {
    res.json({ status: "ok", uptime: Math.round(process.uptime()) });
});

/** Readiness: dependencies are reachable. A load balancer should route traffic by this. */
router.get("/ready", async (_req, res) => {
    try {
        await checkDatabase();
        res.json({ status: "ready" });
    } catch (error) {
        logger.error({ err: error }, "Readiness check failed");
        res.status(503).json({ status: "unavailable" });
    }
});

export default router;
