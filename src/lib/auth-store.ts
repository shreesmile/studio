
"use client";

import { create } from 'zustand';

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
  login: (role: UserRole) => void;
  logout: () => void;
}

// Simple mock store implementation
import { useState, useEffect } from 'react';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('roleflow_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
    setIsLoaded(true);
  }, []);

  const login = (role: UserRole) => {
    const mockUser: User = {
      id: `u-${role.toLowerCase().replace(' ', '-')}`,
      name: `Mock ${role}`,
      email: `${role.toLowerCase().replace(' ', '.')}@roleflow.io`,
      role,
      department: 'Engineering'
    };
    setUser(mockUser);
    localStorage.setItem('roleflow_user', JSON.stringify(mockUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('roleflow_user');
  };

  return { user, login, logout, isLoaded };
};
