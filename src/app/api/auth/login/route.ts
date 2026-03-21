import { type NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import { loginSchema } from '@/validations/auth.schema';
import {
  successResponse,
  validationError,
  unauthorizedError,
  serverError,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );
    }

    const { email, password } = parsed.data;

    // Login
    const result = await authService.login(email, password);

    // Set cookies — include encryption keys in response data
    const response = successResponse(
      {
        user: result.user,
        encryptedDataKey: result.encryptedDataKey,
        keySalt: result.keySalt,
      },
      'Login successful'
    );

    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60,
    });

    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid credentials') {
      return unauthorizedError('Invalid email or password');
    }
    console.error('[Login Error]', error);
    return serverError('Login failed');
  }
}
