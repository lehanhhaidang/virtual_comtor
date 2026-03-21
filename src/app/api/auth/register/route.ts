import { type NextRequest } from 'next/server';
import { authService } from '@/services/auth.service';
import { registerSchema } from '@/validations/auth.schema';
import {
  successResponse,
  validationError,
  serverError,
} from '@/lib/api-response';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(
        'Validation failed',
        parsed.error.flatten().fieldErrors
      );
    }

    const { name, email, password, encryptedDataKey, keySalt } = parsed.data;

    // Register user
    const result = await authService.register(
      name,
      email,
      password,
      encryptedDataKey,
      keySalt
    );

    // Set cookies
    const response = successResponse(
      { user: result.user },
      'Registration successful',
      201
    );

    response.cookies.set('accessToken', result.accessToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60, // 15 minutes
    });

    response.cookies.set('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error) {
    if (error instanceof Error && error.message === 'Email already registered') {
      return validationError('Email already registered');
    }
    console.error('[Register Error]', error);
    return serverError('Registration failed');
  }
}
