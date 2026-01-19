const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1';

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
  private refreshPromise: Promise<void> | null = null;

  constructor() {
    // Access token will be set in memory only after login/refresh
  }

  setAccessToken(accessToken: string) {
    this.accessToken = accessToken;
  }

  clearTokens() {
    this.accessToken = null;
  }

  getAccessToken() {
    return this.accessToken;
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  private isRefreshing = false; // Prevent recursive refresh loops

  private async refreshAccessToken(): Promise<void> {
    // Prevent infinite loop if refresh itself fails
    if (this.isRefreshing) {
      throw new ApiError(401, { message: 'Already refreshing' });
    }

    this.isRefreshing = true;

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}), // Empty body - refresh token comes from httpOnly cookie
        credentials: 'include', // CRITICAL: Include httpOnly cookies
      });

      if (!response.ok) {
        throw new ApiError(response.status, await response.json());
      }

      const data = await response.json();
      this.setAccessToken(data.accessToken);
    } catch (error) {
      this.clearTokens();
      throw error;
    } finally {
      this.isRefreshing = false;
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
      credentials: 'include', // CRITICAL: Include httpOnly cookies in all requests
    });

    // Handle token refresh on 401
    if (response.status === 401 && !skipAuth) {
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
          credentials: 'include', // CRITICAL: Include httpOnly cookies
        });
      } catch {
        // Refresh failed - don't hard redirect, let the app handle auth state
        // The auth provider will update state and protected routes will redirect as needed
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
      credentials: 'include', // CRITICAL: Include httpOnly cookies
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

