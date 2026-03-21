import { type NextRequest } from 'next/server';
import { projectService } from '@/services/project.service';
import { createProjectSchema } from '@/validations/project.schema';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { successResponse, validationError, serverError } from '@/lib/api-response';

/**
 * GET /api/projects — List user's projects.
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const projects = await projectService.getAll(auth.userId);
    return successResponse({ projects });
  } catch (error) {
    console.error('[Projects GET]', error);
    return serverError('Failed to fetch projects');
  }
}

/**
 * POST /api/projects — Create a project.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const body = await request.json();
    const parsed = createProjectSchema.safeParse(body);
    if (!parsed.success) {
      return validationError('Validation failed', parsed.error.flatten().fieldErrors);
    }

    const project = await projectService.create(auth.userId, parsed.data);
    return successResponse({ project }, 'Project created', 201);
  } catch (error) {
    console.error('[Projects POST]', error);
    return serverError('Failed to create project');
  }
}
