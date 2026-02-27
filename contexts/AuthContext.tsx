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

  // Load user on mount
  useEffect(() => {
    const currentUser = getCurrentUser();
    setUser(currentUser);
    setLoading(false);
  }, []);

  // Periodically validate token hasn't expired (every 5 minutes)
  // This catches cases where the token expires while the app is open
  useEffect(() => {
    if (!user) return
    const validateToken = () => {
      const currentUser = getCurrentUser()
      // If getCurrentUser returns null but we think we're logged in,
      // it means the token expired — silently logout
      if (!currentUser && user) {
        console.warn('Token validation failed - logging out')
        setUser(null)
        logoutUser()
      }
    }
    // Check every 5 minutes instead of 30 seconds to reduce pressure
    const interval = setInterval(validateToken, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [user])

  const login = useCallback((newUser: User) => {
    setUser(newUser);
    saveUser(newUser);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    logoutUser();
    // Redirect to login page after logout
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
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
