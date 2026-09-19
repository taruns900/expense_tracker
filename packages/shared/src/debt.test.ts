import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { calculateOutstanding } from './debt';

describe('debt taken', () => {
  it('calculates outstanding from borrowed and repaid', () => {
    const outstanding = calculateOutstanding('TAKEN', [
      { type: 'BORROWED', amount: 10_000 },
      { type: 'REPAID', amount: 2_000 },
      { type: 'BORROWED', amount: 3_000 },
      { type: 'REPAID', amount: 1_000 },
    ]);
    assert.equal(outstanding, 10_000);
  });
});

describe('debt given', () => {
  it('calculates outstanding from given and received', () => {
    const outstanding = calculateOutstanding('GIVEN', [
      { type: 'GIVEN', amount: 5_000 },
      { type: 'RECEIVED', amount: 2_000 },
    ]);
    assert.equal(outstanding, 3_000);
  });
});

describe('transaction order', () => {
  it('is independent of list order', () => {
    const a = calculateOutstanding('TAKEN', [
      { type: 'REPAID', amount: 1_000 },
      { type: 'BORROWED', amount: 5_000 },
    ]);
    const b = calculateOutstanding('TAKEN', [
      { type: 'BORROWED', amount: 5_000 },
      { type: 'REPAID', amount: 1_000 },
    ]);
    assert.equal(a, b);
    assert.equal(a, 4_000);
  });
});
