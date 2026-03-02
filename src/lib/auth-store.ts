
"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: string;
  status: 'Active' | 'Pending' | 'Blocked';
  managerId?: string;
  teamLeadId?: string;
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

export const ROLE_WEIGHTS: Record<UserRole, number> = {
  'Super Admin': 5,
  'Admin': 4,
  'Manager': 3,
  'Team Lead': 2,
  'Employee': 1
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      isLoaded: false,
      setProfile: (profile) => set({ profile, isLoaded: true }),
      setLoaded: (loaded) => set({ isLoaded: loaded }),
      logout: () => set({ profile: null, isLoaded: false }),
    }),
    {
      name: 'roleflow_enterprise_auth',
      onRehydrateStorage: () => (state) => {
        state?.setLoaded(true);
      },
    }
  )
);
