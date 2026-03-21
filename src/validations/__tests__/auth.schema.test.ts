import { describe, it, expect } from 'vitest';
import { loginSchema, registerSchema } from '@/validations/auth.schema';

describe('loginSchema', () => {
  it('should pass with valid email and password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: 'password123',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should normalize email to lowercase', () => {
    const result = loginSchema.safeParse({
      email: 'Test@Example.COM',
      password: 'password',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('test@example.com');
    }
  });

  it('should reject empty email', () => {
    const result = loginSchema.safeParse({
      email: '',
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  it('should reject invalid email format', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'password',
    });
    expect(result.success).toBe(false);
  });

  it('should reject empty password', () => {
    const result = loginSchema.safeParse({
      email: 'test@example.com',
      password: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject missing fields', () => {
    const result = loginSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

describe('registerSchema', () => {
  const validData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'password123',
    confirmPassword: 'password123',
    encryptedDataKey: 'dGVzdC1lbmNyeXB0ZWQta2V5',
    keySalt: 'dGVzdC1zYWx0LXZhbHVl',
  };

  it('should pass with valid data', () => {
    const result = registerSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should trim name', () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: '  Test User  ',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Test User');
    }
  });

  it('should reject empty name', () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: '',
    });
    expect(result.success).toBe(false);
  });

  it('should reject name longer than 100 chars', () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: 'A'.repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it('should reject password shorter than 6 chars', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: '12345',
      confirmPassword: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('should reject password longer than 128 chars', () => {
    const longPassword = 'A'.repeat(129);
    const result = registerSchema.safeParse({
      ...validData,
      password: longPassword,
      confirmPassword: longPassword,
    });
    expect(result.success).toBe(false);
  });

  it('should reject mismatched passwords', () => {
    const result = registerSchema.safeParse({
      ...validData,
      password: 'password123',
      confirmPassword: 'differentpass',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const confirmError = result.error.flatten().fieldErrors.confirmPassword;
      expect(confirmError).toBeDefined();
      expect(confirmError?.[0]).toBe('Passwords do not match');
    }
  });

  it('should normalize email', () => {
    const result = registerSchema.safeParse({
      ...validData,
      email: 'User@Test.COM',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('user@test.com');
    }
  });

  it('should reject invalid email', () => {
    const result = registerSchema.safeParse({
      ...validData,
      email: 'invalid',
    });
    expect(result.success).toBe(false);
  });
});
