import axios from 'axios';
import { WebhookPayload } from '../types';

const TIMEOUT_MS = parseInt(process.env.WEBHOOK_TIMEOUT_MS ?? '5000', 10);

/**
 * Delivers a webhook payload via HTTP POST to the target URL.
 *
 * Isolated from retry/dispatch logic so it can be mocked independently
 * in unit tests and reused by any future delivery adapter.
 *
 * @param url     - The subscriber's registered webhook endpoint.
 * @param payload - The structured notification payload to deliver.
 * @throws        If the HTTP response status is outside the 2xx range,
 *                or if the request times out / network fails.
 */
export async function deliverWebhook(
  url: string,
  payload: WebhookPayload,
): Promise<void> {
  await axios.post(url, payload, {
    timeout: TIMEOUT_MS,
    headers: { 'Content-Type': 'application/json' },
    validateStatus: (status) => status >= 200 && status < 300,
  });
}
