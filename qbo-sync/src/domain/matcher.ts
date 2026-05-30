/** A Work Order candidate as returned from Salesforce. */
export interface WorkOrderRecord {
  Id: string;
  Name: string;
  Stage__c: string;
  PO_Number__c: string;
}

export type MatchResult =
  | { kind: 'matched'; workOrder: WorkOrderRecord }
  | { kind: 'no_match'; poNumber: string }
  | { kind: 'ambiguous'; poNumber: string; candidates: WorkOrderRecord[] };

/**
 * Resolve a QBO PO number to exactly one open Work Order.
 *
 * Policy (decided in planning): match only against Work Orders whose
 * Stage__c != 'Closed'. If exactly one open WO carries the PO number it wins;
 * zero matches -> no_match; two or more -> ambiguous. We never auto-pick a
 * "newest" winner, because a wrong guess silently mis-attributes invoices and
 * overstates the other WO's balance forever. Ambiguity is a human decision.
 *
 * `queryOpenWorkOrders` is injected so this stays a pure, unit-testable
 * function independent of jsforce.
 */
export async function matchWorkOrder(
  poNumber: string,
  queryOpenWorkOrders: (poNumber: string) => Promise<WorkOrderRecord[]>,
): Promise<MatchResult> {
  const trimmed = poNumber.trim();
  if (!trimmed) return { kind: 'no_match', poNumber };

  const open = await queryOpenWorkOrders(trimmed);

  if (open.length === 0) return { kind: 'no_match', poNumber: trimmed };
  if (open.length > 1) return { kind: 'ambiguous', poNumber: trimmed, candidates: open };
  return { kind: 'matched', workOrder: open[0]! };
}
