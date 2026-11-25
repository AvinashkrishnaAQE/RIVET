// Integration tests for the GitHub webhook receiver and delivery query endpoints.
// Boots the real app on an ephemeral port against the configured Postgres database
// (run `npm run migrate` first) and cleans up every created record afterwards.
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { after, before, describe, test } from "node:test";

const TEST_WEBHOOK_SECRET = "test-github-webhook-secret-9f8e7d6c5b4a3210";

// Must be set before the app (and therefore config/env.js) is imported.
Object.assign(process.env, {
    NODE_ENV: "test",
    TRUST_PROXY: "1",
    AUTH_RATE_LIMIT: "1000",
    API_RATE_LIMIT: "1000",
    ARGON2_MEMORY_KIB: "8192",
    ARGON2_TIME_COST: "1",
    GITHUB_WEBHOOK_SECRET: TEST_WEBHOOK_SECRET,
    JSON_BODY_LIMIT: "100kb",
    WEBHOOK_BODY_LIMIT: "5mb",
});

const { default: app } = await import("../src/app.js");
const { executeQuery, closePool } = await import("../src/config/dbConfig.js");
const {
    extractEventChanges,
    getGitHubDelivery,
    recordGitHubDelivery,
    syncGitHubDeliveryDiff,
    verifyGitHubSignature,
} = await import("../src/services/webhook.service.js");

const runId = Date.now().toString(36);
const TEST_USER_AGENT = `rivet-webhook-test-${runId}`;
const createdEmails = [];
const createdDeliveryIds = [];

let server;
let baseUrl;
let authToken;

function newDeliveryId(label) {
    const id = `gh-deliv-${label}-${runId}-${crypto.randomUUID()}`;
    createdDeliveryIds.push(id);
    return id;
}

function signBody(rawBody, secret = TEST_WEBHOOK_SECRET) {
    const hex = crypto.createHmac("sha256", secret).update(rawBody).digest("hex");
    return `sha256=${hex}`;
}

async function sendWebhook({
    rawBody,
    event = "push",
    deliveryId = newDeliveryId("evt"),
    hookId = "12345678",
    contentType = "application/json",
    signature,
    extraHeaders = {},
}) {
    const buf = Buffer.isBuffer(rawBody) ? rawBody : Buffer.from(rawBody, "utf8");
    const headers = {
        "user-agent": "GitHub-Hookshot/test",
        ...extraHeaders,
    };
    if (contentType !== null) headers["content-type"] = contentType;
    if (event !== null) headers["x-github-event"] = event;
    if (deliveryId !== null) headers["x-github-delivery"] = deliveryId;
    if (hookId !== null) headers["x-github-hook-id"] = hookId;

    const sig = signature === undefined ? signBody(buf) : signature;
    if (sig !== null) headers["x-hub-signature-256"] = sig;

    const res = await fetch(`${baseUrl}/api/v1/webhooks/github`, {
        method: "POST",
        headers,
        body: buf,
    });
    const text = await res.text();
    return { status: res.status, headers: res.headers, body: text ? JSON.parse(text) : null };
}

before(async () => {
    server = app.listen(0);
    await new Promise((resolve) => server.once("listening", resolve));
    baseUrl = `http://127.0.0.1:${server.address().port}`;

    const email = `webhook-test+${runId}@example.com`;
    createdEmails.push(email);
    const reg = await fetch(`${baseUrl}/api/v1/auth/register`, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": TEST_USER_AGENT },
        body: JSON.stringify({ email, password: "correct horse battery", name: "Webhook Tester" }),
    });
    const regJson = await reg.json();
    assert.equal(reg.status, 201);
    authToken = regJson.data.accessToken;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (createdDeliveryIds.length > 0) {
        await executeQuery("DELETE FROM github_webhook_deliveries WHERE delivery_id = ANY($1)", [createdDeliveryIds]);
    }
    if (createdEmails.length > 0) {
        await executeQuery("DELETE FROM users WHERE email = ANY($1)", [createdEmails]);
        await executeQuery("DELETE FROM auth_events WHERE email = ANY($1) OR user_agent = $2", [
            createdEmails,
            TEST_USER_AGENT,
        ]);
    }
    await closePool();
});

describe("github webhook signature & validation", () => {
    test("fails closed when webhook secret is absent", () => {
        const body = Buffer.from('{"zen":"keep it secret"}');
        for (const absentSecret of [null, ""]) {
            assert.throws(
                () => verifyGitHubSignature(body, signBody(body), absentSecret),
                (err) => err.statusCode === 503 && err.code === "WEBHOOK_NOT_CONFIGURED",
            );
        }
    });

    test("rejects missing, malformed, and invalid signatures", async () => {
        const rawBody = JSON.stringify({ zen: "hello" });

        const missing = await sendWebhook({ rawBody, event: "ping", signature: null });
        assert.equal(missing.status, 401);
        assert.equal(missing.body.error.code, "INVALID_WEBHOOK_SIGNATURE");

        const badPrefix = await sendWebhook({ rawBody, event: "ping", signature: `sha1=${"a".repeat(64)}` });
        assert.equal(badPrefix.status, 401);
        assert.equal(badPrefix.body.error.code, "INVALID_WEBHOOK_SIGNATURE");

        const badLength = await sendWebhook({ rawBody, event: "ping", signature: "sha256=deadbeef" });
        assert.equal(badLength.status, 401);
        assert.equal(badLength.body.error.code, "INVALID_WEBHOOK_SIGNATURE");

        const wrongSecret = await sendWebhook({
            rawBody,
            event: "ping",
            signature: signBody(rawBody, "wrong-secret-0123456789"),
        });
        assert.equal(wrongSecret.status, 401);
        assert.equal(wrongSecret.body.error.code, "INVALID_WEBHOOK_SIGNATURE");
    });

    test("rejects missing GitHub headers, invalid JSON, and unsupported media types", async () => {
        const validPayload = JSON.stringify({ repository: { full_name: "org/repo" } });

        const noEvent = await sendWebhook({ rawBody: validPayload, event: null });
        assert.equal(noEvent.status, 400);

        const noDelivery = await sendWebhook({ rawBody: validPayload, deliveryId: null });
        assert.equal(noDelivery.status, 400);

        const badJson = await sendWebhook({ rawBody: "{not-json" });
        assert.equal(badJson.status, 400);

        const wrongType = await sendWebhook({ rawBody: validPayload, contentType: "text/plain" });
        assert.equal(wrongType.status, 415);
        assert.equal(wrongType.body.error.code, "UNSUPPORTED_MEDIA_TYPE");
    });
});

describe("github webhook ingestion & deduplication", () => {
    test("records ping event and echoes zen", async () => {
        const deliveryId = newDeliveryId("ping");
        const payload = {
            zen: "Design for failure.",
            hook_id: 424242,
            repository: { full_name: `rivet/repo-${runId}` },
            sender: { login: "octocat" },
        };

        const res = await sendWebhook({
            rawBody: JSON.stringify(payload),
            event: "ping",
            deliveryId,
            hookId: "424242",
            extraHeaders: { "x-forwarded-for": "192.30.252.1", "x-forwarded-proto": "https" },
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.data.received, true);
        assert.equal(res.body.data.deduplicated, false);
        assert.equal(res.body.data.zen, "Design for failure.");
        assert.equal(res.body.data.delivery.deliveryId, deliveryId);
        assert.equal(res.body.data.delivery.event, "ping");
        assert.equal(res.body.data.delivery.hookId, 424242);
        assert.equal(res.body.data.delivery.repository, `rivet/repo-${runId}`);
        assert.equal(res.body.data.delivery.sender, "octocat");
    });

    test("records push event and preserves raw formatting for HMAC check", async () => {
        const deliveryId = newDeliveryId("push");
        // Deliberately non-compact whitespace so any JSON re-serialization would fail HMAC.
        const rawBody = `{\n  "ref": "refs/heads/main",\n  "repository": { "full_name": "rivet/app-${runId}" },\n  "sender": { "login": "alice" }\n}`;

        const res = await sendWebhook({
            rawBody,
            event: "push",
            deliveryId,
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.data.delivery.event, "push");
        assert.equal(res.body.data.delivery.ref, "refs/heads/main");
        assert.equal(res.body.data.delivery.repository, `rivet/app-${runId}`);
    });

    test("accepts application/x-www-form-urlencoded webhooks", async () => {
        const deliveryId = newDeliveryId("pr-form");
        const payload = {
            action: "opened",
            repository: { full_name: `rivet/app-${runId}` },
            sender: { login: "bob" },
            pull_request: { number: 7, head: { ref: "feat/webhooks" } },
        };
        const rawBody = new URLSearchParams({ payload: JSON.stringify(payload) }).toString();

        const res = await sendWebhook({
            rawBody,
            event: "pull_request",
            deliveryId,
            contentType: "application/x-www-form-urlencoded",
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.data.delivery.event, "pull_request");
        assert.equal(res.body.data.delivery.action, "opened");
        assert.equal(res.body.data.delivery.ref, "feat/webhooks");
    });

    test("accepts payloads larger than JSON_BODY_LIMIT (100kb)", async () => {
        const deliveryId = newDeliveryId("large");
        const payload = {
            ref: "refs/heads/release",
            repository: { full_name: `rivet/large-${runId}` },
            sender: { login: "ci-bot" },
            commits: [{ id: "abc", message: "x".repeat(150_000) }],
        };

        const res = await sendWebhook({
            rawBody: JSON.stringify(payload),
            event: "push",
            deliveryId,
        });

        assert.equal(res.status, 200);
        assert.equal(res.body.data.received, true);
    });

    test("deduplicates repeated X-GitHub-Delivery values idempotently", async () => {
        const deliveryId = newDeliveryId("dedup");
        const rawBody = JSON.stringify({
            action: "completed",
            repository: { full_name: `rivet/ci-${runId}` },
            sender: { login: "github-actions[bot]" },
            workflow_run: { head_branch: "main" },
        });

        const first = await sendWebhook({ rawBody, event: "workflow_run", deliveryId });
        const second = await sendWebhook({ rawBody, event: "workflow_run", deliveryId });

        assert.equal(first.status, 200);
        assert.equal(first.body.data.deduplicated, false);

        assert.equal(second.status, 200);
        assert.equal(second.body.data.deduplicated, true);
        assert.equal(second.body.data.delivery.id, first.body.data.delivery.id);

        const { rows } = await executeQuery(
            "SELECT count(*)::int AS n FROM github_webhook_deliveries WHERE delivery_id = $1",
            [deliveryId],
        );
        assert.equal(rows[0].n, 1);
    });
});

describe("github webhook query API", () => {
    test("requires authentication to read webhook deliveries", async () => {
        const listRes = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries`);
        assert.equal(listRes.status, 401);

        const detailRes = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/some-id`);
        assert.equal(detailRes.status, 401);
    });

    test("lists filtered deliveries and retrieves full payload by id or deliveryId", async () => {
        const deliveryId = newDeliveryId("query");
        const repoName = `rivet/query-${runId}`;
        const payload = {
            action: "published",
            repository: { full_name: repoName },
            sender: { login: "releaser" },
            release: { tag_name: "v1.2.3" },
        };

        const ingest = await sendWebhook({
            rawBody: JSON.stringify(payload),
            event: "release",
            deliveryId,
        });
        assert.equal(ingest.status, 200);
        const dbId = ingest.body.data.delivery.id;

        const listRes = await fetch(
            `${baseUrl}/api/v1/webhooks/github/deliveries?event=release&repository=${encodeURIComponent(repoName)}`,
            { headers: { authorization: `Bearer ${authToken}` } },
        );
        assert.equal(listRes.status, 200);
        const listJson = await listRes.json();
        assert.equal(listJson.data.pagination.total, 1);
        assert.equal(listJson.data.deliveries.length, 1);
        assert.equal(listJson.data.deliveries[0].deliveryId, deliveryId);
        assert.equal(listJson.data.deliveries[0].ref, "v1.2.3");
        assert.equal(listJson.data.deliveries[0].payload, undefined);

        // Fetch by database UUID
        const byIdRes = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/${dbId}`, {
            headers: { authorization: `Bearer ${authToken}` },
        });
        assert.equal(byIdRes.status, 200);
        const byIdJson = await byIdRes.json();
        assert.deepEqual(byIdJson.data.delivery.payload, payload);
        assert.equal(byIdJson.data.delivery.signatureVerified, true);
        assert.equal(byIdJson.data.delivery.headers["x-hub-signature-256"], undefined);

        // Fetch by X-GitHub-Delivery header value
        const byDeliveryRes = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/${deliveryId}`, {
            headers: { authorization: `Bearer ${authToken}` },
        });
        assert.equal(byDeliveryRes.status, 200);
        assert.equal((await byDeliveryRes.json()).data.delivery.id, dbId);

        const missingRes = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/does-not-exist`, {
            headers: { authorization: `Bearer ${authToken}` },
        });
        assert.equal(missingRes.status, 404);
    });

    test("extracts pushed commits/files and fetches code diffs via GitHub API", async () => {
        const deliveryId = newDeliveryId("diff");
        const repoName = `rivet/diff-${runId}`;
        const pushPayload = {
            ref: "refs/heads/main",
            before: "1111111111111111111111111111111111111111",
            after: "2222222222222222222222222222222222222222",
            compare: `https://github.com/${repoName}/compare/1111111...2222222`,
            repository: { full_name: repoName },
            sender: { login: "alice" },
            commits: [
                {
                    id: "2222222222222222222222222222222222222222",
                    message: "feat: add webhook handler",
                    timestamp: "2026-11-25T09:00:00Z",
                    author: { username: "alice" },
                    added: ["src/webhook.js"],
                    modified: ["src/app.js"],
                    removed: ["src/legacy.js"],
                },
            ],
        };

        const extracted = extractEventChanges("push", pushPayload);
        assert.equal(extracted.summary.commitCount, 1);
        assert.deepEqual(extracted.summary.added, ["src/webhook.js"]);
        assert.deepEqual(extracted.summary.modified, ["src/app.js"]);
        assert.deepEqual(extracted.summary.removed, ["src/legacy.js"]);

        const mockFetchSuccess = async (url) => {
            assert.match(url, /\/compare\/1111111111111111111111111111111111111111\.\.\.2222222222222222222222222222222222222222$/);
            return {
                ok: true,
                status: 200,
                json: async () => ({
                    html_url: pushPayload.compare,
                    files: [
                        {
                            filename: "src/webhook.js",
                            status: "added",
                            additions: 12,
                            deletions: 0,
                            changes: 12,
                            patch: "@@ -0,0 +1,2 @@\n+export const ok = true;\n",
                            blob_url: `https://github.com/${repoName}/blob/2222222/src/webhook.js`,
                        },
                    ],
                }),
            };
        };

        const recorded = await recordGitHubDelivery(
            {
                deliveryId,
                event: "push",
                action: null,
                hookId: 99,
                repository: repoName,
                sender: "alice",
                ref: "refs/heads/main",
                payload: pushPayload,
                headers: { "x-github-event": "push" },
            },
            { fetchDiffs: true, fetchFn: mockFetchSuccess, token: undefined },
        );

        assert.equal(recorded.deduplicated, false);
        assert.equal(recorded.delivery.diffStatus, "fetched");
        assert.equal(recorded.delivery.changeSummary.additions, 12);

        const detail = await getGitHubDelivery(deliveryId);
        assert.equal(detail.changes.files.length, 1);
        assert.equal(detail.changes.files[0].patch, "@@ -0,0 +1,2 @@\n+export const ok = true;\n");

        // Graceful failure when GitHub returns 404 (e.g. private repo without GITHUB_TOKEN)
        const syncedFail = await syncGitHubDeliveryDiff(deliveryId, {
            fetchFn: async () => ({ ok: false, status: 404 }),
            token: undefined,
        });
        assert.equal(syncedFail.diffStatus, "failed");
        assert.match(syncedFail.diffError, /GITHUB_TOKEN/);
        assert.equal(syncedFail.changes.commits.length, 1);

        // Endpoint auth + 404 checks
        const unauthSync = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/${deliveryId}/sync-diff`, {
            method: "POST",
        });
        assert.equal(unauthSync.status, 401);

        const missingSync = await fetch(`${baseUrl}/api/v1/webhooks/github/deliveries/does-not-exist/sync-diff`, {
            method: "POST",
            headers: { authorization: `Bearer ${authToken}` },
        });
        assert.equal(missingSync.status, 404);

        // Auto-syncs un-fetched push rows on read when autoSync is enabled
        await executeQuery(
            "UPDATE github_webhook_deliveries SET changes = NULL, diff_status = 'not_applicable', diff_error = NULL WHERE delivery_id = $1",
            [deliveryId],
        );
        const autoSynced = await getGitHubDelivery(deliveryId, {
            autoSync: true,
            fetchFn: mockFetchSuccess,
            token: undefined,
        });
        assert.equal(autoSynced.diffStatus, "fetched");
        assert.equal(autoSynced.changes.files.length, 1);
    });
});
