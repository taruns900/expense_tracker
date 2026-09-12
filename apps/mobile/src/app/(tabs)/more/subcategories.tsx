import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useLayoutEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, View } from 'react-native';

import {
  EmptyState,
  FormModal,
  Input,
  MasterItemRow,
  SelectField,
  SelectModal,
} from '@/components';
import { colors, spacing } from '@/components/theme';
import { isDatabaseAvailable } from '@/database';
import { categoryService } from '@/features/categories';
import { subCategoryService } from '@/features/subcategories';
import type { CategoryRecord, SubCategoryRecord } from '@/types/masterData';
import { toUserMessage } from '@/utils/userError';

export default function SubcategoriesScreen() {
  const navigation = useNavigation();
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [items, setItems] = useState<SubCategoryRecord[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<SubCategoryRecord | null>(null);
  const [name, setName] = useState('');

  const selectedCategory = useMemo(
    () => categories.find((category) => category.id === categoryId) ?? null,
    [categories, categoryId],
  );

  const load = useCallback(async () => {
    const nextCategories = await categoryService.listActive();
    setCategories(nextCategories);
    setCategoryId((current) => {
      if (current && nextCategories.some((category) => category.id === current)) {
        return current;
      }
      return nextCategories[0]?.id ?? null;
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      if (!categoryId) {
        setItems([]);
        return;
      }
      void subCategoryService.listByCategory(categoryId).then(setItems);
    }, [categoryId]),
  );

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add subcategory"
          onPress={() => openCreate()}
          style={styles.headerButton}>
          <Ionicons name="add" size={26} color={colors.primary} />
        </Pressable>
      ),
    });
  }, [navigation, categoryId]);

  function openCreate() {
    if (!categoryId) {
      Alert.alert('Choose a category', 'Add an active category before creating a subcategory.');
      return;
    }
    setEditing(null);
    setName('');
    setFormOpen(true);
  }

  function openEdit(item: SubCategoryRecord) {
    setEditing(item);
    setName(item.name);
    setFormOpen(true);
  }

  async function save() {
    if (!categoryId) {
      return;
    }
    try {
      if (editing) {
        await subCategoryService.rename(editing.id, name);
      } else {
        await subCategoryService.create(categoryId, name);
      }
      setFormOpen(false);
      setItems(await subCategoryService.listByCategory(categoryId));
    } catch (error) {
      Alert.alert("Couldn't save", toUserMessage(error, "The subcategory couldn't be saved."));
    }
  }

  function confirmToggle(item: SubCategoryRecord) {
    Alert.alert(
      item.isActive ? 'Deactivate subcategory?' : 'Reactivate subcategory?',
      item.isActive
        ? 'Existing expenses will keep this subcategory in history.'
        : 'This subcategory will be available when adding expenses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: item.isActive ? 'Deactivate' : 'Reactivate',
          style: item.isActive ? 'destructive' : 'default',
          onPress: () => {
            void (async () => {
              try {
                await subCategoryService.setActive(item.id, !item.isActive);
                if (categoryId) {
                  setItems(await subCategoryService.listByCategory(categoryId));
                }
              } catch (error) {
                Alert.alert(
                  "Couldn't update",
                  toUserMessage(error, "The subcategory couldn't be updated."),
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
          title="Subcategories"
          body="Subcategory management is available on iOS and Android."
        />
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <SelectField
        label="Category"
        value={selectedCategory?.name}
        placeholder="Select category"
        onPress={() => setPickerOpen(true)}
      />

      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        style={styles.listFlex}
        contentContainerStyle={styles.list}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState
            title="No subcategories"
            body="This category has none yet. Add Stationery under Office if you want that split."
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

      <SelectModal
        visible={pickerOpen}
        title="Category"
        options={categories.map((category) => ({ id: category.id, label: category.name }))}
        selectedId={categoryId}
        onClose={() => setPickerOpen(false)}
        onSelect={setCategoryId}
      />

      <FormModal
        visible={formOpen}
        title={editing ? 'Edit subcategory' : 'Add subcategory'}
        primaryLabel={editing ? 'Save' : 'Add'}
        onClose={() => setFormOpen(false)}
        onSubmit={() => void save()}>
        <Input
          label="Name"
          value={name}
          onChangeText={setName}
          autoCapitalize="words"
          placeholder="Stationery"
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
    gap: spacing.md,
  },
  listFlex: {
    flex: 1,
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
