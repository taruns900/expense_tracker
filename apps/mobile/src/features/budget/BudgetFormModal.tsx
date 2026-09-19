import {
  BUDGET_PERIOD_TYPES,
  formatBudgetPeriodLabel,
  quarterFromDate,
  resolveDailyPeriod,
  resolveMonthlyPeriod,
  resolveQuarterlyPeriod,
  resolveWeeklyPeriod,
  resolveYearlyPeriod,
  weekStartContaining,
} from '@expense-tracker/shared';
import type { BudgetPeriodType } from '@expense-tracker/shared';
import { useEffect, useMemo, useState } from 'react';
import { Text, View } from 'react-native';

import { DateField, FormModal, Input, SelectField, SelectModal } from '@/components';
import { colors, spacing, typography } from '@/components/theme';
import { categoryService } from '@/features/categories';
import type { BudgetInput, BudgetListItem } from '@/types/budget';
import type { CategoryRecord } from '@/types/masterData';
import { parseIsoDate, toIsoDate } from '@/utils/dates';

type Props = {
  visible: boolean;
  editing: BudgetListItem | null;
  onClose: () => void;
  onSave: (input: BudgetInput) => Promise<void>;
};

const PERIOD_OPTIONS = BUDGET_PERIOD_TYPES.map((type) => ({
  id: type,
  label:
    type === 'DAILY'
      ? 'Daily'
      : type === 'WEEKLY'
        ? 'Weekly'
        : type === 'MONTHLY'
          ? 'Monthly'
          : type === 'QUARTERLY'
            ? 'Quarterly'
            : 'Yearly',
}));

function monthOptions(): Array<{ id: string; label: string }> {
  const now = new Date();
  const items: Array<{ id: string; label: string }> = [];
  for (let offset = -24; offset <= 12; offset += 1) {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const id = `${d.getFullYear()}:${d.getMonth()}`;
    items.push({
      id,
      label: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
    });
  }
  return items.reverse();
}

function yearOptions(): Array<{ id: string; label: string }> {
  const year = new Date().getFullYear();
  return Array.from({ length: 8 }, (_, i) => {
    const y = year - 3 + i;
    return { id: String(y), label: String(y) };
  });
}

function quarterOptions(): Array<{ id: string; label: string }> {
  const year = new Date().getFullYear();
  const quarters: Array<{ id: string; label: string }> = [];
  for (let y = year - 2; y <= year + 2; y += 1) {
    for (let q = 1; q <= 4; q += 1) {
      const bounds = resolveQuarterlyPeriod(y, q as 1 | 2 | 3 | 4);
      quarters.push({
        id: `${y}-Q${q}`,
        label: `Q${q} ${y} (${formatBudgetPeriodLabel('QUARTERLY', bounds.periodStart, bounds.periodEnd)})`,
      });
    }
  }
  return quarters.reverse();
}

export function BudgetFormModal({ visible, editing, onClose, onSave }: Props) {
  const [categories, setCategories] = useState<CategoryRecord[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [periodType, setPeriodType] = useState<BudgetPeriodType>('MONTHLY');
  const [dailyDate, setDailyDate] = useState(toIsoDate(new Date()));
  const [weekAnchor, setWeekAnchor] = useState(weekStartContaining(toIsoDate(new Date())));
  const [monthKey, setMonthKey] = useState(
    `${new Date().getFullYear()}:${new Date().getMonth()}`,
  );
  const [quarterKey, setQuarterKey] = useState(
    `${new Date().getFullYear()}-Q${quarterFromDate(new Date())}`,
  );
  const [yearKey, setYearKey] = useState(String(new Date().getFullYear()));
  const [amount, setAmount] = useState('');
  const [categoryPickerOpen, setCategoryPickerOpen] = useState(false);
  const [periodPickerOpen, setPeriodPickerOpen] = useState(false);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [quarterPickerOpen, setQuarterPickerOpen] = useState(false);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  useEffect(() => {
    if (!visible) {
      return;
    }
    void categoryService.listActive().then(setCategories);
  }, [visible]);

  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editing) {
      setCategoryId(editing.categoryId);
      setPeriodType(editing.periodType);
      setAmount(String(editing.amount));
      setDailyDate(editing.periodStart);
      setWeekAnchor(editing.periodStart);
      const start = parseIsoDate(editing.periodStart);
      setMonthKey(`${start.getFullYear()}:${start.getMonth()}`);
      setQuarterKey(`${start.getFullYear()}-Q${quarterFromDate(start)}`);
      setYearKey(String(start.getFullYear()));
      return;
    }
    const today = toIsoDate(new Date());
    setCategoryId(null);
    setPeriodType('MONTHLY');
    setAmount('');
    setDailyDate(today);
    setWeekAnchor(weekStartContaining(today));
    setMonthKey(`${new Date().getFullYear()}:${new Date().getMonth()}`);
    setQuarterKey(`${new Date().getFullYear()}-Q${quarterFromDate(new Date())}`);
    setYearKey(String(new Date().getFullYear()));
  }, [visible, editing]);

  const bounds = useMemo(() => {
    switch (periodType) {
      case 'DAILY':
        return resolveDailyPeriod(dailyDate);
      case 'WEEKLY':
        return resolveWeeklyPeriod(weekAnchor);
      case 'MONTHLY': {
        const [yearPart, monthPart] = monthKey.split(':');
        const year = Number(yearPart);
        const month = Number(monthPart);
        return resolveMonthlyPeriod(year, month);
      }
      case 'QUARTERLY': {
        const [yearPart, qPart] = quarterKey.split('-Q');
        return resolveQuarterlyPeriod(Number(yearPart), Number(qPart) as 1 | 2 | 3 | 4);
      }
      case 'YEARLY':
        return resolveYearlyPeriod(Number(yearKey));
      default:
        return resolveDailyPeriod(dailyDate);
    }
  }, [periodType, dailyDate, weekAnchor, monthKey, quarterKey, yearKey]);

  const periodDetailLabel = formatBudgetPeriodLabel(bounds.periodType, bounds.periodStart, bounds.periodEnd);

  const categoryLabel = categories.find((c) => c.id === categoryId)?.name;

  async function submit() {
    const parsed = Number(amount.replace(/,/g, ''));
    if (!categoryId) {
      return;
    }
    try {
      await onSave({
        categoryId,
        periodType,
        periodStart: bounds.periodStart,
        periodEnd: bounds.periodEnd,
        amount: parsed,
      });
    } catch {
      // Parent shows validation errors (e.g. duplicate period).
    }
  }

  const monthOptionsMemo = useMemo(() => monthOptions(), []);
  const yearOptionsMemo = useMemo(() => yearOptions(), []);
  const quarterOptionsMemo = useMemo(() => quarterOptions(), []);

  return (
    <>
      <FormModal
        visible={visible}
        title={editing ? 'Edit budget' : 'Create budget'}
        primaryLabel={editing ? 'Save changes' : 'Save budget'}
        onClose={onClose}
        onSubmit={() => void submit()}
        submitDisabled={!categoryId || !(Number(amount.replace(/,/g, '')) > 0)}
        size="tall">
        <View style={{ gap: spacing.md }}>
          <SelectField
            label="Category"
            value={categoryLabel}
            placeholder="Select category"
            onPress={() => setCategoryPickerOpen(true)}
          />
          <SelectField
            label="Period"
            value={PERIOD_OPTIONS.find((o) => o.id === periodType)?.label}
            placeholder="Select period type"
            onPress={() => setPeriodPickerOpen(true)}
          />
          {periodType === 'DAILY' ? (
            <DateField label="Date" value={dailyDate} placeholder="Select date" onChange={setDailyDate} />
          ) : null}
          {periodType === 'WEEKLY' ? (
            <DateField
              label="Week"
              value={weekAnchor}
              placeholder="Select a day in the week"
              onChange={(iso) => setWeekAnchor(weekStartContaining(iso))}
            />
          ) : null}
          {periodType === 'WEEKLY' ? (
            <Text style={{ ...typography.caption, color: colors.textSecondary }}>{periodDetailLabel}</Text>
          ) : null}
          {periodType === 'MONTHLY' ? (
            <SelectField
              label="Month"
              value={monthOptionsMemo.find((m) => m.id === monthKey)?.label}
              placeholder="Select month"
              onPress={() => setMonthPickerOpen(true)}
            />
          ) : null}
          {periodType === 'QUARTERLY' ? (
            <SelectField
              label="Quarter"
              value={quarterOptionsMemo.find((q) => q.id === quarterKey)?.label}
              placeholder="Select quarter"
              onPress={() => setQuarterPickerOpen(true)}
            />
          ) : null}
          {periodType === 'YEARLY' ? (
            <SelectField
              label="Year"
              value={yearKey}
              placeholder="Select year"
              onPress={() => setYearPickerOpen(true)}
            />
          ) : null}
          <Input
            label="Amount"
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            placeholder="0"
          />
        </View>
      </FormModal>

      <SelectModal
        visible={categoryPickerOpen}
        title="Category"
        options={categories.map((c) => ({ id: c.id, label: c.name }))}
        selectedId={categoryId}
        onClose={() => setCategoryPickerOpen(false)}
        onSelect={(id) => {
          setCategoryId(id);
          setCategoryPickerOpen(false);
        }}
      />
      <SelectModal
        visible={periodPickerOpen}
        title="Period type"
        options={PERIOD_OPTIONS}
        selectedId={periodType}
        onClose={() => setPeriodPickerOpen(false)}
        onSelect={(id) => {
          setPeriodType(id as BudgetPeriodType);
          setPeriodPickerOpen(false);
        }}
      />
      <SelectModal
        visible={monthPickerOpen}
        title="Month"
        options={monthOptionsMemo}
        selectedId={monthKey}
        onClose={() => setMonthPickerOpen(false)}
        onSelect={(id) => {
          setMonthKey(id);
          setMonthPickerOpen(false);
        }}
      />
      <SelectModal
        visible={quarterPickerOpen}
        title="Quarter"
        options={quarterOptionsMemo}
        selectedId={quarterKey}
        onClose={() => setQuarterPickerOpen(false)}
        onSelect={(id) => {
          setQuarterKey(id);
          setQuarterPickerOpen(false);
        }}
      />
      <SelectModal
        visible={yearPickerOpen}
        title="Year"
        options={yearOptionsMemo}
        selectedId={yearKey}
        onClose={() => setYearPickerOpen(false)}
        onSelect={(id) => {
          setYearKey(id);
          setYearPickerOpen(false);
        }}
      />
    </>
  );
}
