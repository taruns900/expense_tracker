import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, typography } from '@/components/theme';
import { AddExpenseFlow } from '@/features/expenses';
import { useUiStore } from '@/store';

const TAB_BAR_HEIGHT = 72;
const ADD_ICON_SIZE = 32;

function TabIcon({
  name,
  color,
  focused,
}: {
  name: ComponentProps<typeof Ionicons>['name'];
  color: ColorValue;
  focused: boolean;
}) {
  return <Ionicons name={name} size={focused ? 26 : 24} color={color} />;
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        backBehavior="none"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.tabInactive,
          tabBarLabelStyle: {
            ...typography.caption,
            fontWeight: '600',
          },
          tabBarStyle: {
            backgroundColor: colors.tabBar,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: colors.tabBarBorder,
            height: TAB_BAR_HEIGHT + insets.bottom,
            paddingBottom: insets.bottom,
            paddingTop: 6,
            elevation: 0,
            shadowOpacity: 0,
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabIcon name={focused ? 'home' : 'home-outline'} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="add"
          listeners={{
            tabPress: (event) => {
              event.preventDefault();
            },
          }}
          options={{
            title: 'Add',
            tabBarIcon: () => (
              <View style={styles.addIcon}>
                <Ionicons name="add" size={22} color={colors.textInverse} />
              </View>
            ),
            tabBarButton: ({ children, onPress: _onPress, style, ref: _ref, ...rest }) => (
              <Pressable
                {...rest}
                accessibilityRole="button"
                accessibilityLabel="Add expense"
                onPress={() => useUiStore.getState().openAddExpense()}
                style={({ pressed }) => [style, pressed && styles.addTabPressed]}>
                {children}
              </Pressable>
            ),
          }}
        />
        <Tabs.Screen
          name="more"
          options={{
            title: 'More',
            headerShown: false,
            tabBarIcon: ({ color, focused }) => (
              <TabIcon
                name={focused ? 'ellipsis-horizontal' : 'ellipsis-horizontal-outline'}
                color={color}
                focused={focused}
              />
            ),
          }}
        />
        <Tabs.Screen
          name="expenses"
          options={{
            href: null,
            title: 'Expenses',
          }}
        />
      </Tabs>
      <AddExpenseFlow />
    </>
  );
}

const styles = StyleSheet.create({
  addIcon: {
    width: ADD_ICON_SIZE,
    height: ADD_ICON_SIZE,
    borderRadius: ADD_ICON_SIZE / 2,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addTabPressed: {
    opacity: 0.88,
  },
});
