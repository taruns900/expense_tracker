import { create } from 'zustand';

type SessionState = {
  isHydrated: boolean;
  isDatabaseReady: boolean;
  databaseError: string | null;
  schemaVersion: number | null;
  cloudUserId: string | null;
  cloudEmail: string | null;
  dataEpoch: number;
  markHydrated: () => void;
  markDatabaseReady: (schemaVersion: number) => void;
  markDatabaseError: (message: string) => void;
  setCloudSession: (userId: string, email: string) => void;
  clearCloudSession: () => void;
  bumpDataEpoch: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  isDatabaseReady: false,
  databaseError: null,
  schemaVersion: null,
  cloudUserId: null,
  cloudEmail: null,
  dataEpoch: 0,
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
  setCloudSession: (userId, email) => set({ cloudUserId: userId, cloudEmail: email }),
  clearCloudSession: () => set({ cloudUserId: null, cloudEmail: null }),
  bumpDataEpoch: () => set((state) => ({ dataEpoch: state.dataEpoch + 1 })),
}));
