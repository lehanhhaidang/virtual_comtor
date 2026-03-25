import { z } from 'zod';
import { DEFAULT_PAIR_ID } from '@/lib/soniox';

export const createMeetingSchema = z.object({
  title: z
    .string()
    .min(1, 'Meeting title is required')
    .max(300, 'Meeting title cannot exceed 300 characters')
    .trim(),
  mode: z
    .enum(['standard', 'private'])
    .default('standard')
    .optional(),
  languagePair: z
    .string()
    .regex(/^[a-z]{2,3}:[a-z]{2,3}$/, 'Invalid language pair format (expected "xx:xx")')
    .default(DEFAULT_PAIR_ID)
    .optional(),
});

export const updateMeetingSchema = z.object({
  title: z
    .string()
    .min(1, 'Meeting title is required')
    .max(300, 'Meeting title cannot exceed 300 characters')
    .trim()
    .optional(),
  status: z
    .enum(['scheduled', 'in_progress', 'completed'])
    .optional(),
});

export type CreateMeetingInput = z.infer<typeof createMeetingSchema>;
export type UpdateMeetingInput = z.infer<typeof updateMeetingSchema>;
