import { loadConfig } from './config.js';
import { logger } from './logger.js';

/**
 * Send an operational alert (technical failures: dead-letter, SF/QBO down).
 *
 * No email provider is wired yet — this is an intentional integration point,
 * not a stub pretending to send mail. Today it logs at error level so the
 * alert is at least visible in Fly logs / log drains. Before go-live, wire one
 * of: Fly's built-in log alerts, a transactional email provider (Resend,
 * Postmark, SES), or a Slack webhook. Set OPS_ALERT_EMAIL and implement here.
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
  // TODO(go-live): deliver via email/Slack. Throwing here would risk masking
  // the original failure, so delivery errors must be swallowed and logged.
}
