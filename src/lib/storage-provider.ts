/**
 * StorageProvider — abstraction layer for file storage.
 *
 * Current: LocalStorageProvider (filesystem)
 * Future: S3StorageProvider (AWS S3 + Lambda)
 *
 * Switch via STORAGE_PROVIDER env variable.
 *
 * @module storage-provider
 */

import fs from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = process.env.STORAGE_PATH || './Vcomtor/storage';

/**
 * StorageProvider interface — implement this for different backends.
 */
export interface StorageProvider {
  /** Upload a file. Returns the storage key. */
  upload(key: string, data: Buffer | Uint8Array): Promise<string>;
  /** Download a file by key. */
  download(key: string): Promise<Buffer>;
  /** Delete a file by key. */
  delete(key: string): Promise<void>;
  /** Check if a file exists. */
  exists(key: string): Promise<boolean>;
}

/**
 * Local filesystem storage provider.
 * Files stored under STORAGE_PATH (default: ./Vcomtor/storage).
 */
class LocalStorageProvider implements StorageProvider {
  async upload(key: string, data: Buffer | Uint8Array): Promise<string> {
    const filePath = path.join(STORAGE_ROOT, key);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, data);
    return key;
  }

  async download(key: string): Promise<Buffer> {
    const filePath = path.join(STORAGE_ROOT, key);
    return fs.readFile(filePath);
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(STORAGE_ROOT, key);
    try {
      await fs.unlink(filePath);
      // Clean up empty parent directories
      const dir = path.dirname(filePath);
      const files = await fs.readdir(dir);
      if (files.length === 0) {
        await fs.rmdir(dir);
      }
    } catch (error) {
      // Ignore if file doesn't exist
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(STORAGE_ROOT, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }
}

// Future: S3StorageProvider
// class S3StorageProvider implements StorageProvider {
//   private client: S3Client;
//   private bucket: string;
//
//   constructor() {
//     this.client = new S3Client({ region: process.env.AWS_S3_REGION });
//     this.bucket = process.env.AWS_S3_BUCKET!;
//   }
//
//   async upload(key: string, data: Buffer | Uint8Array): Promise<string> {
//     await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: data }));
//     return key;
//   }
//   async download(key: string): Promise<Buffer> { ... }
//   async delete(key: string): Promise<void> { ... }
//   async exists(key: string): Promise<boolean> { ... }
// }

/**
 * Get the storage provider based on STORAGE_PROVIDER env variable.
 * Default: 'local'
 * Future: 's3'
 */
function createStorageProvider(): StorageProvider {
  const provider = process.env.STORAGE_PROVIDER || 'local';

  switch (provider) {
    case 'local':
      return new LocalStorageProvider();
    // case 's3':
    //   return new S3StorageProvider();
    default:
      return new LocalStorageProvider();
  }
}

/** Singleton storage provider instance. */
export const storageProvider = createStorageProvider();

/**
 * Build a storage key for meeting audio.
 * Format: {userId}/{meetingId}/audio.enc
 */
export function audioStorageKey(userId: string, meetingId: string): string {
  return `${userId}/${meetingId}/audio.enc`;
}
