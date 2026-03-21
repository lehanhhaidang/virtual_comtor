import { userRepository } from '@/repositories/user.repository';
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '@/lib/auth';
import type { AuthResponse, AuthUser } from '@/types/auth.types';

/**
 * Auth service — business logic for authentication.
 * Only knows about the repository layer, not the database driver.
 */
export const authService = {
  /**
   * Register a new user.
   * @throws Error if email already exists.
   */
  async register(
    name: string,
    email: string,
    password: string,
    encryptedDataKey: string,
    keySalt: string
  ): Promise<AuthResponse> {
    // Check for existing user
    const exists = await userRepository.emailExists(email);
    if (exists) {
      throw new Error('Email already registered');
    }

    // Create user (password hashing is handled by model pre-save hook)
    const user = await userRepository.create({
      name,
      email,
      password,
      encryptedDataKey,
      keySalt,
    });

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user._id.toString(), email: user.email }),
      signRefreshToken({ userId: user._id.toString(), email: user.email }),
    ]);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
    };
  },

  /**
   * Login with email and password.
   * @throws Error if credentials are invalid.
   */
  async login(email: string, password: string): Promise<AuthResponse> {
    // Find user with password + keys fields
    const user = await userRepository.findByEmailWithKeys(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    // Generate tokens
    const [accessToken, refreshToken] = await Promise.all([
      signAccessToken({ userId: user._id.toString(), email: user.email }),
      signRefreshToken({ userId: user._id.toString(), email: user.email }),
    ]);

    return {
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
      accessToken,
      refreshToken,
      encryptedDataKey: user.encryptedDataKey,
      keySalt: user.keySalt,
    };
  },

  /**
   * Refresh an access token using a valid refresh token.
   * @throws Error if refresh token is invalid.
   */
  async refreshToken(token: string): Promise<{ accessToken: string; user: AuthUser }> {
    const payload = await verifyRefreshToken(token);
    if (!payload) {
      throw new Error('Invalid refresh token');
    }

    // Verify user still exists
    const user = await userRepository.findById(payload.userId);
    if (!user) {
      throw new Error('User not found');
    }

    const accessToken = await signAccessToken({
      userId: user._id.toString(),
      email: user.email,
    });

    return {
      accessToken,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
      },
    };
  },

  /**
   * Get user by ID (for session validation). Does NOT include keys.
   */
  async getUserById(userId: string): Promise<AuthUser | null> {
    const user = await userRepository.findById(userId);
    if (!user) return null;

    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
    };
  },

  /**
   * Change password — verify current, update hash + re-wrapped data key.
   * @throws Error if current password is wrong.
   */
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
    newEncryptedDataKey: string
  ): Promise<void> {
    const user = await userRepository.findByEmailWithKeys(
      // Need to find user by ID with password
      (await userRepository.findById(userId))?.email ?? ''
    );
    if (!user) {
      throw new Error('User not found');
    }

    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw new Error('Invalid current password');
    }

    // Update password and re-wrapped key atomically via mongoose save
    user.password = newPassword;
    user.encryptedDataKey = newEncryptedDataKey;
    await user.save(); // triggers pre-save password hashing
  },
};
