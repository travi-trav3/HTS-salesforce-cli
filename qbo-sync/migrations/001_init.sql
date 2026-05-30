-- hts-qbo-sync schema. Idempotent: safe to run repeatedly.
-- pg-boss manages its own tables in its own schema; these are app tables.

-- Raw inbound events from the QBO webhook and the CDC poller. The work queue
-- (pg-boss) references these by event_id. Kept >= 90 days for replay-attack
-- defence and forensics.
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id      text PRIMARY KEY,            -- QBO eventNotification id, or synthetic for CDC
  source        text NOT NULL,               -- 'webhook' | 'cdc_poll'
  realm_id      text NOT NULL,
  payload       jsonb NOT NULL,
  received_at   timestamptz NOT NULL DEFAULT now(),
  status        text NOT NULL DEFAULT 'pending',  -- pending|processing|done|dead_letter
  attempts      int  NOT NULL DEFAULT 0,
  last_error    text,
  processed_at  timestamptz
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON webhook_events (status, received_at)
  WHERE status IN ('pending', 'processing');

-- Per-(entity,lastUpdated) idempotency for the CDC path, which has no native
-- event id. A row here means "already enqueued"; replays are no-ops.
CREATE TABLE IF NOT EXISTS processed_entities (
  entity_type   text NOT NULL,
  entity_id     text NOT NULL,
  last_updated  timestamptz NOT NULL,
  seen_at       timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (entity_type, entity_id, last_updated)
);

-- Business-level cases a human (Amanda) must resolve. Distinct from technical
-- failures, which go to the pg-boss dead-letter path + ops email.
CREATE TABLE IF NOT EXISTS needs_attention (
  id            bigserial PRIMARY KEY,
  reason        text NOT NULL,               -- no_match|ambiguous_match|non_usd|schema_drift
  qbo_entity_id text,
  po_number     text,
  details       jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  resolved_at   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_needs_attention_unresolved
  ON needs_attention (created_at)
  WHERE resolved_at IS NULL;

-- Key/value runtime state: reconciliation gate, CDC high-water mark, etc.
CREATE TABLE IF NOT EXISTS system_meta (
  key         text PRIMARY KEY,
  value       jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- QBO OAuth tokens (single realm). Access tokens are short-lived; refresh
-- tokens roll ~every 100 days of inactivity. Stored encrypted-at-rest by the
-- managed Postgres provider; never logged.
CREATE TABLE IF NOT EXISTS qbo_tokens (
  realm_id              text PRIMARY KEY,
  access_token          text NOT NULL,
  refresh_token         text NOT NULL,
  access_expires_at     timestamptz NOT NULL,
  refresh_expires_at    timestamptz NOT NULL,
  updated_at            timestamptz NOT NULL DEFAULT now()
);
