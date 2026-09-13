import { expenseRepository } from '@/database/repositories';
import { categoryRepository } from '@/database/repositories';
import { isDatabaseAvailable } from '@/database';
import { UserFacingError } from '@/utils/userError';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

export const exportService = {
  async shareJsonBackup(): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new UserFacingError('Export is available on iOS and Android.');
    }
    const [expenses, categories] = await Promise.all([
      expenseRepository.list(),
      categoryRepository.list(),
    ]);
    const payload = JSON.stringify({ expenses, categories, exportedAt: new Date().toISOString() }, null, 2);
    const root = FileSystem.cacheDirectory;
    if (!root) {
      throw new UserFacingError("Couldn't create the export file.");
    }
    const path = `${root}expense-tracker-export.json`;
    await FileSystem.writeAsStringAsync(path, payload);
    if (!(await Sharing.isAvailableAsync())) {
      throw new UserFacingError("Sharing isn't available on this device.");
    }
    await Sharing.shareAsync(path, { mimeType: 'application/json' });
  },
};
