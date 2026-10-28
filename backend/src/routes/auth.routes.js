import { Router } from "express";
import * as controller from "../controllers/auth.controller.js";
import { authenticate } from "../middleware/auth.js";
import { authLimiter, loginAccountLimiter, passwordResetLimiter } from "../middleware/rate-limiter.js";
import { validate } from "../middleware/validate.js";
import {
    changePasswordSchema,
    forgotPasswordSchema,
    loginSchema,
    registerSchema,
    resetPasswordSchema,
    sessionIdParamsSchema,
} from "../validators/auth.validators.js";

const router = Router();

// Responses here contain tokens or session data: never let a browser or proxy cache them.
router.use((_req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

// Public
router.post("/register", authLimiter, validate({ body: registerSchema }), controller.register);
router.post("/login", authLimiter, validate({ body: loginSchema }), loginAccountLimiter, controller.login);
router.post("/refresh", authLimiter, controller.refresh);
router.post("/logout", controller.logout);
router.post(
    "/forgot-password",
    authLimiter,
    validate({ body: forgotPasswordSchema }),
    passwordResetLimiter,
    controller.forgotPassword,
);
router.post("/reset-password", authLimiter, validate({ body: resetPasswordSchema }), controller.resetPassword);

// Authenticated
router.get("/me", authenticate, controller.me);
router.post("/logout-all", authenticate, controller.logoutAll);
router.post(
    "/change-password",
    authenticate,
    authLimiter,
    validate({ body: changePasswordSchema }),
    controller.changePassword,
);
router.get("/sessions", authenticate, controller.listSessions);
router.delete(
    "/sessions/:sessionId",
    authenticate,
    validate({ params: sessionIdParamsSchema }),
    controller.revokeUserSession,
);

export default router;
