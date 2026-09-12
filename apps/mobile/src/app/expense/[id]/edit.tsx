import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { colors, spacing } from '@/components/theme';
import { ExpenseForm, expenseService } from '@/features/expenses';
import type { ExpenseListItem } from '@/types/expense';
import { safeGoBack } from '@/utils/navigation';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [expense, setExpense] = useState<ExpenseListItem | null>(null);

  useEffect(() => {
    if (!id) {
      return;
    }
    void expenseService.getById(id).then(setExpense);
  }, [id]);

  return (
    <View style={styles.wrap}>
      <Stack.Screen options={{ title: 'Edit expense' }} />
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.body}>
        {expense ? (
          <ExpenseForm
            initial={expense}
            onSaved={() => {
              safeGoBack(router);
            }}
          />
        ) : null}
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
  },
});
