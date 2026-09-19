import {
  BUDGET_PERIOD_TYPES,
  budgetRemaining,
  formatBudgetPeriodLabel,
  formatBudgetPeriodTypeLabel,
} from '@expense-tracker/shared';
import { budgetRepository, expenseRepository } from '@/database/repositories';
import type { BudgetListItem } from '@/types/budget';

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

const PERIOD_TYPE_RANK = new Map(BUDGET_PERIOD_TYPES.map((type, index) => [type, index]));

export async function spentForBudget(
  budget: Pick<BudgetListItem, 'categoryId' | 'periodStart' | 'periodEnd'>,
): Promise<number> {
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
  const results = await Promise.allSettled(budgets.map((budget) => withRemaining(budget)));
  return results
    .filter((result): result is PromiseFulfilledResult<BudgetWithRemaining> => result.status === 'fulfilled')
    .map((result) => result.value);
}

function sortBudgetsForDashboard(a: BudgetListItem, b: BudgetListItem): number {
  const category = a.categoryName.localeCompare(b.categoryName, undefined, { sensitivity: 'base' });
  if (category !== 0) {
    return category;
  }
  const rankA = PERIOD_TYPE_RANK.get(a.periodType) ?? 99;
  const rankB = PERIOD_TYPE_RANK.get(b.periodType) ?? 99;
  if (rankA !== rankB) {
    return rankA - rankB;
  }
  return a.periodStart.localeCompare(b.periodStart);
}

export async function dashboardBudgetGroups(): Promise<DashboardBudgetGroup[]> {
  const budgets = await listBudgetsWithRemaining();
  if (budgets.length === 0) {
    return [];
  }

  budgets.sort(sortBudgetsForDashboard);

  const byCategory = new Map<string, DashboardBudgetGroup>();
  for (const budget of budgets) {
    const line = {
      budgetId: budget.id,
      periodTypeLabel: formatBudgetPeriodTypeLabel(budget.periodType),
      periodLabel: formatBudgetPeriodLabel(
        budget.periodType,
        budget.periodStart,
        budget.periodEnd,
      ),
      remaining: budget.remaining,
    };
    const existing = byCategory.get(budget.categoryId);
    if (existing) {
      existing.lines.push(line);
      continue;
    }
    byCategory.set(budget.categoryId, {
      categoryId: budget.categoryId,
      categoryName: budget.categoryName,
      lines: [line],
    });
  }

  return Array.from(byCategory.values());
}
