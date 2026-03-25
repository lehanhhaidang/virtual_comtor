import { transcriptRepository, type CreateEntryData } from '@/repositories/transcript.repository';
import { meetingRepository } from '@/repositories/meeting.repository';
import type { ITranscriptEntry } from '@/models/TranscriptEntry';

/** Input shape for encrypted transcript entries from the client. */
export interface EncryptedEntryInput {
  speakerId: string;
  speakerLabel: string;
  language: string;
  originalText: string;
  translatedText: string;
  startMs: number;
  endMs: number;
  confidence: number;
  isReply: boolean;
}

/**
 * Transcript service — business logic for transcript storage.
 * Server stores ciphertext as-is; encryption/decryption is client-side.
 */
export const transcriptService = {
  /**
   * Save encrypted transcript entries for a meeting.
   * Verifies meeting ownership before saving.
   * @throws Error if meeting not found or not owned by user.
   */
  async save(
    meetingId: string,
    userId: string,
    entries: EncryptedEntryInput[]
  ): Promise<void> {
    // Verify meeting belongs to user
    const meeting = await meetingRepository.findByIdAndUser(meetingId, userId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    const createData: CreateEntryData[] = entries.map((e) => ({
      meetingId,
      speakerId: e.speakerId,
      speakerLabel: e.speakerLabel,
      language: e.language,
      originalText: e.originalText,
      translatedText: e.translatedText,
      startMs: e.startMs,
      endMs: e.endMs,
      confidence: e.confidence,
      isReply: e.isReply,
    }));

    await transcriptRepository.bulkCreate(createData);
  },

  /**
   * Get all transcript entries for a meeting.
   * Verifies meeting ownership before returning.
   */
  async get(meetingId: string, userId: string): Promise<ITranscriptEntry[]> {
    const meeting = await meetingRepository.findByIdAndUser(meetingId, userId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    return transcriptRepository.findByMeetingId(meetingId);
  },

  /**
   * Delete all transcript entries for a meeting.
   * Verifies meeting ownership before deleting.
   */
  async delete(meetingId: string, userId: string): Promise<void> {
    const meeting = await meetingRepository.findByIdAndUser(meetingId, userId);
    if (!meeting) {
      throw new Error('Meeting not found');
    }

    await transcriptRepository.deleteByMeetingId(meetingId);
  },
};
