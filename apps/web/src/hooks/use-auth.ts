'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi, User, LoginInput, RegisterInput, VerifyEmailInput, ResendVerificationInput, api } from '@/lib/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;

  // Actions
  login: (data: LoginInput) => Promise<void>;
  register: (data: RegisterInput) => Promise<{ message: string; user: { email: string; fullName: string } }>;
  verifyEmail: (data: VerifyEmailInput) => Promise<void>;
  resendVerification: (data: ResendVerificationInput) => Promise<void>;
  logout: () => Promise<void>;
  fetchUser: () => Promise<void>;
  updateUser: (data: Partial<User>) => Promise<void>;
  setUser: (user: User | null) => void;
  setToken: (token: string | null) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isLoading: true,
      isAuthenticated: false,

      login: async (data) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login(data);
          set({ 
            user: response.user, 
            token: response.accessToken || null,
            isAuthenticated: true, 
            isLoading: false 
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
        } finally {
          set({ user: null, token: null, isAuthenticated: false });
        }
      },

      fetchUser: async () => {
        set({ isLoading: true });
        try {
          // Try to refresh access token from httpOnly cookie
          try {
            const refreshResult = await authApi.refresh();
            set({ token: refreshResult.accessToken });
          } catch (refreshError) {
            // No valid refresh token (cookie expired or user not logged in)
            set({ user: null, token: null, isAuthenticated: false, isLoading: false });
            return;
          }

          // Now fetch user profile with the new access token
          const user = await authApi.getProfile();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch (error) {
          set({ user: null, token: null, isAuthenticated: false, isLoading: false });
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
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        // Don't persist token - it's in memory only
        // Don't persist isAuthenticated - will be determined on page load via refresh
      }),
    }
  )
);

