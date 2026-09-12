import { create } from 'zustand';

type SessionState = {
  isHydrated: boolean;
  isDatabaseReady: boolean;
  databaseError: string | null;
  schemaVersion: number | null;
  markHydrated: () => void;
  markDatabaseReady: (schemaVersion: number) => void;
  markDatabaseError: (message: string) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  isDatabaseReady: false,
  databaseError: null,
  schemaVersion: null,
  markHydrated: () => set({ isHydrated: true }),
  markDatabaseReady: (schemaVersion) =>
    set({
      isDatabaseReady: true,
      databaseError: null,
      schemaVersion,
      isHydrated: true,
    }),
  markDatabaseError: (message) =>
    set({
      isDatabaseReady: false,
      databaseError: message,
      isHydrated: true,
    }),
}));
