import type { AuthUser, LoginCredentials, RegisterCredentials, LoginData } from '@/types/auth.types';
import type { ApiResponse } from '@/types/api.types';

const API_BASE = '/api/auth';

/**
 * Auth API client — frontend HTTP calls to auth endpoints.
 */
export const authApi = {
  /**
   * Login and return user + encryption keys.
   */
  async login(credentials: LoginCredentials): Promise<LoginData> {
    const res = await fetch(`${API_BASE}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data: ApiResponse<{
      user: AuthUser;
      encryptedDataKey: string;
      keySalt: string;
    }> = await res.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return {
      user: data.data.user,
      encryptedDataKey: data.data.encryptedDataKey,
      keySalt: data.data.keySalt,
    };
  },

  /**
   * Register with encryption keys.
   */
  async register(credentials: RegisterCredentials): Promise<AuthUser> {
    const res = await fetch(`${API_BASE}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    const data: ApiResponse<{ user: AuthUser }> = await res.json();

    if (!data.success) {
      throw new Error(data.message);
    }

    return data.data.user;
  },

  async logout(): Promise<void> {
    await fetch(`${API_BASE}/logout`, { method: 'POST' });
  },

  async getMe(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/me`);
      const data: ApiResponse<{ user: AuthUser }> = await res.json();

      if (!data.success) return null;
      return data.data.user;
    } catch {
      return null;
    }
  },

  async refreshToken(): Promise<AuthUser | null> {
    try {
      const res = await fetch(`${API_BASE}/refresh`, { method: 'POST' });
      const data: ApiResponse<{ user: AuthUser }> = await res.json();

      if (!data.success) return null;
      return data.data.user;
    } catch {
      return null;
    }
  },
};
