/** Minimal shapes for the QBO entities we consume. Not exhaustive. */

export interface QboCustomField {
  DefinitionId: string;
  Name: string;
  Type: string;
  StringValue?: string;
}

export interface QboRef {
  value: string;
  name?: string;
}

export interface QboInvoice {
  Id: string;
  /** Post-discount, pre-tax total. The amount we sum against the PO. */
  TotalAmt: number;
  /** Transaction date, ISO `YYYY-MM-DD`. */
  TxnDate: string;
  CurrencyRef?: QboRef;
  CustomField?: QboCustomField[];
  /** Set to "Voided" in PrivateNote when an invoice is voided in QBO. */
  PrivateNote?: string;
  /** Remaining balance; a voided invoice has Balance 0 and TotalAmt 0. */
  Balance?: number;
  MetaData?: {
    CreateTime?: string;
    LastUpdatedTime?: string;
  };
}

/** A single change reported by the QBO webhook or CDC API. */
export interface QboEntityChange {
  name: string; // e.g. "Invoice"
  id: string;
  operation: 'Create' | 'Update' | 'Delete' | 'Merge' | 'Void' | 'Emailed';
  lastUpdated: string; // ISO timestamp
}
