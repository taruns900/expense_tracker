import { GST_RATES } from '@expense-tracker/shared';

import { expenseRepository } from '@/database/repositories';
import {
  addDays,
  endOfMonth,
  startOfMonth,
  startOfYear,
  toIsoDate,
} from '@/utils/dates';
import { formatInr } from '@/utils/money';

export const dashboardService = {
  async summary(now = new Date()) {
    const today = toIsoDate(now);
    const last7Start = toIsoDate(addDays(now, -6));
    const monthStart = toIsoDate(startOfMonth(now));
    const monthEnd = toIsoDate(endOfMonth(now));
    const yearStart = toIsoDate(startOfYear(now));
    const yearEnd = `${now.getFullYear()}-12-31`;

    const [todayTotal, weekTotal, monthTotal, yearTotal] = await Promise.all([
      expenseRepository.sumBetween(today, today),
      expenseRepository.sumBetween(last7Start, today),
      expenseRepository.sumBetween(monthStart, monthEnd),
      expenseRepository.sumBetween(yearStart, yearEnd),
    ]);

    return { todayTotal, weekTotal, monthTotal, yearTotal };
  },

  async last7DaysSeries(now = new Date()) {
    const days = Array.from({ length: 7 }, (_, index) => addDays(now, -index));
    const from = toIsoDate(days[6]);
    const to = toIsoDate(days[0]);
    const rows = await expenseRepository.totalsByDate(from, to);
    const byDate = new Map(rows.map((row) => [row.date, row.total]));
    return days.map((day) => ({
      label: day.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
      total: byDate.get(toIsoDate(day)) ?? 0,
    }));
  },

  async monthSeries(now = new Date()) {
    const monthCount = now.getMonth() + 1;
    const start = startOfYear(now);
    const end = endOfMonth(now);
    const rows = await expenseRepository.totalsByYearMonth(toIsoDate(start), toIsoDate(end));
    const byMonth = new Map(rows.map((row) => [row.yearMonth, row.total]));
    return Array.from({ length: monthCount }, (_, index) => {
      const monthDate = startOfMonth(now, -index);
      const yearMonth = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;
      return {
        key: yearMonth,
        label: monthDate.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
        total: byMonth.get(yearMonth) ?? 0,
      };
    });
  },

  async topCategories(now = new Date()) {
    const from = toIsoDate(startOfMonth(now));
    const to = toIsoDate(endOfMonth(now));
    return (await expenseRepository.topCategories(from, to)).slice(0, 5);
  },

  async monthOverMonth(now = new Date()) {
    const thisFrom = toIsoDate(startOfMonth(now));
    const thisTo = toIsoDate(endOfMonth(now));
    const prevFrom = toIsoDate(startOfMonth(now, -1));
    const prevTo = toIsoDate(endOfMonth(now, -1));
    const [current, previous] = await Promise.all([
      expenseRepository.sumBetween(thisFrom, thisTo),
      expenseRepository.sumBetween(prevFrom, prevTo),
    ]);
    const delta = current - previous;
    const percent = previous === 0 ? (current === 0 ? 0 : 100) : (delta / previous) * 100;
    return {
      current,
      previous,
      percent,
      direction: delta > 0 ? 'increase' : delta < 0 ? 'decrease' : 'flat',
    } as const;
  },
};

export { formatInr, GST_RATES };
