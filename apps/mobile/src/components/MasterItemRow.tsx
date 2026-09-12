import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from './theme';

type Props = {
  title: string;
  subtitle?: string;
  inactive?: boolean;
  onPress: () => void;
  onToggleActive: () => void;
};

export function MasterItemRow({ title, subtitle, inactive, onPress, onToggleActive }: Props) {
  return (
    <View style={[styles.row, inactive && styles.inactiveRow]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Edit ${title}`}
        onPress={onPress}
        style={({ pressed }) => [styles.main, pressed && styles.pressed]}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        {inactive ? <Text style={styles.badge}>Inactive</Text> : null}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={inactive ? `Reactivate ${title}` : `Deactivate ${title}`}
        onPress={onToggleActive}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}>
        <Text style={[styles.actionLabel, inactive ? styles.activate : styles.deactivate]}>
          {inactive ? 'Reactivate' : 'Deactivate'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
  inactiveRow: {
    opacity: 0.7,
  },
  main: {
    flex: 1,
    minHeight: touchTarget,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  action: {
    minHeight: touchTarget,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  title: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },
  badge: {
    ...typography.caption,
    color: colors.warning,
    marginTop: 4,
  },
  actionLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
  deactivate: {
    color: colors.danger,
  },
  activate: {
    color: colors.success,
  },
});
