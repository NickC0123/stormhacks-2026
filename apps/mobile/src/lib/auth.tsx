import type { Session } from '@supabase/supabase-js';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

import { supabase } from './supabase';

type AuthState = { session: Session | null; loading: boolean };

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (active) {
        setSession(nextSession);
        setLoading(false);
      }
    });
    supabase.auth.getUser().then(({ data, error }) => {
      if (active) {
        if (error || !data.user) {
          supabase.auth.signOut({ scope: 'local' }).finally(() => {
            if (active) {
              setSession(null);
              setLoading(false);
            }
          });
        } else {
          supabase.auth.getSession().then(({ data: sessionData }) => {
            if (active) {
              setSession(sessionData.session);
              setLoading(false);
            }
          });
        }
      }
    });
    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  return <AuthContext.Provider value={{ session, loading }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const state = useContext(AuthContext);
  if (!state) throw new Error('useAuth must be used inside AuthProvider');
  return state;
}
