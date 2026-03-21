import { type NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import { changePasswordSchema } from '@/validations/auth.schema';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import {
  successResponse,
  validationError,
  unauthorizedError,
  serverError,
} from '@/lib/api-response';

/**
 * POST /api/auth/change-password
 * Body: { currentPassword, newPassword, newEncryptedDataKey }
 * Updates password hash + re-wrapped data key atomically.
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const body = await request.json();
    const parsed = changePasswordSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );
    }

    const { currentPassword, newPassword, newEncryptedDataKey } = parsed.data;

    await authService.changePassword(
      authResult.userId,
      currentPassword,
      newPassword,
      newEncryptedDataKey
    );

    return successResponse(null, 'Password changed successfully');
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid current password') {
      return unauthorizedError('Invalid current password');
    }
    console.error('[ChangePassword Error]', error);
    return serverError('Failed to change password');
  }
}
