import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Screen } from '@/components';
import { colors, radius, spacing, touchTarget, typography } from '@/components/theme';

const ITEMS = [
  { href: '/expenses', label: 'Expenses', icon: 'list-outline' },
  { href: '/more/categories', label: 'Categories', icon: 'grid-outline' },
  { href: '/more/subcategories', label: 'Subcategories', icon: 'layers-outline' },
  { href: '/more/reports', label: 'Reports', icon: 'document-text-outline' },
  { href: '/more/data-management', label: 'Data management', icon: 'cloud-outline' },
  { href: '/more/settings', label: 'Settings', icon: 'settings-outline' },
] as const;

export default function MoreScreen() {
  const router = useRouter();

  return (
    <Screen title="More" subtitle="Manage lists, reports, and app settings." showBack={false}>
      <View style={styles.list}>
        {ITEMS.map((item) => (
          <Pressable
            key={item.href}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            onPress={() => router.push(item.href)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
            <Ionicons name={item.icon} size={22} color={colors.primary} />
            <Text style={styles.label}>{item.label}</Text>
            <Ionicons name="chevron-forward" size={18} color={colors.tabInactive} />
          </Pressable>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  row: {
    minHeight: touchTarget,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  pressed: {
    backgroundColor: colors.surfaceMuted,
  },
  label: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
});
