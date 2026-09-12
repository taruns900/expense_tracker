import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radius, spacing, touchTarget, typography } from './theme';

type Props = {
  label: string;
  value?: string | null;
  placeholder: string;
  onPress: () => void;
  error?: string;
};

export function SelectField({ label, value, placeholder, onPress, error }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        onPress={onPress}
        style={({ pressed }) => [styles.field, error && styles.fieldError, pressed && styles.pressed]}>
        <Text
          style={[styles.value, !value && styles.placeholder]}
          numberOfLines={1}
          textBreakStrategy="simple">
          {value ?? placeholder}
        </Text>
        <Ionicons name="chevron-down" size={18} color={colors.tabInactive} />
      </Pressable>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.xxs,
  },
  label: {
    ...typography.label,
    color: colors.text,
  },
  field: {
    minHeight: touchTarget,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  fieldError: {
    borderColor: colors.danger,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  value: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  placeholder: {
    color: colors.tabInactive,
  },
  error: {
    ...typography.caption,
    color: colors.danger,
  },
});
