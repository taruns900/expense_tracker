import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, FormModal } from '@/components';
import { colors, radius, spacing, typography } from '@/components/theme';
import { ExpenseForm, type ExpenseFormHandle } from '@/features/expenses/ExpenseForm';
import { useUiStore } from '@/store';
import type { ExpenseListItem } from '@/types/expense';
import { formatDisplayDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';

function isPresent(value?: string | null) {
  return Boolean(value && value.trim().length > 0);
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  if (!isPresent(value)) {
    return null;
  }
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel} textBreakStrategy="simple">
        {label}
      </Text>
      <Text style={styles.detailValue} textBreakStrategy="simple">
        {value}
      </Text>
    </View>
  );
}

function savedRows(expense: ExpenseListItem) {
  return [
    { label: 'Expense ID', value: expense.expenseId },
    { label: 'Amount', value: formatInr(expense.amount) },
    { label: 'Date', value: formatDisplayDate(expense.expenseDate) },
    { label: 'Category', value: expense.categoryName },
    { label: 'Subcategory', value: expense.subCategoryName },
    { label: 'Payment method', value: expense.paymentMethod },
    { label: 'Vendor', value: expense.vendorName },
    {
      label: 'GST',
      value:
        expense.gstRate !== null ? `${expense.gstRate}% · ${formatInr(expense.gstAmount ?? 0)}` : null,
    },
    { label: 'Description', value: expense.description },
    { label: 'Bill number', value: expense.billNumber },
  ];
}

export function AddExpenseFlow() {
  const router = useRouter();
  const formRef = useRef<ExpenseFormHandle>(null);
  const [saving, setSaving] = useState(false);
  const addExpenseOpen = useUiStore((state) => state.addExpenseOpen);
  const closeAddExpense = useUiStore((state) => state.closeAddExpense);
  const savedExpense = useUiStore((state) => state.savedExpense);
  const setSavedExpense = useUiStore((state) => state.setSavedExpense);

  const finish = () => {
    setSavedExpense(null);
    router.replace('/');
  };

  return (
    <>
      <FormModal
        visible={addExpenseOpen}
        title="Add expense"
        primaryLabel={saving ? 'Saving' : 'Save expense'}
        submitDisabled={saving}
        placement="center"
        size="tall"
        onClose={closeAddExpense}
        onSubmit={() => {
          void formRef.current?.submit();
        }}>
        {addExpenseOpen ? (
          <ExpenseForm
            key="add-expense-form"
            ref={formRef}
            hideSubmit
            onSavingChange={setSaving}
            onSaved={(expense) => {
              closeAddExpense();
              setSavedExpense(expense);
            }}
          />
        ) : null}
      </FormModal>

      <Modal visible={Boolean(savedExpense)} transparent animationType="fade" onRequestClose={finish}>
        <View style={styles.overlay}>
          <View style={styles.card}>
            <View style={styles.header}>
              <Ionicons name="checkmark-circle" size={56} color={colors.success} />
              <Text style={styles.doneTitle}>Successful</Text>
            </View>
            <ScrollView
              style={styles.detailsScroll}
              contentContainerStyle={styles.details}
              nestedScrollEnabled>
              {savedExpense
                ? savedRows(savedExpense).map((item) => (
                    <Detail key={item.label} label={item.label} value={item.value} />
                  ))
                : null}
            </ScrollView>
            <Button label="Done" onPress={finish} />
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    maxHeight: '80%',
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  doneTitle: {
    ...typography.heading,
    color: colors.text,
  },
  detailsScroll: {
    width: '100%',
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: spacing.md,
  },
  details: {
    width: '100%',
    gap: spacing.sm,
  },
  detail: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  detailLabel: {
    ...typography.label,
    color: colors.textSecondary,
    width: '44%',
    paddingRight: spacing.sm,
  },
  detailValue: {
    ...typography.body,
    color: colors.text,
    width: '56%',
    textAlign: 'right',
  },
});
