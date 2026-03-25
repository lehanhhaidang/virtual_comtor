import TranscriptEntry, { type ITranscriptEntry } from '@/models/TranscriptEntry';
import connectDB from '@/lib/db';

/** Data shape for creating transcript entries (no _id, no createdAt). */
export interface CreateEntryData {
  meetingId: string;
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
 * Transcript repository — all database operations for TranscriptEntry model.
 */
export const transcriptRepository = {
  /**
   * Bulk-create transcript entries. Uses insertMany with ordered: false
   * to continue on partial failure.
   */
  async bulkCreate(entries: CreateEntryData[]): Promise<void> {
    await connectDB();
    await TranscriptEntry.insertMany(entries, { ordered: false });
  },

  /**
   * Find all transcript entries for a meeting, sorted by startMs ASC.
   */
  async findByMeetingId(meetingId: string): Promise<ITranscriptEntry[]> {
    await connectDB();
    return TranscriptEntry.find({ meetingId }).sort({ startMs: 1 }).lean();
  },

  /**
   * Delete all transcript entries for a meeting.
   * @returns number of deleted entries.
   */
  async deleteByMeetingId(meetingId: string): Promise<number> {
    await connectDB();
    const result = await TranscriptEntry.deleteMany({ meetingId });
    return result.deletedCount;
  },
};
