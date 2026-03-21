/** Auth-related types */

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  encryptedDataKey: string;
  keySalt: string;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
  encryptedDataKey?: string;
  keySalt?: string;
}

/** Login response data including encryption keys */
export interface LoginData {
  user: AuthUser;
  encryptedDataKey: string;
  keySalt: string;
}
