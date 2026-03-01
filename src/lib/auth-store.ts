
"use client";

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'Super Admin' | 'Admin' | 'Manager' | 'Team Lead' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department?: string;
}

interface AuthState {
  user: User | null;
  isLoaded: boolean;
  login: (role: UserRole) => void;
  logout: () => void;
  setLoaded: (loaded: boolean) => void;
}

/**
 * Global authentication store using Zustand.
 * Persists the user session to localStorage and handles hydration state
 * to prevent flickering and hydration mismatches in Next.js.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoaded: false,
      login: (role: UserRole) => {
        const mockUser: User = {
          id: `u-${role.toLowerCase().replace(' ', '-')}`,
          name: `Mock ${role}`,
          email: `${role.toLowerCase().replace(' ', '.')}@roleflow.io`,
          role,
          department: 'Engineering'
        };
        set({ user: mockUser });
      },
      logout: () => {
        set({ user: null });
      },
      setLoaded: (loaded: boolean) => set({ isLoaded: loaded }),
    }),
    {
      name: 'roleflow_auth_storage',
      onRehydrateStorage: () => (state) => {
        // Once the store is hydrated from localStorage, we signal that the app is ready to render.
        state?.setLoaded(true);
      },
    }
  )
);
