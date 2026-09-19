import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
  normalizeIsoDate,
  parseIsoDate,
  quarterBounds,
  quarterFromDate,
  startOfMonth,
  startOfWeek,
  startOfYear,
  toIsoDate,
} from './dates';

export const BUDGET_PERIOD_TYPES = [
  'DAILY',
  'WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
] as const;

export type BudgetPeriodType = (typeof BUDGET_PERIOD_TYPES)[number];

export type BudgetPeriodBounds = {
  periodType: BudgetPeriodType;
  periodStart: string;
  periodEnd: string;
};

export function resolveDailyPeriod(isoDate: string): BudgetPeriodBounds {
  return {
    periodType: 'DAILY',
    periodStart: isoDate,
    periodEnd: isoDate,
  };
}

export function resolveWeeklyPeriod(weekStartIso: string): BudgetPeriodBounds {
  const start = parseIsoDate(weekStartIso);
  const normalizedStart = startOfWeek(start);
  const end = endOfWeek(normalizedStart);
  return {
    periodType: 'WEEKLY',
    periodStart: toIsoDate(normalizedStart),
    periodEnd: toIsoDate(end),
  };
}

export function resolveMonthlyPeriod(year: number, monthIndex0: number): BudgetPeriodBounds {
  const anchor = new Date(year, monthIndex0, 1);
  return {
    periodType: 'MONTHLY',
    periodStart: toIsoDate(startOfMonth(anchor)),
    periodEnd: toIsoDate(endOfMonth(anchor)),
  };
}

export function resolveQuarterlyPeriod(year: number, quarter: 1 | 2 | 3 | 4): BudgetPeriodBounds {
  const { start, end } = quarterBounds(year, quarter);
  return {
    periodType: 'QUARTERLY',
    periodStart: start,
    periodEnd: end,
  };
}

export function resolveYearlyPeriod(year: number): BudgetPeriodBounds {
  const anchor = new Date(year, 0, 1);
  return {
    periodType: 'YEARLY',
    periodStart: toIsoDate(startOfYear(anchor)),
    periodEnd: toIsoDate(endOfYear(anchor)),
  };
}

export function budgetRemaining(budgetAmount: number, spentTotal: number): number {
  return budgetAmount - spentTotal;
}

export function isDateInPeriod(isoDate: string, periodStart: string, periodEnd: string): boolean {
  const day = normalizeIsoDate(isoDate);
  const start = normalizeIsoDate(periodStart);
  const end = normalizeIsoDate(periodEnd);
  return day >= start && day <= end;
}

/** Budget counts for dashboard when its period contains the reference day. */
export function isBudgetActiveOnDate(
  budget: Pick<BudgetPeriodBounds, 'periodType' | 'periodStart' | 'periodEnd'>,
  isoDate: string,
  referenceDate = parseIsoDate(normalizeIsoDate(isoDate)),
): boolean {
  if (isDateInPeriod(isoDate, budget.periodStart, budget.periodEnd)) {
    return true;
  }
  const canonical = activePeriodForType(budget.periodType, referenceDate);
  const start = normalizeIsoDate(budget.periodStart);
  const end = normalizeIsoDate(budget.periodEnd);
  return start === canonical.periodStart && end === canonical.periodEnd;
}

export function activePeriodForType(periodType: BudgetPeriodType, now = new Date()): BudgetPeriodBounds {
  switch (periodType) {
    case 'DAILY':
      return resolveDailyPeriod(toIsoDate(now));
    case 'WEEKLY':
      return resolveWeeklyPeriod(toIsoDate(startOfWeek(now)));
    case 'MONTHLY':
      return resolveMonthlyPeriod(now.getFullYear(), now.getMonth());
    case 'QUARTERLY':
      return resolveQuarterlyPeriod(now.getFullYear(), quarterFromDate(now));
    case 'YEARLY':
      return resolveYearlyPeriod(now.getFullYear());
    default:
      return resolveDailyPeriod(toIsoDate(now));
  }
}

export function formatBudgetPeriodLabel(
  periodType: BudgetPeriodType,
  periodStart: string,
  periodEnd: string,
): string {
  const start = parseIsoDate(periodStart);
  const end = parseIsoDate(periodEnd);
  const short = (d: Date) =>
    d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  const monthYear = (d: Date) =>
    d.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });

  switch (periodType) {
    case 'DAILY':
      return short(start);
    case 'WEEKLY': {
      const endShort = end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      const startShort = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
      return `${startShort} – ${endShort}`;
    }
    case 'MONTHLY':
      return monthYear(start);
    case 'QUARTERLY': {
      const q = quarterFromDate(start);
      return `Q${q} ${start.getFullYear()}`;
    }
    case 'YEARLY':
      return String(start.getFullYear());
    default:
      return `${periodStart} – ${periodEnd}`;
  }
}

export function formatBudgetPeriodTypeLabel(periodType: BudgetPeriodType): string {
  switch (periodType) {
    case 'DAILY':
      return 'Daily';
    case 'WEEKLY':
      return 'Weekly';
    case 'MONTHLY':
      return 'Monthly';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'YEARLY':
      return 'Yearly';
    default:
      return periodType;
  }
}

/** Week containing `isoDate`, for week picker default. */
export function weekStartContaining(isoDate: string): string {
  return toIsoDate(startOfWeek(parseIsoDate(isoDate)));
}

export function addWeeks(weekStartIso: string, deltaWeeks: number): string {
  const start = parseIsoDate(weekStartIso);
  return toIsoDate(addDays(start, deltaWeeks * 7));
}
