import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  activePeriodForType,
  budgetRemaining,
  isDateInPeriod,
  resolveDailyPeriod,
  resolveMonthlyPeriod,
  resolveQuarterlyPeriod,
  resolveWeeklyPeriod,
  resolveYearlyPeriod,
} from './budget';

describe('budget periods', () => {
  it('daily period uses same start and end', () => {
    const p = resolveDailyPeriod('2026-09-19');
    assert.equal(p.periodStart, '2026-09-19');
    assert.equal(p.periodEnd, '2026-09-19');
  });

  it('weekly period is Monday through Sunday', () => {
    const p = resolveWeeklyPeriod('2026-09-19');
    assert.equal(p.periodStart, '2026-09-14');
    assert.equal(p.periodEnd, '2026-09-20');
  });

  it('monthly period covers full month', () => {
    const p = resolveMonthlyPeriod(2026, 8);
    assert.equal(p.periodStart, '2026-09-01');
    assert.equal(p.periodEnd, '2026-09-30');
  });

  it('quarterly period Q3 2026', () => {
    const p = resolveQuarterlyPeriod(2026, 3);
    assert.equal(p.periodStart, '2026-07-01');
    assert.equal(p.periodEnd, '2026-09-30');
  });

  it('yearly period 2026', () => {
    const p = resolveYearlyPeriod(2026);
    assert.equal(p.periodStart, '2026-01-01');
    assert.equal(p.periodEnd, '2026-12-31');
  });

  it('active monthly period for reference date', () => {
    const p = activePeriodForType('MONTHLY', new Date(2026, 8, 19));
    assert.equal(p.periodStart, '2026-09-01');
    assert.equal(p.periodEnd, '2026-09-30');
  });
});

describe('budget remaining', () => {
  it('subtracts spent from budget', () => {
    assert.equal(budgetRemaining(10_000, 6_500), 3_500);
  });

  it('allows negative remaining', () => {
    assert.equal(budgetRemaining(10_000, 11_500), -1_500);
  });
});

describe('expense period matching', () => {
  const p = resolveMonthlyPeriod(2026, 8);

  it('includes date inside period', () => {
    assert.equal(isDateInPeriod('2026-09-15', p.periodStart, p.periodEnd), true);
  });

  it('excludes date outside period', () => {
    assert.equal(isDateInPeriod('2026-10-01', p.periodStart, p.periodEnd), false);
  });
});
