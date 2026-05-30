import { describe, it, expect } from 'vitest';
import {
  extractPoNumber,
  isVoided,
  recomputeFromInvoices,
} from '../src/domain/recompute.js';
import type { QboInvoice } from '../src/qbo/types.js';

function inv(overrides: Partial<QboInvoice>): QboInvoice {
  return {
    Id: '1',
    TotalAmt: 100,
    TxnDate: '2026-01-01',
    CurrencyRef: { value: 'USD' },
    ...overrides,
  };
}

describe('extractPoNumber', () => {
  const base = inv({
    CustomField: [
      { DefinitionId: '2', Name: 'PO Number', Type: 'StringType', StringValue: 'PO-1001' },
      { DefinitionId: '3', Name: 'Sales Rep', Type: 'StringType', StringValue: 'Mary' },
    ],
  });

  it('matches by field name, case-insensitively', () => {
    expect(extractPoNumber(base, { fieldName: 'po number' })).toBe('PO-1001');
  });

  it('prefers DefinitionId when provided', () => {
    // Even with a misleading fieldName, the pinned DefinitionId wins.
    expect(extractPoNumber(base, { fieldName: 'Sales Rep', definitionId: '2' })).toBe('PO-1001');
  });

  it('returns null when the field is absent', () => {
    expect(extractPoNumber(inv({ CustomField: [] }), { fieldName: 'PO Number' })).toBeNull();
  });

  it('returns null when the field is present but blank', () => {
    const blank = inv({
      CustomField: [{ DefinitionId: '2', Name: 'PO Number', Type: 'StringType', StringValue: '   ' }],
    });
    expect(extractPoNumber(blank, { fieldName: 'PO Number' })).toBeNull();
  });
});

describe('isVoided', () => {
  it('flags an invoice whose PrivateNote mentions Voided', () => {
    expect(isVoided(inv({ PrivateNote: 'Voided on 1/2 by Mary' }))).toBe(true);
  });

  it('flags a zeroed-out invoice', () => {
    expect(isVoided(inv({ TotalAmt: 0, Balance: 0 }))).toBe(true);
  });

  it('does not flag a normal invoice', () => {
    expect(isVoided(inv({ TotalAmt: 500, Balance: 500 }))).toBe(false);
  });
});

describe('recomputeFromInvoices', () => {
  it('sums non-voided USD invoices and tracks the latest date', () => {
    const result = recomputeFromInvoices([
      inv({ Id: '1', TotalAmt: 1000, TxnDate: '2026-01-10' }),
      inv({ Id: '2', TotalAmt: 2500.5, TxnDate: '2026-02-15' }),
      inv({ Id: '3', TotalAmt: 300, TxnDate: '2026-01-20' }),
    ]);
    expect(result.invoicedAmount).toBe(3800.5);
    expect(result.lastInvoiceDate).toBe('2026-02-15');
    expect(result.voidedCount).toBe(0);
    expect(result.nonUsdInvoices).toHaveLength(0);
  });

  it('excludes voided invoices from both total and last date', () => {
    const result = recomputeFromInvoices([
      inv({ Id: '1', TotalAmt: 1000, TxnDate: '2026-01-10' }),
      // Latest date, but voided -> must not become lastInvoiceDate.
      inv({ Id: '2', TotalAmt: 0, Balance: 0, TxnDate: '2026-03-01', PrivateNote: 'Voided' }),
    ]);
    expect(result.invoicedAmount).toBe(1000);
    expect(result.lastInvoiceDate).toBe('2026-01-10');
    expect(result.voidedCount).toBe(1);
  });

  it('separates non-USD invoices instead of summing them', () => {
    const result = recomputeFromInvoices([
      inv({ Id: '1', TotalAmt: 1000, TxnDate: '2026-01-10' }),
      inv({ Id: '2', TotalAmt: 9999, TxnDate: '2026-02-01', CurrencyRef: { value: 'CAD' } }),
    ]);
    expect(result.invoicedAmount).toBe(1000);
    expect(result.nonUsdInvoices).toHaveLength(1);
    expect(result.nonUsdInvoices[0]!.Id).toBe('2');
  });

  it('returns a null date when there are no countable invoices', () => {
    const result = recomputeFromInvoices([]);
    expect(result.invoicedAmount).toBe(0);
    expect(result.lastInvoiceDate).toBeNull();
  });

  it('avoids floating-point drift across many adds', () => {
    const many = Array.from({ length: 3 }, (_, i) =>
      inv({ Id: String(i), TotalAmt: 0.1, TxnDate: '2026-01-01' }),
    );
    expect(recomputeFromInvoices(many).invoicedAmount).toBe(0.3);
  });
});
