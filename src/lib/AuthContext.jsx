// src/lib/AuthContext.jsx
// Auth context using Supabase Auth (Email/Password + Google OAuth)
// Replaces the Base44 version which used app-public-settings + base44.auth

import React, { createContext, useState, useContext, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [session, setSession] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Kept for backwards compatibility with App.jsx loading state
  const isLoadingPublicSettings = false;

  useEffect(() => {
    // 1. On mount, get the current session
    supabase.auth.getSession().then(({ data: { session: s }, error }) => {
      if (error) {
        setAuthError({ type: 'unknown', message: error.message });
      }
      setSession(s);
      setUser(s?.user ?? null);
      setIsAuthenticated(!!s?.user);
      setIsLoadingAuth(false);
    });

    // 2. Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);
        setUser(s?.user ?? null);
        setIsAuthenticated(!!s?.user);
        setIsLoadingAuth(false);
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  // ── Auth actions ───────────────────────────────────────────────────────

  const signInWithEmail = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setAuthError({ type: 'auth_failed', message: error.message });
      return { error };
    }
    return { data };
  };

  const signUpWithEmail = async (email, password) => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      setAuthError({ type: 'signup_failed', message: error.message });
      return { error };
    }
    return { data };
  };

  const signInWithGoogle = async () => {
    setAuthError(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/dashboard` },
    });
    if (error) {
      setAuthError({ type: 'oauth_failed', message: error.message });
      return { error };
    }
    return { data };
  };

  const logout = async (shouldRedirect = true) => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setIsAuthenticated(false);
    if (shouldRedirect) {
      window.location.href = '/';
    }
  };

  const navigateToLogin = () => {
    // Simple redirect to a login page. If you build a /login route,
    // adjust this. For now, send to root which has the Welcome screen.
    window.location.href = '/';
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isAuthenticated,
      isLoadingAuth,
      isLoadingPublicSettings,
      authError,
      // actions
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      logout,
      navigateToLogin,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
