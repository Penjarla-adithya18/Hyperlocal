'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

/**
 * Provides authentication state (user, loading) and actions (login, logout, updateUser)
 * backed by localStorage via lib/auth helpers.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    saveUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    logoutUser();
  }, []);

  const updateUser = useCallback((updates: Partial<User>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...updates };
      saveUser(updated);
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Access auth state — must be called inside an AuthProvider. */
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
