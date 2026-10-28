import { Router } from "express";
import authRoutes from "./auth.routes.js";

/** Mounted at /api/v1 by app.js. Add each new feature router here. */
const router = Router();

router.use("/auth", authRoutes);

export default router;
