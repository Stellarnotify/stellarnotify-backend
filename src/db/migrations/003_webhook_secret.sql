-- Migration 003: add webhook_secret column for signature verification

ALTER TABLE subscriptions
ADD COLUMN webhook_secret TEXT;

COMMENT ON COLUMN subscriptions.webhook_secret IS 'HMAC secret for webhook signature verification (optional)';
