import { type NextRequest } from 'next/server';
import { meetingService } from '@/services/meeting.service';
import { createMeetingSchema } from '@/validations/meeting.schema';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { successResponse, validationError, serverError } from '@/lib/api-response';

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/:projectId/meetings — List meetings for a project.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { projectId } = await params;
    const meetings = await meetingService.getByProjectId(projectId, auth.userId);
    return successResponse({ meetings });
  } catch (error) {
    console.error('[Meetings GET]', error);
    return serverError('Failed to fetch meetings');
  }
}

/**
 * POST /api/projects/:projectId/meetings — Create a meeting.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { projectId } = await params;
    const body = await request.json();
    const parsed = createMeetingSchema.safeParse(body);
    if (!parsed.success) {
      return validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const meeting = await meetingService.create(auth.userId, projectId, parsed.data);
    return successResponse({ meeting }, 'Meeting created', 201);
  } catch (error) {
    if (error instanceof Error && error.message === 'Project not found') {
      return validationError('Project not found');
    }
    console.error('[Meetings POST]', error);
    return serverError('Failed to create meeting');
  }
}
