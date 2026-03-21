/**
 * Crypto Web Worker — handles heavy encryption/decryption off main thread.
 *
 * Usage from main thread:
 *   const worker = new Worker(new URL('./crypto-worker.ts', import.meta.url));
 *   worker.postMessage({ type: 'encryptBlob', blob, key });
 *   worker.onmessage = (e) => { const encryptedBlob = e.data.result; };
 *
 * Supported operations:
 *   - encryptBlob: encrypt a Blob with AES-256-GCM
 *   - decryptBlob: decrypt a Blob with AES-256-GCM
 *
 * @module crypto-worker
 */

const IV_BYTES = 12;

self.onmessage = async (event: MessageEvent) => {
  const { type, id } = event.data;

  try {
    switch (type) {
      case 'encryptBlob': {
        const { blob, key } = event.data as {
          blob: Blob;
          key: CryptoKey;
          id: string;
          type: string;
        };

        const arrayBuffer = await blob.arrayBuffer();
        const iv = crypto.getRandomValues(new Uint8Array(IV_BYTES));
        const encrypted = await crypto.subtle.encrypt(
          { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
          key,
          arrayBuffer
        );

        // Combine iv + ciphertext
        const combined = new Uint8Array(iv.length + encrypted.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(encrypted), iv.length);

        const resultBlob = new Blob([combined], { type: 'application/octet-stream' });
        self.postMessage({ id, type: 'result', result: resultBlob });
        break;
      }

      case 'decryptBlob': {
        const { blob, key } = event.data as {
          blob: Blob;
          key: CryptoKey;
          id: string;
          type: string;
        };

        const arrayBuffer = await blob.arrayBuffer();
        const combined = new Uint8Array(arrayBuffer);
        const iv = combined.slice(0, IV_BYTES);
        const data = combined.slice(IV_BYTES);

        const decrypted = await crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          data
        );

        const resultBlob = new Blob([decrypted], { type: 'audio/webm' });
        self.postMessage({ id, type: 'result', result: resultBlob });
        break;
      }

      default:
        self.postMessage({ id, type: 'error', error: `Unknown type: ${type}` });
    }
  } catch (error) {
    self.postMessage({
      id,
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
