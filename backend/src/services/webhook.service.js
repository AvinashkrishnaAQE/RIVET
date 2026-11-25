import crypto from "node:crypto";
import { executeQuery } from "../config/dbConfig.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/api-error.js";
import { logger } from "../utils/logger.js";

const SIGNATURE_PREFIX = "sha256=";
const SHA256_HEX_RE = /^[0-9a-f]{64}$/i;
const REPO_FULL_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const ZERO_SHA = "0000000000000000000000000000000000000000";
const MAX_PATCH_BYTES = 200_000;

const SAFE_GITHUB_HEADERS = [
    "x-github-event",
    "x-github-delivery",
    "x-github-hook-id",
    "x-github-hook-installation-target-id",
    "x-github-hook-installation-target-type",
    "user-agent",
];

const DELIVERY_SUMMARY_COLUMNS = `
    id,
    delivery_id AS "deliveryId",
    event,
    action,
    hook_id AS "hookId",
    repository,
    sender,
    ref,
    status,
    diff_status AS "diffStatus",
    diff_error AS "diffError",
    received_at AS "receivedAt",
    processed_at AS "processedAt"
`;

function formatDeliverySummary(row) {
    return {
        id: row.id,
        deliveryId: row.deliveryId,
        event: row.event,
        action: row.action,
        hookId: row.hookId === null || row.hookId === undefined ? null : Number(row.hookId),
        repository: row.repository,
        sender: row.sender,
        ref: row.ref,
        status: row.status,
        diffStatus: row.diffStatus ?? "not_applicable",
        diffError: row.diffError ?? null,
        changeSummary: row.changeSummary ?? null,
        receivedAt: row.receivedAt,
        processedAt: row.processedAt,
    };
}

function formatDeliveryDetail(row) {
    const resolvedChanges = row.changes ?? extractEventChanges(row.event, row.payload);
    return {
        ...formatDeliverySummary({
            ...row,
            changeSummary: resolvedChanges?.summary ?? null,
        }),
        signatureVerified: row.signatureVerified,
        changes: resolvedChanges,
        payload: row.payload,
        headers: row.headers,
    };
}

/**
 * Verifies GitHub's `X-Hub-Signature-256` HMAC-SHA256 signature over the exact
 * raw body bytes using constant-time comparison. Fails closed if the server
 * secret is not configured.
 */
export function verifyGitHubSignature(rawBody, signatureHeader, secret = env.GITHUB_WEBHOOK_SECRET) {
    if (!secret) {
        throw new ApiError(503, "WEBHOOK_NOT_CONFIGURED", "GitHub webhook secret is not configured");
    }

    if (!Buffer.isBuffer(rawBody)) {
        throw ApiError.badRequest("Webhook request body must be raw bytes");
    }

    if (typeof signatureHeader !== "string" || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
        throw ApiError.unauthorized("Missing or malformed webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    }

    const providedHex = signatureHeader.slice(SIGNATURE_PREFIX.length);
    if (!SHA256_HEX_RE.test(providedHex)) {
        throw ApiError.unauthorized("Malformed webhook signature", "INVALID_WEBHOOK_SIGNATURE");
    }

    const expectedDigest = crypto.createHmac("sha256", secret).update(rawBody).digest();
    const providedDigest = Buffer.from(providedHex, "hex");

    if (!crypto.timingSafeEqual(expectedDigest, providedDigest)) {
        throw ApiError.unauthorized("Webhook signature verification failed", "INVALID_WEBHOOK_SIGNATURE");
    }
}

/**
 * Parses a verified GitHub webhook body supporting both `application/json`
 * and `application/x-www-form-urlencoded` (`payload=<json>`).
 */
export function parseGitHubPayload(rawBody, contentType = "") {
    if (!Buffer.isBuffer(rawBody) || rawBody.length === 0) {
        throw ApiError.badRequest("Webhook payload cannot be empty");
    }

    const mediaType = String(contentType).split(";")[0].trim().toLowerCase();
    let jsonText;

    if (mediaType === "application/x-www-form-urlencoded") {
        const params = new URLSearchParams(rawBody.toString("utf8"));
        jsonText = params.get("payload");
        if (!jsonText) {
            throw ApiError.badRequest("Form-encoded webhook must include a 'payload' field");
        }
    } else if (mediaType === "" || mediaType === "application/json" || mediaType.endsWith("+json")) {
        jsonText = rawBody.toString("utf8");
    } else {
        throw new ApiError(
            415,
            "UNSUPPORTED_MEDIA_TYPE",
            "Unsupported webhook content type; expected application/json or application/x-www-form-urlencoded",
        );
    }

    let parsed;
    try {
        parsed = JSON.parse(jsonText);
    } catch {
        throw ApiError.badRequest("Webhook body is not valid JSON");
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw ApiError.badRequest("Webhook payload must be a JSON object");
    }

    return parsed;
}

function extractRef(payload) {
    const candidates = [
        payload.ref,
        payload.pull_request?.head?.ref,
        payload.workflow_run?.head_branch,
        payload.check_suite?.head_branch,
        payload.release?.tag_name,
    ];
    for (const candidate of candidates) {
        if (typeof candidate === "string" && candidate.trim()) return candidate.trim();
    }
    return null;
}

function extractSafeHeaders(req) {
    const collected = {};
    for (const name of SAFE_GITHUB_HEADERS) {
        const value = req.get(name);
        if (value !== undefined && value !== "") collected[name] = value;
    }
    return collected;
}

export function extractDeliveryMetadata(req, parsedHeaders, payload) {
    const hookIdFromPayload = Number.isInteger(payload.hook_id) && payload.hook_id > 0 ? payload.hook_id : null;

    return {
        deliveryId: parsedHeaders["x-github-delivery"],
        event: parsedHeaders["x-github-event"],
        hookId: parsedHeaders["x-github-hook-id"] ?? hookIdFromPayload,
        action: typeof payload.action === "string" && payload.action.trim() ? payload.action.trim() : null,
        repository: typeof payload.repository?.full_name === "string" ? payload.repository.full_name : null,
        sender: typeof payload.sender?.login === "string" ? payload.sender.login : null,
        ref: extractRef(payload),
        headers: extractSafeHeaders(req),
    };
}

function toStringArray(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string" && item.length > 0) : [];
}

function normalizeCommit(commit) {
    const sha = typeof commit?.id === "string" ? commit.id : "";
    return {
        sha,
        shortSha: sha.slice(0, 7),
        message: typeof commit?.message === "string" ? commit.message : "",
        author: commit?.author?.username || commit?.author?.name || commit?.committer?.name || null,
        timestamp: typeof commit?.timestamp === "string" ? commit.timestamp : null,
        url: typeof commit?.url === "string" ? commit.url : null,
        added: toStringArray(commit?.added),
        modified: toStringArray(commit?.modified),
        removed: toStringArray(commit?.removed),
    };
}

/**
 * Extracts commit and changed-file metadata directly from the webhook payload
 * (without network I/O) so file lists are always captured immediately.
 */
export function extractEventChanges(event, payload) {
    if (!payload || typeof payload !== "object") return null;

    if (event === "push") {
        const rawCommits = Array.isArray(payload.commits) && payload.commits.length > 0
            ? payload.commits
            : payload.head_commit
                ? [payload.head_commit]
                : [];
        const commits = rawCommits.map(normalizeCommit);

        const addedSet = new Set();
        const modifiedSet = new Set();
        const removedSet = new Set();
        for (const commit of commits) {
            for (const f of commit.added) addedSet.add(f);
            for (const f of commit.modified) modifiedSet.add(f);
            for (const f of commit.removed) removedSet.add(f);
        }

        const added = [...addedSet];
        const modified = [...modifiedSet];
        const removed = [...removedSet];
        const files = [
            ...added.map((filename) => ({ filename, previousFilename: null, status: "added", additions: null, deletions: null, changes: null, patch: null, blobUrl: null })),
            ...modified.map((filename) => ({ filename, previousFilename: null, status: "modified", additions: null, deletions: null, changes: null, patch: null, blobUrl: null })),
            ...removed.map((filename) => ({ filename, previousFilename: null, status: "removed", additions: null, deletions: null, changes: null, patch: null, blobUrl: null })),
        ];

        return {
            summary: {
                commitCount: commits.length,
                added,
                modified,
                removed,
                totalFiles: files.length,
                additions: null,
                deletions: null,
            },
            compareUrl: typeof payload.compare === "string" ? payload.compare : null,
            before: typeof payload.before === "string" ? payload.before : null,
            after: typeof payload.after === "string" ? payload.after : null,
            forced: Boolean(payload.forced),
            commits,
            files,
        };
    }

    if (event === "pull_request" && payload.pull_request && typeof payload.pull_request === "object") {
        const pr = payload.pull_request;
        return {
            summary: {
                commitCount: Number.isInteger(pr.commits) ? pr.commits : null,
                added: [],
                modified: [],
                removed: [],
                totalFiles: Number.isInteger(pr.changed_files) ? pr.changed_files : 0,
                additions: Number.isInteger(pr.additions) ? pr.additions : null,
                deletions: Number.isInteger(pr.deletions) ? pr.deletions : null,
            },
            compareUrl: typeof pr.html_url === "string" ? `${pr.html_url}/files` : null,
            pullRequest: {
                number: pr.number,
                title: pr.title ?? "",
                url: pr.html_url ?? null,
                state: pr.state ?? null,
                merged: Boolean(pr.merged),
                headRef: pr.head?.ref ?? null,
                baseRef: pr.base?.ref ?? null,
            },
            commits: [],
            files: [],
        };
    }

    return null;
}

function truncatePatch(patch) {
    if (typeof patch !== "string") return null;
    if (Buffer.byteLength(patch, "utf8") <= MAX_PATCH_BYTES) return patch;
    return `${patch.slice(0, MAX_PATCH_BYTES)}\n... [diff truncated at ${MAX_PATCH_BYTES} chars]`;
}

function normalizeApiFile(file) {
    return {
        filename: String(file.filename ?? ""),
        previousFilename: typeof file.previous_filename === "string" ? file.previous_filename : null,
        status: typeof file.status === "string" ? file.status : "modified",
        additions: Number(file.additions ?? 0),
        deletions: Number(file.deletions ?? 0),
        changes: Number(file.changes ?? 0),
        patch: truncatePatch(file.patch),
        blobUrl: typeof file.blob_url === "string" ? file.blob_url : null,
    };
}

function buildDiffApiTarget(event, repository, payload) {
    if (!repository || !REPO_FULL_NAME_RE.test(repository)) return null;

    if (event === "push") {
        const after = typeof payload?.after === "string" ? payload.after : "";
        const before = typeof payload?.before === "string" ? payload.before : "";
        if (!after || after === ZERO_SHA || before === after) return null;

        if (before && before !== ZERO_SHA) {
            return {
                mode: "compare",
                url: `https://api.github.com/repos/${repository}/compare/${encodeURIComponent(before)}...${encodeURIComponent(after)}`,
            };
        }
        return {
            mode: "commit",
            url: `https://api.github.com/repos/${repository}/commits/${encodeURIComponent(after)}`,
        };
    }

    if (event === "pull_request" && Number.isInteger(payload?.pull_request?.number)) {
        return {
            mode: "pull_files",
            url: `https://api.github.com/repos/${repository}/pulls/${payload.pull_request.number}/files?per_page=100`,
        };
    }

    return null;
}

/**
 * Fetches changed file patches (`files[].patch`) from GitHub's REST API for `push`
 * and `pull_request` events within a bounded timeout so webhook responses stay fast.
 */
export async function fetchGitHubEventDiff({
    event,
    repository,
    payload,
    fetchFn = fetch,
    token = env.GITHUB_TOKEN,
    timeoutMs = env.GITHUB_API_TIMEOUT_MS,
}) {
    const target = buildDiffApiTarget(event, repository, payload);
    if (!target) {
        return { diffStatus: "not_applicable", diffError: null, files: null, compareUrl: null };
    }

    const headers = {
        accept: "application/vnd.github+json",
        "user-agent": "RIVET-Webhook-Client",
        "x-github-api-version": "2022-11-28",
    };
    if (token) headers.authorization = `Bearer ${token}`;

    try {
        const res = await fetchFn(target.url, {
            headers,
            signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok) {
            const hint =
                !token && (res.status === 401 || res.status === 403 || res.status === 404)
                    ? `GitHub API returned ${res.status} for ${repository}. If this repo is private, set GITHUB_TOKEN in backend/.env.local and sync again.`
                    : `GitHub API returned ${res.status} while fetching code diff for ${repository}.`;
            return { diffStatus: "failed", diffError: hint, files: null, compareUrl: null };
        }

        const data = await res.json();
        const rawFiles = target.mode === "pull_files" ? (Array.isArray(data) ? data : []) : (Array.isArray(data?.files) ? data.files : []);
        const files = rawFiles.map(normalizeApiFile);
        const compareUrl = typeof data?.html_url === "string" ? data.html_url : null;

        return { diffStatus: "fetched", diffError: null, files, compareUrl };
    } catch (error) {
        const diffError =
            error?.name === "TimeoutError" || error?.name === "AbortError"
                ? `Timed out after ${timeoutMs}ms fetching code diff from GitHub API.`
                : error?.message || "Failed to fetch code diff from GitHub API.";
        return { diffStatus: "failed", diffError, files: null, compareUrl: null };
    }
}

function mergeDiffIntoChanges(baseChanges, diffResult) {
    if (!baseChanges) return null;
    if (!Array.isArray(diffResult?.files)) return baseChanges;

    const added = [];
    const modified = [];
    const removed = [];
    let additions = 0;
    let deletions = 0;

    for (const file of diffResult.files) {
        additions += file.additions ?? 0;
        deletions += file.deletions ?? 0;
        if (file.status === "added") added.push(file.filename);
        else if (file.status === "removed") removed.push(file.filename);
        else modified.push(file.filename);
    }

    return {
        ...baseChanges,
        compareUrl: diffResult.compareUrl ?? baseChanges.compareUrl,
        summary: {
            ...baseChanges.summary,
            added: added.length > 0 || baseChanges.summary.added.length === 0 ? added : baseChanges.summary.added,
            modified: modified.length > 0 || baseChanges.summary.modified.length === 0 ? modified : baseChanges.summary.modified,
            removed: removed.length > 0 || baseChanges.summary.removed.length === 0 ? removed : baseChanges.summary.removed,
            totalFiles: diffResult.files.length,
            additions,
            deletions,
        },
        files: diffResult.files,
    };
}

/**
 * Persists a verified GitHub webhook delivery idempotently by `delivery_id`.
 * Extracts commit/file changes from the payload immediately and enriches with
 * GitHub REST API code diffs when enabled.
 */
export async function recordGitHubDelivery(
    { deliveryId, event, action, hookId, repository, sender, ref, payload, headers },
    { fetchDiffs = env.githubFetchDiffs, fetchFn = fetch, token = env.GITHUB_TOKEN } = {},
) {
    let changes = extractEventChanges(event, payload);
    const hasDiffTarget = Boolean(changes && buildDiffApiTarget(event, repository, payload));
    let diffStatus = hasDiffTarget ? "skipped" : "not_applicable";
    let diffError = null;

    const { rows } = await executeQuery(
        `INSERT INTO github_webhook_deliveries (
            delivery_id, event, action, hook_id, repository, sender, ref,
            signature_verified, status, payload, headers, changes, diff_status, diff_error, processed_at
         )
         VALUES ($1, $2, $3, $4, $5, $6, $7, true, 'processed', $8::jsonb, $9::jsonb, $10::jsonb, $11, $12, now())
         ON CONFLICT (delivery_id) DO NOTHING
         RETURNING ${DELIVERY_SUMMARY_COLUMNS}, changes->'summary' AS "changeSummary"`,
        [
            deliveryId,
            event,
            action,
            hookId,
            repository,
            sender,
            ref,
            JSON.stringify(payload),
            JSON.stringify(headers),
            changes ? JSON.stringify(changes) : null,
            diffStatus,
            diffError,
        ],
    );

    if (rows.length === 0) {
        const existing = await executeQuery(
            `SELECT ${DELIVERY_SUMMARY_COLUMNS}, changes->'summary' AS "changeSummary"
             FROM github_webhook_deliveries
             WHERE delivery_id = $1`,
            [deliveryId],
        );

        const delivery = formatDeliverySummary(existing.rows[0]);
        logger.info(
            {
                deliveryId: delivery.deliveryId,
                event: delivery.event,
                repository: delivery.repository,
                deduplicated: true,
            },
            "Duplicate GitHub webhook delivery ignored",
        );
        return { deduplicated: true, delivery };
    }

    let recordedRow = rows[0];

    if (fetchDiffs && hasDiffTarget) {
        const diffResult = await fetchGitHubEventDiff({ event, repository, payload, fetchFn, token });
        diffStatus = diffResult.diffStatus;
        diffError = diffResult.diffError;
        changes = mergeDiffIntoChanges(changes, diffResult);

        const updated = await executeQuery(
            `UPDATE github_webhook_deliveries
             SET changes = $2::jsonb, diff_status = $3, diff_error = $4
             WHERE id = $1
             RETURNING ${DELIVERY_SUMMARY_COLUMNS}, changes->'summary' AS "changeSummary"`,
            [recordedRow.id, changes ? JSON.stringify(changes) : null, diffStatus, diffError],
        );
        recordedRow = updated.rows[0];
    }

    const delivery = formatDeliverySummary(recordedRow);
    const logFields = {
        deliveryId: delivery.deliveryId,
        event: delivery.event,
        action: delivery.action,
        repository: delivery.repository,
        sender: delivery.sender,
        ref: delivery.ref,
        deduplicated: false,
    };

    if (changes?.summary) {
        Object.assign(logFields, {
            commits: changes.summary.commitCount,
            addedFiles: changes.summary.added,
            modifiedFiles: changes.summary.modified,
            removedFiles: changes.summary.removed,
            diffStatus: delivery.diffStatus,
        });
    }

    logger.info(logFields, "GitHub webhook delivery recorded");
    return { deduplicated: false, delivery };
}

export async function listGitHubDeliveries({ event, repository, status, limit, offset }) {
    const conditions = [];
    const params = [];

    if (event) {
        params.push(event);
        conditions.push(`event = $${params.length}`);
    }
    if (repository) {
        params.push(repository);
        conditions.push(`repository = $${params.length}`);
    }
    if (status) {
        params.push(status);
        conditions.push(`status = $${params.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limitParam = params.length + 1;
    const offsetParam = params.length + 2;

    const [countResult, listResult] = await Promise.all([
        executeQuery(`SELECT count(*)::int AS total FROM github_webhook_deliveries ${whereClause}`, params),
        executeQuery(
            `SELECT ${DELIVERY_SUMMARY_COLUMNS},
                    COALESCE(
                        changes->'summary',
                        CASE
                            WHEN event = 'push' THEN jsonb_build_object(
                                'commitCount',
                                jsonb_array_length(COALESCE(payload->'commits', '[]'::jsonb))
                            )
                            ELSE NULL
                        END
                    ) AS "changeSummary"
             FROM github_webhook_deliveries
             ${whereClause}
             ORDER BY received_at DESC, id DESC
             LIMIT $${limitParam} OFFSET $${offsetParam}`,
            [...params, limit, offset],
        ),
    ]);

    return {
        deliveries: listResult.rows.map(formatDeliverySummary),
        pagination: {
            total: countResult.rows[0].total,
            limit,
            offset,
        },
    };
}

export async function getGitHubDelivery(idOrDeliveryId) {
    const { rows } = await executeQuery(
        `SELECT ${DELIVERY_SUMMARY_COLUMNS},
                signature_verified AS "signatureVerified",
                changes,
                payload,
                headers
         FROM github_webhook_deliveries
         WHERE id::text = $1 OR delivery_id = $1
         LIMIT 1`,
        [idOrDeliveryId],
    );

    return rows[0] ? formatDeliveryDetail(rows[0]) : null;
}

/**
 * Re-fetches and persists code diffs from the GitHub REST API for an already
 * stored `push` or `pull_request` delivery.
 */
export async function syncGitHubDeliveryDiff(
    idOrDeliveryId,
    { fetchFn = fetch, token = env.GITHUB_TOKEN } = {},
) {
    const existing = await getGitHubDelivery(idOrDeliveryId);
    if (!existing) return null;

    const baseChanges = existing.changes ?? extractEventChanges(existing.event, existing.payload);
    const diffResult = await fetchGitHubEventDiff({
        event: existing.event,
        repository: existing.repository,
        payload: existing.payload,
        fetchFn,
        token,
    });

    const updatedChanges = mergeDiffIntoChanges(baseChanges, diffResult);

    const { rows } = await executeQuery(
        `UPDATE github_webhook_deliveries
         SET changes = $2::jsonb, diff_status = $3, diff_error = $4
         WHERE id = $1
         RETURNING ${DELIVERY_SUMMARY_COLUMNS},
                   signature_verified AS "signatureVerified",
                   changes,
                   payload,
                   headers`,
        [
            existing.id,
            updatedChanges ? JSON.stringify(updatedChanges) : null,
            diffResult.diffStatus,
            diffResult.diffError,
        ],
    );

    return formatDeliveryDetail(rows[0]);
}
