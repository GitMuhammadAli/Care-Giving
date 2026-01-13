import { api } from './client';
import type { CareRecipient } from './care-recipients';

// Simplified family type for User.families - full Family type is in ./family.ts
export interface UserFamily {
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
  refreshToken: string;
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

export const authApi = {
  register: async (data: RegisterInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', data, { skipAuth: true });
    api.setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  login: async (data: LoginInput): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', data, { skipAuth: true });
    api.setTokens(response.accessToken, response.refreshToken);
    return response;
  },

  logout: async (): Promise<void> => {
    try {
      await api.post('/auth/logout');
    } finally {
      api.clearTokens();
    }
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

