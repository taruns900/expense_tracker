import { useRouter } from 'expo-router';
import { useEffect, type ReactNode } from 'react';
import { BackHandler } from 'react-native';

import { safeGoBack } from '@/utils/navigation';

export function HardwareBackHandler({ children }: { children: ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (router.canGoBack()) {
        safeGoBack(router);
        return true;
      }
      return false;
    });
    return () => subscription.remove();
  }, [router]);

  return <>{children}</>;
}
