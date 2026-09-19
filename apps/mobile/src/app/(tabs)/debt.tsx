import { type Href, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState, type ReactNode } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, EmptyState, FormModal, IconButton, Input, Screen, SelectField, SelectModal } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { isDatabaseAvailable } from '@/database';
import { debtService } from '@/features/debt';
import type { DebtPersonListItem } from '@/types/debt';
import type { DebtDirection } from '@expense-tracker/shared';
import { formatInr } from '@/utils/money';
import { toUserMessage } from '@/utils/userError';

const DIRECTION_OPTIONS = [
  { id: 'TAKEN', label: 'You owe (debt taken)' },
  { id: 'GIVEN', label: 'They owe you (debt given)' },
];

export default function DebtScreen() {
  const router = useRouter();
  const [people, setPeople] = useState<DebtPersonListItem[]>([]);
  const [personFormOpen, setPersonFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [direction, setDirection] = useState<DebtDirection>('TAKEN');
  const [directionPickerOpen, setDirectionPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setPeople(await debtService.listPeople());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const taken = people.filter((p) => p.direction === 'TAKEN');
  const given = people.filter((p) => p.direction === 'GIVEN');

  async function savePerson() {
    try {
      await debtService.createPerson({ name, mobileNumber: mobile, direction });
      setPersonFormOpen(false);
      setName('');
      setMobile('');
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The person couldn't be saved."));
    }
  }

  function renderPerson(item: DebtPersonListItem) {
    return (
      <Pressable
        key={item.id}
        onPress={() => router.push(`/debt/${item.id}` as unknown as Href)}
        style={styles.personRow}>
        <View style={styles.personMain}>
          <Text style={styles.personName}>{item.name}</Text>
          <Text style={styles.personPhone}>{item.mobileNumber}</Text>
        </View>
        <Text style={styles.personAmount}>{formatInr(item.outstanding)}</Text>
      </Pressable>
    );
  }

  if (!isDatabaseAvailable()) {
    return (
      <Screen title="Debt" showBack={false}>
        <EmptyState title="Not available" body="Debt tracking is available on iOS and Android." />
      </Screen>
    );
  }

  const isEmpty = people.length === 0;

  return (
    <Screen
      title="Debt"
      showBack={false}
      headerRight={
        <IconButton name="person-add-outline" accessibilityLabel="Add person" onPress={() => setPersonFormOpen(true)} />
      }>
      {isEmpty ? (
        <View style={styles.empty}>
          <EmptyState title="No debt records yet" body="Add a person to start tracking debt." />
          <Button label="Add person" onPress={() => setPersonFormOpen(true)} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.body}>
          <Section title="You owe" items={taken} render={renderPerson} emptyHint="No people in this list yet." />
          <Section title="They owe you" items={given} render={renderPerson} emptyHint="No people in this list yet." />
        </ScrollView>
      )}

      <FormModal
        visible={personFormOpen}
        title="Add person"
        primaryLabel="Save"
        onClose={() => setPersonFormOpen(false)}
        onSubmit={() => void savePerson()}
        submitDisabled={!name.trim() || !mobile.trim()}>
        <View style={{ gap: spacing.md }}>
          <Input label="Name" value={name} onChangeText={setName} placeholder="Name" />
          <Input
            label="Mobile number"
            value={mobile}
            onChangeText={setMobile}
            keyboardType="phone-pad"
            placeholder="10-digit mobile"
          />
          <SelectField
            label="Debt type"
            value={DIRECTION_OPTIONS.find((o) => o.id === direction)?.label}
            placeholder="Select type"
            onPress={() => setDirectionPickerOpen(true)}
          />
        </View>
      </FormModal>

      <SelectModal
        visible={directionPickerOpen}
        title="Debt type"
        options={DIRECTION_OPTIONS}
        selectedId={direction}
        onClose={() => setDirectionPickerOpen(false)}
        onSelect={(id) => {
          setDirection(id as DebtDirection);
          setDirectionPickerOpen(false);
        }}
      />
    </Screen>
  );
}

function Section({
  title,
  items,
  render,
  emptyHint,
}: {
  title: string;
  items: DebtPersonListItem[];
  render: (item: DebtPersonListItem) => ReactNode;
  emptyHint: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.length === 0 ? (
        emptyHint ? <Text style={styles.emptyHint}>{emptyHint}</Text> : null
      ) : (
        items.map((item) => render(item))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: {
    gap: spacing.md,
  },
  body: {
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subheading,
    color: colors.text,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  personMain: {
    flex: 1,
    gap: 2,
  },
  personName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  personPhone: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  personAmount: {
    ...typography.amount,
    color: colors.text,
  },
});
