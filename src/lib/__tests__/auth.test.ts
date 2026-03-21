// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '@/lib/auth';

describe('JWT Auth Utilities', () => {
  const testPayload = { userId: 'user123', email: 'test@example.com' };

  describe('signAccessToken + verifyAccessToken', () => {
    it('should sign and verify an access token', async () => {
      const token = await signAccessToken(testPayload);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = await verifyAccessToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user123');
      expect(decoded?.email).toBe('test@example.com');
    });

    it('should return null for invalid access token', async () => {
      const result = await verifyAccessToken('invalid.token.here');
      expect(result).toBeNull();
    });

    it('should return null for empty token', async () => {
      const result = await verifyAccessToken('');
      expect(result).toBeNull();
    });
  });

  describe('signRefreshToken + verifyRefreshToken', () => {
    it('should sign and verify a refresh token', async () => {
      const token = await signRefreshToken(testPayload);
      expect(token).toBeDefined();

      const decoded = await verifyRefreshToken(token);
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe('user123');
    });

    it('should return null for invalid refresh token', async () => {
      const result = await verifyRefreshToken('bad.token');
      expect(result).toBeNull();
    });
  });

  describe('token isolation', () => {
    it('access token should not be verifiable as refresh token', async () => {
      const accessToken = await signAccessToken(testPayload);
      const result = await verifyRefreshToken(accessToken);
      expect(result).toBeNull();
    });

    it('refresh token should not be verifiable as access token', async () => {
      const refreshToken = await signRefreshToken(testPayload);
      const result = await verifyAccessToken(refreshToken);
      expect(result).toBeNull();
    });
  });
});
