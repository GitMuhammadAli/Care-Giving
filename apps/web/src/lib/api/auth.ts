import { api } from './client';
import type { CareRecipient } from './care-recipients';

// Simplified family type for User.families - full Family type is in ./family.ts
export interface UserFamily {
  [x: string]: any;
  id: string;
  name: string;
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
      await api.post('/auth/logout');
    } finally {
      api.clearTokens();
    }
  },

  refresh: async (): Promise<{ accessToken: string }> => {
    const response = await api.post<{ accessToken: string }>('/auth/refresh');
    api.setAccessToken(response.accessToken);
    return response;
  },

  getProfile: async (): Promise<User> => {
    return api.get<User>('/auth/me');
  },

  updateProfile: async (data: Partial<User>): Promise<User> => {
    return api.patch<User>('/auth/me', data);
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email }, { skipAuth: true });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password }, { skipAuth: true });
  },
};

