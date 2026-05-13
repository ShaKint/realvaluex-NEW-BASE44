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

  // ── Auth acti
