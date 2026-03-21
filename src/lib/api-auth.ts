import { type NextRequest } from 'next/server';
import { verifyAccessToken, type TokenPayload } from '@/lib/auth';
import { unauthorizedError } from '@/lib/api-response';

/**
 * Extract and verify authenticated user from request cookies.
 * Returns payload or NextResponse error.
 */
export async function getAuthUser(
  request: NextRequest
): Promise<TokenPayload | Response> {
  const token = request.cookies.get('accessToken')?.value;

  if (!token) {
    return unauthorizedError('Not authenticated');
  }

  const payload = await verifyAccessToken(token);
  if (!payload) {
    return unauthorizedError('Invalid or expired token');
  }

  return payload;
}

/**
 * Type guard: check if result is an error Response.
 */
export function isAuthError(result: TokenPayload | Response): result is Response {
  return result instanceof Response;
}
