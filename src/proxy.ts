import { NextResponse, type NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth';

/**
 * Protected route patterns — require authentication.
 */
const protectedPatterns = [
  '/dashboard',
  '/projects',
  '/meetings',
  '/api/projects',
  '/api/meetings',
  '/api/soniox',
];

/**
 * Auth page patterns — redirect to dashboard if already logged in.
 */
const authPatterns = ['/login', '/register'];

/**
 * Next.js 16 Proxy — replaces deprecated middleware convention.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const accessToken = request.cookies.get('accessToken')?.value;

  // Check if accessing protected routes
  const isProtected = protectedPatterns.some((p) => pathname.startsWith(p));
  const isAuthPage = authPatterns.some((p) => pathname.startsWith(p));

  if (isProtected) {
    if (!accessToken) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    const payload = await verifyAccessToken(accessToken);
    if (!payload) {
      // Token expired or invalid — redirect to login
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      const response = NextResponse.redirect(loginUrl);
      response.cookies.delete('accessToken');
      return response;
    }
  }

  // Redirect authenticated users away from auth pages
  if (isAuthPage && accessToken) {
    const payload = await verifyAccessToken(accessToken);
    if (payload) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/register',
    '/dashboard/:path*',
    '/projects/:path*',
    '/meetings/:path*',
    '/api/projects/:path*',
    '/api/meetings/:path*',
    '/api/soniox/:path*',
  ],
};
