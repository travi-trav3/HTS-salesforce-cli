import { describe, it, expect } from 'vitest';
import { matchWorkOrder, type WorkOrderRecord } from '../src/domain/matcher.js';

function wo(id: string, stage = 'Active'): WorkOrderRecord {
  return { Id: id, Name: `WO-${id}`, Stage__c: stage, PO_Number__c: 'PO-1001' };
}

describe('matchWorkOrder', () => {
  it('returns matched when exactly one open WO carries the PO', async () => {
    const result = await matchWorkOrder('PO-1001', async () => [wo('a')]);
    expect(result.kind).toBe('matched');
    if (result.kind === 'matched') expect(result.workOrder.Id).toBe('a');
  });

  it('returns no_match when no open WO carries the PO', async () => {
    const result = await matchWorkOrder('PO-1001', async () => []);
    expect(result.kind).toBe('no_match');
  });

  it('returns ambiguous when two or more open WOs share the PO', async () => {
    const result = await matchWorkOrder('PO-1001', async () => [wo('a'), wo('b')]);
    expect(result.kind).toBe('ambiguous');
    if (result.kind === 'ambiguous') expect(result.candidates).toHaveLength(2);
  });

  it('never auto-picks a winner among multiple open WOs', async () => {
    // Two candidates with different created order must NOT resolve to matched.
    const result = await matchWorkOrder('PO-1001', async () => [wo('older'), wo('newer')]);
    expect(result.kind).not.toBe('matched');
  });

  it('treats a blank PO number as no_match without querying', async () => {
    let queried = false;
    const result = await matchWorkOrder('   ', async () => {
      queried = true;
      return [wo('a')];
    });
    expect(result.kind).toBe('no_match');
    expect(queried).toBe(false);
  });

  it('trims the PO number before querying', async () => {
    let received = '';
    await matchWorkOrder('  PO-1001  ', async (po) => {
      received = po;
      return [wo('a')];
    });
    expect(received).toBe('PO-1001');
  });
});
