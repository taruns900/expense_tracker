import { create } from 'zustand';

import type { ExpenseListItem } from '@/types/expense';
import type { ExpenseFilters } from '@/types/filters';

type UiState = {
  filters: ExpenseFilters;
  setFilters: (filters: ExpenseFilters) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addExpenseOpen: boolean;
  openAddExpense: () => void;
  closeAddExpense: () => void;
  savedExpense: ExpenseListItem | null;
  setSavedExpense: (expense: ExpenseListItem | null) => void;
};

export const useUiStore = create<UiState>((set) => ({
  filters: {},
  setFilters: (filters) => set({ filters }),
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  addExpenseOpen: false,
  openAddExpense: () => set({ addExpenseOpen: true }),
  closeAddExpense: () => set({ addExpenseOpen: false }),
  savedExpense: null,
  setSavedExpense: (savedExpense) => set({ savedExpense }),
}));
