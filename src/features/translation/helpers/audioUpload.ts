const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB

export interface UploadProgress {
  pct: number;     // 0–100
  offset: number;
  total: number;
}

/**
 * Encrypt an audio Blob with AES-256-GCM using the provided CryptoKey.
 * Returns: iv (12 bytes) + ciphertext as Uint8Array.
 */
export async function encryptAudio(blob: Blob, dataKey: CryptoKey): Promise<Uint8Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, dataKey, arrayBuffer);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(encrypted), iv.length);
  return combined;
}

/**
 * Upload an encrypted audio Uint8Array to the server in 5 MB chunks.
 * Calls onProgress after each chunk.
 */
export async function uploadAudioChunked(
  meetingId: string,
  bytes: Uint8Array,
  onProgress?: (p: UploadProgress) => void,
): Promise<void> {
  let offset = 0;

  while (offset < bytes.length) {
    const end = Math.min(bytes.length, offset + CHUNK_SIZE);
    const chunk = bytes.slice(offset, end);
    const isFinal = end >= bytes.length;

    const res = await fetch(`/api/meetings/${meetingId}/audio/chunk`, {
      method: 'POST',
      headers: {
        'x-upload-offset': String(offset),
        'x-upload-final': isFinal ? '1' : '0',
      },
      body: chunk,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Audio upload failed (${res.status}) ${body}`);
    }

    offset = end;
    onProgress?.({ pct: Math.round((offset / bytes.length) * 100), offset, total: bytes.length });
  }
}
