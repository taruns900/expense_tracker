import { StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, typography } from '@/components/theme';
import { formatInr } from '@/utils/money';

type Item = { label: string; total: number };

export function BarList({ items, horizontal = false }: { items: Item[]; horizontal?: boolean }) {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <View style={styles.wrap}>
      {items.map((item) => {
        const width = `${Math.max(4, (item.total / max) * 100)}%` as `${number}%`;
        return (
          <View key={item.label} style={styles.row}>
            <Text style={styles.label}>{item.label}</Text>
            <View style={[styles.track, horizontal && styles.trackGrow]}>
              <View style={[styles.fill, { width }]} />
            </View>
            <Text style={styles.value}>{formatInr(item.total)}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  row: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  track: {
    height: 10,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  trackGrow: {
    width: '100%',
  },
  fill: {
    height: 10,
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  value: {
    ...typography.caption,
    color: colors.text,
    fontVariant: ['tabular-nums'],
  },
});
