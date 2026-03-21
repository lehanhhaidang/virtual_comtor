import { type NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import {
  successResponse,
  unauthorizedError,
  serverError,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const refreshToken = request.cookies.get('refreshToken')?.value;

    if (!refreshToken) {
      return unauthorizedError('No refresh token');
    }

    const result = await authService.refreshToken(refreshToken);

    // Set new access token cookie
    const response = successResponse(
      { user: result.user },
      'Token refreshed'
    );

    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof Error) {
      return unauthorizedError(error.message);
    }
    console.error('[Refresh Error]', error);
    return serverError('Token refresh failed');
  }
}
