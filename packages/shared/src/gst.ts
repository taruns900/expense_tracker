import { GST_RATES } from './enums';
import type { GstRate } from './enums';

export const GST_RATE_MIN = 0;
export const GST_RATE_MAX = 100;

export function isPresetGstRate(rate: number): rate is GstRate {
  return (GST_RATES as readonly number[]).includes(rate);
}

export function isValidGstRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= GST_RATE_MIN && rate <= GST_RATE_MAX;
}

export function computeGstAmount(amount: number, gstRate: number): number {
  if (amount <= 0 || !isValidGstRate(gstRate)) {
    return 0;
  }
  return Number(((amount * gstRate) / 100).toFixed(2));
}

/** Amount paid including GST when GST is recorded (base amount + gst amount). */
export function expenseGrandTotal(amount: number, gstAmount: number | null | undefined): number {
  const gst = gstAmount ?? 0;
  return Number((amount + gst).toFixed(2));
}
