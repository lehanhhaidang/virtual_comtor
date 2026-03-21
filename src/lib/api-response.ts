import { NextResponse } from 'next/server';

export interface ApiSuccessResponse<T = unknown> {
  success: true;
  data: T;
  message: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  message: string;
  details?: unknown;
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse;

/**
 * Create a standardized success response.
 */
export function successResponse<T>(
  data: T,
  message = 'Success',
  status = 200
): NextResponse<ApiSuccessResponse<T>> {
  return NextResponse.json(
    { success: true as const, data, message },
    { status }
  );
}

/**
 * Create a standardized error response.
 */
export function errorResponse(
  error: string,
  message: string,
  status = 400,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    { success: false as const, error, message, ...(details ? { details } : {}) },
    { status }
  );
}

/**
 * Common error helpers.
 */
export function validationError(
  message: string,
  details?: unknown
): NextResponse<ApiErrorResponse> {
  return errorResponse('VALIDATION_ERROR', message, 400, details);
}

export function unauthorizedError(
  message = 'Unauthorized'
): NextResponse<ApiErrorResponse> {
  return errorResponse('UNAUTHORIZED', message, 401);
}

export function notFoundError(
  message = 'Not found'
): NextResponse<ApiErrorResponse> {
  return errorResponse('NOT_FOUND', message, 404);
}

export function serverError(
  message = 'Internal server error'
): NextResponse<ApiErrorResponse> {
  return errorResponse('SERVER_ERROR', message, 500);
}
