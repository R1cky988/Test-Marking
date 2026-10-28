import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, AuthResponse } from '@/types/auth.types';

// ============================================================
// Auth Store — Global authentication state
// ============================================================

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
}

interface AuthActions {
  /** Save auth data after a successful login */
  login: (authResponse: AuthResponse) => void;
  /** Clear all auth state */
  logout: () => void;
  /** Update tokens after refresh */
  setTokens: (params: { accessToken: string; refreshToken: string }) => void;
  /** Update user info */
  setUser: (user: User) => void;
}

type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
  user: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      ...initialState,

      login: (authResponse: AuthResponse) => {
        set({
          user: authResponse.user,
          accessToken: authResponse.accessToken,
          refreshToken: authResponse.refreshToken,
          isAuthenticated: true,
        });
      },

      logout: () => {
        set(initialState);
      },

      setTokens: ({ accessToken, refreshToken }) => {
        set({ accessToken, refreshToken });
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'omr_auth_storage',
      storage: createJSONStorage(() => localStorage),
      // Only persist state fields; avoid persisting actions
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
