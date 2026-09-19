import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Card, EmptyState, IconButton, Screen } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { isDatabaseAvailable } from '@/database';
import { BudgetFormModal } from '@/features/budget/BudgetFormModal';
import { budgetService, listBudgetsWithRemaining, type BudgetWithRemaining } from '@/features/budget';
import { formatBudgetPeriodLabel, formatBudgetPeriodTypeLabel } from '@expense-tracker/shared';
import type { BudgetListItem } from '@/types/budget';
import { formatInr } from '@/utils/money';
import { toUserMessage } from '@/utils/userError';

export default function BudgetScreen() {
  const [items, setItems] = useState<BudgetWithRemaining[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<BudgetListItem | null>(null);

  const load = useCallback(async () => {
    setItems(await listBudgetsWithRemaining());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openCreate() {
    setEditing(null);
    setFormOpen(true);
  }

  function openEdit(item: BudgetWithRemaining) {
    setEditing(item);
    setFormOpen(true);
  }

  function confirmDelete(item: BudgetWithRemaining) {
    Alert.alert('Delete budget?', 'This budget will be removed from your device and cloud.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await budgetService.remove(item.id);
              await load();
            } catch (error) {
              Alert.alert("Couldn't delete", toUserMessage(error, "The budget couldn't be deleted."));
            }
          })();
        },
      },
    ]);
  }

  async function save(input: Parameters<typeof budgetService.create>[0]) {
    try {
      if (editing) {
        await budgetService.update(editing.id, input);
      } else {
        await budgetService.create(input);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The budget couldn't be saved."));
      throw error;
    }
  }

  if (!isDatabaseAvailable()) {
    return (
      <Screen title="Budget" showBack={false}>
        <EmptyState title="Not available" body="Budget tracking is available on iOS and Android." />
      </Screen>
    );
  }

  return (
    <Screen
      title="Budget"
      showBack={false}
      headerRight={<IconButton name="add" accessibilityLabel="Add budget" onPress={openCreate} />}>
      {items.length === 0 ? (
        <View style={styles.empty}>
          <EmptyState
            title="No budgets yet"
            body="Create a budget to start tracking your spending."
          />
          <Button label="Create budget" onPress={openCreate} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item)}>
              <Card style={styles.row}>
                <View style={styles.rowTop}>
                  <Text style={styles.category}>{item.categoryName}</Text>
                  <Text
                    style={[
                      styles.remaining,
                      item.remaining < 0 ? styles.remainingOver : null,
                    ]}>
                    {formatInr(item.remaining)}
                  </Text>
                </View>
                <Text style={styles.meta}>
                  {formatBudgetPeriodTypeLabel(item.periodType)} ·{' '}
                  {formatBudgetPeriodLabel(item.periodType, item.periodStart, item.periodEnd)}
                </Text>
                <Text style={styles.hint}>Remaining · long press to delete</Text>
              </Card>
            </Pressable>
          )}
        />
      )}

      <BudgetFormModal
        visible={formOpen}
        editing={editing}
        onClose={() => setFormOpen(false)}
        onSave={save}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: spacing.md,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  row: {
    gap: spacing.xxs,
  },
  rowTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  category: {
    ...typography.subheading,
    color: colors.text,
    flex: 1,
  },
  remaining: {
    ...typography.amount,
    color: colors.text,
  },
  remainingOver: {
    color: colors.danger,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xxs,
  },
});
