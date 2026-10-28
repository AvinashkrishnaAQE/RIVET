import { z } from "zod";

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address").max(254));

// Length beats composition rules (NIST 800-63B). The upper bound exists because
// hashing cost scales with input size; without it a huge "password" is a cheap DoS.
const newPassword = z
    .string()
    .min(10, "Password must be at least 10 characters")
    .max(128, "Password must be at most 128 characters");

const name = z.string().trim().min(1, "Name is required").max(100, "Name must be at most 100 characters");

export const registerSchema = z.object({ email, password: newPassword, name });

// Login deliberately does not re-apply the strength rules: it only needs a value.
export const loginSchema = z.object({ email, password: z.string().min(1, "Password is required").max(128) });

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({
    token: z.string().min(1, "Token is required").max(256),
    newPassword,
});

export const changePasswordSchema = z
    .object({
        currentPassword: z.string().min(1, "Current password is required").max(128),
        newPassword,
    })
    .refine((v) => v.currentPassword !== v.newPassword, {
        path: ["newPassword"],
        message: "New password must be different from the current password",
    });

export const sessionIdParamsSchema = z.object({ sessionId: z.uuid("Invalid session id") });
