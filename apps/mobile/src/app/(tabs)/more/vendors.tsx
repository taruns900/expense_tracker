/** Later version — Vendors are not linked from More and are not synced. */
import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, FormModal, Input, MasterItemRow } from '@/components';
import { colors, spacing } from '@/components/theme';
import { isDatabaseAvailable } from '@/database';
import { vendorService } from '@/features/vendors';
import type { VendorRecord } from '@/types/masterData';
import { toUserMessage } from '@/utils/userError';

const emptyForm = {
  name: '',
  email: '',
  phone: '',
  address: '',
  gstNumber: '',
};

export default function VendorsScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<VendorRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<VendorRecord | null>(null);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setItems(await vendorService.list());
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add vendor"
          onPress={() => openCreate()}
          style={styles.headerButton}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEdit(item: VendorRecord) {
    setEditing(item);
    setForm({
      name: item.name,
      email: item.email ?? '',
      phone: item.phone ?? '',
      address: item.address ?? '',
      gstNumber: item.gstNumber ?? '',
    });
    setFormOpen(true);
  }

  async function save() {
    try {
      if (editing) {
        await vendorService.update(editing.id, form);
      } else {
        await vendorService.create(form);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The vendor couldn't be saved."));
    }
  }

  function confirmToggle(item: VendorRecord) {
    Alert.alert(
      item.isActive ? 'Deactivate vendor?' : 'Reactivate vendor?',
      item.isActive
        ? 'Existing expenses will keep this vendor in history.'
        : 'This vendor will be available when adding expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Reactivate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              try {
                await vendorService.setActive(item.id, !item.isActive);
                await load();
              } catch (error) {
                Alert.alert(
                  "Couldn't update",
                  toUserMessage(error, "The vendor couldn't be updated."),
                );
              }
            })();
          },
        },
      ],
    );
  }

  if (!isDatabaseAvailable()) {
    return (
      <View style={styles.wrap}>
        <EmptyState title="Vendors" body="Vendor management is available on iOS and Android." />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title="No vendors"
            body="Vendors are optional on an expense. Add one when you want it on records and PDFs."
          />
        }
        renderItem={({ item }) => (
          <MasterItemRow
            title={item.name}
            subtitle={[item.phone, item.gstNumber].filter(Boolean).join(' · ') || undefined}
            inactive={!item.isActive}
            onPress={() => openEdit(item)}
            onToggleActive={() => confirmToggle(item)}
          />
        )}
      />

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit vendor' : 'Add vendor'}
        primaryLabel={editing ? 'Save' : 'Add'}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void save()}>
        <Input
          label="Name"
          value={form.name}
          onChangeText={(name) => setForm((current) => ({ ...current, name }))}
          autoCapitalize="words"
          placeholder="Vendor name"
        />
        <Input
          label="Email"
          value={form.email}
          onChangeText={(email) => setForm((current) => ({ ...current, email }))}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <Input
          label="Phone"
          value={form.phone}
          onChangeText={(phone) => setForm((current) => ({ ...current, phone }))}
          keyboardType="phone-pad"
        />
        <Input
          label="Address"
          value={form.address}
          onChangeText={(address) => setForm((current) => ({ ...current, address }))}
        />
        <Input
          label="GST number"
          value={form.gstNumber}
          onChangeText={(gstNumber) => setForm((current) => ({ ...current, gstNumber }))}
          autoCapitalize="characters"
        />
      </FormModal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  list: {
    paddingBottom: spacing.xxl,
  },
  separator: {
    height: spacing.xs,
  },
  headerButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
