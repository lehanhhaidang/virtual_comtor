import { type NextRequest } from 'next/server';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { successResponse, serverError, notFoundError } from '@/lib/api-response';
import { storageProvider, audioStorageKey } from '@/lib/storage-provider';
import { meetingService } from '@/services/meeting.service';

/**
 * POST /api/meetings/[meetingId]/audio
 * Upload encrypted audio blob for a meeting.
 * Body: raw binary (encrypted audio from client).
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;

    // Verify user owns this meeting
    const meeting = await meetingService.getById(meetingId, authResult.userId);
    if (!meeting) {
      return notFoundError('Meeting not found');
    }

    // Read encrypted blob from request body
    const buffer = Buffer.from(await request.arrayBuffer());
    if (buffer.length === 0) {
      return serverError('Empty audio data');
    }

    // Store encrypted audio via StorageProvider
    const key = audioStorageKey(authResult.userId, meetingId);
    await storageProvider.upload(key, buffer);

    return successResponse({ key, size: buffer.length }, 'Audio uploaded successfully');
  } catch (error) {
    console.error('[Audio Upload Error]', error);
    return serverError('Failed to upload audio');
  }
}

/**
 * GET /api/meetings/[meetingId]/audio
 * Download encrypted audio blob for a meeting.
 * Returns raw binary (client decrypts).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;

    // Verify user owns this meeting
    const meeting = await meetingService.getById(meetingId, authResult.userId);
    if (!meeting) {
      return notFoundError('Meeting not found');
    }

    const key = audioStorageKey(authResult.userId, meetingId);
    const exists = await storageProvider.exists(key);
    if (!exists) {
      return notFoundError('Audio not found');
    }

    const buffer = await storageProvider.download(key);
    const bytes = new Uint8Array(buffer);

    return new Response(bytes, {
      status: 200,
      headers: {
        'Content-Type': 'application/octet-stream',
        'Content-Length': bytes.length.toString(),
        'Content-Disposition': `attachment; filename="${meetingId}.enc"`,
      },
    });
  } catch (error) {
    console.error('[Audio Download Error]', error);
    return serverError('Failed to download audio');
  }
}

/**
 * DELETE /api/meetings/[meetingId]/audio
 * Delete encrypted audio for a meeting.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;

    // Verify user owns this meeting
    const meeting = await meetingService.getById(meetingId, authResult.userId);
    if (!meeting) {
      return notFoundError('Meeting not found');
    }

    const key = audioStorageKey(authResult.userId, meetingId);
    await storageProvider.delete(key);

    return successResponse(null, 'Audio deleted successfully');
  } catch (error) {
    console.error('[Audio Delete Error]', error);
    return serverError('Failed to delete audio');
  }
}
