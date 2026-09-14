import { create } from 'zustand';

export type CloudSession = {
  userId: string;
  phone: string;
  name: string;
  recoveryEmail: string;
};

type SessionState = {
  isHydrated: boolean;
  isDatabaseReady: boolean;
  databaseError: string | null;
  schemaVersion: number | null;
  cloudUserId: string | null;
  cloudPhone: string | null;
  cloudName: string | null;
  cloudRecoveryEmail: string | null;
  dataEpoch: number;
  markHydrated: () => void;
  markDatabaseReady: (schemaVersion: number) => void;
  markDatabaseError: (message: string) => void;
  setCloudSession: (session: CloudSession) => void;
  clearCloudSession: () => void;
  bumpDataEpoch: () => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  isHydrated: false,
  isDatabaseReady: false,
  databaseError: null,
  schemaVersion: null,
  cloudUserId: null,
  cloudPhone: null,
  cloudName: null,
  cloudRecoveryEmail: null,
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
  setCloudSession: (session) =>
    set({
      cloudUserId: session.userId,
      cloudPhone: session.phone,
      cloudName: session.name,
      cloudRecoveryEmail: session.recoveryEmail,
    }),
  clearCloudSession: () =>
    set({
      cloudUserId: null,
      cloudPhone: null,
      cloudName: null,
      cloudRecoveryEmail: null,
    }),
  bumpDataEpoch: () => set((state) => ({ dataEpoch: state.dataEpoch + 1 })),
}));
