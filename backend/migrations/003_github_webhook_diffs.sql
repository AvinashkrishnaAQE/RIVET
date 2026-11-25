-- Stores extracted commit/file change summaries and optional GitHub API code diffs
-- for incoming webhook deliveries.

ALTER TABLE github_webhook_deliveries
  ADD COLUMN changes jsonb,
  ADD COLUMN diff_status text NOT NULL DEFAULT 'not_applicable',
  ADD COLUMN diff_error text;

ALTER TABLE github_webhook_deliveries
  ADD CONSTRAINT github_webhook_deliveries_diff_status_check
  CHECK (diff_status IN ('not_applicable', 'fetched', 'failed', 'skipped'));
