import { PAYMENT_METHODS } from '@expense-tracker/shared';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, View } from 'react-native';

import {
  Button,
  DateField,
  EmptyState,
  FormModal,
  IconButton,
  Input,
  Screen,
  SelectField,
  SelectModal,
} from '@/components';
import { ExpenseRow } from '@/components/ExpenseRow';
import { spacing } from '@/components/theme';
import { categoryService } from '@/features/categories';
import { expenseService } from '@/features/expenses';
import { subCategoryService } from '@/features/subcategories';
import { vendorService } from '@/features/vendors';
import { pdfService } from '@/services/pdf';
import { useUiStore } from '@/store';
import type { ExpenseListItem } from '@/types/expense';
import type { ExpenseFilters } from '@/types/filters';
import { hasActiveFilters } from '@/types/filters';
import type { CategoryRecord, SubCategoryRecord, VendorRecord } from '@/types/masterData';
import { toUserMessage } from '@/utils/userError';

export default function ExpensesScreen() {
  const router = useRouter();
  const filters = useUiStore((state) => state.filters);
  const setFilters = useUiStore((state) => state.setFilters);
  const searchQuery = useUiStore((state) => state.searchQuery);
  const setSearchQuery = useUiStore((state) => state.setSearchQuery);
  const [items, setItems] = useState<ExpenseListItem[]>([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [draft, setDraft] = useState<ExpenseFilters>(filters);
  const [picker, setPicker] = useState<null | 'category' | 'sub' | 'vendor' | 'method'>(null);
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [subcategories, setSubcategories] = useState<SubCategoryRecord[]>([]);
  const [vendors, setVendors] = useState<VendorRecord[]>([]);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setItems(await expenseService.list(filters, searchQuery));
  }, [filters, searchQuery]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  useFocusEffect(
    useCallback(() => {
      void categoryService.listActive().then(setCategories);
      void vendorService.listActive().then(setVendors);
    }, []),
  );

  useEffect(() => {
    if (!draft.categoryId) {
      setSubcategories([]);
      return;
    }
    void subCategoryService.listActiveByCategory(draft.categoryId).then(setSubcategories);
  }, [draft.categoryId]);

  const categoryName = categories.find((item) => item.id === draft.categoryId)?.name;
  const subName = subcategories.find((item) => item.id === draft.subCategoryId)?.name;
  const vendorName = vendors.find((item) => item.id === draft.vendorId)?.name;

  return (
    <Screen title="Expenses" subtitle="Search and filter expenses from this list.">
      <View style={styles.wrap}>
      <Input
        label="Search"
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Expense ID, description, bill, vendor, category"
      />
      <View style={styles.actions}>
        <IconButton
          name="funnel-outline"
          accessibilityLabel={hasActiveFilters(filters) ? 'Filters on' : 'Filters'}
          onPress={() => {
            setDraft(filters);
            setFilterOpen(true);
          }}
        />
        <IconButton
          name="download-outline"
          accessibilityLabel="Export PDF"
          disabled={exporting}
          onPress={() => {
            setExporting(true);
            void pdfService
              .shareReport(filters, searchQuery)
              .catch((error) => {
                Alert.alert("Couldn't export", toUserMessage(error, "The report couldn't be created."));
              })
              .finally(() => setExporting(false));
          }}
        />
      </View>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <EmptyState title="No expenses" body="Use Add to record the first expense. It is saved on this device immediately." />
        }
        renderItem={({ item }) => (
          <ExpenseRow item={item} onPress={() => router.push(`/expense/${item.id}`)} />
        )}
      />

      <FormModal
        visible={filterOpen}
        title="Filters"
        primaryLabel="Apply"
        onClose={() => setFilterOpen(false)}
        onSubmit={() => {
          setFilters(draft);
          setFilterOpen(false);
        }}>
        <DateField
          label="From date"
          value={draft.dateFrom}
          placeholder="Any"
          maximumDate={new Date()}
          onChange={(dateFrom) => setDraft((current) => ({ ...current, dateFrom }))}
        />
        <DateField
          label="To date"
          value={draft.dateTo}
          placeholder="Any"
          maximumDate={new Date()}
          onChange={(dateTo) => setDraft((current) => ({ ...current, dateTo }))}
        />
        <SelectField
          label="Category"
          value={categoryName}
          placeholder="Any"
          onPress={() => setPicker('category')}
        />
        {subcategories.length > 0 ? (
          <SelectField
            label="Subcategory"
            value={subName}
            placeholder="Any"
            onPress={() => setPicker('sub')}
          />
        ) : null}
        <SelectField
          label="Vendor"
          value={vendorName}
          placeholder="Any"
          onPress={() => setPicker('vendor')}
        />
        <SelectField
          label="Payment method"
          value={draft.paymentMethod}
          placeholder="Any"
          onPress={() => setPicker('method')}
        />
        <Input
          label="Minimum amount"
          value={draft.amountMin?.toString() ?? ''}
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, amountMin: value ? Number(value) : undefined }))
          }
        />
        <Input
          label="Maximum amount"
          value={draft.amountMax?.toString() ?? ''}
          keyboardType="decimal-pad"
          onChangeText={(value) =>
            setDraft((current) => ({ ...current, amountMax: value ? Number(value) : undefined }))
          }
        />
        <Button label="Clear filters" variant="ghost" onPress={() => setDraft({})} />
      </FormModal>

      <SelectModal
        visible={picker === 'category'}
        title="Category"
        options={[{ id: '', label: 'Any' }, ...categories.map((item) => ({ id: item.id, label: item.name }))]}
        selectedId={draft.categoryId ?? ''}
        onClose={() => setPicker(null)}
        onSelect={(id) => setDraft((current) => ({ ...current, categoryId: id || undefined, subCategoryId: undefined }))}
      />
      <SelectModal
        visible={picker === 'sub'}
        title="Subcategory"
        options={[{ id: '', label: 'Any' }, ...subcategories.map((item) => ({ id: item.id, label: item.name }))]}
        selectedId={draft.subCategoryId ?? ''}
        onClose={() => setPicker(null)}
        onSelect={(id) => setDraft((current) => ({ ...current, subCategoryId: id || undefined }))}
      />
      <SelectModal
        visible={picker === 'vendor'}
        title="Vendor"
        options={[{ id: '', label: 'Any' }, ...vendors.map((item) => ({ id: item.id, label: item.name }))]}
        selectedId={draft.vendorId ?? ''}
        onClose={() => setPicker(null)}
        onSelect={(id) => setDraft((current) => ({ ...current, vendorId: id || undefined }))}
      />
      <SelectModal
        visible={picker === 'method'}
        title="Payment method"
        options={[{ id: '', label: 'Any' }, ...PAYMENT_METHODS.map((item) => ({ id: item, label: item }))]}
        selectedId={draft.paymentMethod ?? ''}
        onClose={() => setPicker(null)}
        onSelect={(id) =>
          setDraft((current) => ({
            ...current,
            paymentMethod: id ? (id as ExpenseFilters['paymentMethod']) : undefined,
          }))
        }
      />
    </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    gap: spacing.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
    zIndex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: spacing.xxl,
    paddingTop: spacing.sm,
  },
  separator: {
    height: spacing.xs,
  },
});
