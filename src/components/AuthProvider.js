"use client";

import { createContext, useContext, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { signOut as supabaseSignOut } from '../lib/auth';

const AuthContext = createContext({ user: null, session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(supabase));
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;

    if (!supabase) {
      return () => {
        mountedRef.current = false;
      };
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mountedRef.current) return;
        setSession(data?.session ?? null);
        setUser(data?.session?.user ?? null);
        setLoading(false);
      })
      .catch(() => {
        if (!mountedRef.current) return;
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mountedRef.current) return;

      if (event === 'TOKEN_REFRESH_FAILED') {
        console.warn('[AuthProvider] Refresh token invalid, forcing sign out.');
        setSession(null);
        setUser(null);
        setLoading(false);
        try {
          await supabase.auth.signOut();
        } catch (error) {
          console.error('[AuthProvider] Failed to clear Supabase session after refresh error.', error);
        }
        return;
      }

      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
    });

    return () => {
      mountedRef.current = false;
      authListener?.subscription?.unsubscribe?.();
    };
  }, []);

  const handleSignOut = useCallback(async () => {
    if (!supabase) return;
    await supabaseSignOut();
  }, []);

  const value = useMemo(() => ({
    user,
    session,
    loading,
    signOut: handleSignOut,
  }), [user, session, loading, handleSignOut]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
