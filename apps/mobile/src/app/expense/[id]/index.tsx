import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { expenseService } from '@/features/expenses';
import { pdfService } from '@/services/pdf';
import type { ExpenseListItem } from '@/types/expense';
import { formatDisplayDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';
import { safeGoBack } from '@/utils/navigation';
import { toUserMessage } from '@/utils/userError';

function Field({ label, value }: { label: string; value?: string | null }) {
  if (!value) {
    return null;
  }
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export default function ExpenseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseListItem | null>(null);

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    setExpense(await expenseService.getById(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  if (!expense) {
    return (
      <View style={styles.wrap}>
        <Text style={styles.value}>This expense is not available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: expense.expenseId }} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.amount}>{formatInr(expense.amount)}</Text>
        <Field label="Expense ID" value={expense.expenseId} />
        <Field label="Date" value={formatDisplayDate(expense.expenseDate)} />
        <Field label="Category" value={expense.categoryName} />
        <Field label="Subcategory" value={expense.subCategoryName} />
        <Field label="Vendor" value={expense.vendorName} />
        <Field label="Payment method" value={expense.paymentMethod} />
        <Field
          label="GST"
          value={
            expense.gstRate !== null
              ? `${expense.gstRate}% · ${formatInr(expense.gstAmount ?? 0)}`
              : null
          }
        />
        <Field label="Description" value={expense.description} />
        <Field label="Bill number" value={expense.billNumber} />

        <Button label="Edit" onPress={() => router.push(`/expense/${expense.id}/edit`)} />
        <Button
          label="Export PDF"
          variant="secondary"
          onPress={() => {
            void pdfService.shareExpense(expense.id).catch((error) => {
              Alert.alert("Couldn't export", toUserMessage(error, "The PDF couldn't be created."));
            });
          }}
        />
        {/* V2 — receipt attachments (photo/PDF). See apps/mobile/src/services/attachments/index.ts */}
        <Button
          label="Delete"
          variant="danger"
          onPress={() => {
            Alert.alert('Delete expense?', 'This removes it from this device and queues a cloud delete.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Delete',
                style: 'destructive',
                onPress: () => {
                  void expenseService.remove(expense.id).then(() => safeGoBack(router));
                },
              },
            ]);
          }}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
  },
  body: {
    padding: spacing.lg,
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  amount: {
    ...typography.amount,
    color: colors.text,
  },
  field: {
    gap: 4,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.text,
  },
});
