import { type NextRequest } from 'next/server';
import { getAuthUser, isAuthError } from '@/lib/api-auth';
import { successResponse, validationError, notFoundError, serverError } from '@/lib/api-response';
import { generateMeetingSummary } from '@/services/openai.service';
import { connectDB } from '@/lib/db';
import Meeting from '@/models/Meeting';
import type { Locale } from '@/lib/i18n/types';

/**
 * POST /api/meetings/:meetingId/summary
 * Generate a summary from transcript text using OpenAI.
 * Client sends decrypted transcript; server calls OpenAI; returns plaintext summary.
 * Client is responsible for encrypting before saving via PUT.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;
    const body = await request.json();

    if (!body.transcript || typeof body.transcript !== 'string') {
      return validationError('transcript (string) is required');
    }

    const language: Locale = body.language || 'vi';

    await connectDB();
    const meeting = await Meeting.findOne({
      _id: meetingId,
      userId: authResult.userId,
    });

    if (!meeting) return notFoundError('Meeting not found');

    const summaryData = await generateMeetingSummary(body.transcript, language);

    return successResponse(summaryData, 'Summary generated');
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate summary';
    return serverError(message);
  }
}

/**
 * PUT /api/meetings/:meetingId/summary
 * Save encrypted summary to the meeting document.
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;
    const body = await request.json();

    if (!body.encryptedSummary || typeof body.encryptedSummary !== 'string') {
      return validationError('encryptedSummary (string) is required');
    }

    await connectDB();
    const meeting = await Meeting.findOneAndUpdate(
      { _id: meetingId, userId: authResult.userId },
      { encryptedSummary: body.encryptedSummary },
      { new: true }
    );

    if (!meeting) return notFoundError('Meeting not found');

    return successResponse(null, 'Summary saved');
  } catch {
    return serverError('Failed to save summary');
  }
}

/**
 * GET /api/meetings/:meetingId/summary
 * Return encrypted summary from the meeting document.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ meetingId: string }> }
) {
  try {
    const authResult = await getAuthUser(request);
    if (isAuthError(authResult)) return authResult;

    const { meetingId } = await params;

    await connectDB();
    const meeting = await Meeting.findOne({
      _id: meetingId,
      userId: authResult.userId,
    }).select('encryptedSummary');

    if (!meeting) return notFoundError('Meeting not found');

    return successResponse({
      encryptedSummary: meeting.encryptedSummary || null,
    });
  } catch {
    return serverError('Failed to get summary');
  }
}
