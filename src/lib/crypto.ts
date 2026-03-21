/**
 * E2EE crypto utilities using Web Crypto API.
 *
 * All CryptoKey objects are NON-EXTRACTABLE.
 * Uses AES-256-GCM for data encryption, AES-KW for key wrapping,
 * and PBKDF2-SHA256 for key derivation.
 *
 * @module crypto
 */

const PBKDF2_ITERATIONS = 600_000;
const SALT_BYTES = 16;
const IV_BYTES = 12; // AES-GCM
const KEY_BITS = 256; // AES-256

/**
 * Generate a random salt for PBKDF2.
 * @returns 16 random bytes
 */
export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_BYTES));
}

/**
 * Derive a wrapping key from password + salt using PBKDF2-SHA256.
 * Returns NON-EXTRACTABLE CryptoKey with usages: ['wrapKey', 'unwrapKey'].
 * Iterations: 600,000 (OWASP 2024).
 */
export async function deriveWrappingKey(
  password: string,
  salt: Uint8Array
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-KW', length: KEY_BITS },
    false,
    ['wrapKey', 'unwrapKey']
  );
}

/**
 * Generate a random AES-256-GCM data key.
 * Extractable=true so it can be wrapped (wrapKey requires this).
 * After unwrapping, the key is created as non-extractable.
 */
export async function generateDataKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey(
    { name: 'AES-GCM', length: KEY_BITS },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Wrap (encrypt) a data key using a wrapping key.
 * Returns base64 string of wrapped key bytes.
 * Uses AES-KW algorithm.
 */
export async function wrapDataKey(
  dataKey: CryptoKey,
  wrappingKey: CryptoKey
): Promise<string> {
  const wrapped = await crypto.subtle.wrapKey(
    'raw',
    dataKey,
    wrappingKey,
    'AES-KW'
  );
  return toBase64(new Uint8Array(wrapped));
}

/**
 * Unwrap (decrypt) a data key using a wrapping key.
 * Returns NON-EXTRACTABLE CryptoKey with usages: ['encrypt', 'decrypt'].
 * Throws if wrapping key is wrong (wrong password).
 */
export async function unwrapDataKey(
  wrapped: string,
  wrappingKey: CryptoKey
): Promise<CryptoKey> {
  const wrappedBytes = fromBase64(wrapped);
  return crypto.subtle.unwrapKey(
    'raw',
    wrappedBytes.buffer as ArrayBuffer,
    wrappingKey,
    'AES-KW',
    { name: 'AES-GCM', length: KEY_BITS },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a string using AES-256-GCM.
 * Uses a RANDOM 12-byte IV per call (prepended to output).
 * Returns base64(iv + ciphertext + gcm_tag).
 * GCM tag is automatically appended by SubtleCrypto.
 */
export async function encrypt(
  plaintext: string,
  key: CryptoKey
): Promise<string> {
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext)
  );

  // Concat iv + ciphertext (which includes GCM tag)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return toBase64(combined);
}

/**
 * Decrypt a string encrypted with encrypt().
 * Throws DOMException on tampered data (GCM tag mismatch).
 */
export async function decrypt(
  ciphertext: string,
  key: CryptoKey
): Promise<string> {
  const decoder = new TextDecoder();
  const combined = fromBase64(ciphertext);

  const iv = combined.slice(0, IV_BYTES);
  const data = combined.slice(IV_BYTES);

  const plainBuffer = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    data
  );

  return decoder.decode(plainBuffer);
}

/**
 * Encode Uint8Array to base64 string.
 */
export function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decode base64 string to Uint8Array.
 */
export function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
