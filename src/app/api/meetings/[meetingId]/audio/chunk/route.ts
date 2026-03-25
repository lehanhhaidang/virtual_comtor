import { type NextRequest } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { successResponse, serverError, notFoundError, validationError } from '@/lib/api-response';
import { audioStorageKey } from '@/lib/storage-provider';
import { meetingService } from '@/services/meeting.service';

const STORAGE_ROOT = process.env.STORAGE_PATH || './Vcomtor/storage';
const CHUNK_TMP_SUFFIX = '.uploading';

/**
 * POST /api/meetings/[meetingId]/audio/chunk
 * Chunked upload for encrypted audio.
 *
 * Headers:
 * - x-upload-offset: number (0-based byte offset)
 * - x-upload-final: "1" when this is the last chunk
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;

    const meeting = await meetingService.getById(meetingId, authResult.userId);
    if (!meeting) return notFoundError('Meeting not found');

    const offsetRaw = request.headers.get('x-upload-offset');
    const finalRaw = request.headers.get('x-upload-final');

    const offset = Number(offsetRaw);
    if (!Number.isFinite(offset) || offset < 0) {
      return validationError('Invalid x-upload-offset');
    }
    const isFinal = finalRaw === '1';

    const chunk = Buffer.from(await request.arrayBuffer());
    if (chunk.length === 0) return serverError('Empty audio chunk');

    const key = audioStorageKey(authResult.userId, meetingId);
    const finalPath = path.join(STORAGE_ROOT, key);
    const tmpPath = `${finalPath}${CHUNK_TMP_SUFFIX}`;

    await fs.mkdir(path.dirname(finalPath), { recursive: true });

    if (offset === 0) {
      // Start a new upload (overwrite tmp)
      await fs.writeFile(tmpPath, chunk);
    } else {
      // Append (basic sequential assumption)
      await fs.appendFile(tmpPath, chunk);
    }

    if (isFinal) {
      // Atomically replace final
      await fs.rename(tmpPath, finalPath);
      return successResponse({ key, size: offset + chunk.length }, 'Audio uploaded (chunked)');
    }

    return successResponse({ received: chunk.length, nextOffset: offset + chunk.length }, 'Chunk received');
  } catch (error) {
    console.error('[Audio Chunk Upload Error]', error);
    return serverError('Failed to upload audio chunk');
  }
}
