import Ionicons from '@expo/vector-icons/Ionicons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Card, IconButton, Screen } from '@/components';
import { BarList } from '@/components/BarList';
import { MonthScroller } from '@/components/MonthScroller';
import { colors, spacing, typography } from '@/components/theme';
import { dashboardBudgetGroups } from '@/features/budget';
import { dashboardService } from '@/features/dashboard';
import { useSessionStore } from '@/store';
import { formatInr } from '@/utils/money';

export default function HomeScreen() {
  const router = useRouter();
  const dataEpoch = useSessionStore((state) => state.dataEpoch);
  const [summary, setSummary] = useState({ todayTotal: 0, weekTotal: 0, monthTotal: 0, yearTotal: 0 });
  const [last7Days, setLast7Days] = useState<Array<{ label: string; total: number }>>([]);
  const [months, setMonths] = useState<Array<{ key: string; label: string; total: number }>>([]);
  const [top, setTop] = useState<Array<{ name: string; total: number }>>([]);
  const [mom, setMom] = useState<{
    current: number;
    previous: number;
    percent: number;
    direction: 'increase' | 'decrease' | 'flat';
  } | null>(null);
  const [budgetGroups, setBudgetGroups] = useState<
    Awaited<ReturnType<typeof dashboardBudgetGroups>>
  >([]);

  const load = useCallback(async () => {
    const [nextSummary, nextDays, nextMonths, nextTop, nextMom, nextBudgets] = await Promise.all([
      dashboardService.summary(),
      dashboardService.last7DaysSeries(),
      dashboardService.monthSeries(),
      dashboardService.topCategories(),
      dashboardService.monthOverMonth(),
      dashboardBudgetGroups(),
    ]);
    setSummary(nextSummary);
    setLast7Days(nextDays);
    setMonths(nextMonths);
    setTop(nextTop);
    setMom(nextMom);
    setBudgetGroups(nextBudgets);
  }, [dataEpoch]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  return (
    <Screen
      title="Home"
      showBack={false}
      headerRight={
        <IconButton
          name="time-outline"
          accessibilityLabel="Expense history"
          onPress={() => router.push('/expenses')}
        />
      }>
      <ScrollView nestedScrollEnabled contentContainerStyle={styles.body}>
        <View style={styles.grid}>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Today</Text>
            <Text style={styles.statValue}>{formatInr(summary.todayTotal)}</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>Last 7 days</Text>
            <Text style={styles.statValue}>{formatInr(summary.weekTotal)}</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>This month</Text>
            <Text style={styles.statValue}>{formatInr(summary.monthTotal)}</Text>
          </Card>
          <Card style={styles.stat}>
            <Text style={styles.statLabel}>This year</Text>
            <Text style={styles.statValue}>{formatInr(summary.yearTotal)}</Text>
          </Card>
        </View>

        {budgetGroups.length > 0 ? (
          <Card>
            <Text style={styles.section}>Budget remaining</Text>
            {budgetGroups.map((group) => (
              <View key={group.categoryId} style={styles.budgetGroup}>
                <Text style={styles.budgetCategory}>{group.categoryName}</Text>
                {group.lines.map((line) => (
                  <View key={line.budgetId} style={styles.budgetLine}>
                    <Text style={styles.budgetMeta}>
                      {line.periodTypeLabel} · {line.periodLabel}
                    </Text>
                    <Text
                      style={[
                        styles.budgetRemaining,
                        line.remaining < 0 ? styles.budgetOver : null,
                      ]}>
                      {formatInr(line.remaining)}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </Card>
        ) : null}

        {mom ? (
          <Card>
            <Text style={styles.section}>Compared with last month</Text>
            <View style={styles.momRow}>
              <Ionicons
                name={mom.direction === 'decrease' ? 'arrow-down' : mom.direction === 'increase' ? 'arrow-up' : 'remove'}
                size={20}
                color={mom.direction === 'decrease' ? colors.success : mom.direction === 'increase' ? colors.danger : colors.textSecondary}
              />
              <Text style={styles.momText}>
                {mom.direction === 'flat' ? 'No change' : `${mom.direction === 'increase' ? 'Increase' : 'Decrease'} ${Math.abs(mom.percent).toFixed(1)}%`}
              </Text>
            </View>
            <Text style={styles.hint}>
              {formatInr(mom.current)} this month · {formatInr(mom.previous)} last month
            </Text>
          </Card>
        ) : null}

        <Card>
          <Text style={styles.section}>Top categories</Text>
          {top.length === 0 ? null : (
            <BarList items={top.slice(0, 5).map((item) => ({ label: item.name, total: item.total }))} horizontal />
          )}
        </Card>

        <Card>
          <Text style={styles.section}>Weekly history</Text>
          <BarList items={last7Days} />
        </Card>

        <Card>
          <Text style={styles.section}>Monthly history</Text>
          <MonthScroller items={months} />
        </Card>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
    paddingBottom: spacing.xxl,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stat: {
    width: '48%',
    flexGrow: 1,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  statValue: {
    ...typography.amount,
    color: colors.text,
    marginTop: spacing.xxs,
  },
  section: {
    ...typography.subheading,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  hint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  momRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  budgetGroup: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  budgetCategory: {
    ...typography.body,
    fontWeight: '700',
    color: colors.text,
    marginBottom: spacing.xxs,
  },
  budgetLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
  budgetMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  budgetRemaining: {
    ...typography.body,
    fontWeight: '600',
    color: colors.text,
  },
  budgetOver: {
    color: colors.danger,
  },
  momText: {
    ...typography.body,
    color: colors.text,
  },
});
