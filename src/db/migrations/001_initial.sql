-- Migration 001: initial schema

-- Tracks the last ingested ledger so the worker can resume after restart
CREATE TABLE IF NOT EXISTS ingest_cursor (
  id          SMALLINT PRIMARY KEY DEFAULT 1,
  last_ledger BIGINT   NOT NULL DEFAULT 0,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT  single_row CHECK (id = 1)
);

INSERT INTO ingest_cursor (id, last_ledger)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

-- Registry of webhook / delivery endpoints (hash → URL mapping)
CREATE TABLE IF NOT EXISTS endpoint_registry (
  hash        TEXT PRIMARY KEY,
  url         TEXT        NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Subscriptions registered by wallet owners
CREATE TABLE IF NOT EXISTS subscriptions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  owner           TEXT        NOT NULL,
  contract_id     TEXT        NOT NULL,
  topic_filters   TEXT[]      NOT NULL DEFAULT '{}',
  channel         TEXT        NOT NULL CHECK (channel IN ('Webhook', 'InApp', 'OnChain')),
  endpoint_hash   TEXT        REFERENCES endpoint_registry (hash),
  active          BOOLEAN     NOT NULL DEFAULT TRUE,
  expires_at      TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_contract_id
  ON subscriptions (contract_id)
  WHERE active = TRUE;

CREATE INDEX IF NOT EXISTS idx_subscriptions_owner
  ON subscriptions (owner);

-- Persisted notification delivery records
CREATE TABLE IF NOT EXISTS notifications (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id  UUID        NOT NULL REFERENCES subscriptions (id) ON DELETE CASCADE,
  event_payload    JSONB       NOT NULL,
  channel          TEXT        NOT NULL CHECK (channel IN ('Webhook', 'InApp', 'OnChain')),
  status           TEXT        NOT NULL DEFAULT 'Pending'
                               CHECK (status IN ('Pending', 'Delivered', 'Failed', 'Retrying')),
  attempts         SMALLINT    NOT NULL DEFAULT 0,
  next_retry_at    TIMESTAMPTZ,
  last_error       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_status
  ON notifications (status)
  WHERE status IN ('Pending', 'Retrying');

CREATE INDEX IF NOT EXISTS idx_notifications_subscription_id
  ON notifications (subscription_id);
