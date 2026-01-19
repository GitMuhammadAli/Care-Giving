import { api } from './client';
import type { CareRecipient } from './care-recipients';

// Simplified family type for User.families - full Family type is in ./family.ts
export interface UserFamily {
  id: string;
  name: string;
  role: 'ADMIN' | 'CAREGIVER' | 'VIEWER';
  careRecipients?: CareRecipient[];
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  name?: string; // alias for fullName
  phone?: string;
  timezone?: string;
  createdAt: string;
  avatarUrl?: string;
  families?: UserFamily[];
  onboardingCompleted?: boolean;
  onboardingCompletedAt?: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  // refreshToken is now in httpOnly cookie, not in response body
}

export interface RegisterInput {
  fullName: string;
  email: string;
  password: string;
  phone?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  otp: string;
}

export interface ResendVerificationInput {
  email: string;
}

export const authApi = {
  register: async (data: RegisterInput): Promise<{ message: string; user: Pick<User, 'email' | 'fullName'> }> => {
    return api.post('/auth/register', data, { skipAuth: true });
  },

  verifyEmail: async (data: VerifyEmailInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/verify-email', data, { skipAuth: true });
    api.setAccessToken(response.accessToken);
    return response;
  },

  resendVerification: async (data: ResendVerificationInput): Promise<{ message: string }> => {
    return api.post('/auth/resend-verification', data, { skipAuth: true });
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data, { skipAuth: true });
    api.setAccessToken(response.accessToken);
    return response;
  },

  logout: async (): Promise<void> => {
    try {
      // Send empty body - refresh token comes from httpOnly cookie
      // skipAuth: true to prevent refresh attempts during logout
      await api.post('/auth/logout', {}, { skipAuth: true });
    } finally {
      api.clearTokens();
    }
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    // Send empty body - refresh token comes from httpOnly cookie
    // IMPORTANT: skipAuth prevents infinite loop - refresh shouldn't trigger another refresh on 401
    const response = await api.post<{ accessToken: string }>('/auth/refresh', {}, { skipAuth: true });
    api.setAccessToken(response.accessToken);
    return response;
  },

  getProfile: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    return api.patch<User>('/auth/me', data);
  },

  forgotPassword: async (email: string): Promise<{ message: string }> => {
    return api.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  verifyResetToken: async (token: string): Promise<{ valid: boolean; email: string }> => {
    return api.get(`/auth/verify-reset-token/${token}`, { skipAuth: true });
  },

  resetPassword: async (token: string, newPassword: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, newPassword }, { skipAuth: true });
  },

  completeOnboarding: async (): Promise<{ message: string }> => {
    return api.post('/auth/complete-onboarding', {});
  },
};

