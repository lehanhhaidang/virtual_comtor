import { type NextRequest } from 'next/server';
import { transcriptService, type EncryptedEntryInput } from '@/services/transcript.service';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError,
} from '@/lib/api-response';

/**
 * POST /api/meetings/:meetingId/transcript
 * Bulk insert encrypted transcript entries.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;
    const body = await request.json();

    if (!body.entries || !Array.isArray(body.entries) || body.entries.length === 0) {
      return validationError('entries array is required and must not be empty');
    }

    const entries: EncryptedEntryInput[] = body.entries;

    await transcriptService.save(meetingId, authResult.userId, entries);

    return successResponse(
      { count: entries.length },
      'Transcript saved successfully',
      201
    );
  } catch (error) {
    if (error instanceof Error && error.message === 'Meeting not found') {
      return notFoundError('Meeting not found');
    }
    console.error('[Transcript POST Error]', error);
    return serverError('Failed to save transcript');
  }
}

/**
 * GET /api/meetings/:meetingId/transcript
 * Return all transcript entries for a meeting.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;
    const entries = await transcriptService.get(meetingId, authResult.userId);

    return successResponse({ entries }, 'Transcript retrieved');
  } catch (error) {
    if (error instanceof Error && error.message === 'Meeting not found') {
      return notFoundError('Meeting not found');
    }
    console.error('[Transcript GET Error]', error);
    return serverError('Failed to get transcript');
  }
}

/**
 * DELETE /api/meetings/:meetingId/transcript
 * Delete all transcript entries for a meeting.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;
    await transcriptService.delete(meetingId, authResult.userId);

    return successResponse(null, 'Transcript deleted');
  } catch (error) {
    if (error instanceof Error && error.message === 'Meeting not found') {
      return notFoundError('Meeting not found');
    }
    console.error('[Transcript DELETE Error]', error);
    return serverError('Failed to delete transcript');
  }
}
