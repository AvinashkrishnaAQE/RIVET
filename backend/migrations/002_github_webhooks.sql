-- GitHub webhook delivery log: stores verified incoming GitHub webhook events
-- with delivery-ID idempotency and indexed metadata for querying.

CREATE TABLE github_webhook_deliveries (
  id                 uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  delivery_id        text        NOT NULL,
  event              text        NOT NULL,
  action             text,
  hook_id            bigint,
  repository         text,
  sender             text,
  ref                text,
  signature_verified boolean     NOT NULL DEFAULT true,
  status             text        NOT NULL DEFAULT 'processed',
  payload            jsonb       NOT NULL,
  headers            jsonb       NOT NULL DEFAULT '{}'::jsonb,
  received_at        timestamptz NOT NULL DEFAULT now(),
  processed_at       timestamptz,
  CONSTRAINT github_webhook_deliveries_delivery_id_key UNIQUE (delivery_id),
  CONSTRAINT github_webhook_deliveries_status_check CHECK (status IN ('processed', 'ignored', 'failed'))
);

CREATE INDEX github_webhook_deliveries_event_idx
  ON github_webhook_deliveries (event, received_at DESC);

CREATE INDEX github_webhook_deliveries_repo_idx
  ON github_webhook_deliveries (repository, received_at DESC)
  WHERE repository IS NOT NULL;

CREATE INDEX github_webhook_deliveries_received_idx
  ON github_webhook_deliveries (received_at DESC);
