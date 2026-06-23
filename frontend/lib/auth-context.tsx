'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { apiFetch, clearToken, setToken } from './api';

export interface User {
  id: number;
  email: string;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Validate any pre-existing token by hitting /api/me on mount.
  useEffect(() => {
    let cancelled = false;
    apiFetch<User>('/api/me')
      .then((u) => {
        if (!cancelled) setUser(u);
      })
      .catch(() => {
        if (!cancelled) setUser(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { access_token } = await apiFetch<{ access_token: string }>(
      '/api/auth/signin',
      { method: 'POST', body: { email, password }, skipAuth: true },
    );
    setToken(access_token);
    const me = await apiFetch<User>('/api/me');
    setUser(me);
  }, []);

  const signUp = useCallback(async (email: string, password: string) => {
    const { access_token } = await apiFetch<{ access_token: string }>(
      '/api/auth/signup',
      { method: 'POST', body: { email, password }, skipAuth: true },
    );
    setToken(access_token);
    const me = await apiFetch<User>('/api/me');
    setUser(me);
  }, []);

  const signOut = useCallback(() => {
    clearToken();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}