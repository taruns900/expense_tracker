import type { GstRate } from './enums';

export function computeGstAmount(amount: number, gstRate: GstRate): number {
  if (amount <= 0) {
    return 0;
  }
  return Number(((amount * gstRate) / 100).toFixed(2));
}
