'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '@/lib/types';
import { getCurrentUser, setCurrentUser as saveUser, logout as logoutUser } from '@/lib/auth';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (user: User) => void;
  logout: () => void;
  updateUser: (updates: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthState = async () => {
      const useSupabase =
        typeof globalThis !== 'undefined' &&
        (globalThis as any)?.process?.env?.NEXT_PUBLIC_USE_SUPABASE === 'true';

      if (useSupabase) {
        try {
          const response = await fetch('/api/auth/me');
          if (response.ok) {
            const payload = await response.json();
            setUser(payload.user || null);
            if (payload.user) {
              saveUser(payload.user);
            }
          } else {
            setUser(null);
          }
        } catch {
          const currentUser = getCurrentUser();
          setUser(currentUser);
        } finally {
          setLoading(false);
        }
        return;
      }

      const currentUser = getCurrentUser();
      setUser(currentUser);
      setLoading(false);
    };

    void loadAuthState();
  }, []);

  const login = (newUser: User) => {
    setUser(newUser);
    saveUser(newUser);
  };

  const logout = () => {
    setUser(null);
    logoutUser();
  };

  const updateUser = (updates: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      saveUser(updatedUser);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
