import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { loadConfig } from '../src/config.js';
import { logger } from '../src/logger.js';
import {
  getPool,
  closePool,
  setMeta,
  META_RECONCILIATION_COMPLETED_AT,
} from '../src/db.js';
import { QboClient } from '../src/qbo/client.js';
import { SalesforceClient } from '../src/sf/client.js';
import { extractPoNumber, recomputeFromInvoices } from '../src/domain/recompute.js';
import { matchWorkOrder } from '../src/domain/matcher.js';
import type { QboInvoice } from '../src/qbo/types.js';

/**
 * One-shot backfill. For every open Work Order with a PO number, re-sum its
 * QBO invoices and (with --apply) write Invoiced_Amount__c + Last_Invoice_Date__c.
 * Must run once before the webhook is enabled; the server refuses to start in
 * production until META_RECONCILIATION_COMPLETED_AT is set.
 *
 * Flags:
 *   --apply     write to Salesforce (default is dry-run)
 *   (default)   compute + write a CSV report only, change nothing
 */
async function main(): Promise<void> {
  const apply = process.argv.includes('--apply');
  const cfg = loadConfig();
  const qbo = new QboClient(cfg);
  const sf = new SalesforceClient(cfg);
  const poField = { fieldName: cfg.QBO_PO_FIELD_NAME, definitionId: cfg.QBO_PO_FIELD_DEFINITION_ID };

  logger.info({ apply, env: cfg.QBO_ENV }, apply ? 'RECONCILE: APPLY mode' : 'RECONCILE: dry-run');

  // Distinct open POs come from Salesforce.
  const woRows = await sf.queryAllOpenPoWorkOrders();
  const report: string[] = [
    'po_number,work_order_id,work_order_name,invoiced_amount,last_invoice_date,non_usd_count,status',
  ];

  let applied = 0;
  let flagged = 0;

  for (const po of unique(woRows.map((w) => w.PO_Number__c))) {
    const invoices = await qbo.getInvoicesByPoNumber(
      po,
      (inv: QboInvoice) => extractPoNumber(inv, poField) === po,
    );
    const totals = recomputeFromInvoices(invoices);
    const match = await matchWorkOrder(po, (p) => sf.queryOpenWorkOrders(p));

    if (match.kind !== 'matched') {
      flagged += 1;
      report.push(`${po},,,${totals.invoicedAmount},${totals.lastInvoiceDate ?? ''},${totals.nonUsdInvoices.length},${match.kind}`);
      continue;
    }

    const wo = match.workOrder;
    report.push(
      `${po},${wo.Id},${wo.Name},${totals.invoicedAmount},${totals.lastInvoiceDate ?? ''},${totals.nonUsdInvoices.length},${apply ? 'applied' : 'dry_run'}`,
    );

    if (apply) {
      await sf.updateWorkOrderTotals(wo.Id, totals.invoicedAmount, totals.lastInvoiceDate);
      applied += 1;
    }
  }

  await mkdir('reports', { recursive: true });
  const reportPath = join('reports', `reconcile-${new Date().toISOString().replace(/[:.]/g, '-')}.csv`);
  await writeFile(reportPath, report.join('\n'), 'utf8');
  logger.info({ reportPath, applied, flagged }, 'reconciliation report written');

  if (apply) {
    await setMeta(META_RECONCILIATION_COMPLETED_AT, new Date().toISOString());
    logger.info('reconciliation gate set — server may now start');
  } else {
    logger.info('dry-run complete. Re-run with --apply to write and open the gate.');
  }
}

function unique<T>(xs: T[]): T[] {
  return [...new Set(xs)];
}

main()
  .then(() => closePool())
  .then(() => process.exit(0))
  .catch(async (err) => {
    logger.error({ err }, 'reconciliation failed');
    await getPool().end().catch(() => {});
    process.exit(1);
  });
