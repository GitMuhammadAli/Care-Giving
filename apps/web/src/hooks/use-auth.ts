'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, LoginInput, RegisterInput, VerifyEmailInput, ResendVerificationInput, api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  // Flag to track if we've already checked for an existing session
  // This prevents repeated refresh attempts when there's no valid session
  sessionChecked: boolean;

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
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
  /**
   * Clear auth state without calling logout API
   * Used after password reset when backend has already invalidated sessions
   */
  clearAuth: () => void;
}

// Module-level promise to prevent concurrent fetchUser calls
let fetchUserPromise: Promise<void> | null = null;

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,
      sessionChecked: false,

      login: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(data);
          set({
            user: response.user,
            token: response.accessToken || null,
            isAuthenticated: true,
            isLoading: false,
            sessionChecked: true
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
            sessionChecked: true
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
          // Reset sessionChecked so next login attempt will check for session
          set({ user: null, token: null, isAuthenticated: false, sessionChecked: false, isLoading: false });
        }
      },

      fetchUser: async () => {
        const { sessionChecked, isAuthenticated } = get();

        // If we've already checked the session, don't check again
        if (sessionChecked) {
          set({ isLoading: false });
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
            set({ user, isAuthenticated: true, isLoading: false, sessionChecked: true });
          } catch {
            // No valid refresh token (cookie expired or user not logged in)
            // Mark session as checked so we don't retry on subsequent calls
            api.clearTokens();
            set({ user: null, token: null, isAuthenticated: false, isLoading: false, sessionChecked: true });
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
        console.log('refetchUser - Starting...');
        try {
          const user = await authApi.getProfile();
          console.log('refetchUser - Got user:', {
            id: user.id,
            email: user.email,
            familiesCount: user.families?.length || 0,
            families: user.families?.map((f: any) => ({
              id: f.id,
              name: f.name,
              careRecipientsCount: f.careRecipients?.length || 0,
            })),
          });
          set({ user, isAuthenticated: true });
        } catch (err) {
          // If profile fetch fails, don't clear auth - user might still be authenticated
          console.error('refetchUser - Error:', err);
        }
      },

      updateUser: async (data) => {
        const user = await authApi.updateProfile(data);
        set({ user });
      },

      setUser: (user) => {
        set({ user, isAuthenticated: !!user });
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
        });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        // Don't persist token - it's in memory only
        // Don't persist isAuthenticated - will be determined on page load via refresh
        // Don't persist sessionChecked - reset each page load, checked once per session
      }),
    }
  )
);
