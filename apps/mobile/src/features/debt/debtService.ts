import {
  calculateOutstanding,
  isValidTransactionType,
  transactionTypesForDirection,
} from '@expense-tracker/shared';
import type { DebtDirection, DebtTransactionType } from '@expense-tracker/shared';

import { getDatabase, isDatabaseAvailable } from '@/database';
import {
  debtPersonRepository,
  debtTransactionRepository,
  enqueueSync,
} from '@/database/repositories';
import { syncEngine } from '@/services/sync';
import type {
  DebtPersonInput,
  DebtPersonListItem,
  DebtPersonRecord,
  DebtTransactionInput,
  DebtTransactionRecord,
} from '@/types/debt';
import { createId } from '@/utils/ids';
import { normalizePhone, isPhoneNumber } from '@/utils/phone';
import { normalizeName, nowIso } from '@/utils/text';
import { UserFacingError } from '@/utils/userError';

function requireDatabase(): void {
  if (!isDatabaseAvailable()) {
    throw new UserFacingError('This action is available on iOS and Android.');
  }
}

function personPayload(record: DebtPersonRecord): Record<string, unknown> {
  return {
    id: record.id,
    name: record.name,
    mobileNumber: record.mobileNumber,
    direction: record.direction,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function transactionPayload(record: DebtTransactionRecord): Record<string, unknown> {
  return {
    id: record.id,
    personId: record.personId,
    type: record.type,
    amount: record.amount,
    transactionDate: record.transactionDate,
    note: record.note,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function validatePersonInput(input: DebtPersonInput, excludeId?: string): Promise<void> {
  const name = normalizeName(input.name);
  if (!name) {
    throw new UserFacingError('Please enter a name.');
  }
  const mobileNumber = normalizePhone(input.mobileNumber);
  if (!isPhoneNumber(mobileNumber)) {
    throw new UserFacingError('Please enter a valid mobile number.');
  }
  const existing = await debtPersonRepository.findByMobile(mobileNumber, excludeId);
  if (existing) {
    throw new UserFacingError('A person with this mobile number already exists.');
  }
}

async function validateTransactionInput(
  person: DebtPersonRecord,
  input: DebtTransactionInput,
): Promise<void> {
  if (!(input.amount > 0)) {
    throw new UserFacingError('Please enter an amount greater than 0.');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.transactionDate)) {
    throw new UserFacingError('Please choose a valid date.');
  }
  if (!isValidTransactionType(person.direction, input.type)) {
    throw new UserFacingError('Please choose a valid transaction type.');
  }
  const note = input.note?.trim() ?? '';
  if (note.length > 200) {
    throw new UserFacingError('Note can be at most 200 characters.');
  }
}

async function attachOutstanding(people: DebtPersonRecord[]): Promise<DebtPersonListItem[]> {
  if (people.length === 0) {
    return [];
  }
  const transactions = await debtTransactionRepository.listAllForPeople(people.map((p) => p.id));
  const byPerson = new Map<string, Array<{ type: DebtTransactionType; amount: number }>>();
  for (const tx of transactions) {
    const list = byPerson.get(tx.personId) ?? [];
    list.push({ type: tx.type, amount: tx.amount });
    byPerson.set(tx.personId, list);
  }
  return people.map((person) => ({
    ...person,
    outstanding: calculateOutstanding(person.direction, byPerson.get(person.id) ?? []),
  }));
}

export const debtService = {
  listPeople: async (): Promise<DebtPersonListItem[]> => {
    const people = await debtPersonRepository.list();
    return attachOutstanding(people);
  },

  getPerson: async (id: string): Promise<DebtPersonListItem | null> => {
    const person = await debtPersonRepository.getById(id);
    if (!person) {
      return null;
    }
    const [withBalance] = await attachOutstanding([person]);
    return withBalance;
  },

  listTransactions: (personId: string) => debtTransactionRepository.listForPerson(personId),

  transactionTypes: (direction: DebtDirection) => transactionTypesForDirection(direction),

  async createPerson(input: DebtPersonInput): Promise<DebtPersonRecord> {
    requireDatabase();
    await validatePersonInput(input);
    const timestamp = nowIso();
    const record: DebtPersonRecord = {
      id: createId(),
      name: normalizeName(input.name),
      mobileNumber: normalizePhone(input.mobileNumber),
      direction: input.direction,
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await debtPersonRepository.insert(record);
      await enqueueSync({
        entityType: 'debt_person',
        entityId: record.id,
        operation: 'CREATE',
        payload: personPayload(record),
      });
    });
    syncEngine.request();
    return record;
  },

  async updatePerson(id: string, input: DebtPersonInput): Promise<void> {
    requireDatabase();
    const current = await debtPersonRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That person couldn't be found.");
    }
    if (input.direction !== current.direction) {
      throw new UserFacingError("Debt direction can't be changed after creation.");
    }
    await validatePersonInput(input, id);
    const updated: DebtPersonRecord = {
      ...current,
      name: normalizeName(input.name),
      mobileNumber: normalizePhone(input.mobileNumber),
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await debtPersonRepository.update(updated);
      await enqueueSync({
        entityType: 'debt_person',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: personPayload(updated),
      });
    });
    syncEngine.request();
  },

  async createTransaction(input: DebtTransactionInput): Promise<DebtTransactionRecord> {
    requireDatabase();
    const person = await debtPersonRepository.getById(input.personId);
    if (!person) {
      throw new UserFacingError('Please select a person.');
    }
    await validateTransactionInput(person, input);
    const timestamp = nowIso();
    const record: DebtTransactionRecord = {
      id: createId(),
      personId: input.personId,
      type: input.type,
      amount: input.amount,
      transactionDate: input.transactionDate,
      note: input.note?.trim() ? input.note.trim() : null,
      syncStatus: 'PENDING',
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await getDatabase().withTransactionAsync(async () => {
      await debtTransactionRepository.insert(record);
      await enqueueSync({
        entityType: 'debt_transaction',
        entityId: record.id,
        operation: 'CREATE',
        payload: transactionPayload(record),
      });
    });
    syncEngine.request();
    return record;
  },

  async updateTransaction(id: string, input: DebtTransactionInput): Promise<void> {
    requireDatabase();
    const current = await debtTransactionRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That transaction couldn't be found.");
    }
    const person = await debtPersonRepository.getById(input.personId);
    if (!person) {
      throw new UserFacingError('Please select a person.');
    }
    await validateTransactionInput(person, input);
    const updated: DebtTransactionRecord = {
      ...current,
      personId: input.personId,
      type: input.type,
      amount: input.amount,
      transactionDate: input.transactionDate,
      note: input.note?.trim() ? input.note.trim() : null,
      syncStatus: 'PENDING',
      updatedAt: nowIso(),
    };

    await getDatabase().withTransactionAsync(async () => {
      await debtTransactionRepository.update(updated);
      await enqueueSync({
        entityType: 'debt_transaction',
        entityId: updated.id,
        operation: 'UPDATE',
        payload: transactionPayload(updated),
      });
    });
    syncEngine.request();
  },

  async removeTransaction(id: string): Promise<void> {
    requireDatabase();
    const current = await debtTransactionRepository.getById(id);
    if (!current) {
      throw new UserFacingError("That transaction couldn't be found.");
    }
    const timestamp = nowIso();
    const payload = { ...transactionPayload(current), updatedAt: timestamp };

    await getDatabase().withTransactionAsync(async () => {
      await debtTransactionRepository.softDelete(id, timestamp);
      await enqueueSync({
        entityType: 'debt_transaction',
        entityId: id,
        operation: 'DELETE',
        payload,
      });
    });
    syncEngine.request();
  },
};
