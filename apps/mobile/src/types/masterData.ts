import type { SyncStatus } from '@expense-tracker/shared';

export type CategoryRecord = {
  id: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type SubCategoryRecord = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  isActive: boolean;
  sortOrder: number;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};

export type VendorRecord = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  gstNumber: string | null;
  isActive: boolean;
  syncStatus: SyncStatus;
  createdAt: string;
  updatedAt: string;
};
