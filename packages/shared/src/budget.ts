import {
  addDays,
  endOfMonth,
  endOfWeek,
  endOfYear,
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
  return isoDate >= periodStart && isoDate <= periodEnd;
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
