import {
  DESCRIPTION_MAX_LENGTH,
  GST_RATES,
  PAYMENT_METHODS,
  computeGstAmount,
  expenseGrandTotal,
  isPresetGstRate,
  isValidGstRate,
} from '@expense-tracker/shared';
import type { PaymentMethod } from '@expense-tracker/shared';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

import { Button, DateField, Input, SelectField, SelectModal } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { categoryService } from '@/features/categories';
import { expenseService } from '@/features/expenses/expenseService';
import { subCategoryService } from '@/features/subcategories';
import type { ExpenseInput, ExpenseListItem } from '@/types/expense';
import type { CategoryRecord, SubCategoryRecord } from '@/types/masterData';
import { toIsoDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';
import { toUserMessage } from '@/utils/userError';

const GST_CUSTOM_OPTION_ID = 'custom';

type Props = {
  initial?: ExpenseListItem | null;
  onSaved: (expense: ExpenseListItem) => void;
  hideSubmit?: boolean;
  onSavingChange?: (saving: boolean) => void;
};

export type ExpenseFormHandle = {
  submit: () => Promise<void>;
};

function initialGstCustomMode(rate: number | null | undefined): boolean {
  return rate !== null && rate !== undefined && !isPresetGstRate(rate);
}

function parseAmount(value: string): number {
  return Number(value.replace(/,/g, ''));
}

export const ExpenseForm = forwardRef<ExpenseFormHandle, Props>(function ExpenseForm(
  { initial, onSaved, hideSubmit = false, onSavingChange },
  ref,
) {
  const [amount, setAmount] = useState(initial ? String(initial.amount) : '');
  const [date, setDate] = useState(initial?.expenseDate ?? toIsoDate(new Date()));
  const [categoryId, setCategoryId] = useState<string | null>(initial?.categoryId ?? null);
  const [subCategoryId, setSubCategoryId] = useState<string | null>(initial?.subCategoryId ?? null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(
    initial?.paymentMethod ?? null,
  );
  const [gstRate, setGstRate] = useState<number | null>(initial?.gstRate ?? null);
  const [gstCustomMode, setGstCustomMode] = useState(initialGstCustomMode(initial?.gstRate));
  const [customGstRate, setCustomGstRate] = useState(
    initialGstCustomMode(initial?.gstRate) && initial?.gstRate !== null && initial?.gstRate !== undefined
      ? String(initial.gstRate)
      : '',
  );
  const [gstAmount, setGstAmount] = useState(
    initial?.gstAmount !== null && initial?.gstAmount !== undefined ? String(initial.gstAmount) : '',
  );
  const [description, setDescription] = useState(initial?.description ?? '');
  const [billNumber, setBillNumber] = useState(initial?.billNumber ?? '');
  const [saving, setSaving] = useState(false);

  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategoryRecord[]>([]);
  const [open, setOpen] = useState<null | 'category' | 'sub' | 'pay' | 'gst'>(null);

  useEffect(() => {
    void categoryService.listActive().then(setCategories);
  }, []);

  useEffect(() => {
    if (!categoryId) {
      setSubcategories([]);
      setSubCategoryId(null);
      return;
    }
    void subCategoryService.listActiveByCategory(categoryId).then((items) => {
      setSubcategories(items);
      setSubCategoryId((current) => (items.some((item) => item.id === current) ? current : null));
    });
  }, [categoryId]);

  useEffect(() => {
    if (gstCustomMode) {
      const parsedRate = Number(customGstRate.replace(/,/g, ''));
      if (!isValidGstRate(parsedRate)) {
        return;
      }
      setGstRate(parsedRate);
      return;
    }
  }, [customGstRate, gstCustomMode]);

  useEffect(() => {
    const parsed = parseAmount(amount);
    if (gstRate === null || !Number.isFinite(parsed) || parsed <= 0) {
      return;
    }
    setGstAmount(String(computeGstAmount(parsed, gstRate)));
  }, [amount, gstRate]);

  async function save() {
    const parsed = parseAmount(amount);
    const parsedGstAmount =
      gstRate === null
        ? null
        : gstAmount.trim().length > 0
          ? Number(gstAmount.replace(/,/g, ''))
          : computeGstAmount(parsed, gstRate);
    const input: ExpenseInput = {
      amount: parsed,
      expenseDate: date,
      categoryId: categoryId ?? '',
      subCategoryId,
      paymentMethod: paymentMethod as PaymentMethod,
      vendorId: null,
      description,
      billNumber,
      gstRate,
      gstAmount: parsedGstAmount,
    };
    setSaving(true);
    onSavingChange?.(true);
    try {
      const saved = initial
        ? await expenseService.update(initial.id, input)
        : await expenseService.create(input);
      onSaved(saved);
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The expense couldn't be saved."));
    } finally {
      setSaving(false);
      onSavingChange?.(false);
    }
  }

  useImperativeHandle(ref, () => ({ submit: save }));

  const categoryName = categories.find((item) => item.id === categoryId)?.name ?? initial?.categoryName;
  const subName =
    subcategories.find((item) => item.id === subCategoryId)?.name ?? initial?.subCategoryName;

  const parsedAmount = parseAmount(amount);
  const parsedGst =
    gstRate === null
      ? 0
      : gstAmount.trim().length > 0
        ? Number(gstAmount.replace(/,/g, '')) || 0
        : computeGstAmount(parsedAmount, gstRate);
  const showTotal =
    gstRate !== null && Number.isFinite(parsedAmount) && parsedAmount > 0 && Number.isFinite(parsedGst);

  const gstModalSelectedId =
    gstRate === null ? '' : isPresetGstRate(gstRate) ? String(gstRate) : GST_CUSTOM_OPTION_ID;

  return (
    <View style={[styles.form, hideSubmit && styles.formEmbedded]}>
      <Input
        label="Amount"
        value={amount}
        onChangeText={setAmount}
        placeholder="0.00"
        keyboardType="decimal-pad"
      />
      <SelectField
        label="Category"
        value={categoryName}
        placeholder="Select category"
        onPress={() => setOpen('category')}
      />
      {subcategories.length > 0 ? (
        <SelectField
          label="Subcategory"
          value={subName}
          placeholder="Select subcategory"
          onPress={() => setOpen('sub')}
        />
      ) : null}
      <SelectField
        label="Payment method"
        value={paymentMethod}
        placeholder="Select payment method"
        onPress={() => setOpen('pay')}
      />
      <DateField
        label="Date"
        value={date}
        placeholder="Today"
        maximumDate={new Date()}
        onChange={setDate}
      />
      {/* Later version — vendor picker
      <SelectField
        label="Vendor"
        value={vendorName}
        placeholder="Optional"
        onPress={() => setOpen('vendor')}
      />
      */}
      <SelectField
        label="GST rate"
        value={gstRate === null ? undefined : `${gstRate}%`}
        placeholder="Optional"
        onPress={() => setOpen('gst')}
      />
      {gstCustomMode ? (
        <Input
          label="Custom GST %"
          value={customGstRate}
          onChangeText={setCustomGstRate}
          placeholder="e.g. 7.5"
          keyboardType="decimal-pad"
        />
      ) : null}
      {gstRate !== null ? (
        <Input
          label="GST amount"
          value={gstAmount}
          onChangeText={setGstAmount}
          keyboardType="decimal-pad"
        />
      ) : null}
      {showTotal ? (
        <Text style={styles.total}>
          Total {formatInr(expenseGrandTotal(parsedAmount, parsedGst))} (amount + GST)
        </Text>
      ) : null}
      <Input label="Bill number" value={billNumber} onChangeText={setBillNumber} />
      <Input
        label="Description"
        value={description}
        onChangeText={(value) => setDescription(value.slice(0, DESCRIPTION_MAX_LENGTH))}
        maxLength={DESCRIPTION_MAX_LENGTH}
        multiline
      />

      {hideSubmit ? null : (
        <Button label={saving ? 'Saving' : 'Save expense'} onPress={() => void save()} disabled={saving} />
      )}

      <SelectModal
        visible={open === 'category'}
        title="Category"
        options={categories.map((item) => ({ id: item.id, label: item.name }))}
        selectedId={categoryId}
        onClose={() => setOpen(null)}
        onSelect={setCategoryId}
      />
      <SelectModal
        visible={open === 'sub'}
        title="Subcategory"
        options={subcategories.map((item) => ({ id: item.id, label: item.name }))}
        selectedId={subCategoryId}
        onClose={() => setOpen(null)}
        onSelect={setSubCategoryId}
      />
      <SelectModal
        visible={open === 'pay'}
        title="Payment method"
        options={PAYMENT_METHODS.map((item) => ({ id: item, label: item }))}
        selectedId={paymentMethod}
        onClose={() => setOpen(null)}
        onSelect={(id) => setPaymentMethod(id as PaymentMethod)}
      />
      {/* Later version — vendor picker
      <SelectModal
        visible={open === 'vendor'}
        title="Vendor"
        options={[{ id: '', label: 'No vendor' }, ...vendors.map((item) => ({ id: item.id, label: item.name }))]}
        selectedId={vendorId ?? ''}
        onClose={() => setOpen(null)}
        onSelect={(id) => setVendorId(id || null)}
      />
      */}
      <SelectModal
        visible={open === 'gst'}
        title="GST rate"
        options={[
          { id: '', label: 'None' },
          ...GST_RATES.map((rate) => ({ id: String(rate), label: `${rate}%` })),
          { id: GST_CUSTOM_OPTION_ID, label: 'Custom %' },
        ]}
        selectedId={gstModalSelectedId}
        onClose={() => setOpen(null)}
        onSelect={(id) => {
          if (id === '') {
            setGstRate(null);
            setGstCustomMode(false);
            setCustomGstRate('');
            setGstAmount('');
            return;
          }
          if (id === GST_CUSTOM_OPTION_ID) {
            setGstCustomMode(true);
            if (customGstRate.trim().length === 0) {
              setGstRate(null);
            }
            return;
          }
          setGstCustomMode(false);
          setCustomGstRate('');
          setGstRate(Number(id));
        }}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  form: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  formEmbedded: {
    paddingBottom: 0,
  },
  total: {
    ...typography.label,
    color: colors.text,
  },
});
