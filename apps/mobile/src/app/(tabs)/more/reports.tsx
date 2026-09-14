import { Alert, StyleSheet, View } from 'react-native';

import { Button } from '@/components';
import { colors, spacing } from '@/components/theme';
import { pdfService } from '@/services/pdf';
import { useUiStore } from '@/store';
import { toUserMessage } from '@/utils/userError';

export default function ReportsScreen() {
  const filters = useUiStore((state) => state.filters);
  const searchQuery = useUiStore((state) => state.searchQuery);

  return (
    <View style={styles.wrap}>
      <Button
        label="Export filtered report"
        onPress={() => {
          void pdfService.shareReport(filters, searchQuery).catch((error) => {
            Alert.alert("Couldn't export", toUserMessage(error, "The report couldn't be created."));
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
    gap: spacing.md,
  },
});
