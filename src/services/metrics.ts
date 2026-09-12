import { Registry, Counter, Gauge } from 'prom-client';
import { getPool } from '../db/client';

// Create a custom registry for StellarNotify metrics
export const register = new Registry();

// Counters for notification lifecycle events
export const notificationsCreatedCounter = new Counter({
  name: 'stellarnotify_notifications_created_total',
  help: 'Total number of notifications created',
  labelNames: ['channel'],
  registers: [register],
});

export const notificationsDeliveredCounter = new Counter({
  name: 'stellarnotify_notifications_delivered_total',
  help: 'Total number of notifications successfully delivered',
  labelNames: ['channel'],
  registers: [register],
});

export const notificationsFailedCounter = new Counter({
  name: 'stellarnotify_notifications_failed_total',
  help: 'Total number of notifications that permanently failed',
  labelNames: ['channel'],
  registers: [register],
});

// Gauges for current system state
export const activeSubscriptionsGauge = new Gauge({
  name: 'stellarnotify_active_subscriptions',
  help: 'Current number of active subscriptions',
  labelNames: ['channel'],
  registers: [register],
  async collect() {
    // This function is called when Prometheus scrapes the endpoint
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT channel, COUNT(*) as count
       FROM subscriptions
       WHERE active = TRUE
         AND (expires_at IS NULL OR expires_at > NOW())
       GROUP BY channel`,
    );

    // Reset gauge before setting new values
    this.reset();

    for (const row of rows) {
      this.set({ channel: row.channel }, parseInt(row.count, 10));
    }
  },
});

export const pendingNotificationsGauge = new Gauge({
  name: 'stellarnotify_pending_notifications',
  help: 'Current number of pending notifications in queue',
  labelNames: ['status'],
  registers: [register],
  async collect() {
    const pool = getPool();
    const { rows } = await pool.query(
      `SELECT status, COUNT(*) as count
       FROM notifications
       WHERE status IN ('Pending', 'Retrying')
       GROUP BY status`,
    );

    // Reset gauge before setting new values
    this.reset();

    for (const row of rows) {
      this.set({ status: row.status }, parseInt(row.count, 10));
    }
  },
});

/**
 * Increment notification created counter
 */
export function recordNotificationCreated(channel: string): void {
  notificationsCreatedCounter.inc({ channel });
}

/**
 * Increment notification delivered counter
 */
export function recordNotificationDelivered(channel: string): void {
  notificationsDeliveredCounter.inc({ channel });
}

/**
 * Increment notification failed counter
 */
export function recordNotificationFailed(channel: string): void {
  notificationsFailedCounter.inc({ channel });
}
