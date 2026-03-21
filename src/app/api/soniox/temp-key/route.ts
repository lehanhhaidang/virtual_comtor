import { type NextRequest } from 'next/server';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { SONIOX_API_URL } from '@/lib/soniox';
import { successResponse, serverError } from '@/lib/api-response';

/**
 * POST /api/soniox/temp-key — Generate temporary API key for browser-side Soniox.
 * The real API key stays server-side; browser gets a short-lived temp key.
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthUser(request);
    if (isAuthError(auth)) return auth;

    const apiKey = process.env.SONIOX_API_KEY;
    if (!apiKey) {
      return serverError('Soniox API key not configured');
    }

    // Request temporary key from Soniox Auth API
    const res = await fetch(`${SONIOX_API_URL}/auth/temporary-api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        usage_type: 'transcribe_websocket',
        expires_in_seconds: 3600,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[Soniox Key]', res.status, errorText);
      return serverError('Failed to generate Soniox temporary key');
    }

    const data = await res.json();
    return successResponse({ key: data.api_key });
  } catch (error) {
    console.error('[Soniox Key]', error);
    return serverError('Failed to generate Soniox temporary key');
  }
}
