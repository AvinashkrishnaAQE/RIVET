// Integration tests: boots the real app on an ephemeral port and drives it over
// HTTP against the configured database (run `npm run migrate` first). Every user
// is created under a unique address and deleted afterwards (sessions, reset
// tokens cascade).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";

// Must be set before the app (and therefore config/env.js) is imported.
Object.assign(process.env, {
    NODE_ENV: "test",
    AUTH_RATE_LIMIT: "1000",
    API_RATE_LIMIT: "1000",
    ARGON2_MEMORY_KIB: "8192", // fast hashing for tests; production default is 64 MiB
    ARGON2_TIME_COST: "1",
    REFRESH_REUSE_GRACE_SECONDS: "30",
    MAX_FAILED_LOGINS: "5",
});

const { default: app } = await import("../src/app.js");
const { executeQuery, closePool } = await import("../src/config/dbConfig.js");
const { hashToken } = await import("../src/services/token.service.js");

const PASSWORD = "correct horse battery";
const runId = Date.now().toString(36);
// Tags every audit row the tests cause, so cleanup can find rows whose user is already gone.
const TEST_USER_AGENT = `aviyash-test-${runId}`;
const createdEmails = [];
const newEmail = (label) => {
    const email = `test+${label}-${runId}@example.com`;
    createdEmails.push(email);
    return email;
};

let server;
let baseUrl;

/** A tiny browser: keeps cookies between requests, as a real client would. */
class Client {
    cookies = new Map();

    async request(method, path, { body, headers = {}, cookies = true } = {}) {
        const sent = { "user-agent": TEST_USER_AGENT, ...headers };
        if (body !== undefined) sent["content-type"] = "application/json";
        if (cookies && this.cookies.size > 0) {
            sent.cookie = [...this.cookies].map(([k, v]) => `${k}=${v}`).join("; ");
        }

        const res = await fetch(`${baseUrl}${path}`, {
            method,
            headers: sent,
            body: body === undefined ? undefined : JSON.stringify(body),
        });

        for (const line of res.headers.getSetCookie()) {
            const [pair] = line.split(";");
            const index = pair.indexOf("=");
            const name = pair.slice(0, index);
            const value = pair.slice(index + 1);
            if (value === "") this.cookies.delete(name);
            else this.cookies.set(name, value);
        }

        const text = await res.text();
        return { status: res.status, headers: res.headers, setCookie: res.headers.getSetCookie(), body: text ? JSON.parse(text) : null };
    }

    /** Mutating request the way the frontend sends it: echoing the CSRF cookie. */
    post(path, body, headers = {}) {
        return this.request("POST", path, { body, headers: { "x-csrf-token": this.cookies.get("csrf_token") ?? "", ...headers } });
    }
    get(path, headers) {
        return this.request("GET", path, { headers });
    }
}

const credentials = (email, password = PASSWORD) => ({ email, password, name: "Test User" });

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await executeQuery("DELETE FROM users WHERE email = ANY($1)", [createdEmails]);
    await executeQuery("DELETE FROM auth_events WHERE email = ANY($1) OR user_agent = $2", [createdEmails, TEST_USER_AGENT]);
    await closePool();
});

describe("infrastructure", () => {
    test("health and readiness", async () => {
        const c = new Client();
        assert.equal((await c.get("/api/health")).status, 200);
        assert.equal((await c.get("/api/ready")).body.status, "ready");
    });

    test("unknown route -> JSON 404 with request id", async () => {
        const res = await new Client().get("/api/v1/nope");
        assert.equal(res.status, 404);
        assert.equal(res.body.error.code, "NOT_FOUND");
        assert.ok(res.body.error.requestId);
    });

    test("malformed JSON -> 400, not 500", async () => {
        const res = await fetch(`${baseUrl}/api/v1/auth/login`, {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: "{not json",
        });
        assert.equal(res.status, 400);
        assert.equal((await res.json()).error.code, "INVALID_JSON");
    });

    test("security headers present, x-powered-by absent", async () => {
        const res = await new Client().get("/api/health");
        assert.equal(res.headers.get("x-content-type-options"), "nosniff");
        assert.equal(res.headers.get("x-powered-by"), null);
        assert.ok(res.headers.get("x-request-id"));
    });

    test("disallowed CORS origin is rejected", async () => {
        const res = await new Client().get("/api/health", { origin: "https://evil.example" });
        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, "CORS_FORBIDDEN");
    });

    test("hostile x-request-id is replaced", async () => {
        const res = await new Client().get("/api/health", { "x-request-id": "bad id; injected" });
        assert.notEqual(res.headers.get("x-request-id"), "bad id; injected");
        const good = await new Client().get("/api/health", { "x-request-id": "trace-abc-12345" });
        assert.equal(good.headers.get("x-request-id"), "trace-abc-12345");
    });
});

describe("registration", () => {
    test("creates an account, stores an argon2id hash, sets cookies, never returns the refresh token", async () => {
        const email = newEmail("reg");
        const c = new Client();
        const res = await c.post("/api/v1/auth/register", credentials(email.toUpperCase()));

        assert.equal(res.status, 201);
        assert.equal(res.body.data.user.email, email); // normalised to lowercase
        assert.equal(res.body.data.user.role, "user");
        assert.ok(res.body.data.accessToken);
        assert.ok(!JSON.stringify(res.body).includes("refresh"));
        assert.ok(!JSON.stringify(res.body).includes("password"));

        const cookieNames = res.setCookie.map((l) => l.split("=")[0]);
        assert.deepEqual(cookieNames.sort(), ["accessToken", "csrf_token", "refreshToken"]);
        for (const line of res.setCookie.filter((l) => !l.startsWith("csrf_token"))) {
            assert.match(line, /HttpOnly/i);
        }
        assert.match(res.setCookie.find((l) => l.startsWith("refreshToken")), /Path=\/api\/v1\/auth/);

        const { rows } = await executeQuery("SELECT password_hash FROM users WHERE email = $1", [email]);
        assert.match(rows[0].password_hash, /^\$argon2id\$/);
        assert.ok(!rows[0].password_hash.includes(PASSWORD));
    });

    test("duplicate email -> 409", async () => {
        const email = newEmail("dup");
        await new Client().post("/api/v1/auth/register", credentials(email));
        const res = await new Client().post("/api/v1/auth/register", credentials(email));
        assert.equal(res.status, 409);
        assert.equal(res.body.error.code, "EMAIL_TAKEN");
    });

    test("validation: bad email, short password, missing name", async () => {
        const res = await new Client().post("/api/v1/auth/register", { email: "nope", password: "short" });
        assert.equal(res.status, 422);
        assert.ok(res.body.error.details["body.email"]);
        assert.ok(res.body.error.details["body.password"]);
        assert.ok(res.body.error.details["body.name"]);
    });

    test("cannot self-assign a role", async () => {
        const email = newEmail("role");
        const res = await new Client().post("/api/v1/auth/register", { ...credentials(email), role: "admin" });
        assert.equal(res.status, 201);
        assert.equal(res.body.data.user.role, "user");
    });
});

describe("login", () => {
    test("succeeds; wrong password and unknown email are indistinguishable", async () => {
        const email = newEmail("login");
        await new Client().post("/api/v1/auth/register", credentials(email));

        const ok = await new Client().post("/api/v1/auth/login", { email, password: PASSWORD });
        assert.equal(ok.status, 200);

        const wrong = await new Client().post("/api/v1/auth/login", { email, password: "wrong password!" });
        const unknown = await new Client().post("/api/v1/auth/login", { email: newEmail("ghost"), password: PASSWORD });
        assert.equal(wrong.status, 401);
        assert.equal(unknown.status, 401);
        assert.deepEqual(
            { ...wrong.body.error, requestId: undefined },
            { ...unknown.body.error, requestId: undefined },
        );
    });

    test("locks the account after repeated failures, even for the right password", async () => {
        const email = newEmail("lock");
        await new Client().post("/api/v1/auth/register", credentials(email));

        for (let i = 0; i < 5; i += 1) {
            const res = await new Client().post("/api/v1/auth/login", { email, password: "wrong password!" });
            assert.equal(res.status, 401);
        }
        const blocked = await new Client().post("/api/v1/auth/login", { email, password: PASSWORD });
        assert.equal(blocked.status, 429);

        const { rows } = await executeQuery("SELECT locked_until FROM users WHERE email = $1", [email]);
        assert.ok(rows[0].locked_until, "database lock should be set");
    });

    test("a disabled account cannot sign in", async () => {
        const email = newEmail("disabled");
        await new Client().post("/api/v1/auth/register", credentials(email));
        await executeQuery("UPDATE users SET status = 'disabled' WHERE email = $1", [email]);

        const res = await new Client().post("/api/v1/auth/login", { email, password: PASSWORD });
        assert.equal(res.status, 403);
        assert.equal(res.body.error.code, "ACCOUNT_DISABLED");
    });

    test("an existing weaker hash is upgraded on login", async () => {
        const email = newEmail("rehash");
        await new Client().post("/api/v1/auth/register", credentials(email));
        const argon2 = (await import("argon2")).default;
        const weak = await argon2.hash(PASSWORD, { type: argon2.argon2id, memoryCost: 8192, timeCost: 1 });
        await executeQuery("UPDATE users SET password_hash = $2 WHERE email = $1", [email, weak]);

        // Tests run with the weak params as "current", so force a real mismatch via a different timeCost.
        const older = await argon2.hash(PASSWORD, { type: argon2.argon2d, memoryCost: 8192, timeCost: 1 });
        await executeQuery("UPDATE users SET password_hash = $2 WHERE email = $1", [email, older]);

        const res = await new Client().post("/api/v1/auth/login", { email, password: PASSWORD });
        assert.equal(res.status, 200);
        const { rows } = await executeQuery("SELECT password_hash FROM users WHERE email = $1", [email]);
        assert.match(rows[0].password_hash, /^\$argon2id\$/);
    });
});

describe("authentication middleware", () => {
    test("bearer token, cookie, and rejection of missing/tampered tokens", async () => {
        const email = newEmail("mw");
        const c = new Client();
        const reg = await c.post("/api/v1/auth/register", credentials(email));
        const token = reg.body.data.accessToken;

        const bearer = await new Client().get("/api/v1/auth/me", { authorization: `Bearer ${token}` });
        assert.equal(bearer.status, 200);
        assert.equal(bearer.body.data.user.email, email);

        assert.equal((await c.get("/api/v1/auth/me")).status, 200); // cookie

        assert.equal((await new Client().get("/api/v1/auth/me")).status, 401);
        const tampered = await new Client().get("/api/v1/auth/me", { authorization: `Bearer ${token.slice(0, -2)}xx` });
        assert.equal(tampered.status, 401);
        assert.equal(tampered.body.error.code, "INVALID_TOKEN");
        assert.equal((await new Client().get("/api/v1/auth/me", { authorization: "Basic abc" })).status, 401);
    });

    test("alg=none tokens are rejected", async () => {
        const email = newEmail("none");
        const reg = await new Client().post("/api/v1/auth/register", credentials(email));
        const [, payload] = reg.body.data.accessToken.split(".");
        const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
        const res = await new Client().get("/api/v1/auth/me", { authorization: `Bearer ${header}.${payload}.` });
        assert.equal(res.status, 401);
    });

    test("disabling a user takes effect immediately, before the token expires", async () => {
        const email = newEmail("disable-live");
        const reg = await new Client().post("/api/v1/auth/register", credentials(email));
        const auth = { authorization: `Bearer ${reg.body.data.accessToken}` };
        assert.equal((await new Client().get("/api/v1/auth/me", auth)).status, 200);

        await executeQuery("UPDATE users SET status = 'disabled' WHERE email = $1", [email]);
        assert.equal((await new Client().get("/api/v1/auth/me", auth)).status, 401);
    });
});

describe("CSRF", () => {
    test("cookie-authenticated mutations need the CSRF header; bearer requests do not", async () => {
        const email = newEmail("csrf");
        const c = new Client();
        await c.post("/api/v1/auth/register", credentials(email));

        const missing = await c.request("POST", "/api/v1/auth/logout-all", { body: {} });
        assert.equal(missing.status, 403);
        assert.equal(missing.body.error.code, "CSRF_MISSING");

        const wrong = await c.request("POST", "/api/v1/auth/logout-all", { body: {}, headers: { "x-csrf-token": "x".repeat(64) } });
        assert.equal(wrong.status, 403);
        assert.equal(wrong.body.error.code, "CSRF_INVALID");

        const ok = await c.post("/api/v1/auth/logout-all", {});
        assert.equal(ok.status, 204);

        // Bearer auth carries no ambient credentials, so no CSRF token is needed.
        const other = await new Client().post("/api/v1/auth/login", { email, password: PASSWORD });
        const bearerCall = await new Client().request("POST", "/api/v1/auth/logout-all", {
            body: {},
            headers: { authorization: `Bearer ${other.body.data.accessToken}` },
            cookies: false,
        });
        assert.equal(bearerCall.status, 204);
    });
});

describe("refresh token rotation", () => {
    test("rotates, rejects a concurrent replay without killing the session, revokes on later reuse", async () => {
        const email = newEmail("refresh");
        const c = new Client();
        await c.post("/api/v1/auth/register", credentials(email));
        const original = c.cookies.get("refreshToken");

        const rotated = await c.post("/api/v1/auth/refresh");
        assert.equal(rotated.status, 200);
        assert.notEqual(c.cookies.get("refreshToken"), original);
        assert.equal((await c.get("/api/v1/auth/me")).status, 200);

        // Immediate replay of the old token: a race between tabs. Rejected, session intact.
        const thief = new Client();
        thief.cookies.set("refreshToken", original);
        thief.cookies.set("csrf_token", "t");
        const race = await thief.post("/api/v1/auth/refresh");
        assert.equal(race.status, 401);
        assert.equal((await c.get("/api/v1/auth/me")).status, 200);

        // Replay after the grace window: treated as theft, the whole session dies.
        await executeQuery(
            "UPDATE sessions SET rotated_at = now() - interval '5 minutes' WHERE user_id = (SELECT id FROM users WHERE email = $1)",
            [email],
        );
        const reuse = await thief.post("/api/v1/auth/refresh");
        assert.equal(reuse.status, 401);
        assert.equal((await c.get("/api/v1/auth/me")).status, 401);
        assert.equal((await c.post("/api/v1/auth/refresh")).status, 401);

        const { rows } = await executeQuery(
            "SELECT revoked_reason FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = $1",
            [email],
        );
        assert.equal(rows[0].revoked_reason, "refresh_token_reuse");
    });

    test("refresh without a cookie -> 401", async () => {
        assert.equal((await new Client().post("/api/v1/auth/refresh")).status, 401);
    });

    test("only the hash of the refresh token is stored", async () => {
        const email = newEmail("hashonly");
        const c = new Client();
        await c.post("/api/v1/auth/register", credentials(email));
        const token = c.cookies.get("refreshToken");
        const { rows } = await executeQuery(
            "SELECT refresh_token_hash FROM sessions s JOIN users u ON u.id = s.user_id WHERE u.email = $1",
            [email],
        );
        assert.equal(rows[0].refresh_token_hash, hashToken(token));
        assert.notEqual(rows[0].refresh_token_hash, token);
    });
});

describe("logout and sessions", () => {
    test("logout invalidates the access token immediately and is idempotent", async () => {
        const email = newEmail("logout");
        const c = new Client();
        const reg = await c.post("/api/v1/auth/register", credentials(email));
        const auth = { authorization: `Bearer ${reg.body.data.accessToken}` };

        assert.equal((await c.post("/api/v1/auth/logout")).status, 204);
        assert.equal((await new Client().get("/api/v1/auth/me", auth)).status, 401);
        assert.equal((await c.post("/api/v1/auth/logout")).status, 204);
    });

    test("list and revoke individual sessions; cannot touch another user's", async () => {
        const email = newEmail("sessions");
        const phone = new Client();
        const laptop = new Client();
        await phone.post("/api/v1/auth/register", credentials(email));
        await laptop.post("/api/v1/auth/login", { email, password: PASSWORD });

        const list = await laptop.get("/api/v1/auth/sessions");
        assert.equal(list.body.data.sessions.length, 2);
        const other = list.body.data.sessions.find((s) => !s.current);

        const stranger = new Client();
        await stranger.post("/api/v1/auth/register", credentials(newEmail("stranger")));
        assert.equal((await stranger.request("DELETE", `/api/v1/auth/sessions/${other.id}`, { headers: { "x-csrf-token": stranger.cookies.get("csrf_token") } })).status, 404);

        const revoked = await laptop.request("DELETE", `/api/v1/auth/sessions/${other.id}`, { headers: { "x-csrf-token": laptop.cookies.get("csrf_token") } });
        assert.equal(revoked.status, 204);
        assert.equal((await phone.get("/api/v1/auth/me")).status, 401);
        assert.equal((await laptop.get("/api/v1/auth/me")).status, 200);

        const bad = await laptop.request("DELETE", "/api/v1/auth/sessions/not-a-uuid", { headers: { "x-csrf-token": laptop.cookies.get("csrf_token") } });
        assert.equal(bad.status, 422);
    });
});

describe("passwords", () => {
    test("change password: verifies current, signs out other sessions, new password works", async () => {
        const email = newEmail("change");
        const a = new Client();
        const b = new Client();
        await a.post("/api/v1/auth/register", credentials(email));
        await b.post("/api/v1/auth/login", { email, password: PASSWORD });

        const wrong = await a.post("/api/v1/auth/change-password", { currentPassword: "not the password", newPassword: "a brand new passphrase" });
        assert.equal(wrong.status, 400);

        const same = await a.post("/api/v1/auth/change-password", { currentPassword: PASSWORD, newPassword: PASSWORD });
        assert.equal(same.status, 422);

        const ok = await a.post("/api/v1/auth/change-password", { currentPassword: PASSWORD, newPassword: "a brand new passphrase" });
        assert.equal(ok.status, 204);

        assert.equal((await a.get("/api/v1/auth/me")).status, 200); // the caller stays signed in
        assert.equal((await b.get("/api/v1/auth/me")).status, 401); // everyone else is signed out
        assert.equal((await new Client().post("/api/v1/auth/login", { email, password: PASSWORD })).status, 401);
        assert.equal((await new Client().post("/api/v1/auth/login", { email, password: "a brand new passphrase" })).status, 200);
    });

    test("forgot-password answers identically for known and unknown emails", async () => {
        const email = newEmail("forgot");
        await new Client().post("/api/v1/auth/register", credentials(email));

        const known = await new Client().post("/api/v1/auth/forgot-password", { email });
        const unknown = await new Client().post("/api/v1/auth/forgot-password", { email: newEmail("nobody") });
        assert.equal(known.status, 202);
        assert.deepEqual(known.body, unknown.body);

        const { rows } = await executeQuery(
            "SELECT count(*)::int AS n FROM password_reset_tokens t JOIN users u ON u.id = t.user_id WHERE u.email = $1",
            [email],
        );
        assert.equal(rows[0].n, 1);
    });

    test("reset-password: single use, expiry enforced, signs out all sessions, clears lockout", async () => {
        const email = newEmail("reset");
        const c = new Client();
        await c.post("/api/v1/auth/register", credentials(email));
        const { rows } = await executeQuery("SELECT id FROM users WHERE email = $1", [email]);
        const userId = rows[0].id;
        await executeQuery("UPDATE users SET failed_login_attempts = 5, locked_until = now() + interval '10 minutes' WHERE id = $1", [userId]);

        // The real token only exists in the email; insert a known one the same way the service does.
        const insertToken = (token, interval) =>
            executeQuery(
                `INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, now() + $3::interval)`,
                [userId, hashToken(token), interval],
            );
        await insertToken("expired-token-value", "-1 minute");
        await insertToken("good-token-value", "10 minutes");

        const expired = await new Client().post("/api/v1/auth/reset-password", { token: "expired-token-value", newPassword: "yet another passphrase" });
        assert.equal(expired.status, 400);

        const reset = await new Client().post("/api/v1/auth/reset-password", { token: "good-token-value", newPassword: "yet another passphrase" });
        assert.equal(reset.status, 204);

        const reused = await new Client().post("/api/v1/auth/reset-password", { token: "good-token-value", newPassword: "and another one here" });
        assert.equal(reused.status, 400);

        assert.equal((await c.get("/api/v1/auth/me")).status, 401);
        const login = await new Client().post("/api/v1/auth/login", { email, password: "yet another passphrase" });
        assert.equal(login.status, 200, "lockout must be cleared by a reset");
    });
});
