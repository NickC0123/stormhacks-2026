import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

import { getMe } from '@/lib/friends';
import type { Profile } from '@/types';

type ProfileState = {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  setProfile: (profile: Profile) => void;
};

const ProfileContext = createContext<ProfileState | null>(null);

/** Loads the signed-in user's profile from the API. Mount inside the signed-in app. */
export function ProfileProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const onLoaded = useCallback((next: Profile) => {
    setProfile(next);
    setError(null);
    setLoading(false);
  }, []);

  const onFailed = useCallback((err: unknown) => {
    setError(err instanceof Error ? err.message : 'Could not load your profile.');
    setLoading(false);
  }, []);

  const reload = useCallback(async () => {
    setLoading(true);
    await getMe().then(onLoaded, onFailed);
  }, [onLoaded, onFailed]);

  useEffect(() => {
    getMe().then(onLoaded, onFailed);
  }, [onLoaded, onFailed]);

  return (
    <ProfileContext.Provider value={{ profile, loading, error, reload, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile() {
  const state = useContext(ProfileContext);
  if (!state) throw new Error('useProfile must be used inside ProfileProvider');
  return state;
}
