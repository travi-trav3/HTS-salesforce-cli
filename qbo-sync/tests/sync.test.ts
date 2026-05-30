import { describe, it, expect } from 'vitest';
import { processInvoiceChange, type SyncPorts, type AttentionReason } from '../src/sync.js';
import type { QboInvoice, QboEntityChange } from '../src/qbo/types.js';
import type { WorkOrderRecord } from '../src/domain/matcher.js';

function invoice(o: Partial<QboInvoice>): QboInvoice {
  return {
    Id: 'inv-1',
    TotalAmt: 1000,
    TxnDate: '2026-02-01',
    CurrencyRef: { value: 'USD' },
    CustomField: [{ DefinitionId: '7', Name: 'PO Number', Type: 'StringType', StringValue: 'PO-1' }],
    ...o,
  };
}

function wo(id: string): WorkOrderRecord {
  return { Id: id, Name: `WO-${id}`, Stage__c: 'Active', PO_Number__c: 'PO-1' };
}

interface Harness {
  ports: SyncPorts;
  attention: { reason: AttentionReason; ctx: unknown }[];
  updates: { id: string; amount: number; date: string | null }[];
  poMap: Map<string, string>;
}

function harness(opts: {
  invoice?: QboInvoice | null;
  invoicesForPo?: QboInvoice[];
  openWorkOrders?: WorkOrderRecord[];
  poMapSeed?: Record<string, string>;
}): Harness {
  const attention: Harness['attention'] = [];
  const updates: Harness['updates'] = [];
  const poMap = new Map(Object.entries(opts.poMapSeed ?? {}));

  const ports: SyncPorts = {
    poField: { fieldName: 'PO Number' },
    qbo: {
      async getInvoice() {
        return opts.invoice ?? null;
      },
      async getInvoicesByPoNumber() {
        return opts.invoicesForPo ?? [];
      },
    },
    sf: {
      async queryOpenWorkOrders() {
        return opts.openWorkOrders ?? [];
      },
      async updateWorkOrderTotals(id, amount, date) {
        updates.push({ id, amount, date });
      },
    },
    async flagAttention(reason, ctx) {
      attention.push({ reason, ctx });
    },
    async lookupInvoicePo(id) {
      return poMap.get(id) ?? null;
    },
    async recordInvoicePo(id, po) {
      poMap.set(id, po);
    },
  };
  return { ports, attention, updates, poMap };
}

const change = (o: Partial<QboEntityChange> = {}): QboEntityChange => ({
  name: 'Invoice',
  id: 'inv-1',
  operation: 'Create',
  lastUpdated: '2026-02-01T00:00:00Z',
  ...o,
});

describe('processInvoiceChange', () => {
  it('updates the WO when one open match exists', async () => {
    const h = harness({
      invoice: invoice({}),
      openWorkOrders: [wo('a')],
      invoicesForPo: [invoice({ Id: 'inv-1', TotalAmt: 1000 }), invoice({ Id: 'inv-2', TotalAmt: 500 })],
    });
    const out = await processInvoiceChange(change(), h.ports);
    expect(out.kind).toBe('updated');
    expect(h.updates).toEqual([{ id: 'a', amount: 1500, date: '2026-02-01' }]);
    expect(h.poMap.get('inv-1')).toBe('PO-1');
  });

  it('flags missing_po when the invoice has no PO custom field', async () => {
    const h = harness({ invoice: invoice({ CustomField: [] }) });
    const out = await processInvoiceChange(change(), h.ports);
    expect(out).toEqual({ kind: 'needs_attention', reason: 'missing_po' });
    expect(h.attention[0]!.reason).toBe('missing_po');
    expect(h.updates).toHaveLength(0);
  });

  it('flags no_match when no open WO carries the PO', async () => {
    const h = harness({ invoice: invoice({}), openWorkOrders: [] });
    const out = await processInvoiceChange(change(), h.ports);
    expect(out).toEqual({ kind: 'needs_attention', reason: 'no_match' });
    expect(h.updates).toHaveLength(0);
  });

  it('flags ambiguous_match and does NOT write when two WOs share the PO', async () => {
    const h = harness({ invoice: invoice({}), openWorkOrders: [wo('a'), wo('b')] });
    const out = await processInvoiceChange(change(), h.ports);
    expect(out).toEqual({ kind: 'needs_attention', reason: 'ambiguous_match' });
    expect(h.updates).toHaveLength(0);
  });

  it('writes USD subtotal and flags non_usd when mixed currencies present', async () => {
    const h = harness({
      invoice: invoice({}),
      openWorkOrders: [wo('a')],
      invoicesForPo: [
        invoice({ Id: 'inv-1', TotalAmt: 1000 }),
        invoice({ Id: 'inv-2', TotalAmt: 9999, CurrencyRef: { value: 'CAD' } }),
      ],
    });
    const out = await processInvoiceChange(change(), h.ports);
    expect(out.kind).toBe('updated');
    expect(h.updates[0]!.amount).toBe(1000); // CAD excluded
    expect(h.attention.some((a) => a.reason === 'non_usd')).toBe(true);
  });

  it('handles a Delete by re-summing the PO from the persisted mapping', async () => {
    const h = harness({
      poMapSeed: { 'inv-1': 'PO-1' },
      openWorkOrders: [wo('a')],
      // inv-1 is gone; only inv-2 remains for the PO.
      invoicesForPo: [invoice({ Id: 'inv-2', TotalAmt: 500 })],
    });
    const out = await processInvoiceChange(change({ operation: 'Delete' }), h.ports);
    expect(out.kind).toBe('updated');
    expect(h.updates[0]!.amount).toBe(500);
  });

  it('skips a Delete for an invoice it never saw', async () => {
    const h = harness({});
    const out = await processInvoiceChange(change({ operation: 'Delete', id: 'unknown' }), h.ports);
    expect(out.kind).toBe('skipped');
    expect(h.updates).toHaveLength(0);
  });

  it('skips non-Invoice entities', async () => {
    const h = harness({});
    const out = await processInvoiceChange(change({ name: 'Customer' }), h.ports);
    expect(out.kind).toBe('skipped');
  });
});
