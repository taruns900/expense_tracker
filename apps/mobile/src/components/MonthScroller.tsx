import { ScrollView } from 'react-native';

import { BarList } from '@/components/BarList';
import { spacing } from '@/components/theme';

type Item = { key?: string; label: string; total: number };

const ROW_HEIGHT = 54;
const VISIBLE_COUNT = 5;

export function MonthScroller({ items }: { items: Item[] }) {
  const visible = Math.min(VISIBLE_COUNT, Math.max(items.length, 1));
  const height = visible * ROW_HEIGHT + Math.max(0, visible - 1) * spacing.sm;

  return (
    <ScrollView
      nestedScrollEnabled
      showsVerticalScrollIndicator
      style={{ height }}
      keyboardShouldPersistTaps="handled">
      <BarList items={items.map(({ label, total }) => ({ label, total }))} />
    </ScrollView>
  );
}
