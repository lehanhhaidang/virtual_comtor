import { z } from 'zod';

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
