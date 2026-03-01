
"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  departmentId?: string;
  reportingToId?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  profile: UserProfile | null;
  isLoaded: boolean;
  setProfile: (profile: UserProfile | null) => void;
  setLoaded: (loaded: boolean) => void;
  logout: () => void;
}

/**
 * Global authentication store using Zustand.
 * Synchronizes with Firebase Auth state provided by the FirebaseProvider.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      isLoaded: false,
      setProfile: (profile) => set({ profile, isLoaded: true }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
      logout: () => {
        set({ profile: null });
      },
    }),
    {
      name: 'roleflow_auth_storage',
      onRehydrateStorage: () => (state) => {
        state?.setLoaded(true);
      },
    }
  )
);
