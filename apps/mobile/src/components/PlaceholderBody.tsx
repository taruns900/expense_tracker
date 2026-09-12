import { StyleSheet, Text } from 'react-native';

import { colors, spacing, typography } from '@/components/theme';

type Props = {
  title: string;
  body: string;
};

export function PlaceholderBody({ title, body }: Props) {
  return (
    <>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>
    </>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.heading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
