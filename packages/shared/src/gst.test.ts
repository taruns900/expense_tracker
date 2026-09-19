import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { computeGstAmount, expenseGrandTotal, isPresetGstRate, isValidGstRate } from './gst';

describe('gst', () => {
  it('computes preset and custom rates', () => {
    assert.equal(computeGstAmount(10_000, 18), 1_800);
    assert.equal(computeGstAmount(10_000, 7.5), 750);
  });

  it('validates gst rate range', () => {
    assert.equal(isValidGstRate(18), true);
    assert.equal(isValidGstRate(7.5), true);
    assert.equal(isValidGstRate(-1), false);
    assert.equal(isValidGstRate(101), false);
  });

  it('detects preset rates', () => {
    assert.equal(isPresetGstRate(18), true);
    assert.equal(isPresetGstRate(7), false);
  });

  it('sums base amount and gst for grand total', () => {
    assert.equal(expenseGrandTotal(10_000, 1_800), 11_800);
    assert.equal(expenseGrandTotal(500, null), 500);
  });
});
