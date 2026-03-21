import { describe, it, expect } from 'vitest';
import {
  successResponse,
  errorResponse,
  validationError,
  unauthorizedError,
  notFoundError,
  serverError,
} from '@/lib/api-response';

describe('API Response Helpers', () => {
  describe('successResponse', () => {
    it('should return success: true with data and message', async () => {
      const res = successResponse({ id: '123' }, 'Created', 201);
      const body = await res.json();

      expect(body.success).toBe(true);
      expect(body.data).toEqual({ id: '123' });
      expect(body.message).toBe('Created');
      expect(res.status).toBe(201);
    });

    it('should default to status 200 and message "Success"', async () => {
      const res = successResponse({ ok: true });
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.message).toBe('Success');
    });
  });

  describe('errorResponse', () => {
    it('should return success: false with error and message', async () => {
      const res = errorResponse('TEST_ERROR', 'Something went wrong', 422);
      const body = await res.json();

      expect(body.success).toBe(false);
      expect(body.error).toBe('TEST_ERROR');
      expect(body.message).toBe('Something went wrong');
      expect(res.status).toBe(422);
    });

    it('should include details when provided', async () => {
      const details = { field: 'email', issue: 'required' };
      const res = errorResponse('VALIDATION', 'Invalid', 400, details);
      const body = await res.json();

      expect(body.details).toEqual(details);
    });
  });

  describe('validationError', () => {
    it('should return 400 with VALIDATION_ERROR', async () => {
      const res = validationError('Invalid input');
      const body = await res.json();

      expect(res.status).toBe(400);
      expect(body.error).toBe('VALIDATION_ERROR');
      expect(body.message).toBe('Invalid input');
    });
  });

  describe('unauthorizedError', () => {
    it('should return 401 with UNAUTHORIZED', async () => {
      const res = unauthorizedError();
      const body = await res.json();

      expect(res.status).toBe(401);
      expect(body.error).toBe('UNAUTHORIZED');
    });

    it('should use custom message', async () => {
      const res = unauthorizedError('Token expired');
      const body = await res.json();

      expect(body.message).toBe('Token expired');
    });
  });

  describe('notFoundError', () => {
    it('should return 404 with NOT_FOUND', async () => {
      const res = notFoundError();
      const body = await res.json();

      expect(res.status).toBe(404);
      expect(body.error).toBe('NOT_FOUND');
    });
  });

  describe('serverError', () => {
    it('should return 500 with SERVER_ERROR', async () => {
      const res = serverError();
      const body = await res.json();

      expect(res.status).toBe(500);
      expect(body.error).toBe('SERVER_ERROR');
    });
  });
});
