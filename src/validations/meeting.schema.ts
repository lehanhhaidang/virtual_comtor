import { z } from 'zod';
import { LANGUAGE_PAIRS, DEFAULT_LANGUAGE_PAIR_ID } from '@/lib/soniox';

const PAIR_IDS = LANGUAGE_PAIRS.map((p) => p.id) as [string, ...string[]];

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
    .enum(PAIR_IDS)
    .default(DEFAULT_LANGUAGE_PAIR_ID)
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
