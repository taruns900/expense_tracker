import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AppBootstrap } from '@/components/AppBootstrap';
import { AppLock } from '@/components/AppLock';
import { HardwareBackHandler } from '@/components/HardwareBackHandler';
import { HeaderBackButton } from '@/components/HeaderBackButton';
import { colors } from '@/components/theme';

export {
  ErrorBoundary,
} from 'expo-router';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppBootstrap>
        <AppLock>
          <HardwareBackHandler>
            <StatusBar style="dark" />
            <Stack
              screenOptions={{
                headerShadowVisible: false,
                headerTintColor: colors.primary,
                headerTitleStyle: { color: colors.text },
                contentStyle: { backgroundColor: colors.background },
                headerLeft: () => <HeaderBackButton />,
                gestureEnabled: true,
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="expense/[id]/index" options={{ title: 'Expense' }} />
              <Stack.Screen name="expense/[id]/edit" options={{ title: 'Edit expense' }} />
            </Stack>
          </HardwareBackHandler>
        </AppLock>
      </AppBootstrap>
    </SafeAreaProvider>
  );
}
