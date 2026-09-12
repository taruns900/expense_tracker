import { Platform } from 'react-native';

export const colors = {
  background: '#F4F6F5',
  surface: '#FFFFFF',
  surfaceMuted: '#EEF2F0',
  text: '#17211D',
  textSecondary: '#5C6B64',
  textInverse: '#FFFFFF',
  border: '#D8E0DC',
  primary: '#1B5E4A',
  primaryPressed: '#144536',
  primaryMuted: '#E4F2EC',
  accent: '#1B5E4A',
  danger: '#B42318',
  dangerMuted: '#FCE8E6',
  warning: '#B54708',
  success: '#027A48',
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabInactive: '#8A9A93',
  overlay: 'rgba(23, 33, 29, 0.45)',
} as const;

export const spacing = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  lg: 20,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const;

export const typography = {
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: '700' as const,
  },
  heading: {
    fontSize: 20,
    lineHeight: 26,
    fontWeight: '600' as const,
  },
  subheading: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600' as const,
  },
  body: {
    fontSize: 16,
    lineHeight: 22,
    fontWeight: '400' as const,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '400' as const,
  },
  label: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '600' as const,
  },
  amount: {
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '700' as const,
    fontVariant: ['tabular-nums'] as ('tabular-nums')[],
  },
};

export const touchTarget = 44;

export const shadow = Platform.select({
  ios: {
    shadowColor: '#17211D',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  android: {
    elevation: 2,
  },
  default: {},
});
