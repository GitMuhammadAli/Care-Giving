const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

export class ApiError extends Error {
  constructor(
    public status: number,
    public data: { message: string; error?: string }
  ) {
    super(data.message || 'An error occurred');
    this.name = 'ApiError';
  }
}

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

class ApiClient {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    // Load tokens from localStorage on init (client-side only)
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private async refreshAccessToken(): Promise<void> {
    if (!this.refreshToken) {
      throw new ApiError(401, { message: 'No refresh token available' });
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.json());
      }

      const data = await response.json();
      this.setTokens(data.accessToken, data.refreshToken);
    } catch (error) {
      this.clearTokens();
      throw error;
    }
  }

  async fetch<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    };

    if (!skipAuth && this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    let response = await fetch(`${API_URL}${url}`, {
      ...fetchOptions,
      headers,
    });

    // Handle token refresh on 401
    if (response.status === 401 && !skipAuth && this.refreshToken) {
      // Ensure only one refresh happens at a time
      if (!this.refreshPromise) {
        this.refreshPromise = this.refreshAccessToken().finally(() => {
          this.refreshPromise = null;
        });
      }

      try {
        await this.refreshPromise;
        
        // Retry with new token
        (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
        response = await fetch(`${API_URL}${url}`, {
          ...fetchOptions,
          headers,
        });
      } catch {
        // Refresh failed, redirect to login
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw new ApiError(401, { message: 'Session expired' });
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new ApiError(response.status, errorData);
    }

    // Handle empty responses
    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }

  // Convenience methods
  get<T>(url: string, options?: RequestOptions) {
    return this.fetch<T>(url, { ...options, method: 'GET' });
  }

  post<T>(url: string, data?: unknown, options?: RequestOptions) {
    return this.fetch<T>(url, {
      ...options,
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  put<T>(url: string, data?: unknown, options?: RequestOptions) {
    return this.fetch<T>(url, {
      ...options,
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  patch<T>(url: string, data?: unknown, options?: RequestOptions) {
    return this.fetch<T>(url, {
      ...options,
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  delete<T>(url: string, options?: RequestOptions) {
    return this.fetch<T>(url, { ...options, method: 'DELETE' });
  }

  async upload<T>(url: string, formData: FormData, options?: RequestOptions): Promise<T> {
    const { skipAuth = false, ...fetchOptions } = options || {};

    const headers: HeadersInit = {
      // Don't set Content-Type - let browser set it with boundary
      ...fetchOptions.headers,
    };

    if (!skipAuth && this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(`${API_URL}${url}`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new ApiError(response.status, errorData);
    }

    const text = await response.text();
    return text ? JSON.parse(text) : ({} as T);
  }
}

export const api = new ApiClient();

