import { type NextRequest } from 'next/server';
import { meetingService } from '@/services/meeting.service';
import { updateMeetingSchema } from '@/validations/meeting.schema';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError,
} from '@/lib/api-response';

type RouteParams = { params: Promise<{ meetingId: string }> };

/**
 * GET /api/meetings/:meetingId — Get meeting details.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { meetingId } = await params;
    const meeting = await meetingService.getById(meetingId, auth.userId);
    if (!meeting) return notFoundError('Meeting not found');

    return successResponse({ meeting });
  } catch (error) {
    console.error('[Meeting GET]', error);
    return serverError('Failed to fetch meeting');
  }
}

/**
 * PUT /api/meetings/:meetingId — Update meeting.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { meetingId } = await params;
    const body = await request.json();
    const parsed = updateMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const meeting = await meetingService.update(meetingId, auth.userId, parsed.data);
    if (!meeting) return notFoundError('Meeting not found');

    return successResponse({ meeting }, 'Meeting updated');
  } catch (error) {
    console.error('[Meeting PUT]', error);
    return serverError('Failed to update meeting');
  }
}

/**
 * DELETE /api/meetings/:meetingId — Delete meeting.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { meetingId } = await params;
    const deleted = await meetingService.delete(meetingId, auth.userId);
    if (!deleted) return notFoundError('Meeting not found');

    return successResponse(null, 'Meeting deleted');
  } catch (error) {
    console.error('[Meeting DELETE]', error);
    return serverError('Failed to delete meeting');
  }
}
