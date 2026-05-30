import { loadConfig } from '../src/config.js';
import { logger } from '../src/logger.js';
import { closePool } from '../src/db.js';
import { buildSyncPorts } from '../src/ports.js';
import { processInvoiceChange } from '../src/sync.js';
import type { QboEntityChange } from '../src/qbo/types.js';

/**
 * Run a single real QBO invoice through the full pipeline (fetch -> extract PO
 * -> match WO -> recompute) against your configured sandbox + Salesforce, and
 * print what it WOULD write. Read-only by default — Salesforce is not modified
 * unless you pass --apply.
 *
 *   npm run dry-run -- <qbo-invoice-id>
 *   npm run dry-run -- <qbo-invoice-id> --apply        # actually writes to SF
 *   npm run dry-run -- <qbo-invoice-id> --op Delete
 *
 * Use this once your sandbox has an invoice with the PO custom field set and a
 * matching open Work Order exists in Salesforce.
 */
async function main(): Promise<void> {
  loadConfig();
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const opIdx = args.indexOf('--op');
  const operation = (opIdx >= 0 ? args[opIdx + 1] : 'Create') as QboEntityChange['operation'];
  const invoiceId = args.find((a) => !a.startsWith('--') && a !== operation);

  if (!invoiceId) {
    logger.error('usage: npm run dry-run -- <qbo-invoice-id> [--op Create|Update|Delete] [--apply]');
    process.exit(2);
  }

  const realPorts = buildSyncPorts();
  // Wrap the write + attention side-effects so a dry run is observable and inert.
  const ports = apply
    ? realPorts
    : {
        ...realPorts,
        sf: {
          queryOpenWorkOrders: realPorts.sf.queryOpenWorkOrders.bind(realPorts.sf),
          async updateWorkOrderTotals(id: string, amount: number, date: string | null) {
            logger.info({ id, amount, date }, 'DRY RUN — would update Work Order totals');
          },
        },
        async flagAttention(reason: string, ctx: unknown) {
          logger.warn({ reason, ctx }, 'DRY RUN — would flag for attention');
        },
        async recordInvoicePo() {
          /* no-op in dry run */
        },
      };

  const change: QboEntityChange = {
    name: 'Invoice',
    id: invoiceId,
    operation,
    lastUpdated: new Date().toISOString(),
  };

  logger.info({ invoiceId, operation, apply }, apply ? 'DRY-RUN (APPLY)' : 'DRY-RUN (read-only)');
  const outcome = await processInvoiceChange(change, ports);
  logger.info({ outcome }, 'pipeline outcome');

  await closePool();
  process.exit(0);
}

main().catch(async (err) => {
  logger.error({ err }, 'dry-run failed');
  await closePool();
  process.exit(1);
});
