import { loadConfig } from './config.js';
import { getPool } from './db.js';
import { logger } from './logger.js';
import { QboClient } from './qbo/client.js';
import { SalesforceClient } from './sf/client.js';
import type { SyncPorts, AttentionReason, AttentionContext } from './sync.js';

/**
 * Wire the production SyncPorts from real clients + Postgres. The pure
 * orchestration in sync.ts depends only on these ports, never on the concrete
 * clients, which is what keeps it unit-testable.
 */
export function buildSyncPorts(): SyncPorts {
  const cfg = loadConfig();
  const qbo = new QboClient(cfg);
  const sf = new SalesforceClient(cfg);
  const pool = getPool();

  return {
    qbo,
    sf,
    poField: {
      fieldName: cfg.QBO_PO_FIELD_NAME,
      definitionId: cfg.QBO_PO_FIELD_DEFINITION_ID,
    },

    async flagAttention(reason: AttentionReason, ctx: AttentionContext) {
      await pool.query(
        `INSERT INTO needs_attention (reason, qbo_entity_id, po_number, details)
         VALUES ($1, $2, $3, $4)`,
        [reason, ctx.qboEntityId ?? null, ctx.poNumber ?? null, ctx.details ?? {}],
      );
      logger.warn({ reason, ...ctx }, 'flagged for human attention');
    },

    async lookupInvoicePo(invoiceId: string) {
      const { rows } = await pool.query<{ po_number: string }>(
        'SELECT po_number FROM invoice_po_map WHERE invoice_id = $1',
        [invoiceId],
      );
      return rows[0]?.po_number ?? null;
    },

    async recordInvoicePo(invoiceId: string, poNumber: string, workOrderId: string | null) {
      await pool.query(
        `INSERT INTO invoice_po_map (invoice_id, po_number, work_order_id, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (invoice_id)
         DO UPDATE SET po_number = EXCLUDED.po_number,
                       work_order_id = EXCLUDED.work_order_id,
                       updated_at = now()`,
        [invoiceId, poNumber, workOrderId],
      );
    },
  };
}
