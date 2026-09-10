import React, { createContext, useCallback, useContext, useState } from 'react';

import { appStorage } from '@/utils/storage';

export interface UserProfile {
  name: string;
  phone: string;
  photoUri?: string;
  avatarColor: string;
}

export const DEFAULT_USER_PROFILE: UserProfile = {
  name: 'Alex Morgan',
  phone: '+1 (555) 019-2831',
  photoUri: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
  avatarColor: '#6366F1',
};

const PROFILE_STORAGE_KEY = 'ilubilu_user_profile';

interface UserProfileContextType {
  profile: UserProfile;
  updateProfile: (updated: Partial<UserProfile>) => void;
  resetProfile: () => void;
}

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfile] = useState<UserProfile>(() =>
    appStorage.getJSON<UserProfile>(PROFILE_STORAGE_KEY, DEFAULT_USER_PROFILE)
  );

  const updateProfile = useCallback((updated: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next: UserProfile = { ...prev, ...updated };
      appStorage.setJSON(PROFILE_STORAGE_KEY, next);
      return next;
    });
  }, []);

  const resetProfile = useCallback(() => {
    setProfile(DEFAULT_USER_PROFILE);
    appStorage.setJSON(PROFILE_STORAGE_KEY, DEFAULT_USER_PROFILE);
  }, []);

  return (
    <UserProfileContext.Provider value={{ profile, updateProfile, resetProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}

export function useUserProfile() {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

