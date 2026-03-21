// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import {
  generateSalt,
  deriveWrappingKey,
  generateDataKey,
  wrapDataKey,
  unwrapDataKey,
  encrypt,
  decrypt,
  toBase64,
  fromBase64,
} from '../crypto';

describe('crypto utilities', () => {
  it('generateSalt returns 16 unique bytes each call', () => {
    const salt1 = generateSalt();
    const salt2 = generateSalt();
    expect(salt1).toBeInstanceOf(Uint8Array);
    expect(salt1.length).toBe(16);
    expect(salt2.length).toBe(16);
    // Extremely unlikely to be equal
    expect(toBase64(salt1)).not.toBe(toBase64(salt2));
  });

  it('deriveWrappingKey is non-extractable', async () => {
    const salt = generateSalt();
    const key = await deriveWrappingKey('test-password', salt);
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.extractable).toBe(false);
    expect(key.usages).toContain('wrapKey');
    expect(key.usages).toContain('unwrapKey');
  });

  it('generateDataKey is extractable (required for wrapKey)', async () => {
    const key = await generateDataKey();
    expect(key).toBeInstanceOf(CryptoKey);
    expect(key.extractable).toBe(true);
    expect(key.usages).toContain('encrypt');
    expect(key.usages).toContain('decrypt');
  });

  it('wrapDataKey + unwrapDataKey roundtrip', async () => {
    const salt = generateSalt();
    const wrappingKey = await deriveWrappingKey('my-password', salt);
    const dataKey = await generateDataKey();

    const wrapped = await wrapDataKey(dataKey, wrappingKey);
    expect(typeof wrapped).toBe('string');
    expect(wrapped.length).toBeGreaterThan(0);

    const unwrapped = await unwrapDataKey(wrapped, wrappingKey);
    expect(unwrapped).toBeInstanceOf(CryptoKey);
    expect(unwrapped.extractable).toBe(false);
    expect(unwrapped.usages).toContain('encrypt');
    expect(unwrapped.usages).toContain('decrypt');

    // Verify the unwrapped key works the same as the original
    const plaintext = 'test data for roundtrip';
    const encrypted = await encrypt(plaintext, dataKey);
    const decrypted = await decrypt(encrypted, unwrapped);
    expect(decrypted).toBe(plaintext);
  });

  it('unwrapDataKey throws on wrong password', async () => {
    const salt = generateSalt();
    const wrappingKey = await deriveWrappingKey('correct-password', salt);
    const dataKey = await generateDataKey();
    const wrapped = await wrapDataKey(dataKey, wrappingKey);

    const wrongKey = await deriveWrappingKey('wrong-password', salt);
    await expect(unwrapDataKey(wrapped, wrongKey)).rejects.toThrow();
  });

  it('encrypt + decrypt roundtrip', async () => {
    const key = await generateDataKey();
    const plaintext = 'Hello, World! 日本語テスト 🎉';
    const ciphertext = await encrypt(plaintext, key);
    const decrypted = await decrypt(ciphertext, key);
    expect(decrypted).toBe(plaintext);
  });

  it('encrypt same plaintext twice → different ciphertext (random IV)', async () => {
    const key = await generateDataKey();
    const plaintext = 'same text both times';
    const ct1 = await encrypt(plaintext, key);
    const ct2 = await encrypt(plaintext, key);
    expect(ct1).not.toBe(ct2);

    // Both should still decrypt to same plaintext
    expect(await decrypt(ct1, key)).toBe(plaintext);
    expect(await decrypt(ct2, key)).toBe(plaintext);
  });

  it('decrypt throws on tampered ciphertext', async () => {
    const key = await generateDataKey();
    const plaintext = 'sensitive data';
    const ciphertext = await encrypt(plaintext, key);

    // Tamper with the ciphertext
    const bytes = fromBase64(ciphertext);
    bytes[bytes.length - 1] ^= 0xff; // Flip last byte (GCM tag)
    const tampered = toBase64(bytes);

    await expect(decrypt(tampered, key)).rejects.toThrow();
  });

  it('toBase64 + fromBase64 roundtrip', () => {
    const original = new Uint8Array([0, 1, 2, 127, 128, 255]);
    const b64 = toBase64(original);
    expect(typeof b64).toBe('string');
    const decoded = fromBase64(b64);
    expect(decoded).toEqual(original);
  });

  it('handles empty string encryption', async () => {
    const key = await generateDataKey();
    const ciphertext = await encrypt('', key);
    const decrypted = await decrypt(ciphertext, key);
    expect(decrypted).toBe('');
  });
});
