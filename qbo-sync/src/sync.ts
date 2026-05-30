import type { QboInvoice, QboEntityChange } from './qbo/types.js';
import type { WorkOrderRecord } from './domain/matcher.js';
import { matchWorkOrder } from './domain/matcher.js';
import { extractPoNumber, recomputeFromInvoices, type PoFieldConfig } from './domain/recompute.js';

/** What sync needs from QBO — satisfied by QboClient and by test fakes. */
export interface InvoiceSource {
  getInvoice(id: string): Promise<QboInvoice | null>;
  getInvoicesByPoNumber(
    poNumber: string,
    matches: (inv: QboInvoice) => boolean,
  ): Promise<QboInvoice[]>;
}

/** What sync needs from Salesforce. */
export interface WorkOrderSink {
  queryOpenWorkOrders(poNumber: string): Promise<WorkOrderRecord[]>;
  updateWorkOrderTotals(
    workOrderId: string,
    invoicedAmount: number,
    lastInvoiceDate: string | null,
  ): Promise<void>;
}

export type AttentionReason = 'missing_po' | 'no_match' | 'ambiguous_match' | 'non_usd';

/** Side-effect ports, injected so the orchestration is unit-testable. */
export interface SyncPorts {
  qbo: InvoiceSource;
  sf: WorkOrderSink;
  poField: PoFieldConfig;
  flagAttention(reason: AttentionReason, ctx: AttentionContext): Promise<void>;
  /** Look up the PO a (now-deleted) invoice carried at last processing. */
  lookupInvoicePo(invoiceId: string): Promise<string | null>;
  /** Remember which PO/WO an invoice resolved to. */
  recordInvoicePo(invoiceId: string, poNumber: string, workOrderId: string | null): Promise<void>;
}

export interface AttentionContext {
  qboEntityId?: string;
  poNumber?: string;
  details?: Record<string, unknown>;
}

export type SyncOutcome =
  | { kind: 'updated'; workOrderId: string; invoicedAmount: number; lastInvoiceDate: string | null }
  | { kind: 'needs_attention'; reason: AttentionReason }
  | { kind: 'skipped'; why: string };

/**
 * Process a single QBO entity change end-to-end. Cumulative and idempotent:
 * we always re-sum the PO's current invoices from QBO, so replays, voids, and
 * out-of-order events converge on the same answer.
 */
export async function processInvoiceChange(
  change: QboEntityChange,
  ports: SyncPorts,
): Promise<SyncOutcome> {
  if (change.name !== 'Invoice') {
    return { kind: 'skipped', why: `unsupported entity ${change.name}` };
  }

  // 1. Resolve the PO number. Deletes carry no invoice body, so fall back to
  //    the persisted mapping.
  let poNumber: string | null;
  if (change.operation === 'Delete') {
    poNumber = await ports.lookupInvoicePo(change.id);
    if (!poNumber) {
      // Never saw this invoice; nothing to recompute.
      return { kind: 'skipped', why: 'deleted invoice not in po map' };
    }
  } else {
    const invoice = await ports.qbo.getInvoice(change.id);
    if (!invoice) return { kind: 'skipped', why: 'invoice not found' };
    poNumber = extractPoNumber(invoice, ports.poField);
    if (!poNumber) {
      await ports.flagAttention('missing_po', { qboEntityId: change.id });
      return { kind: 'needs_attention', reason: 'missing_po' };
    }
  }

  // 2. Resolve to exactly one open Work Order.
  const match = await matchWorkOrder(poNumber, (po) => ports.sf.queryOpenWorkOrders(po));
  if (match.kind === 'no_match') {
    await ports.flagAttention('no_match', { qboEntityId: change.id, poNumber });
    await ports.recordInvoicePo(change.id, poNumber, null);
    return { kind: 'needs_attention', reason: 'no_match' };
  }
  if (match.kind === 'ambiguous') {
    await ports.flagAttention('ambiguous_match', {
      qboEntityId: change.id,
      poNumber,
      details: { candidates: match.candidates.map((c) => ({ id: c.Id, name: c.Name })) },
    });
    return { kind: 'needs_attention', reason: 'ambiguous_match' };
  }

  const workOrder = match.workOrder;

  // 3. Re-sum every current invoice for this PO from QBO (source of truth).
  const invoices = await ports.qbo.getInvoicesByPoNumber(
    poNumber,
    (inv) => extractPoNumber(inv, ports.poField) === poNumber,
  );
  const totals = recomputeFromInvoices(invoices);

  if (totals.nonUsdInvoices.length > 0) {
    await ports.flagAttention('non_usd', {
      poNumber,
      details: { invoiceIds: totals.nonUsdInvoices.map((i) => i.Id) },
    });
    // We still write the USD subtotal; the non-USD invoices are surfaced for
    // a human to reconcile rather than silently folded in or dropped.
  }

  // 4. Write back and remember the mapping.
  await ports.sf.updateWorkOrderTotals(workOrder.Id, totals.invoicedAmount, totals.lastInvoiceDate);
  if (change.operation !== 'Delete') {
    await ports.recordInvoicePo(change.id, poNumber, workOrder.Id);
  }

  return {
    kind: 'updated',
    workOrderId: workOrder.Id,
    invoicedAmount: totals.invoicedAmount,
    lastInvoiceDate: totals.lastInvoiceDate,
  };
}
