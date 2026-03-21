'use client';

import { useRef, useCallback } from 'react';

/**
 * useCryptoWorker — React hook for off-main-thread blob encryption/decryption.
 *
 * Uses a Web Worker to avoid UI freezing during heavy crypto operations
 * (e.g., encrypting 10MB+ audio files).
 */
export function useCryptoWorker() {
  const workerRef = useRef<Worker | null>(null);
  const idCounterRef = useRef(0);

  const getWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('@/lib/crypto-worker.ts', import.meta.url)
      );
    }
    return workerRef.current;
  }, []);

  const sendMessage = useCallback(
    <T>(type: string, data: Record<string, unknown>): Promise<T> => {
      const worker = getWorker();
      const id = `msg-${++idCounterRef.current}`;

      return new Promise((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.data.id !== id) return;
          worker.removeEventListener('message', handler);

          if (event.data.type === 'error') {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.result as T);
          }
        };

        worker.addEventListener('message', handler);
        worker.postMessage({ ...data, type, id });
      });
    },
    [getWorker]
  );

  /**
   * Encrypt a Blob using AES-256-GCM in a Web Worker.
   * Returns encrypted Blob (iv + ciphertext).
   */
  const encryptBlob = useCallback(
    async (blob: Blob, key: CryptoKey): Promise<Blob> => {
      return sendMessage<Blob>('encryptBlob', { blob, key });
    },
    [sendMessage]
  );

  /**
   * Decrypt a Blob using AES-256-GCM in a Web Worker.
   * Returns decrypted Blob (audio/webm).
   */
  const decryptBlob = useCallback(
    async (blob: Blob, key: CryptoKey): Promise<Blob> => {
      return sendMessage<Blob>('decryptBlob', { blob, key });
    },
    [sendMessage]
  );

  /**
   * Terminate the worker (cleanup).
   */
  const terminate = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  return { encryptBlob, decryptBlob, terminate };
}
