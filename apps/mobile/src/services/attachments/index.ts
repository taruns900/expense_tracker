/**
 * V2 — expense receipt attachments (disabled for V1).
 * Uncomment the block below when shipping V2; wire UI in apps/mobile/src/app/expense/[id]/index.tsx.
 */
/*
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';

import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  attachmentRepository,
  enqueueSync,
  expenseRepository,
} from '@/database/repositories';
import type { AttachmentRecord } from '@/database/repositories/attachmentRepository';
import { createId } from '@/utils/ids';
import { nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

const ALLOWED = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

function extensionOf(name: string): string {
  return name.split('.').pop()?.toLowerCase() ?? '';
}

async function ensureDir(path: string): Promise<void> {
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(path, { intermediates: true });
  }
}

async function storeFile(expenseDisplayId: string, sourceUri: string, fileName: string) {
  const root = FileSystem.documentDirectory;
  if (!root) {
    throw new UserFacingError("Couldn't store the file on this device.");
  }
  const dir = `${root}expenses/${expenseDisplayId}/`;
  await ensureDir(dir);
  const dest = `${dir}${Date.now()}-${fileName}`;
  await FileSystem.copyAsync({ from: sourceUri, to: dest });
  const info = await FileSystem.getInfoAsync(dest);
  const size = info.exists && 'size' in info ? info.size : 0;
  return { dest, size };
}

export const attachmentService = {
  listByExpense: (expenseId: string) => attachmentRepository.listByExpense(expenseId),

  async addFromUri(internalExpenseId: string, uri: string, fileName: string): Promise<AttachmentRecord> {
    if (!isDatabaseAvailable()) {
      throw new UserFacingError('This action is available on iOS and Android.');
    }
    const expense = await expenseRepository.getById(internalExpenseId);
    if (!expense) {
      throw new UserFacingError("That expense couldn't be found.");
    }
    const ext = extensionOf(fileName);
    if (!ALLOWED.includes(ext)) {
      throw new UserFacingError('Please attach a JPG, PNG, WEBP, or PDF file.');
    }
    const stored = await storeFile(expense.expenseId, uri, fileName);
    const timestamp = nowIso();
    const record: AttachmentRecord = {
      id: createId(),
      expenseId: internalExpenseId,
      fileName,
      fileType: ext === 'pdf' ? 'application/pdf' : `image/${ext === 'jpg' ? 'jpeg' : ext}`,
      fileSize: stored.size,
      localFilePath: stored.dest,
      cloudObjectPath: null,
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await getDatabase().withTransactionAsync(async () => {
      await attachmentRepository.insert(record);
      await enqueueSync({
        entityType: 'attachment',
        entityId: record.id,
        operation: 'CREATE',
        payload: record,
      });
    });
    return record;
  },

  async pickImage(internalExpenseId: string): Promise<AttachmentRecord | null> {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    const asset = result.assets[0];
    const name = asset.fileName ?? `receipt.${(asset.uri.split('.').pop() ?? 'jpg').toLowerCase()}`;
    return this.addFromUri(internalExpenseId, asset.uri, name);
  },

  async takePhoto(internalExpenseId: string): Promise<AttachmentRecord | null> {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      throw new UserFacingError('Camera access is needed to photograph a receipt.');
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    const asset = result.assets[0];
    return this.addFromUri(internalExpenseId, asset.uri, asset.fileName ?? 'receipt.jpg');
  },

  async pickPdf(internalExpenseId: string): Promise<AttachmentRecord | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/pdf',
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) {
      return null;
    }
    const asset = result.assets[0];
    return this.addFromUri(internalExpenseId, asset.uri, asset.name);
  },

  async remove(id: string): Promise<void> {
    if (!isDatabaseAvailable()) {
      throw new UserFacingError('This action is available on iOS and Android.');
    }
    const existing = await attachmentRepository.getById(id);
    if (!existing) {
      return;
    }
    const timestamp = nowIso();
    await getDatabase().withTransactionAsync(async () => {
      await attachmentRepository.softDelete(id, timestamp);
      await enqueueSync({
        entityType: 'attachment',
        entityId: id,
        operation: 'DELETE',
        payload: { id, updatedAt: timestamp },
      });
    });
  },
};
*/
