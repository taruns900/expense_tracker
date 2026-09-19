export const DESCRIPTION_MAX_LENGTH = 200;

export const PAYMENT_METHODS = [
  'Cash',
  'UPI',
  'Bank Transfer',
  'Credit Card',
  'Debit Card',
  'Cheque',
  'Other',
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const SYNC_STATUSES = ['SYNCED', 'PENDING', 'SYNCING', 'FAILED'] as const;

export type SyncStatus = (typeof SYNC_STATUSES)[number];

export const GST_RATES = [0, 5, 12, 18, 28] as const;

export type GstRate = (typeof GST_RATES)[number];

export const SYNC_OPERATIONS = ['CREATE', 'UPDATE', 'DELETE'] as const;

export type SyncOperation = (typeof SYNC_OPERATIONS)[number];

export const ENTITY_TYPES = [
  'expense',
  'category',
  'subcategory',
  'vendor',
  'attachment',
  'business_profile',
  'budget',
  'debt_person',
  'debt_transaction',
] as const;

export type EntityType = (typeof ENTITY_TYPES)[number];
