import { type NextRequest } from 'next/server';
import { projectService } from '@/services/project.service';
import { updateProjectSchema } from '@/validations/project.schema';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import {
  successResponse,
  validationError,
  notFoundError,
  serverError,
} from '@/lib/api-response';

type RouteParams = { params: Promise<{ projectId: string }> };

/**
 * GET /api/projects/:projectId — Get project details.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { projectId } = await params;
    const project = await projectService.getById(projectId, auth.userId);
    if (!project) return notFoundError('Project not found');

    return successResponse({ project });
  } catch (error) {
    console.error('[Project GET]', error);
    return serverError('Failed to fetch project');
  }
}

/**
 * PUT /api/projects/:projectId — Update project.
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { projectId } = await params;
    const body = await request.json();
    const parsed = updateProjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const project = await projectService.update(projectId, auth.userId, parsed.data);
    if (!project) return notFoundError('Project not found');

    return successResponse({ project }, 'Project updated');
  } catch (error) {
    console.error('[Project PUT]', error);
    return serverError('Failed to update project');
  }
}

/**
 * DELETE /api/projects/:projectId — Delete project + all meetings.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const { projectId } = await params;
    const deleted = await projectService.delete(projectId, auth.userId);
    if (!deleted) return notFoundError('Project not found');

    return successResponse(null, 'Project deleted');
  } catch (error) {
    console.error('[Project DELETE]', error);
    return serverError('Failed to delete project');
  }
}
