export const config = {
  apiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000',
  cloudMode: process.env.EXPO_PUBLIC_CLOUD_MODE ?? 'dummy',
};
