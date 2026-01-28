'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { authApi, User, LoginInput, RegisterInput, VerifyEmailInput, ResendVerificationInput, api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Flag to track if we've already checked for an existing session
  // This prevents repeated refresh attempts when there's no valid session
  sessionChecked: boolean;
  // Track when we last synced with server for stale data detection
  lastSyncedAt: number | null;
  // Hydration state for SSR/CSR consistency
  _hasHydrated: boolean;

  // Actions
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<{ message: string; user: { email: string; fullName: string } }>;
  verifyEmail: (data: VerifyEmailInput) => Promise<void>;
  resendVerification: (data: ResendVerificationInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  /**
   * Force refresh user profile from server
   * Use after actions that modify user data (e.g., accepting invitation)
   */
  refetchUser: () => Promise<void>;
  /**
   * Sync user data with server, invalidating backend cache
   * Use when you need guaranteed fresh data (e.g., after accepting invitation)
   */
  syncWithServer: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  /**
   * Clear auth state without calling logout API
   * Used after password reset when backend has already invalidated sessions
   */
  clearAuth: () => void;
  /**
   * Mark hydration as complete (called after zustand hydrates from storage)
   */
  setHasHydrated: (state: boolean) => void;
}

// Module-level promise to prevent concurrent fetchUser calls
let fetchUserPromise: Promise<void> | null = null;
let syncPromise: Promise<void> | null = null;

// Stale data threshold - if data is older than this, auto-refresh in background
// Set to 30 minutes to reduce unnecessary API calls
const STALE_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

// Development logging helper - only logs in development
const devLog = (...args: any[]) => {
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Disabled by default to reduce console noise - enable for debugging:
    // console.log('[Auth]', ...args);
  }
};

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      sessionChecked: false,
      lastSyncedAt: null,
      _hasHydrated: false,

      login: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(data);
          set({
            user: response.user,
            token: response.accessToken || null,
            isAuthenticated: true,
            isLoading: false,
            sessionChecked: true,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          set({ isLoading: false });
          return response;
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      verifyEmail: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.verifyEmail(data);
          set({
            user: response.user,
            token: response.accessToken || null,
            isAuthenticated: true,
            isLoading: false,
            sessionChecked: true,
            lastSyncedAt: Date.now(),
          });
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      resendVerification: async (data) => {
        await authApi.resendVerification(data);
      },

      logout: async () => {
        try {
          await authApi.logout();
        } catch {
          // Ignore logout errors - we still want to clear local state
        } finally {
          api.clearTokens();
          // Reset all state including sync timestamp
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            sessionChecked: false,
            isLoading: false,
            lastSyncedAt: null,
          });
        }
      },

      fetchUser: async () => {
        const { sessionChecked } = get();

        // If we've already checked the session, don't check again
        if (sessionChecked) {
          set({ isLoading: false });
          
          // Check if data is stale and trigger background refresh
          const { lastSyncedAt, isAuthenticated } = get();
          if (isAuthenticated && lastSyncedAt) {
            const isStale = Date.now() - lastSyncedAt > STALE_THRESHOLD_MS;
            if (isStale) {
              devLog('fetchUser - Data is stale, triggering background sync');
              // Don't await - let it happen in background
              get().syncWithServer().catch(() => {});
            }
          }
          return;
        }

        // If there's already a fetchUser in progress, wait for it
        if (fetchUserPromise) {
          await fetchUserPromise;
          return;
        }

        // Create the promise for this fetch
        fetchUserPromise = (async () => {
          set({ isLoading: true });
          try {
            // Try to refresh access token from httpOnly cookie
            const refreshResult = await authApi.refresh();
            set({ token: refreshResult.accessToken, sessionChecked: true });

            // Now fetch user profile with the new access token
            const user = await authApi.getProfile();
            set({
              user,
              isAuthenticated: true,
              isLoading: false,
              sessionChecked: true,
              lastSyncedAt: Date.now(),
            });
          } catch {
            // No valid refresh token (cookie expired or user not logged in)
            // Mark session as checked so we don't retry on subsequent calls
            api.clearTokens();
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
              sessionChecked: true,
              lastSyncedAt: null,
            });
          }
        })();

        try {
          await fetchUserPromise;
        } finally {
          fetchUserPromise = null;
        }
      },

      refetchUser: async () => {
        // Force refresh user profile from server (bypasses sessionChecked)
        // NOTE: Don't set isLoading: true here - this is a background refresh
        // Setting isLoading causes components to show loading UI which can
        // interfere with local state updates (e.g., onboarding step navigation)
        devLog('refetchUser - Starting...');
        try {
          const user = await authApi.getProfile();
          devLog('refetchUser - Got user:', user.email);
          set({ user, isAuthenticated: true, lastSyncedAt: Date.now() });
        } catch (err) {
          // If profile fetch fails, don't clear auth - user might still be authenticated
          devLog('refetchUser - Error:', err);
        }
      },

      syncWithServer: async () => {
        // Prevent concurrent syncs
        if (syncPromise) {
          await syncPromise;
          return;
        }

        const { isAuthenticated } = get();
        if (!isAuthenticated) {
          return;
        }

        devLog('syncWithServer - Starting...');

        syncPromise = (async () => {
          try {
            // Call the invalidate-cache endpoint first to clear backend Redis cache
            await api.post('/auth/invalidate-cache', {});
            devLog('syncWithServer - Backend cache invalidated');

            // Now fetch fresh user profile
            const user = await authApi.getProfile();
            devLog('syncWithServer - Got fresh user data');
            set({ user, isAuthenticated: true, lastSyncedAt: Date.now() });
          } catch (err) {
            devLog('syncWithServer - Error:', err);
            // On error, still try regular refetch
            try {
              const user = await authApi.getProfile();
              set({ user, isAuthenticated: true, lastSyncedAt: Date.now() });
            } catch (innerErr) {
              devLog('syncWithServer - Fallback refetch also failed:', innerErr);
            }
          }
        })();

        try {
          await syncPromise;
        } finally {
          syncPromise = null;
        }
      },

      updateUser: async (data) => {
        const user = await authApi.updateProfile(data);
        set({ user, lastSyncedAt: Date.now() });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user, lastSyncedAt: user ? Date.now() : null });
      },

      setToken: (token) => {
        set({ token });
      },

      clearAuth: () => {
        // Clear tokens from API client
        api.clearTokens();
        // Reset state - sessionChecked true so we don't auto-refresh
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          sessionChecked: true,
          isLoading: false,
          lastSyncedAt: null,
        });
      },

      setHasHydrated: (state) => {
        set({ _hasHydrated: state });
      },
    }),
    {
      name: 'care-circle-auth',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastSyncedAt: state.lastSyncedAt,
        // Don't persist:
        // - token (in memory only for security)
        // - sessionChecked (reset each page load)
        // - isLoading (UI state)
        // - _hasHydrated (internal state)
      }),
      onRehydrateStorage: () => (state) => {
        // Called when hydration is complete
        if (state) {
          state.setHasHydrated(true);
          // If we have persisted auth state, mark as initially authenticated
          // but still need to verify with server
          if (state.user && state.isAuthenticated) {
            devLog('Auth hydrated from storage with user:', state.user.email);
          }
        }
      },
    }
  )
);

// Selector for checking if store has hydrated (useful for SSR)
export const useAuthHasHydrated = () => useAuth((state) => state._hasHydrated);
