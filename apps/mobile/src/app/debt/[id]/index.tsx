import { formatDebtTransactionTypeLabel } from '@expense-tracker/shared';
import type { DebtTransactionType } from '@expense-tracker/shared';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Card,
  DateField,
  EmptyState,
  FormModal,
  IconButton,
  Input,
  Screen,
  SelectField,
  SelectModal,
} from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { debtService } from '@/features/debt';
import type { DebtPersonListItem, DebtTransactionRecord } from '@/types/debt';
import { formatDisplayDate, toIsoDate } from '@/utils/dates';
import { formatInr } from '@/utils/money';
import { toUserMessage } from '@/utils/userError';

export default function DebtPersonDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [person, setPerson] = useState<DebtPersonListItem | null>(null);
  const [transactions, setTransactions] = useState<DebtTransactionRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<DebtTransactionRecord | null>(null);
  const [type, setType] = useState<DebtTransactionType>('BORROWED');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(toIsoDate(new Date()));
  const [note, setNote] = useState('');
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [personName, setPersonName] = useState('');
  const [personMobile, setPersonMobile] = useState('');

  const load = useCallback(async () => {
    if (!id) {
      return;
    }
    const nextPerson = await debtService.getPerson(id);
    setPerson(nextPerson);
    setTransactions(await debtService.listTransactions(id));
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  function openEditPerson() {
    if (!person) {
      return;
    }
    setPersonName(person.name);
    setPersonMobile(person.mobileNumber);
    setPersonFormOpen(true);
  }

  async function savePerson() {
    if (!person) {
      return;
    }
    try {
      await debtService.updatePerson(person.id, {
        name: personName,
        mobileNumber: personMobile,
        direction: person.direction,
      });
      setPersonFormOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The person couldn't be updated."));
    }
  }

  function openCreate() {
    if (!person) {
      return;
    }
    setEditing(null);
    setType(person.direction === 'TAKEN' ? 'BORROWED' : 'GIVEN');
    setAmount('');
    setDate(toIsoDate(new Date()));
    setNote('');
    setFormOpen(true);
  }

  function openEdit(tx: DebtTransactionRecord) {
    setEditing(tx);
    setType(tx.type);
    setAmount(String(tx.amount));
    setDate(tx.transactionDate);
    setNote(tx.note ?? '');
    setFormOpen(true);
  }

  async function save() {
    if (!person) {
      return;
    }
    const parsed = Number(amount.replace(/,/g, ''));
    try {
      const input = {
        personId: person.id,
        type,
        amount: parsed,
        transactionDate: date,
        note,
      };
      if (editing) {
        await debtService.updateTransaction(editing.id, input);
      } else {
        await debtService.createTransaction(input);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The transaction couldn't be saved."));
    }
  }

  function confirmDelete(tx: DebtTransactionRecord) {
    Alert.alert('Delete transaction?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          void (async () => {
            try {
              await debtService.removeTransaction(tx.id);
              await load();
            } catch (error) {
              Alert.alert("Couldn't delete", toUserMessage(error, "The transaction couldn't be deleted."));
            }
          })();
        },
      },
    ]);
  }

  if (!person) {
    return (
      <Screen title="Debt">
        <EmptyState title="Not found" body="This person could not be found." />
      </Screen>
    );
  }

  const typeOptions = debtService.transactionTypes(person.direction).map((t) => ({
    id: t,
    label: formatDebtTransactionTypeLabel(person.direction, t),
  }));

  return (
    <Screen
      title={person.name}
      headerRight={
        <View style={{ flexDirection: 'row', gap: spacing.xs }}>
          <IconButton name="create-outline" accessibilityLabel="Edit person" onPress={openEditPerson} />
          <IconButton name="add" accessibilityLabel="Add transaction" onPress={openCreate} />
        </View>
      }>
      <Card style={styles.summary}>
        <Text style={styles.phone}>{person.mobileNumber}</Text>
        <Text style={styles.outstandingLabel}>Outstanding</Text>
        <Text style={styles.outstanding}>{formatInr(person.outstanding)}</Text>
      </Card>

      <Text style={styles.section}>Transactions</Text>
      {transactions.length === 0 ? (
        <EmptyState title="No transactions" body="Add a transaction to record borrowing or repayment." />
      ) : (
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const increases =
              (person.direction === 'TAKEN' && item.type === 'BORROWED') ||
              (person.direction === 'GIVEN' && item.type === 'GIVEN');
            return (
              <Pressable onPress={() => openEdit(item)} onLongPress={() => confirmDelete(item)}>
                <Card style={styles.txRow}>
                  <View style={styles.txTop}>
                    <Text style={styles.txDate}>{formatDisplayDate(item.transactionDate)}</Text>
                    <Text style={[styles.txAmount, increases ? styles.txPositive : styles.txNegative]}>
                      {increases ? '+' : '-'}
                      {formatInr(item.amount)}
                    </Text>
                  </View>
                  <Text style={styles.txType}>
                    {formatDebtTransactionTypeLabel(person.direction, item.type)}
                  </Text>
                  {item.note ? <Text style={styles.txNote}>{item.note}</Text> : null}
                </Card>
              </Pressable>
            );
          }}
        />
      )}

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit transaction' : 'Add transaction'}
        primaryLabel="Save"
        onClose={() => setFormOpen(false)}
        onSubmit={() => void save()}
        submitDisabled={!(Number(amount.replace(/,/g, '')) > 0)}>
        <View style={{ gap: spacing.md }}>
          <SelectField
            label="Transaction"
            value={formatDebtTransactionTypeLabel(person.direction, type)}
            placeholder="Select type"
            onPress={() => setTypePickerOpen(true)}
          />
          <Input label="Amount" value={amount} onChangeText={setAmount} keyboardType="decimal-pad" />
          <DateField label="Date" value={date} placeholder="Select date" onChange={setDate} />
          <Input label="Note" value={note} onChangeText={setNote} placeholder="Optional" />
        </View>
      </FormModal>

      <FormModal
        visible={personFormOpen}
        title="Edit person"
        primaryLabel="Save"
        onClose={() => setPersonFormOpen(false)}
        onSubmit={() => void savePerson()}
        submitDisabled={!personName.trim() || !personMobile.trim()}>
        <View style={{ gap: spacing.md }}>
          <Input label="Name" value={personName} onChangeText={setPersonName} />
          <Input
            label="Mobile number"
            value={personMobile}
            onChangeText={setPersonMobile}
            keyboardType="phone-pad"
          />
        </View>
      </FormModal>

      <SelectModal
        visible={typePickerOpen}
        title="Transaction type"
        options={typeOptions}
        selectedId={type}
        onClose={() => setTypePickerOpen(false)}
        onSelect={(next) => {
          setType(next as DebtTransactionType);
          setTypePickerOpen(false);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  summary: {
    marginBottom: spacing.md,
    gap: spacing.xxs,
  },
  phone: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  outstandingLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.sm,
  },
  outstanding: {
    ...typography.amount,
    color: colors.text,
  },
  section: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  list: {
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  txRow: {
    gap: spacing.xxs,
  },
  txTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  txDate: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  txAmount: {
    ...typography.amount,
  },
  txPositive: {
    color: colors.danger,
  },
  txNegative: {
    color: colors.success,
  },
  txType: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  txNote: {
    ...typography.caption,
    color: colors.textSecondary,
  },
});
