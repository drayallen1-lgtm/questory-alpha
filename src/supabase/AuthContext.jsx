import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, hasSupabase } from './client';
import { fetchUserProfile } from './dataService';
import { formatAuthError } from './authErrors';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(hasSupabase());

  useEffect(() => {
    if (!hasSupabase() || !supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;

    async function loadProfile(sessionUser) {
      if (!sessionUser) {
        setProfile(null);
        return;
      }
      const data = await fetchUserProfile(sessionUser.id);
      if (mounted) setProfile(data);
    }

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setUser(data.session?.user ?? null);
      loadProfile(data.session?.user ?? null).finally(() => {
        if (mounted) setLoading(false);
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      loadProfile(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => {
    const isAdmin = profile?.role === 'admin';
    const isSponsor = profile?.role === 'sponsor' || isAdmin;
    const isCreator = profile?.role === 'creator' || isAdmin;
    const localDemoRoles = !hasSupabase();

    async function signInWithEmail(email, password) {
      if (!supabase) throw new Error('Cloud mode is off. Add Supabase env vars to enable sign-in.');
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(formatAuthError(error));
    }

    async function signUpWithEmail(email, password) {
      if (!supabase) throw new Error('Cloud mode is off. Add Supabase env vars to enable sign-up.');
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) throw new Error(formatAuthError(error));
    }

    async function signInWithGoogle() {
      if (!supabase) throw new Error('Cloud mode is off. Add Supabase env vars to enable Google sign-in.');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw new Error(formatAuthError(error));
    }

    async function signOut() {
      if (!supabase) return;
      const { error } = await supabase.auth.signOut();
      if (error) throw new Error(formatAuthError(error));
      setProfile(null);
    }

    return {
      user,
      profile,
      loading,
      isAdmin: isAdmin || localDemoRoles,
      isSponsor: isSponsor || localDemoRoles,
      isCreator: isCreator || localDemoRoles,
      isSupabaseMode: hasSupabase(),
      signInWithEmail,
      signUpWithEmail,
      signInWithGoogle,
      signOut,
      refreshProfile: async () => {
        if (user) {
          const data = await fetchUserProfile(user.id);
          setProfile(data);
        }
      },
    };
  }, [user, profile, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
