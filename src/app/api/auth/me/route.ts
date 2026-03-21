import { type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';
import { successResponse, unauthorizedError, validationError } from '@/lib/api-response';
import { authService } from '@/services/auth.service';
import { userRepository } from '@/repositories/user.repository';
import { z } from 'zod';

/**
 * GET /api/auth/me — Get current authenticated user.
 */
export async function GET(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return unauthorizedError('Not authenticated');
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return unauthorizedError('Invalid or expired token');
  }

  const user = await authService.getUserById(payload.userId);
  if (!user) {
    return unauthorizedError('User not found');
  }

  return successResponse({ user }, 'Authenticated');
}

const updateSchema = z.object({
  name: z.string().min(1).max(100).optional(),
});

/**
 * PATCH /api/auth/me — Update current user's profile.
 */
export async function PATCH(request: NextRequest) {
  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return unauthorizedError('Not authenticated');
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return unauthorizedError('Invalid or expired token');
  }

  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return validationError(parsed.error.issues[0]?.message ?? 'Invalid input');
  }

  const updated = await userRepository.updateById(payload.userId, parsed.data);
  if (!updated) {
    return unauthorizedError('User not found');
  }

  return successResponse(
    { user: { id: updated._id.toString(), name: updated.name, email: updated.email } },
    'Profile updated'
  );
}
