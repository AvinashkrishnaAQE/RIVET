import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Outbound email. No provider is wired up yet, so this only logs -- and in
 * development it logs the reset link so the flow can be exercised end to end.
 * Replace the body of sendPasswordResetEmail with a real provider (SES, Resend,
 * SendGrid, ...) before enabling password reset in production. The link carries
 * a live credential, so it is never logged in production.
 */
export async function sendPasswordResetEmail({ to, token }) {
    const link = `${env.FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;

    if (env.isProduction) {
        logger.warn({ to }, "Password reset requested but no mail provider is configured; email not sent");
        return;
    }

    logger.info({ to, link }, "[dev] Password reset email (not actually sent)");
}
