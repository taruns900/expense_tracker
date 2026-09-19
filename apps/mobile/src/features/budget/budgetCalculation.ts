import { budgetRemaining, formatBudgetPeriodLabel, formatBudgetPeriodTypeLabel } from '@expense-tracker/shared';

import { budgetRepository, expenseRepository } from '@/database/repositories';
import type { BudgetListItem } from '@/types/budget';
import { toIsoDate } from '@/utils/dates';

export type BudgetWithRemaining = BudgetListItem & {
  remaining: number;
};

export type DashboardBudgetGroup = {
  categoryId: string;
  categoryName: string;
  lines: Array<{
    budgetId: string;
    periodTypeLabel: string;
    periodLabel: string;
    remaining: number;
  }>;
};

export async function spentForBudget(budget: Pick<BudgetListItem, 'categoryId' | 'periodStart' | 'periodEnd'>): Promise<number> {
  return expenseRepository.sumForCategoryBetween(budget.categoryId, budget.periodStart, budget.periodEnd);
}

export async function withRemaining(budget: BudgetListItem): Promise<BudgetWithRemaining> {
  const spent = await spentForBudget(budget);
  return {
    ...budget,
    remaining: budgetRemaining(budget.amount, spent),
  };
}

export async function listBudgetsWithRemaining(): Promise<BudgetWithRemaining[]> {
  const budgets = await budgetRepository.list();
  return Promise.all(budgets.map((budget) => withRemaining(budget)));
}

export async function dashboardBudgetGroups(now = new Date()): Promise<DashboardBudgetGroup[]> {
  const today = toIsoDate(now);
  const active = await budgetRepository.listActiveOnDate(today);
  if (active.length === 0) {
    return [];
  }

  const byCategory = new Map<string, DashboardBudgetGroup>();
  const remainingByBudget = await Promise.all(
    active.map(async (budget) => ({
      budget,
      remaining: budgetRemaining(budget.amount, await spentForBudget(budget)),
    })),
  );

  for (const item of remainingByBudget) {
    const existing = byCategory.get(item.budget.categoryId);
    const line = {
      budgetId: item.budget.id,
      periodTypeLabel: formatBudgetPeriodTypeLabel(item.budget.periodType),
      periodLabel: formatBudgetPeriodLabel(
        item.budget.periodType,
        item.budget.periodStart,
        item.budget.periodEnd,
      ),
      remaining: item.remaining,
    };
    if (existing) {
      existing.lines.push(line);
      continue;
    }
    byCategory.set(item.budget.categoryId, {
      categoryId: item.budget.categoryId,
      categoryName: item.budget.categoryName,
      lines: [line],
    });
  }

  return Array.from(byCategory.values());
}
