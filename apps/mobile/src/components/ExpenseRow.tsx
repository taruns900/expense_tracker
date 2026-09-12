import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/components/theme';
import type { ExpenseListItem } from '@/types/expense';
import { formatDisplayDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';

export function ExpenseRow({
  item,
  onPress,
}: {
  item: ExpenseListItem;
  onPress: () => void;
}) {
  const meta = [item.subCategoryName, item.paymentMethod].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.expenseId} ${formatInr(item.amount)}`}
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <View style={styles.main}>
        <Text style={styles.id}>{item.expenseId}</Text>
        <Text style={styles.category}>{item.categoryName}</Text>
        <Text style={styles.meta}>
          {formatDisplayDate(item.expenseDate)}
          {meta ? ` · ${meta}` : ''}
        </Text>
        {item.description ? <Text style={styles.meta}>{item.description}</Text> : null}
      </View>
      <Text style={styles.amount}>{formatInr(item.amount)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  main: {
    flex: 1,
    gap: 2,
  },
  id: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  category: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  meta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  amount: {
    ...typography.subheading,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
