import fs from 'fs/promises';
import path from 'path';

const STORAGE_ROOT = process.env.STORAGE_PATH || './Vcomtor/storage';

export type StorageSubdir = 'audio' | 'transcripts' | 'exports';

/**
 * Get the storage path for a specific meeting resource.
 */
export function getStoragePath(
  userId: string,
  projectId: string,
  meetingId: string,
  subdir?: StorageSubdir
): string {
  const parts = [STORAGE_ROOT, userId, projectId, meetingId];
  if (subdir) parts.push(subdir);
  return path.join(...parts);
}

/**
 * Ensure all directories in the storage path exist.
 */
export async function ensureStorageDir(
  userId: string,
  projectId: string,
  meetingId: string,
  subdir?: StorageSubdir
): Promise<string> {
  const dirPath = getStoragePath(userId, projectId, meetingId, subdir);
  await fs.mkdir(dirPath, { recursive: true });
  return dirPath;
}

/**
 * Save a file to storage.
 */
export async function saveFile(
  userId: string,
  projectId: string,
  meetingId: string,
  subdir: StorageSubdir,
  filename: string,
  data: Buffer | Uint8Array
): Promise<string> {
  const dir = await ensureStorageDir(userId, projectId, meetingId, subdir);
  const filePath = path.join(dir, filename);
  await fs.writeFile(filePath, data);
  return filePath;
}

/**
 * Read a file from storage.
 */
export async function readFile(
  userId: string,
  projectId: string,
  meetingId: string,
  subdir: StorageSubdir,
  filename: string
): Promise<Buffer> {
  const filePath = path.join(
    getStoragePath(userId, projectId, meetingId, subdir),
    filename
  );
  return fs.readFile(filePath);
}

/**
 * List files in a storage subdirectory.
 */
export async function listFiles(
  userId: string,
  projectId: string,
  meetingId: string,
  subdir: StorageSubdir
): Promise<string[]> {
  const dirPath = getStoragePath(userId, projectId, meetingId, subdir);
  try {
    return await fs.readdir(dirPath);
  } catch {
    return [];
  }
}
