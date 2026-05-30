import type { QboInvoice } from '../qbo/types.js';

export interface PoFieldConfig {
  /** User-facing custom field name, e.g. "PO Number". */
  fieldName: string;
  /** Stable DefinitionId; takes precedence over fieldName when set. */
  definitionId?: string | undefined;
}

/**
 * Extract the PO number from a QBO invoice's custom fields.
 *
 * Matching by DefinitionId is preferred (stable; survives a rename in QBO).
 * Falls back to a case-insensitive name match when no DefinitionId is pinned.
 * Returns null when the field is absent or empty.
 */
export function extractPoNumber(invoice: QboInvoice, cfg: PoFieldConfig): string | null {
  const fields = invoice.CustomField ?? [];
  const match = cfg.definitionId
    ? fields.find((f) => f.DefinitionId === cfg.definitionId)
    : fields.find((f) => f.Name?.trim().toLowerCase() === cfg.fieldName.trim().toLowerCase());

  const raw = match?.StringValue?.trim();
  return raw ? raw : null;
}

/** A voided invoice should not count toward the invoiced total or last date. */
export function isVoided(invoice: QboInvoice): boolean {
  const note = invoice.PrivateNote?.toLowerCase() ?? '';
  if (note.includes('voided')) return true;
  // Defensive: a voided invoice in QBO is zeroed out. Treat a zero-total,
  // zero-balance invoice as void-equivalent so it never advances the date.
  if (invoice.TotalAmt === 0 && (invoice.Balance ?? 0) === 0) return true;
  return false;
}

function currencyOf(invoice: QboInvoice): string {
  return (invoice.CurrencyRef?.value ?? 'USD').toUpperCase();
}

export interface RecomputeResult {
  /** Sum of TotalAmt across non-voided USD invoices. */
  invoicedAmount: number;
  /** MAX(TxnDate) across non-voided USD invoices, or null if none. */
  lastInvoiceDate: string | null;
  /** Count of invoices excluded because they were voided. */
  voidedCount: number;
  /** Invoices in a non-USD currency — surfaced for needs_attention. */
  nonUsdInvoices: QboInvoice[];
}

/**
 * Cumulative recompute over the *full* set of invoices currently attached to a
 * PO in QBO. We always re-sum from source rather than applying deltas, so
 * out-of-order webhooks and voids self-heal: whatever QBO reports now is the
 * truth.
 */
export function recomputeFromInvoices(invoices: QboInvoice[]): RecomputeResult {
  let invoicedAmount = 0;
  let lastInvoiceDate: string | null = null;
  let voidedCount = 0;
  const nonUsdInvoices: QboInvoice[] = [];

  for (const inv of invoices) {
    if (currencyOf(inv) !== 'USD') {
      nonUsdInvoices.push(inv);
      continue; // do not fold non-USD amounts into a USD total
    }
    if (isVoided(inv)) {
      voidedCount += 1;
      continue;
    }
    invoicedAmount += inv.TotalAmt;
    if (lastInvoiceDate === null || inv.TxnDate > lastInvoiceDate) {
      lastInvoiceDate = inv.TxnDate;
    }
  }

  // Round to cents to avoid floating-point drift accumulating across many adds.
  invoicedAmount = Math.round(invoicedAmount * 100) / 100;

  return { invoicedAmount, lastInvoiceDate, voidedCount, nonUsdInvoices };
}
