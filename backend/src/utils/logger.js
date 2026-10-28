import pino from "pino";
import { env } from "../config/env.js";

const level = env.LOG_LEVEL ?? (env.isTest ? "silent" : env.isProduction ? "info" : "debug");

// Pretty output only in development; production emits plain JSON for the log pipeline.
const transport =
    env.isProduction || env.isTest
        ? undefined
        : pino.transport({
              target: "pino-pretty",
              options: { colorize: true, translateTime: "SYS:standard", ignore: "pid,hostname" },
          });

export const logger = pino(
    {
        level,
        base: { env: env.NODE_ENV },
        // Never let credentials reach the logs, whatever object they ride in on.
        redact: {
            paths: [
                "req.headers.authorization",
                "req.headers.cookie",
                'res.headers["set-cookie"]',
                "*.password",
                "*.currentPassword",
                "*.newPassword",
                "*.passwordHash",
                "*.password_hash",
                "*.token",
                "*.refreshToken",
                "*.accessToken",
            ],
            censor: "[redacted]",
        },
    },
    transport,
);

export default logger;
