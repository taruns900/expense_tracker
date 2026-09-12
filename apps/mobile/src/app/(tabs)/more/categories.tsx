import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import { EmptyState, FormModal, Input, MasterItemRow } from '@/components';
import { colors, spacing } from '@/components/theme';
import { isDatabaseAvailable } from '@/database';
import { categoryService } from '@/features/categories';
import type { CategoryRecord } from '@/types/masterData';
import { toUserMessage } from '@/utils/userError';

export default function CategoriesScreen() {
  const navigation = useNavigation();
  const [items, setItems] = useState<CategoryRecord[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryRecord | null>(null);
  const [name, setName] = useState('');

  const load = useCallback(async () => {
    setItems(await categoryService.list());
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
          accessibilityLabel="Add category"
          onPress={() => openCreate()}
          style={styles.headerButton}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation]);

  function openCreate() {
    setEditing(null);
    setName('');
    setFormOpen(true);
  }

  function openEdit(item: CategoryRecord) {
    setEditing(item);
    setName(item.name);
    setFormOpen(true);
  }

  async function save() {
    try {
      if (editing) {
        await categoryService.rename(editing.id, name);
      } else {
        await categoryService.create(name);
      }
      setFormOpen(false);
      await load();
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The category couldn't be saved."));
    }
  }

  function confirmToggle(item: CategoryRecord) {
    Alert.alert(
      item.isActive ? 'Deactivate category?' : 'Reactivate category?',
      item.isActive
        ? 'Existing expenses will keep this category in history.'
        : 'This category will be available when adding expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Reactivate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              try {
                await categoryService.setActive(item.id, !item.isActive);
                await load();
              } catch (error) {
                Alert.alert(
                  "Couldn't update",
                  toUserMessage(error, "The category couldn't be updated."),
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
        <EmptyState
          title="Categories"
          body="Category management is available on iOS and Android."
        />
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
            title="No categories"
            body="Add a category such as Office, then attach subcategories if you need them."
          />
        }
        renderItem={({ item }) => (
          <MasterItemRow
            title={item.name}
            inactive={!item.isActive}
            onPress={() => openEdit(item)}
            onToggleActive={() => confirmToggle(item)}
          />
        )}
      />

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit category' : 'Add category'}
        primaryLabel={editing ? 'Save' : 'Add'}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void save()}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Office"
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
