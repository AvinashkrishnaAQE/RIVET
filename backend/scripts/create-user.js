// Creates a user directly in the database (bootstrap / admin tooling).
//
//   NEW_USER_PASSWORD='...' npm run user:create -- <email> "<name>" [--admin]
//
// The password is read from the environment, not argv, so it stays out of the
// process list. It is hashed with the same argon2id settings the API uses. Unlike
// POST /auth/register this does NOT enforce the password-length policy -- it is a
// trusted, operator-run tool.
import { z } from "zod";
import { closePool, executeQuery } from "../src/config/dbConfig.js";
import { hashPassword } from "../src/services/password.service.js";

const args = process.argv.slice(2);
const isAdmin = args.includes("--admin");
const [emailArg, nameArg] = args.filter((a) => !a.startsWith("--"));
const password = process.env.NEW_USER_PASSWORD;

const parsed = z
    .object({
        email: z.string().trim().toLowerCase().pipe(z.email()),
        name: z.string().trim().min(1).max(100),
        password: z.string().min(1).max(128),
    })
    .safeParse({ email: emailArg, name: nameArg, password });

if (!parsed.success) {
    console.error('Usage: NEW_USER_PASSWORD=... npm run user:create -- <email> "<name>" [--admin]');
    console.error(parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n"));
    process.exit(1);
}

try {
    const { email, name } = parsed.data;
    const passwordHash = await hashPassword(parsed.data.password);
    const { rows } = await executeQuery(
        `INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, $3, $4)
         ON CONFLICT (email) DO NOTHING
         RETURNING id, email, name, role`,
        [email, passwordHash, name, isAdmin ? "admin" : "user"],
    );

    if (rows.length === 0) {
        console.error(`A user with email ${email} already exists. Nothing changed.`);
        process.exitCode = 1;
    } else {
        console.log("Created user:", rows[0]);
    }
} finally {
    await closePool();
}
