-- Migration 002: index on notifications.created_at for paginated queries

CREATE INDEX IF NOT EXISTS idx_notifications_created_at
  ON notifications (created_at DESC);
