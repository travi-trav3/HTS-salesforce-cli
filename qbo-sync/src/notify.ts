import { loadConfig } from './config.js';
import { logger } from './logger.js';

type FetchLike = typeof fetch;

/**
 * Deliver an ops alert to an incoming webhook (Slack/Discord/Teams all accept
 * a JSON body with a `text` field). Pure-ish and injectable for testing.
 *
 * Delivery failures are swallowed and logged, never thrown: an alert about a
 * failure must not itself cause a failure that masks the original problem.
 * Returns true if delivery was attempted and succeeded.
 */
export async function deliverOpsAlert(
  url: string | undefined,
  subject: string,
  body: string,
  fetchImpl: FetchLike = fetch,
): Promise<boolean> {
  if (!url) return false;
  try {
    const res = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: `*${subject}*\n${body}` }),
    });
    if (!res.ok) {
      logger.error({ status: res.status }, 'ops alert webhook returned non-2xx');
      return false;
    }
    return true;
  } catch (err) {
    logger.error({ err }, 'ops alert webhook delivery threw');
    return false;
  }
}

/**
 * Send an operational alert for technical failures (dead-letter, SF/QBO down).
 * Always logs at error level so the alert is visible in Fly logs / log drains;
 * additionally posts to OPS_ALERT_WEBHOOK_URL when configured.
 *
 * Business-level cases (no PO match, ambiguous, non-USD) do NOT come here —
 * those go to the needs_attention table and Amanda's Salesforce notification.
 */
export async function sendOpsAlert(subject: string, body: string): Promise<void> {
  const cfg = loadConfig();
  logger.error(
    { opsAlert: true, subject, recipient: cfg.OPS_ALERT_EMAIL ?? '(unconfigured)' },
    `OPS ALERT: ${subject} — ${body}`,
  );
  const delivered = await deliverOpsAlert(cfg.OPS_ALERT_WEBHOOK_URL, subject, body);
  if (!delivered && !cfg.OPS_ALERT_WEBHOOK_URL) {
    // No channel configured — logging is the only delivery. Documented in RUNBOOK.
    logger.warn('no OPS_ALERT_WEBHOOK_URL configured; ops alert was logged only');
  }
}
